// The data API: people, ideas and occasions for the signed-in user.
// Every query includes "user_id = $X", so one account can never see or change another's data.
const db = require("./db");
const { createRouter } = require("./web");
const v = require("./validate");

// Only signed-in users reach these routes (server.js checks first).
const router = createRouter();

const GROUPS = ["family", "friends", "work", "other"];
const COLOURS = ["rust", "blue", "sand", "lavender", "cream", "green"];
const STATUSES = ["idea", "bought", "wrapped", "given"];

// ---------- turning database rows into the shapes the pages use ----------

function personOut(row) {
	return {
		id: row.id,
		name: row.name,
		relationship: row.relationship,
		birthday: row.birthday,
		colour: row.colour,
		group: row.grp,
		sizes: row.sizes,
		favColour: row.fav_colour,
		loves: row.loves,
		avoid: row.avoid
	};
}

function ideaOut(row) {
	return {
		id: row.id,
		personId: row.person_id,
		name: row.name,
		note: row.note,
		heardOn: row.heard_on,
		price: row.price,
		link: row.link,
		status: row.status,
		occasionId: row.occasion_key
	};
}

function occasionOut(row, personIds) {
	return {
		id: row.id,
		name: row.name,
		date: row.date,
		budget: row.budget,
		type: row.type,
		builtin: row.builtin,
		personIds: personIds || []
	};
}

// ---------- cleaning what the browser sends ----------

function personIn(body) {
	return {
		name: v.requiredText(body.name, "Name", 80),
		relationship: v.text(body.relationship, 80),
		birthday: v.fullDate(body.birthday),
		colour: v.oneOf(body.colour, COLOURS, "rust"),
		grp: v.oneOf(body.group, GROUPS, "other"),
		sizes: v.text(body.sizes, 200),
		favColour: v.text(body.favColour, 80),
		loves: v.text(body.loves, 1000),
		avoid: v.text(body.avoid, 1000)
	};
}

async function checkPerson(client, userId, personId) {
	if (!v.isUuid(personId)) {
		throw new v.BadRequest("Pick who the idea is for.");
	}
	const result = await client.query("SELECT 1 FROM people WHERE id = $1 AND user_id = $2", [personId, userId]);
	if (!result.rows[0]) {
		throw new v.BadRequest("That person doesn't exist.");
	}
}

// An idea's occasion: "birthday", one of this user's occasion ids, or null for "any time".
async function checkOccasionKey(client, userId, key) {
	if (key === undefined || key === null || key === "") {
		return null;
	}
	if (key === "birthday") {
		return "birthday";
	}
	if (!v.isUuid(key)) {
		return null;
	}
	const result = await client.query("SELECT 1 FROM occasions WHERE id = $1 AND user_id = $2", [key, userId]);
	return result.rows[0] ? key : null;
}

// Keeps only ids that are real people belonging to this user.
async function ownedPersonIds(client, userId, ids) {
	const list = Array.isArray(ids) ? ids.filter(v.isUuid) : [];
	if (list.length === 0) {
		return [];
	}
	const result = await client.query(
		"SELECT id FROM people WHERE user_id = $1 AND id = ANY($2::uuid[])",
		[userId, list]
	);
	const owned = new Set(result.rows.map(function(row) { return row.id; }));
	return Array.from(new Set(list)).filter(function(id) { return owned.has(id); });
}

async function setOccasionPeople(client, occasionId, personIds) {
	await client.query("DELETE FROM occasion_people WHERE occasion_id = $1", [occasionId]);
	if (personIds.length > 0) {
		await client.query(
			"INSERT INTO occasion_people (occasion_id, person_id) SELECT $1, unnest($2::uuid[])",
			[occasionId, personIds]
		);
	}
}

// Every account has one built-in Christmas (Dec 25, a group, no people to start).
// If the user already made their own "Christmas" on Dec 25, that one becomes the built-in one.
async function ensureChristmas(client, userId) {
	const has = await client.query("SELECT 1 FROM occasions WHERE user_id = $1 AND builtin", [userId]);
	if (has.rows[0]) {
		return;
	}
	try {
		const own = await client.query(
			`SELECT id FROM occasions
			  WHERE user_id = $1 AND date = '12-25' AND lower(name) LIKE 'christmas%'
			  ORDER BY created_at LIMIT 1`,
			[userId]
		);
		if (own.rows[0]) {
			await client.query("UPDATE occasions SET builtin = true, type = 'group' WHERE id = $1", [own.rows[0].id]);
		} else {
			await client.query(
				`INSERT INTO occasions (user_id, name, date, budget, type, builtin)
				 VALUES ($1, 'Christmas', '12-25', NULL, 'group', true)
				 ON CONFLICT (user_id) WHERE builtin DO NOTHING`,
				[userId]
			);
		}
	} catch (error) {
		// 23505 = another request made it at the same moment. That's fine.
		if (error.code !== "23505") {
			throw error;
		}
	}
}

