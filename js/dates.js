function formatMonthDay(dateString){
	const [year, month, day] = dateString.split("-").map(Number);
	const date = new Date()
	const newDate = new Date(date.getFullYear(), month-1, day);
	
	const formatDate = newDate.toLocaleDateString("en-US", {month: "short", day: "numeric"});
	return formatDate;
}

function birthdayLabel(dateString){
	if(dateString === ""){
		return "";
	}
	const days = daysUntil(dateString);
	if(days === 0){
		return "Birthday Today!";
	}
	if(days === 1){
		return "Birthday Tomorrow!";
	}
	if(days <= 30){
		return `Birthday in ${days} days`;
	}
	return `Birthday ${formatMonthDay(dateString)}`;
}

function daysUntil(dateString){
	const [year, month, day] = dateString.split("-").map(Number);
	
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	
	const next = new Date(today.getFullYear(), month -1, day);
	
	if (next < today){
		next.setFullYear(today.getFullYear() + 1);
	}
	
	const msPerDay = 1000 * 60 * 60 * 24;
	return Math.round((next - today) / msPerDay);
}

function getTodaysDate() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}