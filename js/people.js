const peopleList = document.querySelector("#people-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const people = loadPeople();
const ideas = loadAllIdeas();
const groups = ["family","friends","work","other"];
const ideaFilter = document.querySelector(".segmented");
let activeView = "all"


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
	});
	selectFilter.classList.add("segment-active");
	activeView = selectFilter.dataset.view;
	applyFilters();
});

function applyFilters(){
	const searchText = searchInput.value.toLowerCase();
	
	const filteredPeople = people.filter(function(per){
		if(!per.name.toLowerCase().includes(searchText)){
			return false;
		}
		if(activeView === "all"){
			return true;
		}
		const openIdeas = ideas.filter(function(idea){
			return idea.personId === per.id && idea.status !== "given";
		})
		return openIdeas.length === 0;
	});
	
	renderPeople(filteredPeople,ideas);
}

function renderPeople(list,ideas){
	peopleList.innerHTML = "";
	if(list.length === 0){
		emptyState.hidden = false;
		if(people.length === 0){
			emptyState.textContent = "No one here yet. Tap + to add your first person";
			return;
		} 
		if (searchInput.value){
			emptyState.textContent = `No one matches "${searchInput.value}`;
		}
		emptyState.textContent = `Everyone has ideas saved. Nice work!`;
		return;
	} 
	
	emptyState.hidden = true;
	
	groups.forEach(function(group){
		const peopleGroup = list.filter(function(per){
			return per.group === group;
		});
		if(peopleGroup.length === 0){
			return;
		}
		const cardHTML = peopleGroup.map(function(person){
			const personIdeas = ideas.filter(function(perIdea){
				return perIdea.personId === person.id && perIdea.status !== "given";
			});
			const days = person.birthday ? daysUntil(person.birthday) : null;
			const label = birthdayLabel(person.birthday);
			const isSoon = days !== null & days <= 30;
			
			const detailsText = !isSoon && label ? `${person.relationship} &middot; ${label}` : person.relationship;
			
			const pillHTML = isSoon
	? 		`<span class="birthday-pill ${days === 0 ? "birthday-pill-today" : `avatar-${person.colour}`}">${label}</span>`
	: 		"";
			return `<li><a class="person-link" href="person.html?id=${person.id}">
		<span class="person-initial avatar-${person.colour}">${person.name[0].toUpperCase()}</span>
		<span class="person-info">
			<span class="person-name">${person.name}</span>
			<span class="person-relationship">${detailsText}</span>
			${pillHTML}
		</span>
		<span class="person-ideas ${personIdeas.length === 0 ? `person-ideas-none avatar-${person.colour}` : ""}">${personIdeas.length === 0 ? "No ideas" : personIdeas.length === 1 ? "1 idea" : personIdeas.length + " ideas"}</span>
		</a></li>`
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

function init(){
	const peopleCards = loadPeople();
	const ideaCard = loadAllIdeas();
	applyFilters();
}
init();