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
	constructor (cookie) {
		this.baseurl = "/* insert planinfo url here */";
		this.cookies = "/* insert planinfo cookies here */";
		this.data = {};
		this.readDataFromDisk();
	}

	async retrieveData () {
		let newData = {
			date: new Date(),
			tables: {}
		};
		let types = ['S', 'L'];
		let ids = [];
		for (let type of types) {
			let listHtml = await stdutil.get(this.baseurl + 'artwahl=' + type, 'utf-8', this.cookie);
			let $ = cheerio.load(listHtml);
			$('#objektwahl').children().each((i, o) => {
				if (o.attribs.value >= 0) ids.push(o.attribs.value);
			});
		}
		for (let id of ids) {
			await stdutil.sleep(40);
			let pageHtml = await stdutil.get(this.baseurl + 'dbidx=' + id, 'utf-8', this.cookie);
			let pageData = this.parsePlaninfoPage(pageHtml);
			newData.tables[pageData.name] = pageData.tables;
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

		if (!data || !data.date || new Date() - new Date(data.date) > 24 * 3600 * 1000) {
			this.retrieveData();
		} else {
			this.data = data;
			setTimeout(this.retrieveData.bind(this), 24 * 3600 * 1000 - (new Date() - new Date(data.date)));
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
