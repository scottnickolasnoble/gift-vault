const peopleList = document.querySelector("#people-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const groups = ["family","friends","work","other"];
const ideaFilter = document.querySelector(".segmented");
let activeView = "all";
let people = [];
let ideas = [];
let occasions = [];


searchInput.addEventListener("input",function(event){
	applyFilters();
});

ideaFilter.addEventListener("click",function(event){
	const selectFilter = event.target.closest(".segment");
	if(!selectFilter){
		return;
	}
	document.querySelectorAll(".segment").forEach(function(seg){
		seg.classList.remove("segment-active");
		seg.setAttribute("aria-pressed", "false");
	});
	selectFilter.classList.add("segment-active");
	selectFilter.setAttribute("aria-pressed", "true");
	activeView = selectFilter.dataset.view;
	applyFilters();
});

function openIdeasFor(personId){
	return ideas.filter(function(idea){
		return idea.personId === personId && idea.status !== "given";
	});
}

function applyFilters(){
	const searchText = searchInput.value.toLowerCase();

	const filteredPeople = people.filter(function(per){
		if(!per.name.toLowerCase().includes(searchText)){
			return false;
		}
		if(activeView === "all"){
			return true;
		}
		return openIdeasFor(per.id).length === 0;
	});

	renderPeople(filteredPeople);
}

function renderPeople(list){
	peopleList.innerHTML = "";
	if(list.length === 0){
		emptyState.hidden = false;
		if(people.length === 0){
			emptyState.textContent = "No one here yet. Tap + to add your first person.";
		} else if (searchInput.value){
			emptyState.textContent = `No one matches "${searchInput.value}".`;
		} else {
			emptyState.textContent = "Everyone has ideas saved. Nice work!";
		}
		return;
	}

	emptyState.hidden = true;

	groups.forEach(function(group){
		const peopleGroup = list.filter(function(per){
			return (per.group || "other") === group;
		});
		if(peopleGroup.length === 0){
			return;
		}
		const cardHTML = peopleGroup.map(function(person){
			const personIdeas = openIdeasFor(person.id);
			const days = person.birthday ? daysUntil(person.birthday) : null;
			const isSoon = days !== null && days <= 30;

			// The second line: their next event (birthday or occasion) in the next 60 days,
			// and how many ideas they have. Falls back to the relationship.
			const next = nextEventFor(person, occasions, 60);
			const parts = [];
			let eventHTML = "";
			if(next && !(next.key === "birthday" && isSoon)){
				const eventText = `${next.name} ${inDaysText(next.days)}`;
				eventHTML = `<span class="card-event ${next.days <= 7 ? "card-event-soon" : ""}">${esc(eventText)}</span>`;
			}
			if(person.relationship){
				parts.push(esc(person.relationship));
			}
			if(eventHTML){
				parts.push(eventHTML);
			}
			const detailsHTML = parts.join(" &middot; ");

			const pillHTML = isSoon
				? `<span class="birthday-pill ${days === 0 ? "birthday-pill-today" : `avatar-${person.colour}`}">${birthdayLabel(person.birthday)}</span>`
				: "";

			// Nudge: something is coming up within 30 days and there are no ideas yet.
			const needsNudge = personIdeas.length === 0 && next && next.days <= 30;
			const countHTML = personIdeas.length === 0
				? `<span class="person-ideas ${needsNudge ? "person-ideas-none" : "person-ideas-zero"}">No ideas</span>`
				: `<span class="person-ideas">${personIdeas.length === 1 ? "1 idea" : personIdeas.length + " ideas"}</span>`;

			return `<li><a class="person-link" href="person.html?id=${person.id}">
		<span class="person-initial avatar-${person.colour}">${esc(person.name[0].toUpperCase())}</span>
		<span class="person-info">
			<span class="person-name">${esc(person.name)}</span>
			<span class="person-relationship">${detailsHTML}</span>
			${pillHTML}
		</span>
		${countHTML}
		</a></li>`;
		}).join("");
		const groupLabel = group[0].toUpperCase() + group.slice(1);
		const sectionHTML = `<section class="people-section">
		<div class="people-section-head">
		<h2>${groupLabel}</h2>
		<span>${peopleGroup.length}</span>
		</div>
		<ul class="people-list">${cardHTML}</ul>
		</section>
		`;

		peopleList.insertAdjacentHTML("beforeend",sectionHTML);
	});
}

async function init(){
	const data = await loadData();
	people = data.people;
	ideas = data.ideas;
	occasions = data.occasions;
	applyFilters();
}

startPage(init);
