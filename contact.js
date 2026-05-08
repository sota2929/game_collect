const form = document.querySelector("#contactForm");
const statusText = document.querySelector("#formStatus");

form.addEventListener("submit", (event) => {
  if (form.action.includes("REPLACE_WITH_FORM_ID")) {
    event.preventDefault();
    statusText.textContent = "送信先が未設定です。Formspreeで発行されたURLを設定してください。";
    return;
  }

  statusText.textContent = "送信中です...";
});
