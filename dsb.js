#!/usr/bin/node

const zlib = require('zlib')
const https = require('https')
const cheerio = require('cheerio')

function encode(data) {
  return new Buffer(zlib.gzipSync(JSON.stringify(data))).toString('base64')
}

function decode(data) {
  return JSON.parse(zlib.gunzipSync(new Buffer(data, 'base64')))
}

function payload() {
  return JSON.stringify({
    "req": {
      "Data": encode({
        "AppId": "",
        "PushId": "",
        "UserId": "/* insert dsbmobile userid here */",
        "UserPw": "/* insert dsbmobile password here */",
        "AppVersion": "0.8",
        "Device": "WebApp",
        "OsVersion": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.71 Safari/537.36",
        "Language": "de",
        "Date": new Date(),
        "LastUpdate": new Date(),
        "BundleId": "de.heinekingmedia.inhouse.dsbmobile.web"
      }),
      "DataType": 1
    }
  })
}

function post(url, payload, callback) {
  let options = require('url').parse(url)
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
  options.method = 'POST'

  let data = ""

  https.request(options, (res) => {
    res.setEncoding("UTF-8")
    res.on("data", (chunk) => {
      data += chunk
    })
    res.on("end", () => {
      callback(data)
    })
  }).end(payload)
}

function get(url, callback) {
  let options = require("url").parse(url)

  let data = ""

  https.request(options, (res) => {
    res.setEncoding("latin1")
    res.on("data", (chunk) => {
      data += chunk
    })
    res.on("end", () => {
      callback(data)
    })
  }).end()
}

post("https://app.dsbcontrol.de/JsonHandlerWeb.ashx/GetData", payload(), function(res) {
  let url = decode(JSON.parse(res).d).ResultMenuItems[0].Childs[0].Root.Childs[0].Childs[0].Detail
  get(url, function(res) {
    let $ = cheerio.load(res)
    console.log(res)
  })
})

