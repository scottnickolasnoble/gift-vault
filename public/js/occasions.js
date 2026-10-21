const occasionList = document.querySelector("#occasions-list");
const occasionsEmpty = document.querySelector("#occasions-empty");
const sections = [
	{label: "Next 30 days", from: 0, to: 30},
	{label: "Next 3 months", from: 31, to: 90},
	{label: "Later", from: 91, to: 366}
];

function renderSections(entries){
	occasionList.innerHTML = "";
	occasionsEmpty.hidden = entries.length > 0;

	sections.forEach(function(section){
		const sectionEntries = entries.filter(function(entry){
			return entry.days >= section.from && entry.days <= section.to;
		});

		if (sectionEntries.length === 0){
			return;
		}

		const rowsHTML = sectionEntries.map(function(entry){
			const [month, day] = formatMonthDay(entry.date).split(" ");

			return `<li>
				<a class="occasion-row" href="${entry.link}">
					<span class="date-box ${entry.isGroup ? "date-box-dark" : ""}">
						<span class="date-month">${esc(month)}</span>
						<span class="date-day">${esc(day)}</span>
					</span>
					<span class="occasion-info">
						<span class="occasion-title">${esc(entry.title)}</span>
						<span class="occasion-meta">
							<span class="occasion-tag avatar-${entry.colour}">${esc(entry.tag)}</span>
							<span class="occasion-detail">${esc(entry.detail)}</span>
						</span>
					</span>
					<span class="occasion-days ${entry.days <= 7 ? "occasion-days-soon" : ""}">${daysText(entry.days)}</span>
				</a>
			</li>`;
		}).join("");

		const sectionHTML = `<section class="occasion-section">
			<h2>${section.label}</h2>
			<ul class="occasion-list">${rowsHTML}</ul>
		</section>`;

		occasionList.insertAdjacentHTML("beforeend", sectionHTML);
	});
}

async function init(){
	const data = await loadData();
	// 1. birthdays + occasions → one list, soonest first (entries.js)
	const entries = buildEntries(data.people, data.occasions, data.ideas);
	// 2. draw each section
	renderSections(entries);
}

startPage(init);
