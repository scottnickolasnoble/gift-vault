const editOccasion = document.querySelector("#edit-occasion");
const dateBoxOccasion = document.querySelector("#date-box-occasion");
const occasionMonth = document.querySelector("#occasion-month");
const occasionDay = document.querySelector("#occasion-day");
const occasionTitle = document.querySelector("#occasion-title");
const occasionWhen = document.querySelector("#occasion-when");
const occasionPill = document.querySelector("#occasion-pill");
const occasionStats = document.querySelector("#occasion-stats");
const statBudget = document.querySelector("#stat-budget");
const statSpent = document.querySelector("#stat-spent");
const statLeft = document.querySelector("#stat-left");
const budgetBar = document.querySelector("#budget-bar");
const budgetBarFill = document.querySelector("#budget-bar-fill");
const budgetWarning = document.querySelector("#budget-warning");
const sortedLine = document.querySelector("#sorted-line");
const peopleHeading = document.querySelector("#people-heading");
const addPeopleLink = document.querySelector("#add-people-link");
const planFilter = document.querySelector("#plan-filter");
const countTodo = document.querySelector("#count-todo");
const countDone = document.querySelector("#count-done");
const occasionPeople = document.querySelector("#occasion-people");
const filterEmpty = document.querySelector("#filter-empty");
const addOccasionIdea = document.querySelector("#add-occasion-idea");
const deleteButton = document.querySelector("#delete-button");
const deleteDialog = document.querySelector("#delete-dialog");
const keepButton = document.querySelector("#keep-button");
const confirmDelete = document.querySelector("#confirm-delete");
const addDialog = document.querySelector("#add-dialog");
const addTitle = document.querySelector("#add-title");
const addList = document.querySelector("#add-list");
const addCount = document.querySelector("#add-count");
const addCancel = document.querySelector("#add-cancel");
const addConfirm = document.querySelector("#add-confirm");
const params = new URLSearchParams(window.location.search);
const occasionId = params.get("id");
const groups = ["family","friends","work","other"];
const statusNames = { idea: "Idea", bought: "Bought", wrapped: "Wrapped", given: "Given" };

let people = [];
let ideas = [];
let filteredOccasion = null;
let isGroup = false;
let currentFilter = "all"; // all / todo / done

// ---------- the top of the page (doesn't change after loading) ----------

function renderHeader(){
	const [month, day] = formatMonthDay(filteredOccasion.date).split(" ");
	const days = daysUntil(filteredOccasion.date);
	document.title = `${filteredOccasion.name} · Gift Vault`;
	occasionTitle.textContent = filteredOccasion.name;
	occasionMonth.textContent = month;
	occasionDay.textContent = day;
	occasionWhen.textContent = `${month} ${day} · ${inDaysText(days)}`;
	occasionPill.textContent = isGroup ? "Group · repeats yearly" : "Repeats yearly";
	dateBoxOccasion.classList.toggle("date-box-dark", isGroup);
	occasionStats.classList.toggle("occasion-stats-dark", isGroup);
	editOccasion.href = `occasion-form.html?id=${filteredOccasion.id}`;
	addPeopleLink.hidden = !isGroup;
	planFilter.hidden = !isGroup;
	addOccasionIdea.textContent = `+ Add a ${filteredOccasion.name} idea`;
}

// ---------- budget, spent and left ----------

function renderStats(){
	const spent = spentForOccasion(filteredOccasion, ideas);
	const budget = filteredOccasion.budget;
	statSpent.textContent = formatMoney(spent) || "$0";

	statBudget.textContent = budget === null ? "None set" : formatMoney(budget);
	statBudget.classList.toggle("stat-empty", budget === null);

	if(budget === null){
		statLeft.textContent = "—";
		budgetBar.hidden = true;
		budgetWarning.hidden = true;
		statLeft.classList.remove("stat-over");
		return;
	}

	const over = spent > budget;
	statLeft.textContent = formatMoney(Math.max(budget - spent, 0)) || "$0";
	statLeft.classList.toggle("stat-over", over);
	budgetBar.hidden = false;
	const percent = budget > 0 ? Math.min(Math.round(spent / budget * 100), 100) : (spent > 0 ? 100 : 0);
	budgetBarFill.style.width = `${percent}%`;
	budgetBarFill.classList.toggle("budget-bar-over", over);
	budgetWarning.hidden = !over;
	budgetWarning.textContent = over ? `${formatMoney(Math.round((spent - budget) * 100) / 100)} over budget` : "";
}

