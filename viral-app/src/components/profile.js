import { computeProgress } from "../feed.js";
import { createPostCard } from "./post.js";

export function renderProfileView({ profile, posts, onReact, onComment }) {
  const container = document.createElement("section");
  container.className = "profile-view";
  const hero = document.createElement("div");
  hero.className = "card";

  const heading = document.createElement("h2");
  heading.textContent = profile?.username || "Your profile";

  const { level, progress } = computeProgress(profile?.xp || 0);
  const levelBadge = document.createElement("div");
  levelBadge.className = "badge";
  levelBadge.textContent = `Level ${level}`;

  const statsGrid = document.createElement("div");
  statsGrid.className = "stats-grid";
  statsGrid.innerHTML = `
    <div class="stats-tile">
      <span>XP</span>
      <strong>${profile?.xp ?? 0}</strong>
    </div>
    <div class="stats-tile">
      <span>Posts</span>
      <strong>${posts?.length ?? 0}</strong>
    </div>
    <div class="stats-tile">
      <span>Member since</span>
      <strong>${formatDate(profile?.created_at)}</strong>
    </div>
  `;

  const progressTrack = document.createElement("div");
  progressTrack.style.height = "10px";
  progressTrack.style.background = "rgba(15, 118, 110, 0.15)";
  progressTrack.style.borderRadius = "999px";
  progressTrack.style.overflow = "hidden";

  const progressFill = document.createElement("div");
  progressFill.style.width = `${Math.floor(progress * 100)}%`;
  progressFill.style.height = "100%";
  progressFill.style.background = "var(--accent)";
  progressTrack.append(progressFill);

  hero.append(heading, levelBadge, progressTrack, statsGrid);
  container.append(hero);

  if (posts && posts.length) {
    const feedSection = document.createElement("div");
    feedSection.className = "feed";
    posts.forEach((post) => {
      const card = createPostCard(post, { onReact, onComment });
      feedSection.append(card);
    });
    container.append(feedSection);
  }

  return container;
}

function formatDate(value) {
  if (!value) return "Today";
  if (value.toDate) {
    return value.toDate().toLocaleDateString();
  }
  if (value.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }
  return new Date(value).toLocaleDateString();
}
