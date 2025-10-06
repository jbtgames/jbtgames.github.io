const STORAGE_KEY = "tweetstream-data";
const SESSION_KEY = "tweetstream-session";
const DATA_RECORD_KEY = "snapshot";

class ClientDatabase {
  constructor(name = "tweetstream-db") {
    this.name = name;
    if (!("indexedDB" in window)) {
      this.fallback = true;
      this.storageKey = `${this.name}-fallback`;
      return;
    }
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async get(key) {
    if (this.fallback) {
      try {
        const raw = localStorage.getItem(`${this.storageKey}:${key}`);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.error("Failed to read fallback storage", error);
        return null;
      }
    }
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const store = tx.objectStore("kv");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key, value) {
    if (this.fallback) {
      try {
        localStorage.setItem(`${this.storageKey}:${key}`, JSON.stringify(value));
      } catch (error) {
        console.error("Failed to persist fallback storage", error);
      }
      return;
    }
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      const store = tx.objectStore("kv");
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const persistence = new ClientDatabase();

const elements = {
  authCard: document.getElementById("authCard"),
  authForm: document.getElementById("authForm"),
  authTitle: document.getElementById("authTitle"),
  authSubtitle: document.getElementById("authSubtitle"),
  authSubmit: document.getElementById("authSubmit"),
  toggleAuth: document.getElementById("toggleAuth"),
  headerActions: document.getElementById("headerActions"),
  loginBtn: document.getElementById("loginBtn"),
  signupBtn: document.getElementById("signupBtn"),
  feed: document.getElementById("feed"),
  posts: document.getElementById("posts"),
  postTemplate: document.getElementById("postTemplate"),
  postInput: document.getElementById("postInput"),
  postBtn: document.getElementById("postBtn"),
  charCount: document.getElementById("charCount"),
  profileName: document.getElementById("profileName"),
  profileHandle: document.getElementById("profileHandle"),
  profileAvatar: document.getElementById("profileAvatar"),
  logoutBtn: document.getElementById("logoutBtn"),
  friendsList: document.getElementById("friendsList"),
  addFriendForm: document.getElementById("addFriendForm"),
  friendSearch: document.getElementById("friendSearch"),
  feedToggle: document.querySelector(".feed-toggle"),
  pills: Array.from(document.querySelectorAll(".feed-toggle .btn.pill")),
};

const state = {
  mode: "login",
  data: { users: {}, posts: [] },
  session: null,
  activeFeed: "hot",
  ready: false,
};

const hotness = {
  halfLifeHours: 18,
  likeWeight: 12,
  friendBoost: 24,
  freshnessBonus(hoursAgo) {
    const decay = Math.log(2) / this.halfLifeHours;
    return Math.exp(-decay * hoursAgo) * 100;
  },
  compute(post, currentUser) {
    const now = Date.now();
    const hoursAgo = (now - post.createdAt) / 36e5;
    const likes = post.likes.length;
    const hasFriendLike = currentUser
      ? post.likes.some((u) => currentUser.friends.includes(u))
      : false;
    const friendBoost = hasFriendLike ? this.friendBoost : 0;
    return (
      this.freshnessBonus(hoursAgo) +
      likes * this.likeWeight +
      friendBoost +
      (post.author === currentUser?.username ? 5 : 0)
    );
  },
};

async function loadData() {
  const stored = await persistence.get(DATA_RECORD_KEY);
  if (stored) {
    return {
      users: stored.users ?? {},
      posts: stored.posts ?? [],
    };
  }

  const legacy = localStorage.getItem(STORAGE_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      const normalized = {
        users: parsed.users ?? {},
        posts: parsed.posts ?? [],
      };
      await persistence.set(DATA_RECORD_KEY, normalized);
      localStorage.removeItem(STORAGE_KEY);
      return normalized;
    } catch (err) {
      console.error("Failed migrating legacy storage", err);
    }
  }

  const demoUsers = {
    aurora: makeUser("aurora", "Aurora Vega", "stargazer"),
    finn: makeUser("finn", "Finn Harper", "fieldnotes"),
    naia: makeUser("naia", "Naia Brooks", "wavewhisper"),
  };

  demoUsers.aurora.friends.push("finn", "naia");
  demoUsers.finn.friends.push("aurora");
  demoUsers.naia.friends.push("aurora");

  const now = Date.now();
  const demoPosts = [
    makePost(
      "aurora",
      "Watching the city lights flicker from the rooftop. Every window a story.",
      now - 36e5
    ),
    makePost(
      "finn",
      "Someone left a typewriter on the corner table of the cafe. I left a poem behind.",
      now - 7.2e6
    ),
    makePost(
      "naia",
      "Low tide revealed a dozen tiny glass bottles today. The ocean is secretly a librarian.",
      now - 1.5e6
    ),
  ];

  demoPosts[0].likes.push("finn", "naia");
  demoPosts[1].likes.push("aurora");
  demoPosts[2].likes.push("aurora", "finn");

  const data = { users: demoUsers, posts: demoPosts };
  await persistence.set(DATA_RECORD_KEY, data);
  return data;
}

function loadSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return parsed?.username ? parsed : null;
  } catch (err) {
    console.error("Failed to parse session", err);
    return null;
  }
}

