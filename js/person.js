const params = new URLSearchParams(window.location.search);
const personId = params.get("id");
const personAvatar = document.querySelector("#person-avatar");
const personName = document.querySelector("#person-name");
const personDetails = document.querySelector("#person-details");
const addIdeaLabel = document.querySelector("#add-idea-link");
const ideaList = document.querySelector("#ideas-list");
const ideaEmpty = document.querySelector("#ideas-empty");
const statuses = ["Idea","Bought","Wrapped","Given"];
const editButton = document.querySelector("#person-edit-button");
const personDetailsDiv = document.querySelector(".person-name-relationship");

editButton.addEventListener("click",function(event){
	window.location.href = `person-form.html?id=${personId}`;
});

ideaList.addEventListener("change",function(event){
	const statusSelect = event.target.closest(".idea-status");
	if (!statusSelect) {
		return;
	}
	const selectedCardId = event.target.closest(".idea-card").dataset.id;
	const newStatus = statusSelect.value;
	
	const allIdeas = loadAllIdeas();
	const idea = allIdeas.find(function(idea){
		return idea.id === selectedCardId
	});
	
	idea.status = newStatus;
	
	saveIdeas(allIdeas);
	renderIdeas(loadIdeas());
	
})

function loadIdeas(){
	const ideas = loadAllIdeas();
	const personIdeas = ideas.filter(function(idea){
		return idea.personId === personId;
	})
	return personIdeas;
}

function loadPerson(){
	const people = loadPeople();
	const person = people.find(function(per){
		return per.id === personId;
	});
	return person;
}

function renderPerson(personInfo){
	const days = personInfo.birthday ? daysUntil(personInfo.birthday) : null;
	const label = birthdayLabel(personInfo.birthday);
	const isSoon = days !== null & days <= 30;
			
	const detailsText = !isSoon && label ? `${personInfo.relationship} &middot; ${label}` : personInfo.relationship;
	const pillHTML = isSoon
	? 		`<span class="birthday-pill ${days === 0 ? "birthday-pill-today" : `avatar-${personInfo.colour}`}">${label}</span>`
	: 		"";
	personAvatar.textContent = personInfo.name[0].toUpperCase();
	personAvatar.classList.add(`avatar-${personInfo.colour}`);
	personName.textContent = personInfo.name;
	personDetails.textContent = personInfo.relationship || "Add a relationship";
	personDetails.classList.add(`avatar-${personInfo.colour}`);
	personDetails.insertAdjacentHTML("afterend", isSoon ? pillHTML : `<span class="person-birthday birthday-pill avatar-${personInfo.colour}">${label}</span>`);
	addIdeaLabel.classList.add(`avatar-${personInfo.colour}`);
	addIdeaLabel.style.background = "transparent";
	addIdeaLabel.href = `idea-form.html?personId=${personId}`;
}

function renderIdeas(personIdeas,person){
	ideaList.innerHTML = "";
	console.log(person);
	if(personIdeas.length === 0){
			ideaEmpty.hidden = false;
			return;
	}
	ideaEmpty.hidden = true;
	personIdeas.forEach(function(idea){
		const cardHTML = `<article class="idea-card" data-id="${idea.id}">
						<div class="idea-top">
							<span class="idea-name">${idea.name}</span>
							<select class="idea-status status-${idea.status}">
								${statuses.map(function(status){
									return `<option value="${status.toLowerCase()}" ${status.toLowerCase() === idea.status ? "selected" : ""}>${status}</option>`
								}).join("")}
							</select>
						</div>
						<p class="idea-note">${idea.note||"No notes"}</p>
						<div class="edit-relationship-label">
						<span class="idea-meta">Heard ${idea.heardOn} &middot; ~$${idea.price||0}</span>
						<a class="avatar-${person.colour} edit-idea-button" href="idea-form.html?id=${idea.id}">
						<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil preview-icon"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
						Edit</a>
						</div>
					</article>`;
		ideaList.insertAdjacentHTML("beforeend",cardHTML);
				
	});
}

function init(){
	const person = loadPerson();
	const ideas = loadAllIdeas();
	renderPerson(person);
	renderIdeas(ideas,person);
	
}

init();