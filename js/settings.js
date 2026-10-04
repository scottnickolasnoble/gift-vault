const exportButton = document.querySelector("#export-button");
const importButton = document.querySelector("#import-button");
const importFile = document.querySelector("#import-file");

exportButton.addEventListener('click',function(event){
	const backup = {
		version: 1,
		exportedOn: getTodaysDate(),
		people: loadPeople(),
		ideas: loadAllIdeas()
	}
	const text = JSON.stringify(backup,null,2);
	const file = new Blob([text], { type: "application/json" });
	const url = URL.createObjectURL(file);

	const link = document.createElement("a");
	link.href = url;
	link.download = `gift-vault-backup-${backup.exportedOn}.json`;
	link.click();

	URL.revokeObjectURL(url);
});

importButton.addEventListener('click',function(event){
	importFile.click();
});

importFile.addEventListener('change', async function(event){
	const file = importFile.files[0];
	if(!file){
		return;
	}
	const text = await file.text();
	let backup;
	try {
		backup = JSON.parse(text);
	} catch (error) {
		alert("That file isn't a valid backup.");
		return;
	}
	
	if(!Array.isArray(backup.people) || !Array.isArray(backup.ideas)){
		alert("Not a valid backup");
		return;
	}
	
	const ok = confirm(`Replace your vault with ${backup.people.length} people and ${backup.ideas.length} ideas?`);
if(!ok){
	return;
}

savePeople(backup.people);
saveIdeas(backup.ideas);
window.location.href = "index.html";
});