const occasionForm = document.querySelector(".occasion-form");
const personInput = document.querySelector("#person-input");
const dayInput = document.querySelector("#day-input");
const peopleChecklist = document.querySelector("#people-checklist");
const checklistCount = document.querySelector("#checklist-count");
const checklistGroup = document.querySelector("#checklist-groups");
const people = loadPeople();
const occasions = loadOccasions();


people.sort(function(a,b){
	return a.name.localeCompare(b.name);
});


const groups = ["family","friends","work","other"];
occasionForm.addEventListener("submit",function(event){
	event.preventDefault();
	
	const name = occasionForm.elements.name.value;
	const month = occasionForm.elements.month.value;
	const day = occasionForm.elements.day.value;
	const who = document.querySelector('input[name="who"]:checked').value;
	const budgetText = occasionForm.elements.budget.value;
	const budget = budgetText ? Number(budgetText) : null;
	console.log(budget);
	const formattedMonth = String(month).padStart(2,"0");
	const formattedDay = String(day).padStart(2,"0");
	const formattedDate = formattedMonth + "-" + formattedDay;
	
	const ticked = peopleChecklist.querySelectorAll('input[name="personIds"]:checked');
	
	const personIds = who === "person" ? [personInput.value] : Array.from(ticked).map(function(tick){
		return tick.value;
	});
	
	if (personIds.length === 0){
		alert("You must choose a person or group to assign the occasion too.");
		return;
	}
	
	const occasionObj = {
		id: crypto.randomUUID(),
		name,
		date: formattedDate,
		personIds: personIds,
		budget: budgetText ? Number(budgetText).
		type: who
	}
	
	occasions.push(occasionObj);
	saveOccasions(occasions);
	window.location.href = "occasions.html";
});

occasionForm.addEventListener("change",function(event){
	if (event.target.name === "personIds"){
		updateCount();
		return;
	}
	if (event.target.name !== "who"){
		return;
	}
	if (event.target.value === "group") {
		peopleChecklist.hidden = false;
		personInput.hidden = true;
	} else {
		peopleChecklist.hidden = true;
		personInput.hidden = false;
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
	console.log(allTicked);
	boxes.forEach(function(box){
		box.checked = !allTicked;
	});
	button.textContent = allTicked ? "Select all" : "Clear";
	updateCount();
})

function updateCount(){
	const ticked = peopleChecklist.querySelectorAll('input[name="personIds"]:checked');
	const count = ticked.length;
	checklistCount.textContent = `${count} ${count === 1 ? "person" : "people"} selected`;
}

function drawCheckList(){
	groups.forEach(function(group){
		const filteredPeople = people.filter(function(per){
			return per.group === group;
		});
		if(filteredPeople.length === 0){
			return;
		}
		let rows = ""
		filteredPeople.forEach(function(per){
			rows += `<label class="checklist-person">
			<input type="checkbox" name="personIds" value="${per.id}">
			<span class="person-initial avatar-${per.colour}">${per.name[0].toUpperCase()}</span>
			<span class="check-name">${per.name}</span>
			<span class="check-tick"></span>
			</label>`
		})
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
		opt.innerHTML = i;
		dayInput.appendChild(opt);
	}
}

function populatePeople(){
	const personOpt = people.forEach(function(per){
		const opt = document.createElement("option");
		opt.value = per.id;
		opt.textContent = per.name;
		personInput.appendChild(opt);
	});
	
}

function init(){
	populateDays();
	populatePeople();
	drawCheckList();
}

init();