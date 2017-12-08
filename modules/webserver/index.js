/*  Copyright (C) 2017 Milan Pässler
    Copyright (C) 2016 HopGlass Server contributors

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>. */

'use strict'

const http = require('http')
const url = require('url')
const util = require('util')
const path = require('path')
const fs = require('fs')
const stat = util.promisify(fs.stat)
const readFile = util.promisify(fs.readFile)

module.exports = class WebServer {

  /**
   * @param dir directory to be served
   */
  constructor(dir) {
    this.index = {}
    this.mimeTypes = {}
    this.dir = dir
    this.initMimeTypes()
  }

  async handleRequest(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')

    let requestUrl = url.parse(req.url, true) // true to get query as object

    let route
    if ((req.method + ' ' + requestUrl.pathname) in this.index) {
      route = req.method + ' ' + requestUrl.pathname
    } else if(requestUrl.pathname in this.index) {
      route = requestUrl.pathname
    }

    if (route) {
      if (req.method === 'POST') {
        let data = ''
        req.on('data', (chunk) => {
          data += chunk;
        })
        req.on('end', () => {
          this.index[route].forEach(f => res.finished || f(req, res, requestUrl.query, data))
        })
      } else {
        this.index[route].forEach(f => res.finished || f(req, res, requestUrl.query))
      }
    } else if (req.method === 'GET') {
      let filePath = this.dir + requestUrl.pathname

      let stats
      try {
        stats = await stat(filePath)
      } catch(err) {}

      if (stats && stats.isDirectory()) {
        if (requestUrl.pathname.slice(-1) === '/') {
          filePath += 'index.html'
        } else {
          res.writeHead(301, { 'Location': requestUrl.pathname + '/' })
          res.end()
          return
        }
      }

      let ext = filePath.split('.').pop().toLowerCase()
      let contentType = this.mimeTypes[ext] || 'text/html'

      let content
      try {
        content = await readFile(filePath)
      } catch(err) {}

      if (content) {
        res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' })
        res.end(content)
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('404')
      }
    }
  }

  async initMimeTypes() {
    let mimeTypesFile

    try {
      mimeTypesFile = await readFile(path.dirname(module.filename) + '/mime.types')
    } catch(err) {
      console.error('couldn\'t read mime types from "mime.types": ' + err)
      return
    }

    let numMimeTypes = 0, numExts = 0

    String(mimeTypesFile).split(/[\r\n]+/).forEach((line) => {
      numMimeTypes++
      let elements = line.split(/\s+/)
      let mimeType = elements.shift()
      elements.forEach((ext) => {
        numExts++
        this.mimeTypes[ext] = mimeType
      })
    })

    console.log('parsed ' + numMimeTypes + ' mime types and ' + numExts
        + ' file extensions')
  }

  listen(ipOrPort, port) {
    if (port) [ipOrPort, port] = [port, ipOrPort] // swap variables
    http.createServer(this.handleRequest.bind(this)).listen(ipOrPort, port, () => {
      console.log('webserver listening on port ' + ipOrPort)
    })
    return this
  }

  route(path, func) {
    if (!this.index[path]) this.index[path] = []
    this.index[path].push(func)
  }

  setMimeType(ext, mimeType) {
    this.mimeTypes[ext] = mimeType
  }

  basicAuth(path, user, pass) {
    this.route(path, (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.headers.foo !== user + ':' + pass) {
        res.writeHead(301, { 'Content-Type': 'text/plain' })
        res.end('301')
      }
    })
  }
}