async function saveData() {
  await persistence.set(DATA_RECORD_KEY, state.data);
}

function saveSession(username) {
  const session = username ? { username } : null;
  state.session = session;
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function makeUser(username, displayName, handle = username) {
  return {
    username,
    displayName,
    handle: `@${handle}`,
    password: "password",
    friends: [],
  };
}

function makePost(author, content, createdAt = Date.now()) {
  return {
    id: crypto.randomUUID(),
    author,
    content,
    createdAt,
    likes: [],
  };
}

async function init() {
  elements.loginBtn?.addEventListener("click", () => switchMode("login"));
  elements.signupBtn?.addEventListener("click", () => switchMode("signup"));
  elements.toggleAuth?.addEventListener("click", (event) => {
    event.preventDefault();
    switchMode(state.mode === "login" ? "signup" : "login");
  });

  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.logoutBtn.addEventListener("click", () => {
    saveSession(null);
    state.mode = "login";
    render();
  });

  elements.postInput.addEventListener("input", handleComposerInput);
  elements.postBtn.addEventListener("click", handleCreatePost);
  elements.addFriendForm.addEventListener("submit", handleAddFriend);

  elements.feedToggle.addEventListener("click", (event) => {
    const pill = event.target.closest(".btn.pill");
    if (!pill) return;
    const feedType = pill.dataset.feed;
    if (!feedType || feedType === state.activeFeed) return;
    state.activeFeed = feedType;
    elements.pills.forEach((btn) => btn.classList.toggle("active", btn.dataset.feed === feedType));
    renderPosts();
  });

  renderLoading();

  try {
    state.data = await loadData();
  } catch (error) {
    console.error("Failed to load data", error);
    state.data = { users: {}, posts: [] };
  }

  state.session = loadSession();
  state.ready = true;

  render();
}

function switchMode(mode) {
  state.mode = mode;
  if (mode === "login") {
    elements.authTitle.textContent = "Welcome back";
    elements.authSubtitle.textContent = "Sign in to catch up with your friends.";
    elements.authSubmit.textContent = "Log In";
    elements.toggleAuth.textContent = "Sign up";
  } else {
    elements.authTitle.textContent = "Create your account";
    elements.authSubtitle.textContent = "Join the conversation and find your crew.";
    elements.authSubmit.textContent = "Sign Up";
    elements.toggleAuth.textContent = "Log in";
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const username = formData.get("username").trim().toLowerCase();
  const password = formData.get("password").trim();
  if (!username || !password) return;

  if (state.mode === "login") {
    const user = state.data.users[username];
    if (!user || user.password !== password) {
      showToast("Invalid credentials. Try again.");
      return;
    }
    saveSession(username);
    render();
  } else {
    if (state.data.users[username]) {
      showToast("That username is already taken.");
      return;
    }
    const user = {
      username,
      displayName: username.replace(/\b\w/g, (l) => l.toUpperCase()),
      handle: `@${username}`,
      password,
      friends: [],
    };
    state.data.users[username] = user;
    await saveData();
    saveSession(username);
    showToast("Welcome aboard! Start by finding friends.");
    render();
  }
}

function handleComposerInput() {
  const remaining = 280 - elements.postInput.value.length;
  elements.charCount.textContent = remaining;
  elements.charCount.classList.toggle("danger", remaining <= 40);
}

async function handleCreatePost() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const content = elements.postInput.value.trim();
  if (!content) {
    showToast("Write something first.");
    return;
  }
  const post = makePost(currentUser.username, content);
  state.data.posts.unshift(post);
  await saveData();
  elements.postInput.value = "";
  handleComposerInput();
  renderPosts();
}

async function handleAddFriend(event) {
  event.preventDefault();
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const username = elements.friendSearch.value.trim().toLowerCase();
  if (!username || username === currentUser.username) {
    showToast("Enter someone else's username.");
    return;
  }
  const friend = state.data.users[username];
  if (!friend) {
    showToast("Couldn't find that user.");
    return;
  }
  if (currentUser.friends.includes(username)) {
    showToast("You're already friends.");
    return;
  }

  currentUser.friends.push(username);
  friend.friends.push(currentUser.username);
  await saveData();
  elements.friendSearch.value = "";
  showToast(`You're now friends with ${friend.displayName}.`);
  renderFriends();
  renderPosts();
}

async function handleRemoveFriend(username) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  currentUser.friends = currentUser.friends.filter((f) => f !== username);
  const other = state.data.users[username];
  if (other) {
    other.friends = other.friends.filter((f) => f !== currentUser.username);
  }
  await saveData();
  renderFriends();
  renderPosts();
}

