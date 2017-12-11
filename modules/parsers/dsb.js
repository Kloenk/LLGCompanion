'use strict'

const zlib = require('zlib')
const cheerio = require('cheerio')
const stdutil = require('../stdutil')
const util = require('util')
const fs = require('fs')
const readFile = util.promisify(fs.readFile)
const write = util.promisify(fs.write)
const fsync = util.promisify(fs.fsync)
const close = util.promisify(fs.close)
const open = util.promisify(fs.open)
const rename = util.promisify(fs.rename)

module.exports = class DsbParser {
  constructor() {
    this.cookie = '/* insert dsbmobile cookie here */'
    this.readDataFromDisk()
  }

  async retrieveData() {
    let dsbHtml = await stdutil.post('https://www.dsbmobile.de/JsonHandlerWeb.ashx/GetData', this.createRequestPayload(), this.cookie)
    let untisUrl = this.decodeDsb(JSON.parse(dsbHtml).d)
      .ResultMenuItems.filter(d => d.Title === 'Inhalte')[0]
      .Childs.filter(d => d.Title === 'Pläne')[0]
      .Root.Childs.filter(d => d.Title === 'DSBSchueler')[0]
      .Childs[0].Detail

    let untisHtml = await stdutil.get(untisUrl, 'latin1')
    this.data = this.parseUntis(untisHtml)
    await this.writeDataToDisk()
    setTimeout(this.retrieveData.bind(this), 300 * 1000)
  }

  createRequestPayload() {
    return JSON.stringify({
      'req': {
        'Data': this.encodeDsb({
          'UserId': '/* insert dsbmobile userid here */',
          'UserPw': '/* insert dsbmobile password here */',
          'Abos': [],
          'AppVersion': '2.3',
          'Language': 'de',
          'OsVersion': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
          'AppId': '',
          'Device': 'WebApp',
          'PushId': '',
          'BundleId': 'de.heinekingmedia.inhouse.dsbmobile.web',
          'Date': new Date(),
          'LastUpdate': new Date(),
        }),
        'DataType': 1
      }
    })
  }

  parseUntis(html) {
    let daysOfWeek = [ 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag' ]
    let types = {
      'vtr.': 'covered',
      'vertr.': 'covered',
      'betreuung': 'covered',
      'raum': 'covered',
      'unterricht geändert': 'covered',
      'entfällt': 'dropped',
      'entfälllt': 'dropped'
    }
  
    let $ = cheerio.load(html.replace('&nbsp;', ''))
    let dayTitle, day, current, week
    let newData = {
      date: new Date,
      subs: [[], []]
    }

    $('.mon_title').each(function(i, d) {
      dayTitle = $(d).text()
      week = Number(dayTitle.indexOf('Woche A') === -1)
      day = daysOfWeek.indexOf(daysOfWeek.filter(f => dayTitle.indexOf(f) !== -1)[0])
      $(d).parent().find('tr').each(function(j, e) {
        let header = $(e).find('.inline_header').map(function(k, f) {return f}).get()[0]
        if (header === undefined) {
          let g = $(e).find('td').map(function(k, f) {
            return $(f).text().trim()
          }).get()
          if (g.length == 8 && g[4] && g[4] != '') {
            let hrs = []
            let parts = g[1].split(' - ')
            if (parts.length > 1) {
              for (let i = Number(parts[0]); i <= Number(parts[1]); i++) {
                hrs.push(i)
              }
            } else {
              hrs.push(Number(g[1]))
            }
            for (let hr of hrs) {
              let data = {
                group: g[0],
                teacher: g[2],
                subject: g[4],
                newSubject: g[3],
                newRoom: g[7],
                type: types[g[6].toLowerCase()],
                text: g[5]
              }
              if (!Array.isArray(newData.subs[week][hr])) {
                newData.subs[week][hr] = []
              }
              if (!Array.isArray(newData.subs[week][hr][day])) {
                newData.subs[week][hr][day] = []
              }
              newData.subs[week][hr][day].push(data)
            }
          }
	}
      })
    })
    for (let week = 0; week < newData.subs.length; week++) {
      for (let hr = 0; hr < newData.subs[week].length; hr++) {
        if (!Array.isArray(newData.subs[week][hr])) {
          newData.subs[week][hr] = []
        }
        for (let day = 0; day < newData.subs[week][hr].length; day++) {
          if (!Array.isArray(newData.subs[week][hr][day])) {
            newData.subs[week][hr][day] = []
          }
        }
      }
    }

    return newData
  }

  encodeDsb(data) {
    return new Buffer(zlib.gzipSync(JSON.stringify(data))).toString('base64')
  }

  decodeDsb(data) {
    return JSON.parse(zlib.gunzipSync(new Buffer(data, 'base64')))
  }

  async readDataFromDisk() {
    let data
    try {
      data = JSON.parse(await readFile('./subs.json'))
    } catch (err) {}

    if (!data || !data.date || new Date() - new Date(data.date) > 300 * 1000) {
      this.retrieveData()
    } else {
      this.data = data
      setTimeout(this.retrieveData.bind(this), 300 * 1000 - (new Date() - new Date(data.date)))
    }
  }

  async writeDataToDisk() {
    try {
      let fd = await open('./subs.json.tmp', 'w')
      await write(fd, JSON.stringify(this.data))
      await fsync(fd)
      await close(fd)
      await rename('./subs.json.tmp', './subs.json')
    } catch (err) {}
  }
}
