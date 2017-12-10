'use strict';

let ver = 'v20';

let preCache = [
	'./',
	'./css/stdplan.css',
	'./favicon.png',
	'./fonts/roboto/Roboto-Regular.woff2',
	'./fonts/icons/MaterialIcons-Regular.woff2',
	'./js/app.js',
	'./manifest.json'
];

const CACHE = 'cache-v38'

self.addEventListener('install', function(evt) {
  evt.waitUntil(caches.open(CACHE).then(function (cache) {
    cache.addAll(preCache);
  }));
});

self.addEventListener('fetch', function(evt) {
  evt.respondWith(fromCache(evt.request).then(function(match) {
    if (match) {
      let path = new URL(evt.request.url).pathname;
      if (path.startsWith('/plan.json') || path.startsWith('dsb.json'))
        evt.waitUntil(update(evt.request).then(refresh));
      return match;
    } else {
      return fromNetworkAndCache(evt.request);
    }
  }));
});

self.addEventListener('message', function(evt) {
  evt.waitUntil(caches.open(CACHE).then(function (cache) {
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

function fromNetworkAndCache(request) {
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

function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request);
  });
}

function update(request) {
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