async function handleLike(postId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const post = state.data.posts.find((p) => p.id === postId);
  if (!post) return;
  const hasLiked = post.likes.includes(currentUser.username);
  post.likes = hasLiked
    ? post.likes.filter((u) => u !== currentUser.username)
    : [...post.likes, currentUser.username];
  await saveData();
  renderPosts();
}

function getCurrentUser() {
  if (!state.session?.username) return null;
  return state.data.users[state.session.username] ?? null;
}

function render() {
  if (!state.ready) {
    renderLoading();
    return;
  }
  const currentUser = getCurrentUser();
  const isAuthenticated = Boolean(currentUser);

  elements.feed.hidden = !isAuthenticated;
  elements.authCard.hidden = isAuthenticated;

  elements.headerActions.hidden = isAuthenticated;

  toggleAuthFormDisabled(false);

  elements.postBtn.disabled = !isAuthenticated;
  elements.postInput.disabled = !isAuthenticated;
  elements.friendSearch.disabled = !isAuthenticated;
  const addFriendButton = elements.addFriendForm.querySelector("button[type='submit']");
  if (addFriendButton) {
    addFriendButton.disabled = !isAuthenticated;
  }

  if (!isAuthenticated) {
    switchMode(state.mode);
    return;
  }

  renderProfile(currentUser);
  renderFriends();
  renderPosts();
}

function renderProfile(user) {
  elements.profileName.textContent = user.displayName;
  elements.profileHandle.textContent = user.handle;
  elements.profileAvatar.textContent = user.displayName[0]?.toUpperCase() ?? "";
}

function renderFriends() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  elements.friendsList.innerHTML = "";

  if (!currentUser.friends.length) {
    const empty = document.createElement("li");
    empty.textContent = "No friends yet. Add someone to get started.";
    empty.classList.add("empty-state");
    elements.friendsList.append(empty);
    return;
  }

  currentUser.friends.forEach((username) => {
    const friend = state.data.users[username];
    if (!friend) return;
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = friend.displayName;
    const handle = document.createElement("small");
    handle.textContent = friend.handle;
    handle.style.color = "var(--text-muted)";
    handle.style.display = "block";
    const remove = document.createElement("button");
    remove.className = "btn";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => handleRemoveFriend(username));

    const textWrap = document.createElement("div");
    textWrap.append(name, handle);
    item.append(textWrap, remove);
    elements.friendsList.append(item);
  });
}

function renderPosts() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const posts = getFeedPosts(currentUser, state.activeFeed);
  elements.posts.innerHTML = "";

  if (!posts.length) {
    const empty = document.createElement("li");
    empty.className = "post empty-post";
    empty.textContent = "Nothing here yet. Start a conversation!";
    elements.posts.append(empty);
    return;
  }

  posts.forEach((post) => {
    const clone = elements.postTemplate.content.cloneNode(true);
    const root = clone.querySelector(".post");
    const author = state.data.users[post.author];
    const likeBtn = clone.querySelector("[data-action='like']");

    clone.querySelector(".post-author").textContent = author?.displayName ?? post.author;
    clone.querySelector(".post-handle").textContent = author?.handle ?? `@${post.author}`;
    clone.querySelector(".post-time").textContent = formatRelativeTime(post.createdAt);
    clone.querySelector(".post-content").textContent = post.content;
    clone.querySelector(".count").textContent = post.likes.length;

    const score = hotness.compute(post, currentUser);
    clone.querySelector(".score").textContent = `🔥 ${score.toFixed(0)} hot score`;

    likeBtn.classList.toggle("primary", post.likes.includes(currentUser.username));
    likeBtn.addEventListener("click", () => handleLike(post.id));

    root.querySelector(".post-avatar").textContent = (author?.displayName ?? post.author)[0]?.toUpperCase() ?? "";
    elements.posts.append(clone);
  });
}

function getFeedPosts(currentUser, feed) {
  const posts = [...state.data.posts];
  switch (feed) {
    case "hot":
      return posts
        .sort((a, b) => hotness.compute(b, currentUser) - hotness.compute(a, currentUser))
        .slice(0, 100);
    case "friends":
      return posts
        .filter((post) => post.author === currentUser.username || currentUser.friends.includes(post.author))
        .sort((a, b) => hotness.compute(b, currentUser) - hotness.compute(a, currentUser));
    case "fresh":
    default:
      return posts.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleString();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 2600);
}

function renderLoading() {
  elements.feed.hidden = true;
  elements.authCard.hidden = false;
  elements.headerActions.hidden = false;
  elements.authTitle.textContent = "Loading TweetStream";
  elements.authSubtitle.textContent = "Hang tight while we connect to your feed.";
  elements.authSubmit.textContent = "Loading…";
  toggleAuthFormDisabled(true);
}

function toggleAuthFormDisabled(disabled) {
  Array.from(elements.authForm.elements).forEach((element) => {
    element.disabled = disabled;
  });
}

init();
