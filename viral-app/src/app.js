import {
  watchAuth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  ensureUserDocument,
} from "./auth.js";
import {
  listenToFeed,
  fetchDiscoverPosts,
  createPost,
  toggleReaction,
  fetchLeaderboard,
  fetchProfile,
  fetchUserPosts,
  addComment,
  loadSeedPosts,
  fetchTrendingWords,
} from "./api.js";
import { rankPosts, mergeSeedContent } from "./feed.js";
import { renderNavbar } from "./components/navbar.js";
import { createPostCard } from "./components/post.js";
import { renderProfileView } from "./components/profile.js";
import { renderLeaderboard } from "./components/leaderboard.js";

const appEl = document.getElementById("app");
const state = {
  user: null,
  route: "feed",
  feed: [],
  discover: [],
  leaders: [],
  profile: null,
  profilePosts: [],
  seed: [],
  trending: [],
};
let feedUnsubscribe = null;

bootstrap();

async function bootstrap() {
  if ("serviceWorker" in navigator) {
    const swUrl = new URL("../sw.js", import.meta.url);
    navigator.serviceWorker.register(swUrl).catch((err) => console.warn("SW registration failed", err));
  }
  appEl.classList.add("loading");
  state.seed = await loadSeedPosts();
  renderShell();
  watchAuth(async (user) => {
    state.user = user;
    if (user) {
      await ensureUserDocument(user);
      await loadProfile();
      attachFeedListener();
      refreshLeaders();
    } else {
      detachFeedListener();
      state.profile = null;
      state.profilePosts = [];
    }
    render();
  });
  await refreshDiscover();
  await refreshTrending();
  attachFeedListener();
  render();
  setInterval(refreshTrending, 60 * 1000);
}

function renderShell() {
  appEl.innerHTML = `
    <header class="app-header">
      <button class="icon-btn" id="spark-toggle">☀️</button>
      <h1>Social Spark</h1>
      <button class="icon-btn" id="auth-button"></button>
    </header>
    <main id="view"></main>
  `;
  appEl.classList.remove("loading");
  updateAuthButton();
  mountNavbar();
  document.getElementById("spark-toggle").addEventListener("click", toggleTheme);
}

function render() {
  updateAuthButton();
  mountNavbar();
  const view = document.getElementById("view");
  view.innerHTML = "";
  if (!state.user && state.route !== "discover") {
    view.append(renderAuthCard());
    return;
  }

  switch (state.route) {
    case "feed":
      view.append(renderComposer());
      view.append(...renderFeed());
      break;
    case "discover":
      view.append(renderDiscover());
      break;
    case "leaderboard":
      view.append(renderLeaderboard(state.leaders));
      break;
    case "profile":
      if (!state.profile) {
        view.append(renderNotice("Create an account to track your streak."));
      } else {
        view.append(
          renderProfileView({
            profile: state.profile,
            posts: state.profilePosts,
            onReact: handleReaction,
            onComment: handleComment,
          })
        );
      }
      break;
    default:
      view.append(renderNotice("Coming soon."));
  }
}

function renderFeed() {
  if (!state.feed.length && !state.seed.length) {
    return [renderNotice("Be the first to post!")];
  }
  const posts = mergeSeedContent(state.feed, state.seed, 20);
  return posts.map((post) => createPostCard(post, { onReact: handleReaction, onComment: handleComment }));
}

function renderDiscover() {
  const wrapper = document.createElement("section");
  wrapper.className = "card";
  const heading = document.createElement("h2");
  heading.textContent = "Discover";
  wrapper.append(heading);

  if (state.trending.length) {
    const trendBar = document.createElement("div");
    trendBar.className = "notice";
    trendBar.textContent = `Trending: ${state.trending.map((item) => `#${item.word}`).join(" · ")}`;
    wrapper.append(trendBar);
  }

  if (!state.discover.length) {
    const empty = document.createElement("p");
    empty.className = "feed-empty";
    empty.textContent = "Check back soon for the hottest posts.";
    wrapper.append(empty);
    return wrapper;
  }

  const ranked = rankPosts(state.discover).slice(0, 12);
  ranked.forEach((post) => {
    wrapper.append(createPostCard(post, { onReact: handleReaction, onComment: handleComment }));
  });
  return wrapper;
}

function renderComposer() {
  const card = document.createElement("section");
  card.className = "card";
  card.innerHTML = `
    <h2>Create a spark</h2>
    <form class="compose">
      <textarea name="content" placeholder="Drop your bold idea or spicy take" required></textarea>
      <div class="actions">
        <label class="upload">
          <input type="file" name="media" accept="image/*" hidden />
          <span class="badge">📸 Add photo</span>
        </label>
        <button class="primary" type="submit">Post</button>
      </div>
    </form>
  `;
  const form = card.querySelector("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    const formData = new FormData(form);
    const content = formData.get("content").toString().trim();
    const file = formData.get("media");
    if (!content && !(file && file.size)) {
      submitBtn.disabled = false;
      return;
    }
    try {
      await createPost({ content, file: file && file.size ? file : null });
      form.reset();
      toast("Posted! XP +20");
    } catch (error) {
      console.error(error);
      toast(error.message || "Could not post");
    } finally {
      submitBtn.disabled = false;
    }
  });
  return card;
}

