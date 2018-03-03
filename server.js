#!/usr/bin/node

'use strict';

// global.debug = true

const PlaninfoParser = require('./modules/parsers/planinfo');
const DsbParser = require('./modules/parsers/dsb');
const WebServer = require('./modules/webserver');
const _ = require('lodash');

const pParser = new PlaninfoParser();
const dParser = new DsbParser();
const server = new WebServer(global.debug ? './dev' : './dist').listen(8080);

server.route('GET /subs.json', (req, res, query) => {
	if (!query.group) {
		res.writeHead(400, {
			'ContentType': 'text/plain; charset=UTF-8'
		});
		return res.end('400 invalid request: missing query parameter group');
	} else {
		res.writeHead(200, {
			'ContentType': 'application/json; charset=UTF-8'
		});
		res.end(JSON.stringify({
			date: dParser.data.date,
			subs: dParser.data.subs.filter(n => n[0] === query.group)
		}));
	}
});

server.route('GET /plan.json', (req, res, query) => {
	res.writeHead(200, {
		'ContentType': 'application/json; charset=UTF-8'
	});
	let filteredTables = {};
	if (query.name) {
		Object.keys(pParser.data.tables).forEach((n) => {
			if (n.toLowerCase().includes(query.name.toLowerCase())) filteredTables[n] = pParser.data.tables[n];
		});
	}
	if (Object.keys(filteredTables).length > 1) {
		filteredTables = [];
	}
	res.end(JSON.stringify({
		date: pParser.data.date,
		tables: query.name ? filteredTables : pParser.data.tables
	}));
});

server.route('GET /names.json', (req, res, query) => {
	res.writeHead(200, {
		'ContentType': 'application/json; charset=UTF-8'
	});
	let filteredNames;
	if (query.name) {
		filteredNames = Object.keys(pParser.data.tables).filter(n => n.toLowerCase().includes(query.name.toLowerCase()));
	} else {
		filteredNames = Object.keys(pParser.data.tables);
	}
	if (filteredNames.length > 20) {
		filteredNames = [];
	}
	res.end(JSON.stringify({
		date: pParser.data.date,
		names: filteredNames
	}));
});

server.route('GET /plan.json', (req, res, query) => {
	res.writeHead(200, {
		'ContentType': 'application/json; charset=UTF-8'
	});
	let filteredTables = {};
	if (query.name) {
		Object.keys(pParser.data.tables).forEach((n) => {
			if (n.toLowerCase().includes(query.name.toLowerCase())) filteredTables[n] = pParser.data.tables[n];
		});
	}
	res.end(JSON.stringify({
		date: pParser.data.date,
		tables: query.name ? filteredTables : pParser.data.tables
	}));
});

let planCache = {};

server.route('GET /v2/plan.json', (req, res, query) => {
	res.writeHead(200, {
		'ContentType': 'application/json; charset=UTF-8'
	});

	if (!query.name || !pParser.data.tables[query.name]) {
		res.end('[]');
		return;
	}

	if (!(query.name in planCache)) {
		let data = [[], []];
		let src = pParser.data.tables[query.name];
		for (let w = 0; w < src.length; w++) {
			let max = 0;
			for (let i in src[w]) {
				for (let j in src[w][i]) {
					if (src[w][i][j] !== '' && i > max) max = i;
				}
			}

			for (let i = 0; i <= max; i++) {
				data[w][i] = [];
				for (let j = 0; j < src[w][i].length; j++) {
					data[w][i][j] = src[w][i][j];
				}
			}
		}

		let group = query.name.split('(')[1].split('-')[0];
		let subs = dParser.data.subs.filter(n => n[0] === group);
		subs.forEach((sub) => {
			let d = _.get(data, [sub[7], sub[8] - 1, sub[9]]);
			if (!d) return;
			let plan = d.split(' ');
			if (plan[1] === sub[2] || plan[2] === sub[1]) {
				d = [ d ];
				if (plan[5] === 'covered') {
					plan[3] = '<span class="strike">' + plan[3] + '</span>'
					d[0] = plan.join(' ') + ' ' + sub[4];
				}
				if (subs[6]) d[0] +=  ' (' + sub[6] + ')';
				d.push(sub[5]);
				data[sub[7]][sub[8] - 1][sub[9]] = d;
			}
		})
		planCache[query.name] = JSON.stringify(data);
		setTimeout(() => {
			delete planCache[query.name];
		}, 10000);
	}

	res.end(planCache[query.name]);
});

