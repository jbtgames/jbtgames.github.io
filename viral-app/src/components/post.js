import { timeAgo } from "../feed.js";

export function createPostCard(post, { onReact, onComment, onViewComments }) {
  const card = document.createElement("article");
  card.className = "card post";
  card.dataset.postId = post.id;

  const header = document.createElement("div");
  header.className = "post-header";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = getInitials(post.author?.username || "?");

  const meta = document.createElement("div");
  meta.className = "post-meta";
  const username = document.createElement("strong");
  username.textContent = post.author?.username || "Anon";
  const metaInfo = document.createElement("span");
  metaInfo.textContent = `${timeAgo(post.timestamp)} · ${post.likes || 0} likes`;
  meta.append(username, metaInfo);

  const seedBadge = document.createElement("span");
  if (post.seed) {
    seedBadge.className = "badge";
    seedBadge.textContent = "🤖 Spark Bot";
  }

  header.append(avatar, meta);
  if (post.seed) {
    header.append(seedBadge);
  }

  const content = document.createElement("p");
  content.className = "post-content";
  content.textContent = post.content;

  card.append(header, content);

  if (post.image_url) {
    const image = document.createElement("img");
    image.src = post.image_url;
    image.alt = "Post attachment";
    image.style.width = "100%";
    image.style.borderRadius = "18px";
    image.loading = "lazy";
    card.append(image);
  }

  const actions = document.createElement("div");
  actions.className = "post-actions";

  const likeBtn = document.createElement("button");
  likeBtn.type = "button";
  likeBtn.innerHTML = `👍 <span>${post.likes || 0}</span>`;
  likeBtn.classList.toggle("active", post.viewerReaction === 1);
  likeBtn.addEventListener("click", () => onReact?.(post, 1));

  const dislikeBtn = document.createElement("button");
  dislikeBtn.type = "button";
  dislikeBtn.innerHTML = `👎 <span>${post.dislikes || 0}</span>`;
  dislikeBtn.classList.toggle("active", post.viewerReaction === -1);
  dislikeBtn.addEventListener("click", () => onReact?.(post, -1));

  const commentBtn = document.createElement("button");
  commentBtn.type = "button";
  commentBtn.innerHTML = `💬 <span>${post.comments_count || 0}</span>`;
  commentBtn.addEventListener("click", () => onComment?.(post));

  actions.append(likeBtn, dislikeBtn, commentBtn);
  card.append(actions);

  if (Array.isArray(post.comments) && post.comments.length) {
    const list = document.createElement("div");
    list.className = "comment-list";
    post.comments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comment";
      const author = document.createElement("strong");
      author.textContent = comment.author?.username || "user";
      const metaLine = document.createElement("span");
      metaLine.textContent = timeAgo(comment.timestamp);
      const body = document.createElement("p");
      body.textContent = comment.content;
      item.append(author, metaLine, body);
      list.append(item);
    });
    card.append(list);
  } else if (onViewComments) {
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "primary";
    viewBtn.textContent = "View comments";
    viewBtn.addEventListener("click", () => onViewComments(post));
    card.append(viewBtn);
  }

  return card;
}

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