// ---------- the people (and their ideas for this occasion) ----------

function ideaRowsFor(person){
	const theirIdeas = ideasFor(person.id, filteredOccasion.id, ideas);
	if(theirIdeas.length === 0){
		return `<p class="occasion-ideas-empty">No ideas yet &middot; <a href="idea-form.html?personId=${person.id}&occasion=${filteredOccasion.id}">Add idea</a></p>`;
	}
	const rows = theirIdeas.map(function(idea){
		const price = idea.price !== null && idea.price !== undefined ? `<span class="occasion-idea-price">${formatMoney(idea.price)}</span>` : "";
		return `<li class="occasion-idea">
			<a class="occasion-idea-name" href="idea-form.html?id=${idea.id}&occasion=${filteredOccasion.id}">${esc(idea.name)}</a>
			${price}
			<span class="idea-status status-${idea.status}">${statusNames[idea.status]}</span>
		</li>`;
	}).join("");
	return `<ul class="occasion-ideas">${rows}</ul>`;
}

function renderPeople(){
	const inOccasion = people.filter(function(per){
		return filteredOccasion.personIds.includes(per.id);
	});
	const sortedPeople = inOccasion.filter(function(per){
		return isSorted(per.id, filteredOccasion.id, ideas);
	});

	peopleHeading.textContent = isGroup ? `Who's in it · ${inOccasion.length}` : "For";
	sortedLine.hidden = !isGroup || inOccasion.length === 0;
	sortedLine.innerHTML = `<span class="sorted-number">${sortedPeople.length}</span> of ${inOccasion.length} ${inOccasion.length === 1 ? "person" : "people"} sorted`;
	countTodo.textContent = inOccasion.length - sortedPeople.length;
	countDone.textContent = sortedPeople.length;

	const shown = !isGroup ? inOccasion : inOccasion.filter(function(per){
		if(currentFilter === "all") return true;
		const sorted = isSorted(per.id, filteredOccasion.id, ideas);
		return currentFilter === "done" ? sorted : !sorted;
	});

	occasionPeople.innerHTML = "";
	shown.forEach(function(per){
		const status = furthestStatus(per.id, filteredOccasion.id, ideas);
		const pill = !isGroup ? "" : status
			? `<span class="idea-status status-${status}">${statusNames[status]}</span>`
			: `<span class="person-ideas-none">No ideas</span>`;
		const action = isGroup
			? `<button type="button" class="remove-person" aria-label="Remove ${esc(per.name)}">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
			</button>`
			: `<a class="view-profile" href="person.html?id=${per.id}">View profile</a>`;
		const cardHTML = `<li class="occasion-person" data-id="${per.id}">
			<div class="occasion-person-row">
				<span class="person-initial avatar-${per.colour}">${esc(per.name[0].toUpperCase())}</span>
				<span class="occasion-person-info">
					<span class="occasion-person-name">${esc(per.name)}</span>
					<span class="occasion-person-detail">${esc(per.relationship)}</span>
				</span>
				${pill}
				${action}
			</div>
			${ideaRowsFor(per)}
		</li>`;
		occasionPeople.insertAdjacentHTML("beforeend", cardHTML);
	});

	filterEmpty.hidden = shown.length > 0;
	if(inOccasion.length === 0){
		filterEmpty.textContent = "No one's in this occasion yet. Tap + Add people.";
	} else {
		filterEmpty.textContent = currentFilter === "done" ? "Nothing bought yet." : "Everyone's sorted.";
	}

	// The "Add an idea" button picks the person when there's only one.
	const personPart = !isGroup && inOccasion[0] ? `personId=${inOccasion[0].id}&` : "";
	addOccasionIdea.href = `idea-form.html?${personPart}occasion=${filteredOccasion.id}`;
	addOccasionIdea.hidden = inOccasion.length === 0;

	renderStats();
}