function notFound(res, what) {
	return res.status(404).json({ error: `That ${what} doesn't exist anymore.` });
}

// ---------- everything at once ----------

async function loadAll(userId) {
	const [people, ideas, occasions, links] = await Promise.all([
		db.query("SELECT * FROM people WHERE user_id = $1 ORDER BY created_at", [userId]),
		db.query("SELECT * FROM ideas WHERE user_id = $1 ORDER BY created_at", [userId]),
		db.query("SELECT * FROM occasions WHERE user_id = $1 ORDER BY created_at", [userId]),
		db.query(
			`SELECT op.occasion_id, op.person_id FROM occasion_people op
			   JOIN occasions o ON o.id = op.occasion_id WHERE o.user_id = $1`,
			[userId]
		)
	]);
	const peopleByOccasion = {};
	links.rows.forEach(function(link) {
		(peopleByOccasion[link.occasion_id] = peopleByOccasion[link.occasion_id] || []).push(link.person_id);
	});
	return {
		people: people.rows.map(personOut),
		ideas: ideas.rows.map(ideaOut),
		occasions: occasions.rows.map(function(row) { return occasionOut(row, peopleByOccasion[row.id]); })
	};
}

router.get("/data", async function(req, res) {
	await ensureChristmas(db, req.user.id);
	const data = await loadAll(req.user.id);
	data.user = { id: req.user.id, name: req.user.name, email: req.user.email };
	res.json(data);
});

// ---------- people ----------

router.post("/people", async function(req, res) {
	const p = personIn(req.body);
	const result = await db.query(
		`INSERT INTO people (user_id, name, relationship, birthday, colour, grp, sizes, fav_colour, loves, avoid)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
		[req.user.id, p.name, p.relationship, p.birthday, p.colour, p.grp, p.sizes, p.favColour, p.loves, p.avoid]
	);
	res.status(201).json(personOut(result.rows[0]));
});

router.put("/people/:id", async function(req, res) {
	if (!v.isUuid(req.params.id)) {
		return notFound(res, "person");
	}
	const p = personIn(req.body);
	const result = await db.query(
		`UPDATE people SET name = $3, relationship = $4, birthday = $5, colour = $6, grp = $7,
		        sizes = $8, fav_colour = $9, loves = $10, avoid = $11
		  WHERE id = $1 AND user_id = $2 RETURNING *`,
		[req.params.id, req.user.id, p.name, p.relationship, p.birthday, p.colour, p.grp, p.sizes, p.favColour, p.loves, p.avoid]
	);
	if (!result.rows[0]) {
		return notFound(res, "person");
	}
	res.json(personOut(result.rows[0]));
});

// Deleting a person also deletes their ideas and takes them out of every occasion.
router.delete("/people/:id", async function(req, res) {
	if (!v.isUuid(req.params.id)) {
		return notFound(res, "person");
	}
	const result = await db.query("DELETE FROM people WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
	if (result.rowCount === 0) {
		return notFound(res, "person");
	}
	res.json({ ok: true });
});

// ---------- ideas ----------

router.post("/ideas", async function(req, res) {
	const body = req.body;
	const row = await db.transaction(async function(client) {
		await checkPerson(client, req.user.id, body.personId);
		const occasionKey = await checkOccasionKey(client, req.user.id, body.occasionId);
		const result = await client.query(
			`INSERT INTO ideas (user_id, person_id, name, note, heard_on, price, link, status, occasion_key)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
			[
				req.user.id, body.personId,
				v.requiredText(body.name, "The gift", 200),
				v.text(body.note, 2000),
				v.fullDate(body.heardOn),
				v.money(body.price),
				v.text(body.link, 2000),
				v.oneOf(body.status, STATUSES, "idea"),
				occasionKey
			]
		);
		return result.rows[0];
	});
	res.status(201).json(ideaOut(row));
});

