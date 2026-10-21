// Shared "what's coming up" logic, used by Home, Occasions and the People list.
// Needs dates.js and money.js loaded first.

const STATUS_ORDER = ["idea", "bought", "wrapped", "given"];

function isGroupOccasion(occasion) {
	return occasion.type ? occasion.type === "group" : occasion.personIds.length > 1;
}

// "Today", "Tomorrow", "12 days"
function daysText(days) {
	if (days === 0) return "Today";
	if (days === 1) return "Tomorrow";
	return `${days} days`;
}

// "today", "tomorrow", "in 12 days"
function inDaysText(days) {
	if (days === 0) return "today";
	if (days === 1) return "tomorrow";
	return `in ${days} days`;
}

// Birthdays (from people) and occasions, joined into one list, soonest first.
function buildEntries(people, occasions, ideas) {
	const birthdayEntries = people
		.filter(function(person) { return person.birthday; })
		.map(function(person) {
			return {
				kind: "birthday",
				id: person.id,
				title: person.name,
				tag: "Birthday",
				date: person.birthday,
				days: daysUntil(person.birthday),
				detail: person.relationship,
				link: `person.html?id=${person.id}`,
				colour: person.colour,
				person: person,
				isGroup: false
			};
		});

	const occasionEntries = occasions.map(function(occasion) {
		const isGroup = isGroupOccasion(occasion);
		const person = isGroup ? null : people.find(function(per) {
			return per.id === occasion.personIds[0];
		});
		const spent = ideas ? spentForOccasion(occasion, ideas) : 0;
		let detail = "";
		if (occasion.budget !== null && spent > 0) {
			detail = `${formatMoney(spent)} of ${formatMoney(occasion.budget)}`;
		} else if (occasion.budget !== null) {
			detail = `${formatMoney(occasion.budget)} budget`;
		} else if (spent > 0) {
			detail = `${formatMoney(spent)} spent`;
		}
		return {
			kind: "occasion",
			id: occasion.id,
			title: occasion.name,
			tag: occasion.personIds.length === 0 ? "Add people"
				: isGroup ? `${occasion.personIds.length} ${occasion.personIds.length === 1 ? "person" : "people"}`
				: (person ? person.name : "No one"),
			date: occasion.date,
			days: daysUntil(occasion.date),
			detail: detail,
			link: `occasion.html?id=${occasion.id}`,
			colour: isGroup || !person ? "sand" : person.colour,
			occasion: occasion,
			person: person,
			isGroup: isGroup
		};
	});

	return birthdayEntries.concat(occasionEntries).sort(function(a, b) {
		return a.days - b.days;
	});
}

// The ideas a person has for one occasion ("birthday" or an occasion id).
function ideasFor(personId, occasionKey, ideas) {
	return ideas.filter(function(idea) {
		return idea.personId === personId && idea.occasionId === occasionKey;
	});
}

// A person is "sorted" for an occasion once one of its gifts is bought, wrapped or given.
function isSorted(personId, occasionKey, ideas) {
	return ideasFor(personId, occasionKey, ideas).some(function(idea) {
		return countsAsSpent(idea.status);
	});
}

// The furthest-along status of a person's gifts for an occasion, or "" if none.
function furthestStatus(personId, occasionKey, ideas) {
	let best = -1;
	ideasFor(personId, occasionKey, ideas).forEach(function(idea) {
		best = Math.max(best, STATUS_ORDER.indexOf(idea.status));
	});
	return best === -1 ? "" : STATUS_ORDER[best];
}

// A person's soonest birthday or occasion within maxDays, or null.
function nextEventFor(person, occasions, maxDays) {
	const events = [];
	if (person.birthday) {
		events.push({ name: "Birthday", key: "birthday", days: daysUntil(person.birthday) });
	}
	occasions.forEach(function(occasion) {
		if (occasion.personIds.includes(person.id)) {
			events.push({ name: occasion.name, key: occasion.id, days: daysUntil(occasion.date) });
		}
	});
	const soon = events
		.filter(function(event) { return event.days <= maxDays; })
		.sort(function(a, b) { return a.days - b.days; });
	return soon[0] || null;
}

function capitalize(word) {
	return word ? word[0].toUpperCase() + word.slice(1) : "";
}
