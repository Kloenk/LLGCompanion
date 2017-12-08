'use strict'

let ver = "v5"

const APP_CACHE = 'appcache-v37'
const DATA_CACHE = 'datacache-v1'

self.addEventListener('install', function(evt) {
	evt.waitUntil(precache())
})

self.addEventListener('fetch', function(evt) {
	let parts = evt.request.url.split('/')
	let fileName = parts[parts.length-1]
	if (fileName.startsWith('dsb.json') || fileName.startsWith('planinfo.json')) {
		evt.respondWith(fromCache(evt.request, DATA_CACHE))
		evt.waitUntil(update(evt.request))
	} else {
		evt.respondWith(fromCache(evt.request, APP_CACHE))
	}
})

function precache() {
	return Promise.all([
		caches.open(APP_CACHE).then(function(cache) {
			return cache.addAll([
				'./',
				'./css/stdplan.css',
				'./favicon.png',
				'./fonts/roboto/Roboto-Regular.woff2',
				'./fonts/icons/MaterialIcons-Regular.woff2',
				'./index.html',
				'./js/app.js',
				'./manifest.json'
			])
		}),
		caches.open(DATA_CACHE).then(function(cache) {
			return cache.addAll([
				'./plan.json',
				'./dsb.json'
			])
		})
	])
}

function fromCache(request, cacheName) {
	console.log("serving " + request.url + " from " + cacheName)
	return caches.open(cacheName).then(function(cache) {
		return cache.match(request).then(function(matching) {
			return matching || Promise.reject('no-match')
		})
	})
}

function update(request) {
	return caches.open(DATA_CACHE).then(function(cache) {
		return fetch(request).then(function(response) {
			return cache.put(request, response.clone()).then(function() {
				return refresh(response)
			})
		})
	})
}

function refresh(response) {
	return response.text().then(function(text) {
		return self.clients.matchAll().then(function(clients) {
			clients.forEach(function(client) {
				client.postMessage(JSON.stringify({
					type: 'refresh',
					data: text
				}))
			})
		})
	})
}
