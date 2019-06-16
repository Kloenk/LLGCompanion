#!/usr/bin/env node

'use strict';

// parse arguments
const yargs = require('yargs');

const argv = yargs
	.option('config', {
		alias: 'c',
		description: 'set configuration file',
		type: 'string',
	})
	.option('users', {
		alias: 'u',
		description: 'set the users file',
		type: 'string',
	})
	.option('subs', {
		alias: 's',
		description: 'set subs.json file',
		type: 'string',
	})
	.help()
	.alias('help', 'h')
	.alias('version', 'v')
	.argv;

// actual server

const config = require((argv.config == undefined) ? './config.json' : argv.config);
global.debug = config.debug;

config.dsb.file = (argv.subs == undefined) ? './subs.json' : argv.subs;

const fs = require('fs');
const PlaninfoParser = require('./modules/parsers/planinfo');
const DsbParser = require('./modules/parsers/dsb');
const WebServer = require('./modules/webserver');
const UserAuth = require('./modules/users');

const pParser = new PlaninfoParser(config.planinfo);
const dParser = new DsbParser(config.dsb);
const server = new WebServer(global.debug ? './dev' : './dist');
const users = new UserAuth();

require('./modules/routes')(server, pParser, dParser, users, config);

function loadUsers () {
	users.users = require((argv.users == undefined) ? './users.json' : argv.users);
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
			users.htmlFailed = 'server error';
			console.log(err);
			return;
		}
		users.htmlFailed = data;
	});
}

const startServer = async () => {
	console.log('loading data');
	await dParser.readDataFromDisk();
	loadUsers();
	server.listen(config.listenPort);
};

startServer();
