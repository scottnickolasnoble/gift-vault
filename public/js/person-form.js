const formInfo = document.querySelector('form');
const colours = ["rust","blue","sand","lavender","cream","green"];
const params = new URLSearchParams(window.location.search);
const personLabel = document.querySelector("#person-label");
const avatarPreview = document.querySelector("#avatar-preview");
const personId = params.get("id");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-link");
const deleteButton = document.querySelector("#delete-button");
const deleteDialog = document.querySelector("#delete-dialog");
const confirmDelete = document.querySelector("#confirm-delete");
const keepButton = document.querySelector("#keep-button");
let people = [];


formInfo.addEventListener('submit', async function(event){
	event.preventDefault();
	const details = {
		name: formInfo.elements.name.value,
		relationship: formInfo.elements.relationship.value,
		birthday: formInfo.elements.birthday.value,
		group: formInfo.elements.group.value,
		sizes: formInfo.elements.sizes.value,
		favColour: formInfo.elements.favColour.value,
		loves: formInfo.elements.loves.value,
		avoid: formInfo.elements.avoid.value
	};

	if(!personId){
		details.colour = colours[people.length % colours.length];
		const saved = await whileSaving(saveButton, function(){
			return createPerson(details);
		});
		if(saved){
			window.location.href = `person.html?id=${saved.id}`;
		}
		return;
	}

	const person = people.find(function(per){
		return per.id === personId;
	});
	details.id = personId;
	details.colour = person.colour;
	const saved = await whileSaving(saveButton, function(){
		return updatePerson(details);
	});
	if(saved){
		window.location.href = `person.html?id=${personId}`;
	}
});

deleteButton.addEventListener('click',function(event){
	deleteDialog.showModal();
});

keepButton.addEventListener('click',function(event){
	deleteDialog.close();
});

// The server also deletes their ideas and takes them out of every occasion.
confirmDelete.addEventListener('click', async function(event){
	const done = await whileSaving(confirmDelete, function(){
		return deletePerson(personId);
	});
	if(done){
		window.location.href = "index.html";
	}
});

function setUpEditMode(id){

	const person = people.find(function(per){
		return per.id === id;
	});
	if(!person){
		window.location.href = "index.html";
		return;
	}
	deleteButton.hidden = false;
	personLabel.textContent = "Edit Person";
	const avatar = `<span class="person-initial avatar-${person.colour} avatar-large">${esc(person.name[0].toUpperCase())}</span>`
	avatarPreview.innerHTML = avatar;
	saveButton.textContent = "Save Changes";
	cancelButton.href = `person.html?id=${id}`;

	formInfo.elements.name.value = person.name;
	formInfo.elements.relationship.value = person.relationship;
	formInfo.elements.birthday.value = person.birthday;
	formInfo.elements.group.value = person.group;
	formInfo.elements.sizes.value = person.sizes;
	formInfo.elements.loves.value = person.loves;
	formInfo.elements.favColour.value = person.favColour;
	formInfo.elements.avoid.value = person.avoid;
}

async function init(){
	cancelButton.href = "index.html";
	if(!personId){
		personLabel.textContent = "New Person";
		saveButton.textContent = "Save Person";
	}
	const data = await loadData();
	people = data.people;

	if(!personId){
		const colour = colours[people.length % colours.length];
		avatarPreview.innerHTML = `<span class="person-initial avatar-${colour} avatar-large" id="new-avatar">?</span>
		<p class="avatar-preview-label">Initial and colour are set automatically</p>`;
		formInfo.elements.name.addEventListener("input", function(){
			const first = formInfo.elements.name.value.trim()[0];
			document.querySelector("#new-avatar").textContent = first ? first.toUpperCase() : "?";
		});
		return;
	}
	setUpEditMode(personId);
}

startPage(init);
