'use strict';

import { render, html } from 'lit-html';

/* fck jqry */

const id = document.getElementById.bind(document);

/* definitions */
// allow for better uglifying

const body = document.body;
const localStorage = window.localStorage;
const sw = navigator.serviceWorker;
const search = id('search');

/* variables */

let weekShift = 0;

/* actions */

search.value = localStorage.getItem('selected');

if (body.classList.contains('nd')) {
	if (search.value) {
		fetchPlan();
	} else {
		search.focus();
	}
} else {
	highlights();
	// The plan is already rendered
	// Request the plan to initialize an update
	// The result will not be processed, it contains the data from cache that is
	// already rendered. It will be returned via a message from the sw when it is
	// ready.
	fetch('v2/plan.json?name=' + search.value);
}

if (!navigator.onLine) body.classList.add('o');

/* events */

addEvent(id('clear'), 'click', function clear () {
	search.value = '';
	search.focus();
});

addEvent(id('searchicon'), 'click', function clear () {
	search.focus();
});

addEvent(search, 'blur', function () {
	body.classList.remove('typing');
});

addEvent(window, 'online', function () {
	body.classList.remove('o');
});

addEvent(window, 'offline', function () {
	body.classList.add('o');
});

addEvent(window, 'focus', function () {
	if (search.value) {
		fetch('v2/plan.json?name=' + search.value);
	}
});

addEvent(id('lastweek'), 'click', function () {
	weekShift++;
	highlights();
});

addEvent(id('nextweek'), 'click', function () {
	weekShift++;
	highlights();
});

/* functions */

function highlights () {
	let date = new Date();
	date.setHours(date.getHours() + 8);
	if (date.getDay() === 6) date.setHours(date.getHours() + 24);
	if (date.getDay() === 0) date.setHours(date.getHours() + 24);
	let onejan = new Date(date.getFullYear(), 0, 1);
	let week =
		Math.ceil(((date - onejan) / 86400000 + onejan.getDay() + 1) / 7) % 2;
	let day = date.getDay() - 1;
	/*id('table-' + week).childNodes.forEach(function (child) {
		console.log(child);
		child.childNodes[day + 1].classList.add('today');
	});*/
	date.setDate(date.getDate() + weekShift * 7);
	onejan = new Date(date.getFullYear(), 0, 1);
	week = Math.ceil(((date - onejan) / 86400000 + onejan.getDay() + 1) / 7) % 2;
	id('p' + week).classList.add('tw');
	id('p' + (week + 1) % 2).classList.remove('tw');
}

function renderPlan (data) {
	render(html`
		<div id="spacer"></div>
		${data.map((week) => {
			let wid = data.indexOf(week);
								console.log(week);
			return html`
				<div id="p${wid}" class="p">
					<h4 id="title-${wid}">Woche ${wid}</h4>
					<table class="centered striped card">
						<tbody id="table-${wid}">
							<tr><th class="hour"></th><th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th></tr>
							${week.map((hour) => {
								let hid = week.indexOf(hour);
								return html`
									<tr>
										<td class="hour">${hid + 1}</td>
										${hour.map((day) => {
											return html`
												<td>${day}</td>
											`;
										})}
									</tr>
								`;
							})}
						</tbody>
					</table>
				</div>
			`;
		})}
		<footer>
			<span>Version __GIT_REVISION | Stundenplan zuletzt aktualisiert am ${formatDate(new Date(data.date))} | <a href="https://pbb.lc/">Impressum</a></span>
		</footer>
	`, id('content'));

	search.blur();
	body.classList.remove('nd');
	id('ac-ss').innerHTML = '';
	if (sw && sw.controller) {
		sw.controller.postMessage(
			JSON.stringify({
				type: 'prerender',
				content: document.documentElement.outerHTML
			})
		);
	}

	highlights();
}

function pad (string, amount) {
	return (
		Array(amount)
			.join('0')
			.substr(0, amount - String(string).length) + string
	);
}

function formatDate (date) {
	return (
		'' +
		pad(date.getDate(), 2) +
		'.' +
		pad(date.getMonth() + 1, 2) +
		'.' +
		date.getFullYear() +
		' um ' +
		date.getHours() +
		':' +
		pad(date.getMinutes(), 2) +
		' Uhr'
	);
}

function addEvent (el, type, handler) {
	el.addEventListener(type, handler);
}

