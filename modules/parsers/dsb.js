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

    let untisHtml = await stdutil.get(untisUrl)
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
    let $ = cheerio.load(html)
    let day, current
    let newData = {
      date: new Date,
      table: {}
    }
    $('.mon_title').each(function(i, d) {
      day = $(d).text()
      newData.table[day] = {}
      $(d).parent().find('tr').each(function(j, e) {
        let header = $(e).find('.inline_header').map(function(k, f) {return f}).get()[0]
        if (header !== undefined) {
          current = $(header).text()
          if (!current) { current = null; return }
          newData.table[day][current] = []
        } else if (day && current && newData.table[day] && newData.table[day][current]) {
          let g = $(e).find('td').map(function(k, f) {
            return $(f).text()
          }).get()
          if (g.length == 8) newData.table[day][current].push(g)
        }
      })
    })
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
