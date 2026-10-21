// Gift Vault service worker (V3)
// Your data now lives on the server, so this only keeps a copy of the app's
// files: pages open fast, and if there's no signal you see a friendly page
// instead of the browser's error. It never stores your people or ideas.

const CACHE = "gift-vault-v3-1";

const FILES = [
	"./home.html",
	"./index.html",
	"./person.html",
	"./person-form.html",
	"./idea-form.html",
	"./occasions.html",
	"./occasion.html",
	"./occasion-form.html",
	"./settings.html",
	"./signin.html",
	"./welcome.html",
	"./offline.html",
	"./manifest.json",
	"./css/styles.css",
	"./js/api.js",
	"./js/dates.js",
	"./js/money.js",
	"./js/entries.js",
	"./js/pwa.js",
	"./js/home.js",
	"./js/people.js",
	"./js/person.js",
	"./js/person-form.js",
	"./js/idea-form.js",
	"./js/occasions.js",
	"./js/occasion.js",
	"./js/occasion-form.js",
	"./js/settings.js",
	"./js/signin.js",
	"./js/welcome.js",
	"./icons/icon-192.png",
	"./icons/icon-512.png",
	"./icons/apple-touch-icon.png",
	"./icons/favicon-32.png"
];

self.addEventListener("install", function(event) {
	event.waitUntil(
		caches.open(CACHE).then(function(cache) {
			return Promise.all(FILES.map(function(file) {
				return cache.add(file).catch(function() {
					console.warn("Gift Vault: couldn't cache", file);
				});
			}));
		})
	);
	self.skipWaiting();
});

self.addEventListener("activate", function(event) {
	event.waitUntil(
		caches.keys().then(function(names) {
			return Promise.all(names.map(function(name) {
				if (name !== CACHE) {
					return caches.delete(name);
				}
			}));
		})
	);
	self.clients.claim();
});

// Network first: always try for the newest file. If that fails (no signal),
// use the saved copy. The /api is never cached: data always comes fresh.
self.addEventListener("fetch", function(event) {
	const request = event.request;
	const url = new URL(request.url);
	if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
		return;
	}

	event.respondWith(
		fetch(request).then(function(response) {
			if (response.ok) {
				const copy = response.clone();
				caches.open(CACHE).then(function(cache) {
					cache.put(url.pathname, copy);
				});
			}
			return response;
		}).catch(function() {
			return caches.match(url.pathname).then(function(saved) {
				if (saved) {
					return saved;
				}
				if (request.mode === "navigate") {
					return caches.match("./offline.html");
				}
				return Response.error();
			});
		})
	);
});