// ---------- filters: Everyone / To buy / Done ----------

planFilter.addEventListener("click", function(event){
	const button = event.target.closest(".segment");
	if(!button){
		return;
	}
	currentFilter = button.dataset.filter;
	planFilter.querySelectorAll(".segment").forEach(function(seg){
		const active = seg === button;
		seg.classList.toggle("segment-active", active);
		seg.setAttribute("aria-pressed", active ? "true" : "false");
	});
	renderPeople();
});

// ---------- removing someone ----------

occasionPeople.addEventListener("click", async function(event){
	const removePerson = event.target.closest(".remove-person");
	if (!removePerson) return;

	const personId = removePerson.closest(".occasion-person").dataset.id;
	const before = filteredOccasion.personIds;
	filteredOccasion.personIds = before.filter(function(id){
		return id !== personId;
	});
	renderPeople();
	try {
		await updateOccasion(filteredOccasion.id, { personIds: filteredOccasion.personIds });
	} catch (error) {
		filteredOccasion.personIds = before;
		renderPeople();
		showMessage(error.message);
	}
});

// ---------- adding people ----------

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
					<span class="person-initial avatar-${person.colour}">${esc(person.name[0].toUpperCase())}</span>
					<span class="occasion-person-info">
						<span class="occasion-person-name">${esc(person.name)}</span>
						<span class="occasion-person-detail">${esc(person.relationship)}</span>
					</span>
				</label>
			</li>`;
		}).join("");

		const groupLabel = group[0].toUpperCase() + group.slice(1);
		addList.insertAdjacentHTML("beforeend", `<section class="add-group">
			<div class="section-header">
				<h3>${groupLabel}</h3>
				<button type="button" class="group-select-all" data-group="${group}">Select all</button>
			</div>
			<ul class="check-list">${rowsHTML}</ul>
		</section>`);
	});

	if (notListedPeople.length === 0){
		addList.innerHTML = `<p class="add-hint">Everyone is already in it.</p>`;
	}

	addTitle.textContent = `Add to ${filteredOccasion.name}`;
	updateAddCount();
	addDialog.showModal();
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

addList.addEventListener("change", updateAddCount);

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

addConfirm.addEventListener("click", async function(){
	const newIds = Array.from(addList.querySelectorAll(".add-check:checked")).map(function(box){
		return box.value;
	});
	const saved = await whileSaving(addConfirm, function(){
		return updateOccasion(filteredOccasion.id, { personIds: filteredOccasion.personIds.concat(newIds) });
	});
	if(saved){
		filteredOccasion.personIds = saved.personIds;
		renderPeople();
		addDialog.close();
	}
});

addCancel.addEventListener("click", function(){
	addDialog.close();
});

// ---------- deleting the occasion ----------

deleteButton.addEventListener("click", function(){
	deleteDialog.showModal();
});

keepButton.addEventListener("click", function(){
	deleteDialog.close();
});

confirmDelete.addEventListener("click", async function(){
	const done = await whileSaving(confirmDelete, function(){
		return deleteOccasion(filteredOccasion.id);
	});
	if(done){
		window.location.href = "occasions.html";
	}
});

// ---------- start ----------

async function init(){
	const data = await loadData();
	people = data.people;
	ideas = data.ideas;
	filteredOccasion = data.occasions.find(function(occ){
		return occ.id === occasionId;
	});
	// The occasion was deleted (or the link is wrong): go back to the list.
	if(!filteredOccasion){
		window.location.href = "occasions.html";
		return;
	}
	isGroup = isGroupOccasion(filteredOccasion);
	renderHeader();
	renderPeople();
}

startPage(init);