// Changes only the fields that are sent (so the status dropdown can send just { status }).
router.put("/ideas/:id", async function(req, res) {
	if (!v.isUuid(req.params.id)) {
		return notFound(res, "idea");
	}
	const body = req.body;
	const row = await db.transaction(async function(client) {
		const found = await client.query("SELECT * FROM ideas WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
		const idea = found.rows[0];
		if (!idea) {
			return null;
		}
		if ("personId" in body) {
			await checkPerson(client, req.user.id, body.personId);
			idea.person_id = body.personId;
		}
		if ("name" in body) idea.name = v.requiredText(body.name, "The gift", 200);
		if ("note" in body) idea.note = v.text(body.note, 2000);
		if ("heardOn" in body) idea.heard_on = v.fullDate(body.heardOn);
		if ("price" in body) idea.price = v.money(body.price);
		if ("link" in body) idea.link = v.text(body.link, 2000);
		if ("status" in body) idea.status = v.oneOf(body.status, STATUSES, idea.status);
		if ("occasionId" in body) idea.occasion_key = await checkOccasionKey(client, req.user.id, body.occasionId);

		const result = await client.query(
			`UPDATE ideas SET person_id = $3, name = $4, note = $5, heard_on = $6, price = $7,
			        link = $8, status = $9, occasion_key = $10
			  WHERE id = $1 AND user_id = $2 RETURNING *`,
			[idea.id, req.user.id, idea.person_id, idea.name, idea.note, idea.heard_on, idea.price, idea.link, idea.status, idea.occasion_key]
		);
		return result.rows[0];
	});
	if (!row) {
		return notFound(res, "idea");
	}
	res.json(ideaOut(row));
});

router.delete("/ideas/:id", async function(req, res) {
	if (!v.isUuid(req.params.id)) {
		return notFound(res, "idea");
	}
	const result = await db.query("DELETE FROM ideas WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
	if (result.rowCount === 0) {
		return notFound(res, "idea");
	}
	res.json({ ok: true });
});

// ---------- occasions ----------

function occasionIn(body) {
	return {
		name: v.requiredText(body.name, "The occasion's name", 80),
		date: v.monthDay(body.date),
		budget: v.money(body.budget),
		type: v.oneOf(body.type, ["person", "group"], "group")
	};
}

router.post("/occasions", async function(req, res) {
	const o = occasionIn(req.body);
	const result = await db.transaction(async function(client) {
		const personIds = await ownedPersonIds(client, req.user.id, req.body.personIds);
		if (personIds.length === 0) {
			throw new v.BadRequest("Choose who the occasion is for.");
		}
		const inserted = await client.query(
			"INSERT INTO occasions (user_id, name, date, budget, type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
			[req.user.id, o.name, o.date, o.budget, o.type]
		);
		await setOccasionPeople(client, inserted.rows[0].id, personIds);
		return occasionOut(inserted.rows[0], personIds);
	});
	res.status(201).json(result);
});

// Changes only the fields that are sent (so adding/removing people can send just { personIds }).
router.put("/occasions/:id", async function(req, res) {
	if (!v.isUuid(req.params.id)) {
		return notFound(res, "occasion");
	}
	const body = req.body;
	const result = await db.transaction(async function(client) {
		const found = await client.query("SELECT * FROM occasions WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
		const occasion = found.rows[0];
		if (!occasion) {
			return null;
		}
		// Christmas keeps its name, date and group type; only its budget and people change.
		if (!occasion.builtin) {
			if ("name" in body) occasion.name = v.requiredText(body.name, "The occasion's name", 80);
			if ("date" in body) occasion.date = v.monthDay(body.date);
			if ("type" in body) occasion.type = v.oneOf(body.type, ["person", "group"], occasion.type);
		}
		if ("budget" in body) occasion.budget = v.money(body.budget);

		const updated = await client.query(
			"UPDATE occasions SET name = $3, date = $4, budget = $5, type = $6 WHERE id = $1 AND user_id = $2 RETURNING *",
			[occasion.id, req.user.id, occasion.name, occasion.date, occasion.budget, occasion.type]
		);

		let personIds;
		if ("personIds" in body) {
			personIds = await ownedPersonIds(client, req.user.id, body.personIds);
			await setOccasionPeople(client, occasion.id, personIds);
		} else {
			const links = await client.query("SELECT person_id FROM occasion_people WHERE occasion_id = $1", [occasion.id]);
			personIds = links.rows.map(function(link) { return link.person_id; });
		}
		return occasionOut(updated.rows[0], personIds);
	});
	if (!result) {
		return notFound(res, "occasion");
	}
	res.json(result);
});

// Deleting an occasion keeps the people and ideas; tagged ideas go back to "any time".
router.delete("/occasions/:id", async function(req, res) {
	if (!v.isUuid(req.params.id)) {
		return notFound(res, "occasion");
	}
	const found = await db.query("SELECT builtin FROM occasions WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
	if (found.rows[0] && found.rows[0].builtin) {
		throw new v.BadRequest("Christmas is built in, so it can't be deleted. You can take everyone out of it instead.");
	}
	const deleted = await db.transaction(async function(client) {
		const result = await client.query("DELETE FROM occasions WHERE id = $1 AND user_id = $2 AND NOT builtin", [req.params.id, req.user.id]);
		if (result.rowCount === 0) {
			return false;
		}
		await client.query("UPDATE ideas SET occasion_key = NULL WHERE user_id = $1 AND occasion_key = $2", [req.user.id, req.params.id]);
		return true;
	});
	if (!deleted) {
		return notFound(res, "occasion");
	}
	res.json({ ok: true });
});

// ---------- import a backup file (replaces everything) ----------

router.post("/import", async function(req, res) {
	const backup = req.body || {};
	if (!Array.isArray(backup.people) || !Array.isArray(backup.ideas)) {
		throw new v.BadRequest("That file isn't a Gift Vault backup.");
	}
	const occasions = Array.isArray(backup.occasions) ? backup.occasions : [];
	if (backup.people.length > 2000 || backup.ideas.length > 10000 || occasions.length > 1000) {
		throw new v.BadRequest("That backup is too big to import.");
	}
	const userId = req.user.id;

	const counts = await db.transaction(async function(client) {
		await client.query("DELETE FROM occasions WHERE user_id = $1", [userId]);
		await client.query("DELETE FROM people WHERE user_id = $1", [userId]); // also deletes their ideas

		// Old ids are swapped for new ones, so two accounts can import the same file.
		const newPersonId = {};
		for (const [index, person] of backup.people.entries()) {
			if (!person || !person.name) continue;
			const p = personIn(Object.assign({}, person, {
				colour: COLOURS.includes(person.colour) ? person.colour : COLOURS[index % COLOURS.length]
			}));
			const inserted = await client.query(
				`INSERT INTO people (user_id, name, relationship, birthday, colour, grp, sizes, fav_colour, loves, avoid)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
				[userId, p.name, p.relationship, p.birthday, p.colour, p.grp, p.sizes, p.favColour, p.loves, p.avoid]
			);
			newPersonId[person.id] = inserted.rows[0].id;
		}

		const newOccasionId = {};
		for (const occasion of occasions) {
			if (!occasion || !occasion.name) continue;
			let o;
			try {
				o = occasionIn(occasion);
			} catch (error) {
				continue; // skip an occasion with a broken date
			}
			const personIds = (Array.isArray(occasion.personIds) ? occasion.personIds : [])
				.map(function(id) { return newPersonId[id]; })
				.filter(Boolean);
			// Christmas can be empty (it's built in); any other occasion needs someone in it.
			const isChristmas = occasion.builtin === true || (o.date === "12-25" && /^christmas/i.test(o.name));
			if (personIds.length === 0 && !isChristmas) continue;
			if (!occasion.type) {
				o.type = personIds.length > 1 ? "group" : "person";
			}
			const inserted = await client.query(
				"INSERT INTO occasions (user_id, name, date, budget, type) VALUES ($1, $2, $3, $4, $5) RETURNING id",
				[userId, o.name, o.date, o.budget, o.type]
			);
			newOccasionId[occasion.id] = inserted.rows[0].id;
			await setOccasionPeople(client, inserted.rows[0].id, Array.from(new Set(personIds)));
		}

		let ideaCount = 0;
		for (const idea of backup.ideas) {
			if (!idea || !idea.name || !newPersonId[idea.personId]) continue;
			const key = idea.occasionId === "birthday" ? "birthday" : (newOccasionId[idea.occasionId] || null);
			await client.query(
				`INSERT INTO ideas (user_id, person_id, name, note, heard_on, price, link, status, occasion_key)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				[
					userId, newPersonId[idea.personId],
					v.text(idea.name, 200), v.text(idea.note, 2000), v.fullDate(idea.heardOn),
					v.money(idea.price), v.text(idea.link, 2000),
					v.oneOf(idea.status, STATUSES, "idea"), key
				]
			);
			ideaCount++;
		}

		await ensureChristmas(client, userId);

		return {
			people: Object.keys(newPersonId).length,
			ideas: ideaCount,
			occasions: Object.keys(newOccasionId).length
		};
	});
	res.json({ ok: true, imported: counts });
});

module.exports = router;
