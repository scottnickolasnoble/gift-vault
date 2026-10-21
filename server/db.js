// Connects to the Postgres database (Neon in production).
const fs = require("fs");
const path = require("path");
const { Pool, types } = require("pg");

// Postgres sends prices (numeric) back as text like "59.99". Turn them into numbers.
types.setTypeParser(1700, function(value) {
	return value === null ? null : parseFloat(value);
});

if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL is not set. Add it to .env (local) or to Render's Environment tab.");
	process.exit(1);
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 5,
	idleTimeoutMillis: 30000
});

// A dropped idle connection (Neon pauses when idle) shouldn't crash the server.
pool.on("error", function(error) {
	console.warn("Database connection dropped:", error.message);
});

function query(text, params) {
	return pool.query(text, params);
}

// Runs several queries as one: either all of them happen, or none do.
async function transaction(work) {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const result = await work(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

async function setUpTables() {
	const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
	await pool.query(sql);
}

module.exports = { query, transaction, setUpTables, pool };
