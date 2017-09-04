#!/usr/bin/node

"use strict"

const https = require("https")
const http = require("http")
const fs = require("fs")
const cheerio = require("cheerio")

const baseurl = "/* insert planinfo url here */"
const cookies = "/* insert planinfo cookies here */"

let data = {}

function get(url, callback) {
  let options = require("url").parse(url)
  options.headers = {
    Cookie: cookies
  }

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

let count = 0

function updateStatus() {
  let fetched = Object.keys(data).length
  console.log(fetched + " / " + count)
  if (fetched < count) {
    setTimeout(updateStatus, 1000)
  } else {
    try {
      let file = fs.openSync('./.data.json.tmp', 'w')
      fs.writeSync(file, JSON.stringify(data))
      fs.fsyncSync(file)
      fs.closeSync(file)
      fs.renameSync('./.data.json.tmp', './data.json')
    } catch(err) {
      console.error(err)
    }
  }
}

function parsePlaninfo() {
  count = 0
  let types = ["S", "L"]
  types.forEach((type) => {
    get(baseurl + "artwahl=" + type, (res) => {
      let $ = cheerio.load(res)
      $("#objektwahl").children().each((i, o) => {
        if (o.attribs.value < 0) return
        count++
        get(baseurl + "dbidx=" + o.attribs.value, (res) => {
          let $ = cheerio.load(res)
          let tables = $("table.plan tbody").get().map((t) => {
            return $(t).find("tr").get().map((tr) => {
              return $(tr).find("td").get().map((td) => {
                return $(td).text()
              })
            })
          })
          $(".onlyprint th.titel").text().replace(/^([AB])-Woche-Stundenplan von (.*)$/, (str, week, name) => {
            data[name] = tables
          })
        })
      })
    })
  })
  setTimeout(updateStatus, 1000)
}

parsePlaninfo()

