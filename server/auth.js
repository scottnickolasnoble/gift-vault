// Accounts: sign up, sign in, sign out, and "who is signed in?".
const crypto = require("crypto");
const { promisify } = require("util");
const db = require("./db");
const { createRouter, rateLimit } = require("./web");
const { BadRequest, text } = require("./validate");

const scrypt = promisify(crypto.scrypt);
const COOKIE = "gv_session";
const SESSION_DAYS = 60;

const router = createRouter();

// Slows down anyone guessing passwords: 20 tries per 15 minutes per IP.
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	message: "Too many tries. Wait a few minutes and try again."
});

// ---------- passwords ----------
// We never store the password itself, only a slow, salted "fingerprint" of it (scrypt).

async function hashPassword(password) {
	const salt = crypto.randomBytes(16);
	const key = await scrypt(password, salt, 64);
	return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function checkPassword(password, stored) {
	const [kind, saltText, keyText] = String(stored).split("$");
	if (kind !== "scrypt" || !saltText || !keyText) {
		return false;
	}
	const expected = Buffer.from(keyText, "base64");
	const actual = await scrypt(password, Buffer.from(saltText, "base64"), expected.length);
	return crypto.timingSafeEqual(actual, expected);
}

// Used when the email doesn't exist, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

// ---------- sessions ----------

function hashToken(token) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

function publicUser(row) {
	return { id: row.id, name: row.name, email: row.email };
}

async function startSession(res, userId) {
	const token = crypto.randomBytes(32).toString("base64url");
	const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	await db.query(
		"INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
		[hashToken(token), userId, expires]
	);
	res.cookie(COOKIE, token, {
		httpOnly: true,                                   // page JavaScript can't read it
		sameSite: "lax",                                  // not sent by other sites' forms
		secure: process.env.NODE_ENV === "production",    // HTTPS only on Render
		expires: expires,
		path: "/"
	});
}

function cleanEmail(value) {
	const email = text(value, 254).toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new BadRequest("Enter a valid email address.");
	}
	return email;
}

function cleanPassword(value) {
	const password = typeof value === "string" ? value : "";
	if (password.length < 8) {
		throw new BadRequest("Password must be at least 8 characters.");
	}
	if (password.length > 200) {
		throw new BadRequest("That password is too long.");
	}
	return password;
}

// Runs before every /api request: works out who is signed in from the cookie.
async function loadUser(req) {
	const token = req.cookies[COOKIE];
	if (!token) {
		return;
	}
	const result = await db.query(
		`SELECT users.id, users.name, users.email
		   FROM sessions JOIN users ON users.id = sessions.user_id
		  WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
		[hashToken(token)]
	);
	if (result.rows[0]) {
		req.user = result.rows[0];
	}
}

// Put this in front of any route that needs a signed-in user.
function requireUser(req, res) {
	if (!req.user) {
		res.status(401).json({ error: "Please sign in." });
		return;
	}
	return "next";
}

// ---------- the routes ----------

router.post("/signup", authLimiter, async function(req, res) {
	const name = text(req.body.name, 80);
	if (!name) {
		throw new BadRequest("Enter your name.");
	}
	const email = cleanEmail(req.body.email);
	const password = cleanPassword(req.body.password);
	const hash = await hashPassword(password);

	const result = await db.query(
		`INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
		 ON CONFLICT (email) DO NOTHING
		 RETURNING id, name, email`,
		[name, email, hash]
	);
	if (!result.rows[0]) {
		throw new BadRequest("There's already an account with that email. Try signing in.");
	}
	await startSession(res, result.rows[0].id);
	res.status(201).json({ user: publicUser(result.rows[0]) });
});

router.post("/login", authLimiter, async function(req, res) {
	const email = text(req.body.email, 254).toLowerCase();
	const password = typeof req.body.password === "string" ? req.body.password : "";
	const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
	const user = result.rows[0];
	const ok = await checkPassword(password, user ? user.password_hash : DUMMY_HASH);
	if (!user || !ok) {
		res.status(401).json({ error: "That email and password don't match." });
		return;
	}
	await startSession(res, user.id);
	res.json({ user: publicUser(user) });
});

router.post("/logout", async function(req, res) {
	const token = req.cookies[COOKIE];
	if (token) {
		await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
	}
	res.clearCookie(COOKIE, { path: "/" });
	res.json({ ok: true });
});

router.get("/me", requireUser, function(req, res) {
	res.json({ user: publicUser(req.user) });
});

// Deletes the account and everything in it. Asks for the password again first.
router.post("/delete-account", requireUser, authLimiter, async function(req, res) {
	const result = await db.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
	const password = typeof req.body.password === "string" ? req.body.password : "";
	const ok = await checkPassword(password, result.rows[0].password_hash);
	if (!ok) {
		res.status(401).json({ error: "That password isn't right." });
		return;
	}
	await db.query("DELETE FROM users WHERE id = $1", [req.user.id]);
	res.clearCookie(COOKIE, { path: "/" });
	res.json({ ok: true });
});

// Clears out expired sessions now and then.
async function cleanUpSessions() {
	try {
		await db.query("DELETE FROM sessions WHERE expires_at < now()");
	} catch (error) {
		console.warn("Couldn't clean up sessions:", error.message);
	}
}

module.exports = { router, loadUser, requireUser, cleanUpSessions };
