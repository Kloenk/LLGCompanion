'use strict';

const https = require('https');

module.exports = {

	post: function post (url, payload, cookie) {
		if (global.debug) console.log('DEBUG: POST ' + url);
		return new Promise((resolve, reject) => {
			let options = require('url').parse(url);
			options.headers = {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
				'Bundle_ID': 'de.heinekingmedia.inhouse.dsbmobile.web',
				'Content-Type': 'application/json;charset=UTF-8',
				'Content-Length': Buffer.byteLength(payload),
				'X-Requested-With': 'XMLHttpRequest',
				'Origin': 'https://www.dsbmobile.de',
				'Host': 'www.dsbmobile.de',
				'Accept-Encoding': 'gzip, deflate, br',
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Referer': 'https://www.dsbmobile.de/default.aspx'
			};

			if (cookie) {
				options.headers.Cookie = cookie;
			}

			options.method = 'POST';

			let data = '';

			https.request(options, (res, err) => {
				if (err) return reject(err);
				let c = 0;

				res.setEncoding('UTF-8');
				res.on('data', (chunk) => {
					if (global.debug) console.log('DEBUG: POST ' + url + ' chunk ' + c++);
					data += chunk;
				});
				res.on('error', (err) => {
					reject(err);
				});
				res.on('end', () => {
					if (global.debug) console.log('DEBUG: POST ' + url + ' end');
					resolve(data);
				});
			}).end(payload);
		});
	},

	get: function get (url, encoding, cookie) {
		if (global.debug) console.log('DEBUG: GET ' + url + ' start');
		return new Promise((resolve, reject) => {
			let options = require('url').parse(url);
			options.method = 'GET';

			if (cookie) {
				options.headers = {
					Cookie: cookie
				};
			}

			let data = '';

			https.request(options, (res, err) => {
				if (err) return reject(err);
				let c = 0;

				res.setEncoding(encoding);
				res.on('data', (chunk) => {
					if (global.debug) console.log('DEBUG: GET ' + url + ' chunk ' + c++);
					data += chunk;
				});
				res.on('error', (err) => {
					reject(err);
				});
				res.on('end', () => {
					if (global.debug) console.log('DEBUG: GET ' + url + ' end');
					resolve(data);
				});
			}).end();
		});
	},

	sleep: function sleep (time) {
		return new Promise((resolve) => {
			setTimeout(resolve, time);
		});
	}
};
