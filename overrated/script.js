const cards = document.querySelectorAll(".game-card");

cards.forEach((card) => {
  const toggle = card.querySelector(".toggle");
  const panel = card.querySelector(".toggle-panel");

  if (!toggle || !panel) return;

  const updateState = (expanded) => {
    toggle.setAttribute("aria-expanded", expanded);
    panel.classList.toggle("open", expanded === "true");
  };

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true" ? "false" : "true";
    updateState(expanded);
  });

  toggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const expanded = toggle.getAttribute("aria-expanded") === "true" ? "false" : "true";
      updateState(expanded);
    }
  });

  // Initialize collapsed state
  updateState("false");
});
