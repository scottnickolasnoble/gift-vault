const authForm = document.querySelector("#auth-form");
const authTabs = document.querySelector(".auth-tabs");
const nameField = document.querySelector("#name-field");
const passwordHint = document.querySelector("#password-hint");
const authSubtitle = document.querySelector("#auth-subtitle");
const authSubmit = document.querySelector("#auth-submit");
const authError = document.querySelector("#auth-error");
const params = new URLSearchParams(window.location.search);
let mode = "signin";

// Only send people back to pages on this site after signing in.
function nextPage(){
	const next = params.get("next") || "";
	return next.startsWith("/") && !next.startsWith("//") ? next : "home.html";
}

function setMode(newMode){
	mode = newMode;
	const creating = mode === "signup";
	authTabs.querySelectorAll(".segment").forEach(function(tab){
		const active = tab.dataset.mode === mode;
		tab.classList.toggle("segment-active", active);
		tab.setAttribute("aria-pressed", active ? "true" : "false");
	});
	nameField.hidden = !creating;
	authForm.elements.name.required = creating;
	passwordHint.hidden = !creating;
	authForm.elements.password.autocomplete = creating ? "new-password" : "current-password";
	authSubtitle.textContent = creating
		? "Make an account to keep your gift ideas safe on every device."
		: "Welcome back. Sign in to see your people and plans.";
	authSubmit.textContent = creating ? "Create account" : "Sign in";
	authError.hidden = true;
}

authTabs.addEventListener("click", function(event){
	const tab = event.target.closest(".segment");
	if(!tab){
		return;
	}
	setMode(tab.dataset.mode);
});

authForm.addEventListener("submit", async function(event){
	event.preventDefault();
	authError.hidden = true;
	const name = authForm.elements.name.value;
	const email = authForm.elements.email.value;
	const password = authForm.elements.password.value;
	const label = authSubmit.textContent;
	authSubmit.disabled = true;
	authSubmit.textContent = mode === "signup" ? "Creating account…" : "Signing in…";
	try {
		if(mode === "signup"){
			await signUp(name, email, password);
			window.location.href = "welcome.html";
		} else {
			await signIn(email, password);
			window.location.href = nextPage();
		}
	} catch (error) {
		authError.textContent = error.message;
		authError.hidden = false;
		authSubmit.disabled = false;
		authSubmit.textContent = label;
	}
});

// Already signed in? Skip this page.
async function init(){
	setMode(params.get("mode") === "signup" ? "signup" : "signin");
	try {
		await apiRequest("GET", "/auth/me");
		window.location.href = nextPage();
	} catch (error) {
		// not signed in: stay here
	}
}

init();
