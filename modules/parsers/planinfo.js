'use strict';

const cheerio = require('cheerio');
const stdutil = require('../stdutil');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const write = util.promisify(fs.write);
const fsync = util.promisify(fs.fsync);
const close = util.promisify(fs.close);
const open = util.promisify(fs.open);
const rename = util.promisify(fs.rename);

module.exports = class PlaninfoParser {
	constructor (config) {
		this.url = config.baseUrl + "?ug=" + config.schoolId;
		this.cookies = config.cookies;
		this.data = {};
	}

	async retrieveData () {
		let newData = {
			date: new Date(),
			tables: {}
		};
		let types = ['S', 'L', 'R', 'K'];
		let ids = [];
		for (let type of types) {
			let listHtml = await stdutil.get(this.url + '&artwahl=' + type, 'utf-8', this.cookies);
			let $ = cheerio.load(listHtml);
			$('#objektwahl').children().each((i, o) => {
				if (o.attribs.value >= 0) {
					if (type === 'K') {
						ids.push(o.attribs.value + '&wochewahl=A');
						ids.push(o.attribs.value + '&wochewahl=B');
					} else {
						ids.push(o.attribs.value);
					}
				}
			});
		}
		for (let id of ids) {
			await stdutil.sleep(40);
			let pageHtml = await stdutil.get(this.url + '&dbidx=' + id, 'utf-8', this.cookies);
			let pageData = this.parsePlaninfoPage(pageHtml);
			if (!newData.tables[pageData.name]) newData.tables[pageData.name] = [];
			newData.tables[pageData.name] = newData.tables[pageData.name].concat(pageData.tables);
		}
		this.data = newData;
		await this.writeDataToDisk();
		setTimeout(this.retrieveData.bind(this), 24 * 3600 * 1000);
	}

	parsePlaninfoPage (html) {
		let $ = cheerio.load(html);
		let tables = $('table.plan tbody').get().map((t) => {
			return $(t).find('tr').get().map((tr) => {
				return $(tr).find('td').get().map((td) => {
					return $(td).text();
				});
			});
		});

		// remove padding empty rows
		tables.forEach((t) => {
			// iterate backwards
			for (let i = t.length - 1; i > 0; i--) {
				if (!t.length || t[i].every(i => i === '')) {
					t.splice(i, 1);
				} else {
					break;
				}
			}
		});

		let pageData;
		$('th.titel').eq(0).text().replace(/^([AB])-Woche-Stundenplan von (.*)$/, (str, week, name) => {
			pageData = {
				name: name,
				tables: tables
			};
		});
		return pageData;
	}

	async readDataFromDisk () {
		let data;
		try {
			data = JSON.parse(await readFile('./plan.json'));
		} catch (err) {}

		if (data && data.date) {
			this.data = data;
		} else {
			await this.retrieveData();
		}

		if (new Date() - new Date(this.data.date) > 24 * 3600 * 1000) {
			this.retrieveData();
		} else {
			setTimeout(this.retrieveData.bind(this), 24 * 3600 * 1000 - (new Date() - new Date(this.data.date)));
		}
	}

	async writeDataToDisk () {
		try {
			let fd = await open('./plan.json.tmp', 'w');
			await write(fd, JSON.stringify(this.data));
			await fsync(fd);
			await close(fd);
			await rename('./plan.json.tmp', './plan.json');
		} catch (err) {}
	}
};
