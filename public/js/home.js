const greeting = document.querySelector("#greeting");
const homeDate = document.querySelector("#home-date");
const homeEmpty = document.querySelector("#home-empty");
const nextSection = document.querySelector("#next-section");
const nextCard = document.querySelector("#next-card");
const nextDateBox = document.querySelector("#next-date-box");
const nextMonth = document.querySelector("#next-month");
const nextDay = document.querySelector("#next-day");
const nextTitle = document.querySelector("#next-title");
const nextWhen = document.querySelector("#next-when");
const nextDetail = document.querySelector("#next-detail");
const nextBar = document.querySelector("#next-bar");
const nextBarFill = document.querySelector("#next-bar-fill");
const comingSection = document.querySelector("#coming-section");
const comingList = document.querySelector("#coming-list");
const needsSection = document.querySelector("#needs-section");
const needsList = document.querySelector("#needs-list");
const needsNone = document.querySelector("#needs-none");

function greetingFor(name){
	const hour = new Date().getHours();
	const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
	const firstName = (name || "").split(" ")[0];
	return firstName ? `${part}, ${firstName}` : part;
}

function renderNext(entry, ideas){
	const [month, day] = formatMonthDay(entry.date).split(" ");
	nextMonth.textContent = month;
	nextDay.textContent = day;
	nextCard.href = entry.link;
	nextTitle.textContent = entry.kind === "birthday" ? `${entry.title}'s birthday` : entry.title;
	nextWhen.textContent = capitalize(inDaysText(entry.days));
	nextWhen.classList.toggle("next-when-soon", entry.days <= 7);
	nextDateBox.className = "date-box date-box-large " + (entry.isGroup ? "date-box-dark" : `avatar-${entry.colour}`);
	nextBar.hidden = true;

	if(entry.kind === "birthday"){
		const theirIdeas = ideasFor(entry.id, "birthday", ideas);
		const sorted = isSorted(entry.id, "birthday", ideas);
		const allIdeas = ideas.filter(function(idea){ return idea.personId === entry.id && idea.status !== "given"; });
		if(sorted){
			nextDetail.textContent = "Gift sorted";
		} else if(theirIdeas.length > 0){
			nextDetail.textContent = `${theirIdeas.length} birthday ${theirIdeas.length === 1 ? "idea" : "ideas"} · nothing bought yet`;
		} else {
			nextDetail.textContent = allIdeas.length > 0 ? `${allIdeas.length} ${allIdeas.length === 1 ? "idea" : "ideas"} saved · nothing bought yet` : "No ideas yet";
		}
		return;
	}

	const occasion = entry.occasion;
	const total = occasion.personIds.length;
	const sortedCount = occasion.personIds.filter(function(personId){
		return isSorted(personId, occasion.id, ideas);
	}).length;
	if(total === 0){
		nextDetail.textContent = "Tap to add the people you're buying for";
		return;
	}
	const parts = [];
	if(entry.isGroup){
		parts.push(`${sortedCount} of ${total} sorted`);
	} else if(sortedCount === 1){
		parts.push("Gift sorted");
	} else {
		parts.push("Nothing bought yet");
	}
	if(occasion.budget !== null){
		parts.push(`${formatMoney(spentForOccasion(occasion, ideas))} of ${formatMoney(occasion.budget)}`);
	}
	nextDetail.textContent = parts.join(" · ");
	if(entry.isGroup && total > 0){
		nextBar.hidden = false;
		nextBarFill.style.width = `${Math.round(sortedCount / total * 100)}%`;
	}
}

function renderComing(entries){
	comingList.innerHTML = entries.map(function(entry){
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
}

// People with a birthday or occasion in the next 30 days whose gift isn't bought yet.
function findNeeds(entries, people, ideas){
	const needs = [];
	const seen = [];
	entries.forEach(function(entry){
		if(entry.days > 30){
			return;
		}
		if(entry.kind === "birthday"){
			if(!isSorted(entry.id, "birthday", ideas) && !seen.includes(entry.id)){
				seen.push(entry.id);
				needs.push({ person: entry.person, what: "Birthday", key: "birthday", days: entry.days });
			}
			return;
		}
		entry.occasion.personIds.forEach(function(personId){
			const person = people.find(function(per){ return per.id === personId; });
			if(person && !isSorted(personId, entry.id, ideas) && !seen.includes(personId)){
				seen.push(personId);
				needs.push({ person: person, what: entry.title, key: entry.id, days: entry.days });
			}
		});
	});
	return needs;
}

function renderNeeds(needs){
	needsNone.hidden = needs.length > 0;
	needsList.innerHTML = needs.map(function(need){
		const person = need.person;
		return `<li class="need-row">
			<a class="need-person" href="person.html?id=${person.id}">
				<span class="person-initial avatar-${person.colour}">${esc(person.name[0].toUpperCase())}</span>
				<span class="person-info">
					<span class="person-name">${esc(person.name)}</span>
					<span class="person-relationship">${esc(need.what)} · ${inDaysText(need.days)}</span>
				</span>
			</a>
			<a class="need-add" href="idea-form.html?personId=${person.id}&occasion=${need.key}">Add idea</a>
		</li>`;
	}).join("");
}

async function init(){
	homeDate.textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
	const data = await loadData();
	greeting.textContent = greetingFor(data.user.name);

	if(data.people.length === 0){
		homeEmpty.hidden = false;
		return;
	}

	const entries = buildEntries(data.people, data.occasions, data.ideas);
	if(entries.length > 0){
		nextSection.hidden = false;
		renderNext(entries[0], data.ideas);
	}
	if(entries.length > 1){
		comingSection.hidden = false;
		renderComing(entries.slice(1, 4));
	}
	needsSection.hidden = false;
	renderNeeds(findNeeds(entries, data.people, data.ideas));
}

startPage(init);
