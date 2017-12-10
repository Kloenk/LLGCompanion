#!/usr/bin/node

'use strict'

global.debug = true

const PlaninfoParser = require('./modules/parsers/planinfo')
const DsbParser = require('./modules/parsers/dsb')
const WebServer = require('./modules/webserver')

const pParser = new PlaninfoParser()
const dParser = new DsbParser()
const server = new WebServer(global.debug ? './dev' : './dist').listen(8080)

server.route('GET /subs.json', (req, res) => {
  res.writeHead(200, {'ContentType': 'application/json; charset=UTF-8'})
  res.end(JSON.stringify(dParser.data))
})

server.route('GET /plan.json', (req, res, query) => {
  res.writeHead(200, {'ContentType': 'application/json; charset=UTF-8'})
  let filteredTables = {}
  if (query.name) {
    Object.keys(pParser.data.tables).forEach((n) => {
      if (n.toLowerCase().includes(query.name.toLowerCase())) filteredTables[n] = pParser.data.tables[n]
    })
  }
  res.end(JSON.stringify({
    date: pParser.data.date,
    tables: query.name ? filteredTables : pParser.data.tables
  }))
})

server.route('GET /names.json', (req, res, query) => {
  res.writeHead(200, {'ContentType': 'application/json; charset=UTF-8'})
  let filteredNames
  if (query.name) {
    filteredNames = Object.keys(pParser.data.tables).filter(n => n.toLowerCase().includes(query.name.toLowerCase()))
  } else {
    filteredNames = Object.keys(pParser.data.tables)
  }
  if (filteredNames.length > 20) {
    filteredNames = []
  }
  res.end(JSON.stringify({
    date: pParser.data.date,
    names: filteredNames
  }))
})
