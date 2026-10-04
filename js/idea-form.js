const params = new URLSearchParams(window.location.search);
const personId = params.get("personId");
const ideaId = params.get("id");
const cancelLink = document.querySelector("#cancel-link");
cancelLink.href = `person.html?id=${personId}`;
const formInfo = document.querySelector('form');
const ideas = loadAllIdeas();
const editIdeaLabel = document.querySelector("#idea-form-title");
const saveButton = document.querySelector("#save-button");
const deleteButton = document.querySelector("#delete-button");
const deleteDialog = document.querySelector("#delete-dialog");
const keepButton = document.querySelector("#keep-button");
const confirmDelete = document.querySelector("#confirm-delete");

formInfo.addEventListener("submit", function(event){
	event.preventDefault();
	const name = formInfo.elements.name.value;
	const note = formInfo.elements.note.value;
	const heardOn = formInfo.elements.heardOn.value;
	const price = Number(formInfo.elements.price.value);
	const link = formInfo.elements.link.value;
	
	if(!ideaId){
		const idea = {
			name,
			note,
			heardOn,
			price,
			link,
			id: crypto.randomUUID(),
			personId,
			status: "idea"
		};
	
		ideas.push(idea);
		saveIdeas(ideas);
		window.location.href = cancelLink.href;
		return;
	}
	
	const ideaEdited = ideas.find(function(idea){
		return idea.id === ideaId;
	});
	
	ideaEdited.name = name;
	ideaEdited.note = note;
	ideaEdited.heardOn = heardOn;
	ideaEdited.price = price;
	ideaEdited.link = link;
	
	saveIdeas(ideas);
	window.location.href = cancelLink.href;
	
});

deleteButton.addEventListener('click',function(event){
	deleteDialog.showModal();
});

keepButton.addEventListener('click',function(event){
	deleteDialog.close();
});

confirmDelete.addEventListener('click',function(event){
	const deleteIdea = ideas.filter(function(idea){
		return idea.id !== ideaId;
	});
	
	localStorage.setItem("ideas", JSON.stringify(deleteIdea));
	window.location.href = cancelLink.href;
});

function renderEditForm(){
	const editIdea = ideas.find(function(idea){
		return idea.id === ideaId;
	});
	cancelLink.href = `person.html?id=${editIdea.personId}`;
	editIdeaLabel.textContent = "Edit Idea";
	formInfo.elements.name.value = editIdea.name;
	formInfo.elements.note.value = editIdea.note;
	formInfo.elements.heardOn.value = editIdea.heardOn;
	formInfo.elements.price.value = editIdea.price;
	formInfo.elements.link.value = editIdea.link;
	saveButton.textContent = "Save Changes";
	deleteButton.hidden = false;
}

function getTodaysDate(){
	const today = new Date();
	const month = today.getMonth() + 1;
	const year = today.getFullYear();
	const day = today.getDate();
	
	const monthFormatted = String(month).padStart(2, "0");
	const dayFormatted = String(day).padStart(2, "0");
	
	const todaysDate = `${year}-${monthFormatted}-${dayFormatted}`;
	
	return todaysDate;
}

function init(){
	if(!ideaId){
		saveButton.textContent = "Save Idea";
		formInfo.elements.name.value = "";
		formInfo.elements.note.value = "";
		formInfo.elements.heardOn.value = getTodaysDate();
		formInfo.elements.price.value = "";
		formInfo.elements.link.value = "";
		return;
	}
	renderEditForm();
}

init();