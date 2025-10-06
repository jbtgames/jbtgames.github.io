const NAV_ITEMS = [
  { id: "feed", label: "Feed", emoji: "🔥" },
  { id: "discover", label: "Discover", emoji: "✨" },
  { id: "leaderboard", label: "Leaders", emoji: "🏆" },
  { id: "profile", label: "Profile", emoji: "😊" },
];

export function renderNavbar(active, onNavigate) {
  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  NAV_ITEMS.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.route = item.id;
    button.className = item.id === active ? "active" : "";
    button.innerHTML = `<span>${item.emoji}</span><small>${item.label}</small>`;
    button.addEventListener("click", () => onNavigate(item.id));
    nav.appendChild(button);
  });
  return nav;
}
