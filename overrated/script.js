const cards = document.querySelectorAll(".game-card");
const filterControls = document.querySelectorAll('[data-filter]');
const shareButton = document.querySelector('[data-action="share"]');
const statusTime = document.querySelector("#status-time");
const meterCards = document.querySelectorAll(".pulse-card");

const updateToggleState = (toggle, panel, expanded) => {
  toggle.setAttribute("aria-expanded", expanded);
  panel.classList.toggle("open", expanded === "true");
};

cards.forEach((card) => {
  const toggle = card.querySelector(".toggle");
  const panel = card.querySelector(".toggle-panel");

  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true" ? "false" : "true";
    updateToggleState(toggle, panel, expanded);
  });

  toggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const expanded = toggle.getAttribute("aria-expanded") === "true" ? "false" : "true";
      updateToggleState(toggle, panel, expanded);
    }
  });

  updateToggleState(toggle, panel, "false");
});

const setActiveFilter = (filter) => {
  filterControls.forEach((control) => {
    const isActive = control.dataset.filter === filter;
    control.classList.toggle("active", isActive);
    if (control.hasAttribute("aria-pressed")) {
      control.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    if (control.classList.contains("nav-btn")) {
      control.classList.toggle("active", isActive);
    }
  });

  cards.forEach((card) => {
    const isMatch = filter === "all" || card.dataset.category === filter;
    card.hidden = !isMatch;
    card.setAttribute("aria-hidden", isMatch ? "false" : "true");
  });
};

if (filterControls.length) {
  filterControls.forEach((control) => {
    control.addEventListener("click", () => {
      const { filter } = control.dataset;
      if (!filter) {
        return;
      }
      setActiveFilter(filter);
    });
  });

  setActiveFilter("all");
}

if (shareButton) {
  shareButton.addEventListener("click", async () => {
    const shareData = {
      title: "Overrated Gaming Trends",
      text: "Check out this tongue-in-cheek list of overrated gaming fads!",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.warn("Share cancelled", error);
      }
    } else {
      window.alert("Sharing isn't supported here, but you can copy the link!");
    }
  });
}

if (statusTime) {
  const renderTime = () => {
    const now = new Date();
    statusTime.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  renderTime();
  setInterval(renderTime, 60_000);
}

meterCards.forEach((pulseCard) => {
  const value = Number.parseInt(pulseCard.dataset.meterValue ?? "0", 10);
  const fill = pulseCard.querySelector(".meter-fill");

  if (!fill) return;

  requestAnimationFrame(() => {
    fill.style.width = `${Math.min(Math.max(value, 0), 100)}%`;
  });
});
