#!/usr/bin/node

'use strict';

const config = require('./config.json');
global.debug = config.debug;

const PlaninfoParser = require('./modules/parsers/planinfo');
const DsbParser = require('./modules/parsers/dsb');
const WebServer = require('./modules/webserver');

const pParser = new PlaninfoParser(config.planinfo);
const dParser = new DsbParser(config.dsb);
const server = new WebServer(global.debug ? './dev' : './dist');

require('./modules/routes')(server, pParser, dParser);

const startServer = async () => {
	console.log('loading data');
	await dParser.readDataFromDisk();
	server.listen(config.listenPort);
}

startServer();

