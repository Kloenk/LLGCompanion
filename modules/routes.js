'use strict';

const jwt = require('jsonwebtoken');
const _ = require('lodash');

function createJwtPayload (username) {
	return {
		'sub': 'auth',
		'name': username,
		'iat': Date.now()
	};
}

module.exports = (server, pParser, dParser, users, config) => {
	server.route('GET /subs.json', (req, res, query) => {
		if (!validateCookie(req.headers.cookie, config.html.secret)) {
			res.writeHead(401, {
				'ContentType': 'text/plain; charset=UTF-8'
			});
			return res.end('401 invalid access token');
		}
		if (!query.group) {
			res.writeHead(400, {
				'ContentType': 'text/plain; charset=UTF-8'
			});
			return res.end('400 invalid request: missing query parameter group');
		} else {
			res.writeHead(200, {
				'ContentType': 'application/json; charset=UTF-8'
			});
			if (query.group.startsWith('EF')) {
				query.group = 'EF';   // this is used to strip the class information, because subs doesn't use it
			}
			res.end(JSON.stringify({
				date: dParser.data.date,
				subs: dParser.data.subs.filter(n => n[0] === query.group)
			}));
		}
	});

	server.route('POST /login-callback.html', (req, res, query, data) => {
		var body = getJsonFromData(data);
		console.log(body);
		if (!body.username && !body.pass) {
			res.writeHead(400, {
				'ContentType': 'text/plain; charset=UTF-8'
			});
			return res.end('400 invalid request: missing username/password');
		}
		if (users.check(body.username, body.pass)) {
			const token = jwt.sign(createJwtPayload(body.username), config.html.secret);
			res.writeHead(200, {
				'ContentType': 'text/html; charset=UTF-8',
				'Set-Cookie': 'auth=' + token + '; Max-Age=7776000',
				'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			});
			if (global.debug) {
				console.log('DEBUG: writing cookie ' + token);
			}
			return res.end(users.html);
		} else {
			res.writeHead(423, {
				'ContentType': 'text/html; charset=UTF-8'
			});
			return res.end(users.htmlFailed);
		}
	});

	server.route('GET /plan.json', (req, res, query) => {
		if (!validateCookie(req.headers.cookie, config.html.secret)) {
			res.writeHead(401, {
				'ContentType': 'text/plain; charset=UTF-8'
			});
			return res.end('401 invalid access token');
		}
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

	server.route('GET /check', (req, res, query) => {
		if (!validateCookie(req.headers.cookie, config.html.secret)) {
			res.writeHead(401, {
				'ContentType': 'text/plain; charset=UTF-8',
				'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			});
			return res.end('401 invalid access token');
		} else {
			res.writeHead(200, {
				'ContentType': 'text/plain; charset=UTF-8',
				'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			});
			return res.end('200 access token valid');
		}
	});

	server.route('GET /names.json', (req, res, query) => {
		if (!validateCookie(req.headers.cookie, config.html.secret)) {
			res.writeHead(401, {
				'ContentType': 'text/plain; charset=UTF-8'
			});
			return res.end('401 invalid access token');
		}
		res.writeHead(200, {
			'ContentType': 'application/json; charset=UTF-8'
		});
		if (query.name) {
			pParser.retrieveNames(query.name).then((names) => {
				res.end(JSON.stringify({
					date: new Date(),
					names: names.filter(name => name.startsWith('Schüler/in '))
				}));
			});
		} else {
			res.end(JSON.stringify({
				date: new Date(),
				names: []
			}));
		}
	});

	server.route('GET /v2/plan.json', (req, res, query) => {
		if (!validateCookie(req.headers.cookie, config.html.secret)) {
			res.writeHead(401, {
				'ContentType': 'text/plain; charset=UTF-8'
			});
			return res.end('401 invalid access token');
		}
		console.log(req.headers.cookie);
		res.writeHead(200, {
			'ContentType': 'application/json; charset=UTF-8'
		});

		if (!query.name) {
			res.end('[]');
			return;
		}

		pParser.retrievePlan(query.name).then((data) => {
			let type = query.name.split(' ')[0];
			if (type === 'Schüler/in') {
				let group = query.name.split('(')[1].split('-')[0];
				if (group.startsWith('EF')) {
					group = 'EF';	// this is used to strip the class information, because subs doesn't use it
				}
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
			res.end(JSON.stringify({
				t: data,
				d: new Date()
			}));
		});
	});

	server.route('GET /v3/plan.json', (req, res, query) => {
		if (!validateCookie(req.headers.cookie, config.html.secret)) {
			res.writeHead(401, {
				'ContentType': 'text/plain; charset=UTF-8'
			});
			return res.end('401 invalid access token');
		}
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

function validateCookie (cookie, secret) {
	if (cookie === undefined) {
		return false;
	}
	var cookies = splitCookie(cookie);
	return validate(cookies.auth, secret);
}

function splitCookie (cookie) {
	var list = {};

	cookie.split(';').forEach(function (line) {
		var parts = line.split('=');
		list[parts.shift().trim()] = decodeURI(parts.join('='));
	});

	return list;
}

function validate (token, secret) {
	try {
		var data = jwt.verify(token, secret);
		if (global.debug) {
			console.log('DEBUG: user authenticated: ' + data.name);
		}
		return true;
	} catch (e) {
		if (global.debug) {
			console.log('DEBUG: token invalid ' + token);
		}
		return false;
	}
}

function getJsonFromData (query) {
	var result = {};
	query.split('&').forEach(function (part) {
		var item = part.split('=');
		result[item[0]] = decodeURIComponent(item[1]);
	});
	return result;
}
