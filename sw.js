// Old-address (GitHub Pages) service worker: switches itself off.
// The V1/V2 app kept copies of its pages here. This version deletes those copies
// and unregisters, so the "Gift Vault has moved" page shows instead of the old app.
// (The new app's own service worker is public/sw.js.)

self.addEventListener("install", function() {
	self.skipWaiting();
});

self.addEventListener("activate", function(event) {
	event.waitUntil(
		caches.keys()
			.then(function(names) {
				return Promise.all(names.map(function(name) { return caches.delete(name); }));
			})
			.then(function() { return self.registration.unregister(); })
			.then(function() { return self.clients.matchAll({ type: "window" }); })
			.then(function(clients) {
				clients.forEach(function(client) {
					client.navigate("./index.html");
				});
			})
	);
});
