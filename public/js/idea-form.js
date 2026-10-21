const params = new URLSearchParams(window.location.search);
const ideaId = params.get("id");
const fromOccasion = params.get("occasion"); // set when opened from an occasion page or Home
let personId = params.get("personId");
const cancelLink = document.querySelector("#cancel-link");
const formInfo = document.querySelector('form');
const editIdeaLabel = document.querySelector("#idea-form-title");
const saveButton = document.querySelector("#save-button");
const deleteButton = document.querySelector("#delete-button");
const deleteDialog = document.querySelector("#delete-dialog");
const keepButton = document.querySelector("#keep-button");
const confirmDelete = document.querySelector("#confirm-delete");
const personSelect = document.querySelector("#person-select");
const occasionChips = document.querySelector("#occasion-chips");
let people = [];
let ideas = [];
let occasions = [];

// Where to go after saving, cancelling or deleting.
function returnPage(){
	if(fromOccasion && fromOccasion !== "birthday" && occasions.some(function(occ){ return occ.id === fromOccasion; })){
		return `occasion.html?id=${fromOccasion}`;
	}
	return personId ? `person.html?id=${personId}` : "index.html";
}

// The "Which occasion?" chips: Any time, Birthday (if they have one),
// and every occasion this person is part of.
function drawChips(forPersonId, selected){
	const person = people.find(function(per){ return per.id === forPersonId; });
	const choices = [{ value: "", label: "Any time" }];
	if(person && person.birthday){
		choices.push({ value: "birthday", label: "Birthday" });
	}
	occasions.forEach(function(occasion){
		if(occasion.personIds.includes(forPersonId)){
			choices.push({ value: occasion.id, label: occasion.name });
		}
	});
	const pick = choices.some(function(choice){ return choice.value === selected; }) ? selected : "";
	occasionChips.innerHTML = choices.map(function(choice){
		return `<label class="add-person-chip occasion-chip">
			<input type="radio" name="occasion" value="${choice.value}" ${choice.value === pick ? "checked" : ""}>
			<span>${esc(choice.label)}</span>
		</label>`;
	}).join("");
}

function selectedOccasion(){
	const checked = formInfo.querySelector('input[name="occasion"]:checked');
	return checked && checked.value ? checked.value : null;
}

personSelect.addEventListener("change", function(){
	personId = personSelect.value;
	drawChips(personId, selectedOccasion());
	cancelLink.href = returnPage();
});

formInfo.addEventListener("submit", async function(event){
	event.preventDefault();
	const details = {
		personId: personSelect.value,
		name: formInfo.elements.name.value,
		note: formInfo.elements.note.value,
		heardOn: formInfo.elements.heardOn.value,
		price: formInfo.elements.price.value === "" ? null : Number(formInfo.elements.price.value),
		link: formInfo.elements.link.value,
		occasionId: selectedOccasion()
	};
	personId = details.personId;

	const saved = await whileSaving(saveButton, function(){
		return ideaId ? updateIdea(ideaId, details) : createIdea(details);
	});
	if(saved){
		window.location.href = returnPage();
	}
});

deleteButton.addEventListener('click',function(event){
	deleteDialog.showModal();
});

keepButton.addEventListener('click',function(event){
	deleteDialog.close();
});

confirmDelete.addEventListener('click', async function(event){
	const done = await whileSaving(confirmDelete, function(){
		return deleteIdea(ideaId);
	});
	if(done){
		window.location.href = returnPage();
	}
});

function fillPeople(){
	const sorted = people.slice().sort(function(a, b){
		return a.name.localeCompare(b.name);
	});
	personSelect.innerHTML = sorted.map(function(per){
		return `<option value="${per.id}">${esc(per.name)}</option>`;
	}).join("");
	if(personId && people.some(function(per){ return per.id === personId; })){
		personSelect.value = personId;
	}
	personId = personSelect.value;
}

async function init(){
	const data = await loadData();
	people = data.people;
	ideas = data.ideas;
	occasions = data.occasions;

	if(people.length === 0){
		showMessage("Add a person first, then you can save ideas for them.");
		window.location.href = "person-form.html";
		return;
	}

	if(!ideaId){
		fillPeople();
		formInfo.elements.heardOn.value = getTodaysDate();
		drawChips(personId, fromOccasion || "");
		cancelLink.href = returnPage();
		return;
	}

	const idea = ideas.find(function(idea){
		return idea.id === ideaId;
	});
	if(!idea){
		window.location.href = "index.html";
		return;
	}
	personId = idea.personId;
	fillPeople();
	editIdeaLabel.textContent = "Edit Idea";
	saveButton.textContent = "Save Changes";
	deleteButton.hidden = false;
	formInfo.elements.name.value = idea.name;
	formInfo.elements.note.value = idea.note;
	formInfo.elements.heardOn.value = idea.heardOn;
	formInfo.elements.price.value = idea.price === null ? "" : idea.price;
	formInfo.elements.link.value = idea.link;
	drawChips(personId, idea.occasionId || "");
	cancelLink.href = returnPage();
}

startPage(init);
