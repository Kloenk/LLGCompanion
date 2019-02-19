#!/usr/bin/node

'use strict';

const config = require('./config.json');
global.debug = config.debug;

const fs = require('fs');
const PlaninfoParser = require('./modules/parsers/planinfo');
const DsbParser = require('./modules/parsers/dsb');
const WebServer = require('./modules/webserver');
const UserAuth = require('./modules/users');

const pParser = new PlaninfoParser(config.planinfo);
const dParser = new DsbParser(config.dsb);
const server = new WebServer(global.debug ? './dev' : './dist');
const users = new UserAuth();

require('./modules/routes')(server, pParser, dParser, users);

function loadUsers () {
	users.users = require('./users.json');
	fs.readFile(global.debug ? './dev/login-ok.html' : './dist/login-ok.html', 'utf8', function (err, data) {
		if (err) {
			users.html = 'server error';
			console.log(err);
			return;
		}
		users.html = data;
	});
	fs.readFile(global.debug ? './dev/login-failed.html' : './dist/login-failed.html', 'utf8', function (err, data) {
		if (err) {
			users.html = 'server error';
			console.log(err);
			return;
		}
		users.html = data;
	});
}

const startServer = async () => {
	console.log('loading data');
	await dParser.readDataFromDisk();
	await loadUsers();
	server.listen(config.listenPort);
};

startServer();
