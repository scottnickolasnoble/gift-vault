function loadPeople(){
	const people = JSON.parse(localStorage.getItem("people")) || [];
	return people;
}

function loadAllIdeas(){
	const ideas = JSON.parse(localStorage.getItem("ideas")) || [];
	return ideas;
}

function savePeople(people){
	localStorage.setItem("people",JSON.stringify(people));
}

function saveIdeas(ideas){
	localStorage.setItem("ideas",JSON.stringify(ideas));
}