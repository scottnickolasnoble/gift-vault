// Talks to the server. This replaces storage.js from V1/V2:
// instead of localStorage, everything is saved to your account in the database.
//
// Every function here is "async": call it with await, e.g.
//   const data = await loadData();
//   const person = await createPerson({ name: "Mom" });

async function apiRequest(method, path, body) {
	const options = {
		method: method,
		headers: {},
		credentials: "same-origin"
	};
	if (body !== undefined || method !== "GET") {
		options.headers["Content-Type"] = "application/json";
		options.body = JSON.stringify(body || {});
	}

	let response;
	try {
		response = await fetch("/api" + path, options);
	} catch (error) {
		throw new Error("Can't reach Gift Vault. Check your connection and try again.");
	}

	// Not signed in (or the session ran out): go to the sign-in page, then come back here.
	if (response.status === 401 && !path.startsWith("/auth/")) {
		const here = location.pathname + location.search;
		location.href = "signin.html?next=" + encodeURIComponent(here);
		return new Promise(function() {}); // stop here while the page changes
	}

	let data = {};
	try {
		data = await response.json();
	} catch (error) {
		// some responses have no body
	}
	if (!response.ok) {
		throw new Error(data.error || "Something went wrong. Try again.");
	}
	return data;
}

// ---------- loading ----------

// Everything for the signed-in user: { user, people, ideas, occasions }
function loadData() {
	return apiRequest("GET", "/data");
}

// ---------- people ----------

function createPerson(person) {
	return apiRequest("POST", "/people", person);
}
function updatePerson(person) {
	return apiRequest("PUT", "/people/" + person.id, person);
}
function deletePerson(id) {
	return apiRequest("DELETE", "/people/" + id);
}

// ---------- ideas ----------

function createIdea(idea) {
	return apiRequest("POST", "/ideas", idea);
}
// Send only what changed, e.g. updateIdea(id, { status: "bought" })
function updateIdea(id, changes) {
	return apiRequest("PUT", "/ideas/" + id, changes);
}
function deleteIdea(id) {
	return apiRequest("DELETE", "/ideas/" + id);
}

// ---------- occasions ----------

function createOccasion(occasion) {
	return apiRequest("POST", "/occasions", occasion);
}
// Send only what changed, e.g. updateOccasion(id, { personIds: [...] })
function updateOccasion(id, changes) {
	return apiRequest("PUT", "/occasions/" + id, changes);
}
function deleteOccasion(id) {
	return apiRequest("DELETE", "/occasions/" + id);
}

// ---------- backups ----------

// Replaces everything in the account with what's in a backup file.
function importBackup(backup) {
	return apiRequest("POST", "/import", backup);
}

// ---------- account ----------

function signUp(name, email, password) {
	return apiRequest("POST", "/auth/signup", { name: name, email: email, password: password });
}
function signIn(email, password) {
	return apiRequest("POST", "/auth/login", { email: email, password: password });
}
async function signOut() {
	await apiRequest("POST", "/auth/logout");
	location.href = "signin.html";
}
function deleteAccount(password) {
	return apiRequest("POST", "/auth/delete-account", { password: password });
}

// ---------- small helpers every page uses ----------

// Makes text safe to put inside HTML (so a name like "<b>Mom</b>" shows as typed).
function esc(value) {
	return String(value === undefined || value === null ? "" : value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

// A short message that pops up at the bottom of the screen.
function showMessage(text) {
	let toast = document.querySelector("#toast");
	if (!toast) {
		toast = document.createElement("div");
		toast.id = "toast";
		toast.className = "toast";
		toast.setAttribute("role", "status");
		document.body.appendChild(toast);
	}
	toast.textContent = text;
	toast.classList.add("toast-show");
	clearTimeout(showMessage.timer);
	showMessage.timer = setTimeout(function() {
		toast.classList.remove("toast-show");
	}, 4000);
}

// Turns a button into "Saving…" while work happens, then back again.
// Gives back what the work returned, or nothing (undefined) if it failed.
async function whileSaving(button, work) {
	const label = button.textContent;
	button.disabled = true;
	button.textContent = "Saving…";
	try {
		return await work();
	} catch (error) {
		showMessage(error.message);
		return undefined;
	} finally {
		button.disabled = false;
		button.textContent = label;
	}
}

// Runs a page's start-up code and shows a message if anything fails.
function startPage(init) {
	init().catch(function(error) {
		console.error(error);
		showMessage(error.message);
	});
}
