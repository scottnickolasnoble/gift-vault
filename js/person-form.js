const formInfo = document.querySelector('form')
const colours = ["rust","blue","sand","lavender","cream","green"];
const params = new URLSearchParams(window.location.search);
const personLabel = document.querySelector("#person-label");
const avatarPreview = document.querySelector("#avatar-preview");
const people = loadPeople();;
const ideas = loadAllIdeas();
const personId = params.get("id");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-link");
const deleteButton = document.querySelector("#delete-button");
const deleteDialog = document.querySelector("#delete-dialog");
const confirmDelete = document.querySelector("#confirm-delete");
const keepButton = document.querySelector("#keep-button");


formInfo.addEventListener('submit', function(event){
	event.preventDefault();
	const name = formInfo.elements.name.value;
	const relationship = formInfo.elements.relationship.value;
	const birthday = formInfo.elements.birthday.value;
	const group = formInfo.elements.group.value;
	
	if(!personId){
		const person = {
			id: crypto.randomUUID(), 
			name,
			relationship,
			birthday,
			colour: colours[people.length%colours.length],
			group
			};
			
	
		people.push(person);
		savePeople(people);
		window.location.href = "index.html";
		return;
	}
	
	const person = people.find(function(per){
		return per.id === personId;
	})
	
	person.name = name;
	person.relationship = relationship;
	person.birthday = birthday;
	person.group = group;
	savePeople(people);
	window.location.href = `person.html?id=${personId}`;
	return;
});

deleteButton.addEventListener('click',function(event){
	deleteDialog.showModal();
});

keepButton.addEventListener('click',function(event){
	deleteDialog.close();
});

confirmDelete.addEventListener('click',function(event){
	const remainingPeople = people.filter(function(per){
		return per.id !== personId;
	});
	const remainingIdeas = ideas.filter(function(idea){
		return idea.personId !== personId;
	});
	savePeople(remainingPeople);
	saveIdeas(remainingIdeas);
	window.location.href = "index.html";
	
});

function setUpEditMode(id){
	
	const person = people.find(function(per){
		return per.id === id;
	});
	deleteButton.hidden = false;
	personLabel.textContent = "Edit Person";
	const avatar = `<span class="person-initial avatar-${person.colour} avatar-large">${person.name[0].toUpperCase()}</span>`
	avatarPreview.innerHTML = avatar;
	saveButton.textContent = "Save Changes";
	cancelButton.href = `person.html?id=${id}`;
	
	formInfo.elements.name.value = `${person.name}`;
	formInfo.elements.relationship.value = `${person.relationship}`;
	formInfo.elements.birthday.value = person.birthday;
	formInfo.elements.group.value = person.group;
}

function init(){
	
	if(!personId){
		personLabel.textContent = "New Person";
		const preview = `<span class="person-initial avatar-rust avatar-large">L</span>
		<p class="avatar-preview-label">Initial and colour are set automatically</p>
		`;
		avatarPreview.innerHTML = preview;
		saveButton.textContent = "Save Person";
		cancelButton.href = "index.html";
		return;
	}
	setUpEditMode(personId);
}

init();