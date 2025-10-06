export function renderLeaderboard(leaders = []) {
  const section = document.createElement("section");
  section.className = "card";

  const heading = document.createElement("h2");
  heading.textContent = "Top Creators";
  section.append(heading);

  if (!leaders.length) {
    const empty = document.createElement("p");
    empty.className = "feed-empty";
    empty.textContent = "Stay tuned — creators are leveling up.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "leaderboard-list";

  leaders.forEach((leader, index) => {
    const item = document.createElement("div");
    item.className = "leaderboard-item";
    const rank = document.createElement("strong");
    rank.textContent = `#${leader.rank ?? index + 1}`;
    const name = document.createElement("div");
    name.innerHTML = `<div>${leader.username || "user"}</div><small>${leader.xp || 0} XP</small>`;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `Lvl ${leader.level || Math.floor((leader.xp || 0) / 120) + 1}`;
    item.append(rank, name, badge);
    list.append(item);
  });

  section.append(list);
  return section;
}
