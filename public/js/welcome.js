// "Bring your data over": import a backup file from the old Gift Vault into the new account.
const chooseButton = document.querySelector("#choose-button");
const backupFile = document.querySelector("#backup-file");
const moveCounts = document.querySelector("#move-counts");
const countPeople = document.querySelector("#count-people");
const countIdeas = document.querySelector("#count-ideas");
const countOccasions = document.querySelector("#count-occasions");
const moveButton = document.querySelector("#move-button");
const doneLink = document.querySelector("#done-link");
const freshLink = document.querySelector("#fresh-link");
const welcomeTitle = document.querySelector("#welcome-title");
const welcomeLead = document.querySelector("#welcome-lead");
const welcomeSteps = document.querySelector("#welcome-steps");
let backup = null;

chooseButton.addEventListener("click", function(){
	backupFile.click();
});

backupFile.addEventListener("change", async function(){
	const file = backupFile.files[0];
	if(!file){
		return;
	}
	try {
		backup = JSON.parse(await file.text());
	} catch (error) {
		backup = null;
	}
	if(!backup || !Array.isArray(backup.people) || !Array.isArray(backup.ideas)){
		backup = null;
		moveCounts.hidden = true;
		moveButton.hidden = true;
		showMessage("That file isn't a Gift Vault backup.");
		return;
	}
	countPeople.textContent = backup.people.length;
	countIdeas.textContent = backup.ideas.length;
	countOccasions.textContent = Array.isArray(backup.occasions) ? backup.occasions.length : 0;
	moveCounts.hidden = false;
	moveButton.hidden = false;
	chooseButton.textContent = "Choose a different file";
});

moveButton.addEventListener("click", async function(){
	if(!backup){
		return;
	}
	const result = await whileSaving(moveButton, function(){
		return importBackup(backup);
	});
	if(!result){
		return;
	}
	countPeople.textContent = result.imported.people;
	countIdeas.textContent = result.imported.ideas;
	countOccasions.textContent = result.imported.occasions;
	moveCounts.classList.add("move-counts-done");
	welcomeTitle.textContent = "All moved over";
	welcomeLead.textContent = "Everything is in your account now. Sign in on any device and it will be there.";
	welcomeSteps.hidden = true;
	chooseButton.hidden = true;
	moveButton.hidden = true;
	freshLink.hidden = true;
	doneLink.hidden = false;
});

async function init(){
	const data = await loadData();
	// Someone who already has things saved doesn't need this page.
	if(data.people.length > 0){
		welcomeLead.textContent = "Your account already has people in it. Importing a backup will replace everything that's there now.";
	}
}

startPage(init);
