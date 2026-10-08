// Gift Vault service worker
// Keeps a copy of the app's files so it opens with no signal.
// Your people and ideas are NOT stored here; they stay in localStorage.

const CACHE = "gift-vault-v1";

const FILES = [
	"./",
	"./index.html",
	"./person.html",
	"./person-form.html",
	"./idea-form.html",
	"./settings.html",
	"./manifest.json",
	"./css/styles.css",
	"./js/storage.js",
	"./js/dates.js",
	"./js/pwa.js",
	"./js/people.js",
	"./js/person.js",
	"./js/person-form.js",
	"./js/idea-form.js",
	"./js/settings.js",
	"./icons/icon-192.png",
	"./icons/icon-512.png",
	"./icons/apple-touch-icon.png",
	"./occasions.html",
	"./occasion-form.html",
	"./occasion.html",
	"./js/occasions.js",
	"./js/occasion-form.js",
	"./js/occasion.js",
	"./js/dates.js"
];

// Install: save a copy of every file.
// Each file is added on its own, so one missing file can't stop the rest.
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

// Activate: delete caches from older versions.
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

// Fetch: show the saved copy straight away (fast, works offline),
// then quietly fetch a fresh copy in the background for next time.
self.addEventListener("fetch", function(event) {
	const request = event.request;
	const sameSite = new URL(request.url).origin === self.location.origin;
	if (request.method !== "GET" || !sameSite) {
		return;
	}

	event.respondWith(
		caches.open(CACHE).then(function(cache) {
			// ignoreSearch: person.html?id=abc uses the saved person.html
			return cache.match(request, { ignoreSearch: true }).then(function(saved) {
				const fresh = fetch(request).then(function(response) {
					if (response.ok) {
						cache.put(request.url.split("?")[0], response.clone());
					}
					return response;
				}).catch(function() {
					return saved;
				});
				return saved || fresh;
			});
		})
	);
});
