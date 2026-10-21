// Money helpers shared by the occasion page, the occasions list and Home.

// 60 → "$60", 59.5 → "$59.50", null → ""
function formatMoney(amount) {
	if (amount === null || amount === undefined || amount === "") {
		return "";
	}
	const number = Number(amount);
	if (!Number.isFinite(number)) {
		return "";
	}
	return Number.isInteger(number) ? `$${number}` : `$${number.toFixed(2)}`;
}

// Statuses that mean the money has been spent.
function countsAsSpent(status) {
	return status === "bought" || status === "wrapped" || status === "given";
}

// Ideas tagged for this occasion, for people who are still in it.
function ideasForOccasion(occasion, ideas) {
	return ideas.filter(function(idea) {
		return idea.occasionId === occasion.id && occasion.personIds.includes(idea.personId);
	});
}

// Total price of this occasion's ideas that are bought, wrapped or given.
function spentForOccasion(occasion, ideas) {
	return ideasForOccasion(occasion, ideas).reduce(function(total, idea) {
		return countsAsSpent(idea.status) ? total + (Number(idea.price) || 0) : total;
	}, 0);
}
