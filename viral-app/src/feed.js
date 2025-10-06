const ONE_HOUR = 3600 * 1000;

export function rankPosts(posts = []) {
  const now = Date.now();
  return posts
    .map((post) => {
      const timestamp = resolveDate(post.timestamp);
      const ageHours = Math.max(1, (now - timestamp) / ONE_HOUR);
      const engagement = (post.likes || 0) * 5 + (post.comments_count || 0) * 4 - (post.dislikes || 0) * 2;
      const freshnessBoost = Math.max(0.5, 8 / ageHours);
      return {
        ...post,
        computedScore: engagement * freshnessBoost + (post.weekly_score || 0),
      };
    })
    .sort((a, b) => b.computedScore - a.computedScore);
}

export function mergeSeedContent(livePosts, seedPosts, take = 12) {
  const merged = [...rankPosts(seedPosts).map((p) => ({ ...p, seed: true })), ...rankPosts(livePosts)];
  return merged
    .sort((a, b) => b.computedScore - a.computedScore)
    .slice(0, take);
}

export function timeAgo(date) {
  const timestamp = resolveDate(date);
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(days / 365);
  return `${years}y ago`;
}

export function computeLevel(xp = 0) {
  return Math.max(1, Math.floor(xp / 120) + 1);
}

export function computeProgress(xp = 0) {
  const level = computeLevel(xp);
  const currentLevelThreshold = (level - 1) * 120;
  const nextLevelThreshold = level * 120;
  const progress = Math.min(1, (xp - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold));
  return { level, progress };
}

function resolveDate(date) {
  if (!date) return Date.now();
  if (typeof date === "number") return date;
  if (date?.toDate) return date.toDate().getTime();
  if (date?.seconds) return date.seconds * 1000;
  return new Date(date).getTime();
}
