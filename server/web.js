// A tiny web framework built on Node's own "http" module, so the server only
// needs one outside package (pg, for the database). It works like Express:
//   router.get("/people/:id", async function(req, res) { res.json({...}); });
const fs = require("fs");
const path = require("path");

// ---------- making req and res easier to use ----------

function addHelpers(req, res) {
	const url = new URL(req.url, "http://localhost");
	req.path = decodeURIComponent(url.pathname);
	req.query = Object.fromEntries(url.searchParams);
	req.cookies = parseCookies(req.headers.cookie || "");
	req.ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;

	res.status = function(code) {
		res.statusCode = code;
		return res;
	};
	res.json = function(data) {
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.end(JSON.stringify(data));
	};
	res.redirect = function(location) {
		res.statusCode = 302;
		res.setHeader("Location", location);
		res.end();
	};
	res.cookie = function(name, value, options) {
		appendCookie(res, serializeCookie(name, value, options));
	};
	res.clearCookie = function(name, options) {
		appendCookie(res, serializeCookie(name, "", Object.assign({}, options, { expires: new Date(0) })));
	};
}

function parseCookies(header) {
	const cookies = {};
	header.split(";").forEach(function(part) {
		const index = part.indexOf("=");
		if (index > 0) {
			const name = part.slice(0, index).trim();
			try {
				cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
			} catch (error) {
				// ignore a badly encoded cookie
			}
		}
	});
	return cookies;
}

function serializeCookie(name, value, options) {
	const o = options || {};
	let cookie = `${name}=${encodeURIComponent(value)}; Path=${o.path || "/"}`;
	if (o.expires) cookie += `; Expires=${o.expires.toUTCString()}`;
	if (o.httpOnly) cookie += "; HttpOnly";
	if (o.secure) cookie += "; Secure";
	if (o.sameSite) cookie += `; SameSite=${o.sameSite[0].toUpperCase() + o.sameSite.slice(1)}`;
	return cookie;
}

function appendCookie(res, cookie) {
	const existing = res.getHeader("Set-Cookie");
	res.setHeader("Set-Cookie", existing ? [].concat(existing, cookie) : cookie);
}

// Reads a JSON request body (up to a size limit).
function readJson(req, limitBytes) {
	return new Promise(function(resolve, reject) {
		let size = 0;
		const chunks = [];
		req.on("data", function(chunk) {
			size += chunk.length;
			if (size > limitBytes) {
				const error = new Error("That's too much data in one go.");
				error.status = 413;
				req.destroy();
				return reject(error);
			}
			chunks.push(chunk);
		});
		req.on("end", function() {
			const text = Buffer.concat(chunks).toString("utf8");
			if (!text) {
				return resolve({});
			}
			try {
				resolve(JSON.parse(text));
			} catch (error) {
				const bad = new Error("That request wasn't valid JSON.");
				bad.status = 400;
				reject(bad);
			}
		});
		req.on("error", reject);
	});
}

// ---------- routing ----------

function createRouter() {
	const routes = [];

	function add(method, pattern, handlers) {
		// "/people/:id" → a regular expression with a named group for "id"
		const keys = [];
		const regex = new RegExp("^" + pattern.replace(/:([a-zA-Z]+)/g, function(match, key) {
			keys.push(key);
			return "([^/]+)";
		}) + "/?$");
		routes.push({ method: method, regex: regex, keys: keys, handlers: handlers });
	}

	const router = {
		get: function(pattern, ...handlers) { add("GET", pattern, handlers); },
		post: function(pattern, ...handlers) { add("POST", pattern, handlers); },
		put: function(pattern, ...handlers) { add("PUT", pattern, handlers); },
		delete: function(pattern, ...handlers) { add("DELETE", pattern, handlers); },

		// Finds the matching route and runs its handlers in order.
		// A handler that returns "next" lets the following one run.
		handle: async function(req, res, subPath) {
			for (const route of routes) {
				if (route.method !== req.method) continue;
				const match = route.regex.exec(subPath);
				if (!match) continue;
				req.params = {};
				route.keys.forEach(function(key, index) {
					req.params[key] = match[index + 1];
				});
				for (const handler of route.handlers) {
					const result = await handler(req, res);
					if (result !== "next" || res.writableEnded) {
						return true;
					}
				}
				return true;
			}
			return false;
		}
	};
	return router;
}

// ---------- static files (the pages in public/) ----------

const TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".webmanifest": "application/manifest+json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff2": "font/woff2"
};

function serveStatic(rootFolder) {
	const root = path.resolve(rootFolder);
	return function(req, res) {
		if (req.method !== "GET" && req.method !== "HEAD") {
			return false;
		}
		let filePath = path.resolve(root, "." + req.path);
		if (!filePath.startsWith(root)) {
			return false; // someone tried "../" to escape the folder
		}
		if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
			filePath = path.join(filePath, "index.html");
		}
		if (!fs.existsSync(filePath) && fs.existsSync(filePath + ".html")) {
			filePath = filePath + ".html";
		}
		if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
			return false;
		}
		const ext = path.extname(filePath).toLowerCase();
		res.setHeader("Content-Type", TYPES[ext] || "application/octet-stream");
		// Pages and the service worker are always re-checked; other files can be kept for an hour.
		res.setHeader("Cache-Control", ext === ".html" || filePath.endsWith("sw.js") ? "no-cache" : "public, max-age=3600");
		if (req.method === "HEAD") {
			res.end();
		} else {
			fs.createReadStream(filePath).pipe(res);
		}
		return true;
	};
}

// ---------- a simple rate limiter (to slow down password guessing) ----------

function rateLimit(options) {
	const hits = new Map();
	setInterval(function() { hits.clear(); }, options.windowMs).unref();
	return function(req, res) {
		const key = req.ip;
		const count = (hits.get(key) || 0) + 1;
		hits.set(key, count);
		if (count > options.limit) {
			res.status(429).json({ error: options.message });
			return;
		}
		return "next";
	};
}

module.exports = { addHelpers, readJson, createRouter, serveStatic, rateLimit };
