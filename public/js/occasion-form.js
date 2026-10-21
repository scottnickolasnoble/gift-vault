const occasionForm = document.querySelector(".occasion-form");
const personInput = document.querySelector("#person-input");
const dayInput = document.querySelector("#day-input");
const monthInput = document.querySelector("#month-input");
const peopleChecklist = document.querySelector("#people-checklist");
const checklistCount = document.querySelector("#checklist-count");
const checklistGroup = document.querySelector("#checklist-groups");
const occasionLabel = document.querySelector("#occasion-label");
const saveOccasion = document.querySelector("#save-occasion");
const cancelLink = document.querySelector("#cancel-link");
const params = new URLSearchParams(window.location.search);
const occasionId = params.get("id"); // there in edit mode
const groups = ["family","friends","work","other"];
let people = [];
let editing = null;

occasionForm.addEventListener("submit", async function(event){
	event.preventDefault();

	const name = occasionForm.elements.name.value;
	const month = occasionForm.elements.month.value;
	const day = occasionForm.elements.day.value;
	const who = document.querySelector('input[name="who"]:checked').value;
	const budgetText = occasionForm.elements.budget.value;
	const formattedDate = String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0");

	const ticked = peopleChecklist.querySelectorAll('input[name="personIds"]:checked');
	const personIds = who === "person" ? [personInput.value] : Array.from(ticked).map(function(tick){
		return tick.value;
	});

	if (personIds.length === 0 || !personIds[0]){
		showMessage("Choose who the occasion is for.");
		return;
	}

	const details = {
		name: name,
		date: formattedDate,
		personIds: personIds,
		budget: budgetText ? Number(budgetText) : null,
		type: who
	};

	const saved = await whileSaving(saveOccasion, function(){
		return editing ? updateOccasion(editing.id, details) : createOccasion(details);
	});
	if(saved){
		window.location.href = `occasion.html?id=${saved.id}`;
	}
});

function showWho(who){
	peopleChecklist.hidden = who !== "group";
	personInput.hidden = who === "group";
}

occasionForm.addEventListener("change",function(event){
	if (event.target.name === "personIds"){
		updateCount();
		return;
	}
	if (event.target.name === "who"){
		showWho(event.target.value);
	}
});

checklistGroup.addEventListener("click",function(event){
	const button = event.target.closest(".select-all");
	if (!button){
		return;
	}
	const section = button.closest(".checklist-section");
	const boxes = section.querySelectorAll('input[name="personIds"]');
	const allTicked = Array.from(boxes).every(function(box){
		return box.checked;
	});
	boxes.forEach(function(box){
		box.checked = !allTicked;
	});
	updateCount();
});

function updateCount(){
	const ticked = peopleChecklist.querySelectorAll('input[name="personIds"]:checked');
	const count = ticked.length;
	checklistCount.textContent = `${count} ${count === 1 ? "person" : "people"} selected`;

	// Each group's button says "Clear" when the whole group is ticked.
	checklistGroup.querySelectorAll(".checklist-section").forEach(function(section){
		const boxes = Array.from(section.querySelectorAll('input[name="personIds"]'));
		const allTicked = boxes.every(function(box){ return box.checked; });
		section.querySelector(".select-all").textContent = allTicked ? "Clear" : "Select all";
	});
}

function drawCheckList(){
	checklistGroup.innerHTML = "";
	groups.forEach(function(group){
		const filteredPeople = people.filter(function(per){
			return (per.group || "other") === group;
		});
		if(filteredPeople.length === 0){
			return;
		}
		let rows = "";
		filteredPeople.forEach(function(per){
			rows += `<label class="checklist-person">
			<input type="checkbox" name="personIds" value="${per.id}">
			<span class="person-initial avatar-${per.colour}">${esc(per.name[0].toUpperCase())}</span>
			<span class="check-name">${esc(per.name)}</span>
			<span class="check-tick"></span>
			</label>`;
		});
		const sectionHTML = `<section class="checklist-section" data-group="${group}">
		<div class="checklist-head">
		<h3>${group[0].toUpperCase()+group.slice(1)}</h3>
		<button type="button" class="select-all" data-group="${group}">Select all</button>
		</div>
		${rows}
		</section>`;
		checklistGroup.insertAdjacentHTML("beforeend",sectionHTML);
	});
}

function populateDays(){
	for (let i = 1; i <= 31; i++){
		const opt = document.createElement("option");
		opt.value = i;
		opt.textContent = i;
		dayInput.appendChild(opt);
	}
}

function populatePeople(){
	people.forEach(function(per){
		const opt = document.createElement("option");
		opt.value = per.id;
		opt.textContent = per.name;
		personInput.appendChild(opt);
	});
}

// Edit mode: fill the form with the saved occasion.
function fillForm(occasion){
	occasionLabel.textContent = "Edit Occasion";
	saveOccasion.textContent = "Save changes";
	cancelLink.href = `occasion.html?id=${occasion.id}`;
	document.title = "Edit occasion · Gift Vault";

	occasionForm.elements.name.value = occasion.name;
	const [month, day] = occasion.date.split("-").map(Number);
	monthInput.value = String(month);
	dayInput.value = String(day);
	occasionForm.elements.budget.value = occasion.budget === null ? "" : occasion.budget;

	const who = isGroupOccasion(occasion) ? "group" : "person";
	document.querySelector(`input[name="who"][value="${who}"]`).checked = true;
	showWho(who); // ticking a radio from code doesn't fire "change", so do it ourselves

	if(who === "person"){
		personInput.value = occasion.personIds[0] || "";
	} else {
		peopleChecklist.querySelectorAll('input[name="personIds"]').forEach(function(box){
			box.checked = occasion.personIds.includes(box.value);
		});
	}
	updateCount();
}

async function init(){
	populateDays();
	const data = await loadData();
	people = data.people.slice().sort(function(a,b){
		return a.name.localeCompare(b.name);
	});
	if(people.length === 0){
		showMessage("Add a person first, then you can make an occasion for them.");
	}
	populatePeople();
	drawCheckList();

	if(occasionId){
		editing = data.occasions.find(function(occ){
			return occ.id === occasionId;
		});
		if(!editing){
			window.location.href = "occasions.html";
			return;
		}
		fillForm(editing);
	}
}

startPage(init);
