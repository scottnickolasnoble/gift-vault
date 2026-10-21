// Small helpers that clean up what the browser sends before it reaches the database.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class BadRequest extends Error {
	constructor(message) {
		super(message);
		this.status = 400;
	}
}

function isUuid(value) {
	return typeof value === "string" && UUID.test(value);
}

// Text: trims it and caps the length. Missing becomes "".
function text(value, max) {
	if (value === undefined || value === null) {
		return "";
	}
	return String(value).trim().slice(0, max || 500);
}

function requiredText(value, label, max) {
	const cleaned = text(value, max);
	if (!cleaned) {
		throw new BadRequest(`${label} is required.`);
	}
	return cleaned;
}

// Money: "" / null / not a number → null. Otherwise a number ≥ 0 with 2 decimals.
function money(value) {
	if (value === undefined || value === null || value === "") {
		return null;
	}
	const number = Number(String(value).replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(number) || number < 0) {
		return null;
	}
	return Math.round(number * 100) / 100;
}

// "YYYY-MM-DD" or "".
function fullDate(value) {
	const cleaned = text(value, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : "";
}

// "MM-DD" (also accepts "M-D").
function monthDay(value) {
	const match = /^(\d{1,2})-(\d{1,2})$/.exec(text(value, 5));
	if (!match) {
		throw new BadRequest("Date must be a month and day.");
	}
	const month = Number(match[1]);
	const day = Number(match[2]);
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		throw new BadRequest("That date doesn't exist.");
	}
	return String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function oneOf(value, allowed, fallback) {
	return allowed.includes(value) ? value : fallback;
}

module.exports = { BadRequest, isUuid, text, requiredText, money, fullDate, monthDay, oneOf };