function renderAuthCard() {
  const wrapper = document.createElement("section");
  wrapper.className = "card auth-card";
  wrapper.innerHTML = `
    <h2>Join Social Spark</h2>
    <form id="auth-form">
      <input type="text" name="username" placeholder="Display name" required />
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit" class="primary">Create account</button>
    </form>
    <div class="toggle-auth">Already lit? <button type="button" id="toggle-auth">Sign in</button></div>
    <button type="button" id="google-auth" class="primary">Continue with Google</button>
  `;
  let mode = "register";
  const form = wrapper.querySelector("#auth-form");
  const toggleBtn = wrapper.querySelector("#toggle-auth");
  const googleBtn = wrapper.querySelector("#google-auth");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = data.get("email").toString();
    const password = data.get("password").toString();
    const username = data.get("username").toString();
    try {
      if (mode === "register") {
        await registerWithEmail(email, password, username);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error) {
      toast(error.message || "Authentication failed");
    }
  });

  toggleBtn.addEventListener("click", () => {
    mode = mode === "register" ? "login" : "register";
    const usernameField = form.querySelector("input[name=username]");
    form.querySelector("button[type=submit]").textContent = mode === "register" ? "Create account" : "Sign in";
    usernameField.hidden = mode === "login";
    usernameField.required = mode !== "login";
    toggleBtn.textContent = mode === "register" ? "Sign in" : "Create one";
  });

  googleBtn.addEventListener("click", async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      toast(error.message || "Google sign-in failed");
    }
  });

  return wrapper;
}

function renderNotice(message) {
  const card = document.createElement("div");
  card.className = "card compact";
  const text = document.createElement("p");
  text.className = "notice";
  text.textContent = message;
  card.append(text);
  return card;
}

function mountNavbar() {
  const existing = appEl.querySelector(".bottom-nav");
  if (existing) existing.remove();
  const nav = renderNavbar(state.route, (route) => {
    state.route = route;
    if (route === "profile" && state.user) {
      loadProfile();
    }
    if (route === "discover") {
      refreshDiscover();
    }
    if (route === "leaderboard") {
      refreshLeaders();
    }
    render();
  });
  appEl.append(nav);
}

function attachFeedListener() {
  detachFeedListener();
  feedUnsubscribe = listenToFeed(async (posts) => {
    state.feed = posts;
    render();
  });
}

function detachFeedListener() {
  if (feedUnsubscribe) {
    feedUnsubscribe();
    feedUnsubscribe = null;
  }
}

async function refreshDiscover() {
  try {
    state.discover = await fetchDiscoverPosts();
  } catch (error) {
    console.warn("Discover load failed", error);
  }
}

async function refreshLeaders() {
  try {
    state.leaders = await fetchLeaderboard();
  } catch (error) {
    console.warn("Leaderboard load failed", error);
  }
}

async function refreshTrending() {
  try {
    state.trending = await fetchTrendingWords();
    if (state.route === "discover") render();
  } catch (error) {
    console.warn("Trending words failed", error);
  }
}

async function loadProfile() {
  if (!state.user) return;
  state.profile = await fetchProfile(state.user.uid);
  state.profilePosts = await fetchUserPosts(state.user.uid);
}

function updateAuthButton() {
  const button = document.getElementById("auth-button");
  if (!button) return;
  if (state.user) {
    button.textContent = "⏻";
    button.title = "Sign out";
    button.onclick = async () => {
      await logout();
      toast("Signed out");
    };
  } else {
    button.textContent = "★";
    button.title = "Sign in";
    button.onclick = () => {
      state.route = "feed";
      render();
    };
  }
}

async function handleReaction(post, value) {
  try {
    await toggleReaction(post.id, value);
  } catch (error) {
    toast(error.message || "Unable to react");
  }
}

async function handleComment(post) {
  const content = prompt("Drop a quick reply:");
  if (!content) return;
  try {
    await addComment(post.id, { content });
    toast("Comment sent! XP +5");
  } catch (error) {
    toast(error.message || "Could not comment");
  }
}

function toggleTheme() {
  document.documentElement.classList.toggle("dark-mode");
}

function toast(message) {
  let toastEl = document.querySelector(".toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.append(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("visible");
  setTimeout(() => toastEl.classList.remove("visible"), 2400);
}

window.addEventListener("beforeunload", detachFeedListener);
