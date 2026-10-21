// Registers the service worker, so the app can open offline.
if ("serviceWorker" in navigator) {
	window.addEventListener("load", function() {
		navigator.serviceWorker.register("./sw.js").catch(function(error) {
			console.warn("Gift Vault: service worker didn't register", error);
		});
	});
}
