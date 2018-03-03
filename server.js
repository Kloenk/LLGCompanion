#!/usr/bin/node

'use strict';

// global.debug = true

const PlaninfoParser = require('./modules/parsers/planinfo');
const DsbParser = require('./modules/parsers/dsb');
const WebServer = require('./modules/webserver');

const pParser = new PlaninfoParser();
const dParser = new DsbParser();
const server = new WebServer(global.debug ? './dev' : './dist');

require('./modules/routes')(server, pParser, dParser);

const startServer = async () => {
	console.log('loading data');
	await pParser.readDataFromDisk();
	await dParser.readDataFromDisk();
	server.listen(8080);
}

startServer();

