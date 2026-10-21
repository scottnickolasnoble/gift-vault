// Gift Vault server: serves the pages in public/ and the /api the pages talk to.
const http = require("http");
const path = require("path");
const db = require("./server/db");
const auth = require("./server/auth");
const routes = require("./server/routes");
const { addHelpers, readJson, serveStatic } = require("./server/web");

const PORT = process.env.PORT || 3000;
const servePublic = serveStatic(path.join(__dirname, "public"));

async function handleApi(req, res) {
	// Changes to data must come from our own pages as JSON. Other websites can't
	// send JSON to us without the browser asking first, which blocks forged requests.
	if (req.method !== "GET") {
		if (!String(req.headers["content-type"] || "").startsWith("application/json")) {
			return res.status(415).json({ error: "Send JSON." });
		}
		req.body = await readJson(req, 2 * 1024 * 1024);
	} else {
		req.body = {};
	}

	await auth.loadUser(req);

	const subPath = req.path.slice("/api".length) || "/";
	if (subPath.startsWith("/auth/")) {
		if (await auth.router.handle(req, res, subPath.slice("/auth".length))) return;
	} else {
		if (!req.user) {
			return res.status(401).json({ error: "Please sign in." });
		}
		if (await routes.handle(req, res, subPath)) return;
	}
	res.status(404).json({ error: "Not found." });
}

const server = http.createServer(async function(req, res) {
	try {
		addHelpers(req, res);
	} catch (error) {
		res.statusCode = 400;
		return res.end("Bad request.");
	}
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("Referrer-Policy", "same-origin");
	res.setHeader("X-Frame-Options", "DENY");

	try {
		if (req.path === "/healthz") {
			return res.json({ ok: true });
		}
		if (req.path === "/api" || req.path.startsWith("/api/")) {
			return await handleApi(req, res);
		}
		if (req.path === "/") {
			return res.redirect("/home.html");
		}
		if (servePublic(req, res)) {
			return;
		}
		res.statusCode = 404;
		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		res.end("Page not found.");
	} catch (error) {
		// A clear message for things the user can fix; a generic one for bugs.
		if (res.headersSent) {
			return res.end();
		}
		if (error.status && error.status < 500) {
			return res.status(error.status).json({ error: error.message });
		}
		console.error(error);
		res.status(500).json({ error: "Something went wrong on our side. Try again." });
	}
});

// Log anything unexpected instead of letting one bad request stop the whole server.
process.on("unhandledRejection", function(error) {
	console.error("Unhandled error:", error);
});

db.setUpTables()
	.then(function() {
		server.listen(PORT, function() {
			console.log(`Gift Vault running on http://localhost:${PORT}`);
		});
		auth.cleanUpSessions();
		setInterval(auth.cleanUpSessions, 6 * 60 * 60 * 1000).unref();
	})
	.catch(function(error) {
		console.error("Couldn't set up the database:", error.message);
		process.exit(1);
	});
