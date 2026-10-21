const exportButton = document.querySelector("#export-button");
const importButton = document.querySelector("#import-button");
const importFile = document.querySelector("#import-file");
const accountAvatar = document.querySelector("#account-avatar");
const accountName = document.querySelector("#account-name");
const accountEmail = document.querySelector("#account-email");
const countPeople = document.querySelector("#count-people");
const countIdeas = document.querySelector("#count-ideas");
const countOccasions = document.querySelector("#count-occasions");
const signOutButton = document.querySelector("#sign-out-button");
const deleteAccountButton = document.querySelector("#delete-account-button");
const accountDialog = document.querySelector("#account-dialog");
const accountForm = document.querySelector("#account-form");
const accountKeep = document.querySelector("#account-keep");
const accountConfirm = document.querySelector("#account-confirm");
let data = null;

// Backup version 2: people, ideas and occasions (version 1 only had people and ideas).
exportButton.addEventListener('click', async function(event){
	data = await loadData();
	const backup = {
		version: 2,
		exportedOn: getTodaysDate(),
		people: data.people,
		ideas: data.ideas,
		occasions: data.occasions
	};
	const text = JSON.stringify(backup,null,2);
	const file = new Blob([text], { type: "application/json" });
	const url = URL.createObjectURL(file);

	const link = document.createElement("a");
	link.href = url;
	link.download = `gift-vault-backup-${backup.exportedOn}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();

	setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
});

importButton.addEventListener('click',function(event){
	importFile.click();
});

importFile.addEventListener('change', async function(event){
	const file = importFile.files[0];
	importFile.value = "";
	if(!file){
		return;
	}
	let backup;
	try {
		backup = JSON.parse(await file.text());
	} catch (error) {
		showMessage("That file isn't a valid backup.");
		return;
	}

	if(!backup || !Array.isArray(backup.people) || !Array.isArray(backup.ideas)){
		showMessage("That file isn't a Gift Vault backup.");
		return;
	}
	const occasionCount = Array.isArray(backup.occasions) ? backup.occasions.length : 0;

	const ok = confirm(`Replace everything in your account with ${backup.people.length} people, ${backup.ideas.length} ideas and ${occasionCount} occasions?`);
	if(!ok){
		return;
	}

	const result = await whileSaving(importButton, function(){
		return importBackup(backup);
	});
	if(result){
		showMessage(`Imported ${result.imported.people} people, ${result.imported.ideas} ideas and ${result.imported.occasions} occasions.`);
		await showAccount();
	}
});

signOutButton.addEventListener("click", function(){
	signOut().catch(function(error){
		showMessage(error.message);
	});
});

deleteAccountButton.addEventListener("click", function(){
	accountForm.reset();
	accountDialog.showModal();
});

accountKeep.addEventListener("click", function(){
	accountDialog.close();
});

accountForm.addEventListener("submit", async function(event){
	event.preventDefault();
	const done = await whileSaving(accountConfirm, function(){
		return deleteAccount(accountForm.elements.password.value);
	});
	if(done){
		window.location.href = "signin.html";
	}
});

async function showAccount(){
	data = await loadData();
	accountAvatar.textContent = (data.user.name[0] || "?").toUpperCase();
	accountName.textContent = data.user.name;
	accountEmail.textContent = data.user.email;
	countPeople.textContent = data.people.length;
	countIdeas.textContent = data.ideas.length;
	countOccasions.textContent = data.occasions.length;
}

startPage(showAccount);
