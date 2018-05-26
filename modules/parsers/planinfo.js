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
	}

	async retrieveNames (name) {
		let html = await stdutil.get(this.url + '&search=' + name, 'utf-8', this.cookies);
		let $ = cheerio.load(html);
		let options = $('#objektwahl optgroup');
		if (options.length) {
			return $('#objektwahl optgroup').children().get().map((o) => {
				return {
					id: o.attribs.value,
					name: $($(o)[0].children[0]).text()
				}
			}).filter(o => o.id >= 0).map(o => o.name);
		} else {
			let name = $('th.titel img').attr('title');
			if (name) return [ name ];
			return [];
		}
	}

	async retrievePlan (name) {
		let names = name.split(' ');
		if (names.length < 4) return [];
		let course = names[names.length - 1];
		course = course.slice(1, course.length-1);
		name = [ names[names.length - 2], names[1].slice(0, 3) ].join('') + '.' + course;

		let html = await stdutil.get(this.url + '&search=' + name, 'utf-8', this.cookies);
		let data = this.parsePlaninfoPage(html);
		return data.tables;
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

		let name = $('th.titel img').attr('title');
		let pageData = {
			name: name,
			tables: tables
		};
		return pageData;
	}
};
