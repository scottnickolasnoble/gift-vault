const editOccasion = document.querySelector("#edit-occasion");
const dateBoxOccasion = document.querySelector("#date-box-occasion");
const occasionMonth = document.querySelector("#occasion-month");
const occasionDay = document.querySelector("#occasion-day");
const occasionTitle = document.querySelector("#occasion-title");
const occasionWhen = document.querySelector("#occasion-when");
const occasionPill = document.querySelector("#occasion-pill");
const statBudget = document.querySelector("#stat-budget");
const statSpent = document.querySelector("#stat-spent");
const peopleHeading = document.querySelector("#people-heading");
const addPeopleLink = document.querySelector("#add-people-link");
const occasionPeople = document.querySelector("#occasion-people");
const deleteButton = document.querySelector("#delete-button");
const deleteDialog = document.querySelector("#delete-dialog");
const keepButton = document.querySelector("#keep-button");
const confirmDelete = document.querySelector("#confirm-delete");
const occasionFooter = document.querySelector("#occasion-footer");
const addDialog = document.querySelector("#add-dialog");
const addTitle = document.querySelector("#add-title");
const addList = document.querySelector("#add-list");
const addCount = document.querySelector("#add-count");
const addCancel = document.querySelector("#add-cancel");
const addConfirm = document.querySelector("#add-confirm");
const params = new URLSearchParams(window.location.search);
const occasionId = params.get("id");
const groups = ["family","friends","work","other"];
const occasions = loadOccasions();
const people = loadPeople();

const filteredOccasion = occasions.find(function(occ){
	return occ.id === occasionId;
	});

const isGroup = filteredOccasion.type
  ? filteredOccasion.type === "group"
  : filteredOccasion.personIds.length > 1;


addPeopleLink.addEventListener("click", function(){
	const notListedPeople = people.filter(function(per){
		return !filteredOccasion.personIds.includes(per.id);
	});

	addList.innerHTML = "";

	groups.forEach(function(group){
		const peopleGroup = notListedPeople.filter(function(per){
			return (per.group || "other") === group;
		});

		if (peopleGroup.length === 0){
			return;
		}

		const rowsHTML = peopleGroup.map(function(person){
			return `<li>
				<label class="check-row">
					<input type="checkbox" class="add-check" value="${person.id}" data-group="${group}">
					<span class="person-initial avatar-${person.colour}">${person.name[0].toUpperCase()}</span>
					<span class="occasion-person-info">
						<span class="occasion-person-name">${person.name}</span>
						<span class="occasion-person-detail">${person.relationship}</span>
					</span>
				</label>
			</li>`;
		}).join("");

		const groupLabel = group[0].toUpperCase() + group.slice(1);

		const sectionHTML = `<section class="add-group">
			<div class="section-header">
				<h3>${groupLabel}</h3>
				<button type="button" class="group-select-all" data-group="${group}">Select all</button>
			</div>
			<ul class="check-list">${rowsHTML}</ul>
		</section>`;

		addList.insertAdjacentHTML("beforeend", sectionHTML);
	});
	
	addDialog.showModal();
	addTitle.textContent = `Add to ${filteredOccasion.name}`;
});
addList.addEventListener("click", function(event){
	const button = event.target.closest(".group-select-all");
	if (!button) return;

	const boxes = Array.from(addList.querySelectorAll(`.add-check[data-group="${button.dataset.group}"]`));
	const allTicked = boxes.every(function(box){ return box.checked; });

	boxes.forEach(function(box){
		box.checked = !allTicked;
	});

	updateAddCount();
});
addConfirm.addEventListener("click", function(){
	const newIds = Array.from(addList.querySelectorAll(".add-check:checked")).map(function(box){
		return box.value;
	});

	filteredOccasion.personIds = filteredOccasion.personIds.concat(newIds);
	saveOccasions(occasions);
	renderPeople();
	addDialog.close();
});
addCancel.addEventListener("click", function(){
	addDialog.close();
});
occasionPeople.addEventListener("click",function(event){
	const removePerson = event.target.closest(".remove-person");
	
	if (!removePerson) return;
	
	const personId = event.target.closest(".occasion-person").dataset.id;
	
	filteredOccasion.personIds = filteredOccasion.personIds.filter(function(occ){
		return occ !== personId;
	});
	
	saveOccasions(occasions);
	renderPeople();
});

function updateAddCount(){
	const ticked = addList.querySelectorAll(".add-check:checked").length;

	addCount.textContent = `${ticked} selected`;
	addConfirm.disabled = ticked === 0;
	addConfirm.textContent = ticked === 0 ? "Add people" : ticked === 1 ? "Add 1 person" : `Add ${ticked} people`;

	addList.querySelectorAll(".group-select-all").forEach(function(button){
		const boxes = Array.from(addList.querySelectorAll(`.add-check[data-group="${button.dataset.group}"]`));
		const allTicked = boxes.every(function(box){ return box.checked; });
		button.textContent = allTicked ? "Clear" : "Select all";
	});
}

addList.addEventListener("change", updateAddCount);
function renderPeople(){
	const filteredPeople = people.filter(function(per){
		return filteredOccasion.personIds.includes(per.id);
	});

	if(isGroup){
		dateBoxOccasion.classList.add("date-box-dark");
		peopleHeading.textContent = `Who's in it · ${filteredPeople.length}`;
		addPeopleLink.hidden = false;
	} else {
		dateBoxOccasion.classList.remove("date-box-dark");
		peopleHeading.textContent = "For";
		addPeopleLink.hidden = true;
	}

	const formatDate = formatMonthDay(filteredOccasion.date);
	const [month,day] = formatDate.split(" ");

	occasionTitle.textContent = filteredOccasion.name;

	occasionMonth.textContent = month;
	occasionDay.textContent = day;
	occasionWhen.textContent = `${month} ${day} · ${daysUntil(filteredOccasion.date) === 1 ? "in 1 day" : daysUntil(filteredOccasion.date) === 0 ? "Today" : "in " + daysUntil(filteredOccasion.date) + " days"}`;
	occasionPill.textContent = `${isGroup ? "Group · repeats yearly" : "Repeats yearly"}`;

	editOccasion.href = `occasion-form.html?id=${filteredOccasion.id}`;

	statBudget.textContent = filteredOccasion.budget === null ? "No budget set" : `$${filteredOccasion.budget}`;
	statBudget.classList.toggle("stat-empty", filteredOccasion.budget === null);
	statSpent.textContent = "$0";
	occasionPeople.innerHTML = "";
	filteredPeople.forEach(function(per){
		const cardHTML = `<li class="occasion-person" data-id="${per.id}">
		<span class="person-initial avatar-${per.colour}">${per.name[0].toUpperCase()}</span>
		<span class="occasion-person-info">
			<span class="occasion-person-name">${per.name}</span>
			<span class="occasion-person-detail">${per.relationship}</span>
		</span>
		${isGroup ? `<button type="button" class="remove-person">X</button>` : `<a class="view-profile" href="person.html?id=${per.id}">View profile</a>`}
		</li>`;
		occasionPeople.insertAdjacentHTML("beforeend",cardHTML);

});
	occasionFooter.textContent = `Gift ideas tagged for ${filteredOccasion.name} will show up here next to ${isGroup ? "each person" : filteredPeople[0].name}.`;
}

renderPeople();

