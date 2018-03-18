'use strict';

const _ = require('lodash');

module.exports = (server, pParser, dParser) => {
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
			let data = _.cloneDeep(pParser.data.tables[query.name]);
			let type = query.name.split(' ')[0];
			if (type === 'Schüler/in') {
				let group = query.name.split('(')[1].split('-')[0];
				let subs = _.cloneDeep(dParser.data.subs.filter(n => n[0] === group));
				subs.forEach((sub) => {
					let d = _.get(data, [sub[7], sub[8] - 1, sub[9]]);
					if (!d || Array.isArray(d)) return;
					let plan = d.split(' ');
					if (plan[1] === sub[2] || plan[2] === sub[1]) {
						d = [ d ];
						if (plan[5] === 'covered') {
							// plan[3] = '<span class="strike">' + plan[3] + '</span>'
							plan[3] = sub[4];
							d[0] = plan.join(' ');
						}
						if (sub[6]) d[0] +=  ' (' + sub[6] + ')';
						d.push(sub[5]);
						data[sub[7]][sub[8] - 1][sub[9]] = d;
					}
				})
			}
			data.forEach((week) => {
				week.forEach((hour) => {
					for (let d in hour) {
						if (hour[d] === '') continue;
						let plan;

						if (Array.isArray(hour[d])) {
							plan = hour[d][0].split(' ');
						} else {
							plan = hour[d].split(' ');
						}

						let text = [plan[1].split('-')[0], plan[2], plan[3]].join(' ');

						if (Array.isArray(hour[d])) {
							hour[d][0] = text;
						} else {
							hour[d] = text;
						}
					}
				});
			});
			planCache[query.name] = JSON.stringify({
				t: data,
				d: new Date()
			});
			setTimeout(() => {
				delete planCache[query.name];
			}, 10000);
		}

		res.end(planCache[query.name]);
	});

	server.route('GET /v3/plan.json', (req, res, query) => {
		res.writeHead(200, {
			'ContentType': 'application/json; charset=UTF-8'
		});

		if (!query.name || !pParser.data.tables[query.name]) {
			res.end('[]');
			return;
		}

		if (!(query.name in planCache)) {
			let rawData = _.cloneDeep(pParser.data.tables[query.name]);
			let data = {};
			for (let week in rawData) {
				let newIndex = String.fromCharCode(Number(week) + 'A'.charCodeAt(0));
				data[newIndex] = rawData[week];
			}
			for (let wid in data) {
				let week = data[wid];
				week.forEach((hour) => {
					for (let d in hour) {
						let text = '';

						if (hour[d] !== '') {
							let plan = hour[d].split(' ');
							text = [plan[1].split('-')[0], plan[2], plan[3]].join(' ')
						}

						hour[d] = {
							text: text
						};
					}
				});
				data[wid] = _.flatten(week);

			}
			planCache[query.name] = JSON.stringify({
				tables: data,
				date: new Date()
			});
			setTimeout(() => {
				delete planCache[query.name];
			}, 10000);
		}

		res.end(planCache[query.name]);
	});
};
