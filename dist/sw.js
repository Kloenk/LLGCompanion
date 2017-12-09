'use strict';

let ver = 'v12';

let cached = [
	'./',
	'./css/stdplan.css',
	'./favicon.png',
	'./fonts/roboto/Roboto-Regular.woff2',
	'./fonts/icons/MaterialIcons-Regular.woff2',
	'./js/app.js',
	'./manifest.json'
];

const APP_CACHE = 'appcache-v37'
const DATA_CACHE = 'datacache-v1'

self.addEventListener('install', function(evt) {
  evt.waitUntil(caches.open(APP_CACHE).then(function (cache) {
    cache.addAll(cached);
  }));
});

self.addEventListener('fetch', function(evt) {
  let path = new URL(evt.request.url).pathname;
  if (cached.indexOf('.' + path) !== -1) {
    evt.respondWith(fromCache(evt.request, APP_CACHE));
  } else if (path.startsWith('/plan.json')) {
    evt.respondWith(fromCache(evt.request, DATA_CACHE).then(function(match) {
      if (match) {
        evt.waitUntil(update(evt.request, DATA_CACHE).then(refresh));
        return match;
      } else {
        return fromNetworkAndCache(evt.request, DATA_CACHE);
      }
    }));
  } else {
    evt.respondWith(fromNetwork(evt.request));
  }
});

self.addEventListener('message', function(evt) {
  evt.waitUntil(caches.open(APP_CACHE).then(function (cache) {
    let headers = { 'Content-Type': 'text/html; charset=UTF-8' };
    let response = new Response(evt.data, { headers: headers });
    return cache.put('/', response);
  }));
});

self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim()); // Become available to all pages
});

function fromNetwork(request) {
  return new Promise(function (fulfill, reject) {
    var timeoutId = setTimeout(reject, 500);
    fetch(request).then(function (response) {
      clearTimeout(timeoutId);
      fulfill(response);
    }, reject);
  });
}

function fromNetworkAndCache(request, CACHE) {
  return caches.open(CACHE).then(function (cache) {
    return new Promise(function (fulfill, reject) {
      var timeoutId = setTimeout(reject, 500);
      fetch(request).then(function (response) {
        cache.put(request, response.clone());
        clearTimeout(timeoutId);
        fulfill(response);
      }, reject);
    });
  });
}

function fromCache(request, CACHE) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request);
  });
}

function update(request, CACHE) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response.clone()).then(function () {
        return response;
      });
    });
  });
}

function refresh(response) {
  return response.text().then(function (text) {
    return self.clients.matchAll().then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage(text);
      });
    });
  });
}

