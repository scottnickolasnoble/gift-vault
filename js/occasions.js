const people = loadPeople();
const occasions = loadOccasions();
const occasionList = document.querySelector("#occasions-list");
const sections = [
	{label: "Next 30 days", from: 0, to: 30},
	{label: "Next 3 months", from: 31, to: 90},
	{label: "Later", from: 91, to: 366}
];

const filteredBirthdays = people.filter(function(per) {
	return per.birthday;
});

// 1. people → birthday entries
const birthdayEntries = filteredBirthdays.map(function(per) {
	return {
		title: per.name,
		tag: "Birthday",
		date: per.birthday,
		days: daysUntil(per.birthday),
		detail: per.relationship,
		link: `person.html?id=${per.id}`,
		colour: per.colour
	};
});

// 2. occasions → occasion entries
const occasionEntries = occasions.map(function(occasion) {
	const isGroup = occasion.type
		? occasion.type === "group"
		: occasion.personIds.length > 1;

	// one person: look them up by the single ID in their list
	const person = isGroup ? null : people.find(function(per) {
		return per.id === occasion.personIds[0];
	});

	return {
		title: occasion.name,
		tag: isGroup ? `${occasion.personIds.length} people` : (person ? person.name : "No one"),
		date: occasion.date,
		days: daysUntil(occasion.date),
		detail: occasion.budget !== null ? `$${occasion.budget} budget` : "",
		link: `occasion.html?id=${occasion.id}`,
		colour: isGroup || !person ? "sand" : person.colour
	};
});

// 3. join them, then sort
const entries = birthdayEntries.concat(occasionEntries);

entries.sort(function(a, b) {
	return a.days - b.days;
});

// 4. draw each section
sections.forEach(function(section){
	const sectionEntries = entries.filter(function(entry){
		return entry.days >= section.from && entry.days <= section.to;
	});

	if (sectionEntries.length === 0){
		return;
	}

	const rowsHTML = sectionEntries.map(function(entry){
		const [month, day] = formatMonthDay(entry.date).split(" ");
		const daysText = entry.days === 0 ? "Today" : entry.days === 1 ? "Tomorrow" : `${entry.days} days`;

		return `<li>
			<a class="occasion-row" href="${entry.link}">
				<span class="date-box">
					<span class="date-month">${month}</span>
					<span class="date-day">${day}</span>
				</span>
				<span class="occasion-info">
					<span class="occasion-title">${entry.title}</span>
					<span class="occasion-meta">
						<span class="occasion-tag avatar-${entry.colour}">${entry.tag}</span>
						<span class="occasion-detail">${entry.detail}</span>
					</span>
				</span>
				<span class="occasion-days ${entry.days <= 7 ? "occasion-days-soon" : ""}">${daysText}</span>
			</a>
		</li>`;
	}).join("");

	const sectionHTML = `<section class="occasion-section">
		<h2>${section.label}</h2>
		<ul class="occasion-list">${rowsHTML}</ul>
	</section>`;

	occasionList.insertAdjacentHTML("beforeend", sectionHTML);
});