function source (val, suggest) {
	fetch('names.json?name=' + val)
		.then(function (resp) {
			return resp.json();
		})
		.then(function (data) {
			suggest(data.names);
		});
}

function renderItem (item, search) {
	// escape special characters
	search = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
	let re = new RegExp('(' + search.split(' ').join('|') + ')', 'gi');
	return (
		'<div class="ac-s" data-val="' +
		item +
		'">' +
		item.replace(re, '<span class="hl">$1</span>') +
		'</div>'
	);
}

function onSelect (e, term, item) {
	body.classList.remove('typing');
	search.value = term;
	localStorage.setItem('selected', search.value);
	fetchPlan();
}

function fetchPlan () {
	fetch('v2/plan.json?name=' + search.value)
		.then(function (resp) {
			return resp.json();
		})
		.then(function (data) {
			renderPlan(data);
		});
}

/*
	Based on JavaScript autoComplete v1.0.4
	Copyright (c) 2014 Simon Steinberger / Pixabay
	Copyright (c) 2017-2018 PetaByteBoy
	GitHub: https://github.com/Pixabay/JavaScript-autoComplete
	License: http://www.opensource.org/licenses/mit-license.php
*/

function addEventToSuggestions (event, cb) {
	addEvent(id('ac-ss'), event, function (e) {
		let found;
		let el = e.target || e.srcElement;
		while (el && !(found = el.classList.contains('ac-s'))) { el = el.parentElement; }
		if (found) cb.call(el, e);
	});
}

search.last_val = '';
body.appendChild(id('ac-ss'));

addEventToSuggestions('mouseleave', function (e) {
	let sel = id('ac-ss').querySelector('.ac-s.s');
	if (sel) {
		setTimeout(function () {
			sel.classList.remove('s');
		}, 20);
	}
});

addEventToSuggestions('mouseover', function (e) {
	let sel = id('ac-ss').querySelector('.ac-s.s');
	if (sel) sel.classList.remove('s');
	this.classList.add('s');
});

addEventToSuggestions('mousedown', function (e) {
	if (this.classList.contains('ac-s')) {
		// else outside click
		let v = this.getAttribute('data-val');
		search.value = v;
		onSelect(e, v, this);
	}
});

function suggest (data) {
	let val = search.value;
	if (data.length && val.length > 2) {
		let s = '';
		for (let i = 0; i < data.length; i++) s += renderItem(data[i], val);
		id('ac-ss').innerHTML = s;
		body.classList.add('typing');
	} else id('ac-ss').innerHTML = '';
}

addEvent(search, 'keydown', function (e) {
	let key = window.event ? e.keyCode : e.which;
	// down (40), up (38)
	if (key === 9) {
		e.preventDefault();
		key = 40;
	}
	if ((key === 40 || key === 38) && id('ac-ss').innerHTML) {
		let next;
		let sel = id('ac-ss').querySelector('.ac-s.s');
		if (!sel) {
			next =
				key === 40
					? id('ac-ss').querySelector('.ac-s')
					: id('ac-ss').childNodes[id('ac-ss').childNodes.length - 1]; // first : last
			next.classList.add('s');
		} else {
			next = key === 40 ? sel.nextSibling : sel.previousSibling;
			if (next) {
				sel.classList.remove('s');
				next.classList.add('s');
			} else {
				sel.classList.remove('s');
				search.value = search.last_val;
				next = 0;
			}
		}
		body.classList.add('typing');

		return false;
	} else if (key === 27) {
		// esc
		search.value = search.last_val;
		search.blur();
	} else if (key === 13 || key === 9) {
		// enter
		if (body.classList.contains('typing')) {
			let sel = id('ac-ss').querySelector('.ac-s.s') || id('ac-ss').firstChild;
			onSelect(e, sel.getAttribute('data-val'), sel);
		}
	}
});

addEvent(search, 'keyup', function (e) {
	let key = window.event ? e.keyCode : e.which;
	if (!key || ((key < 35 || key > 40) && key !== 13 && key !== 27)) {
		let val = search.value;
		if (val.length > 2) {
			if (val !== search.last_val) {
				search.last_val = val;
				clearTimeout(search.timer);
				source(val, suggest);
			}
		} else {
			search.last_val = val;
			body.classList.remove('typing');
		}
	}
});

// sw

if (sw) {
	sw.register('sw.js', {
		scope: './'
	});

	sw.onmessage = function (evt) {
		renderPlan(JSON.parse(evt.data));
	};
}
