const palette = [
  { mood: "Joy", color: "#FFD166" },
  { mood: "Calm", color: "#5AB3E6" },
  { mood: "Focused", color: "#06D6A0" },
  { mood: "Tired", color: "#A8A8A8" },
  { mood: "Sad", color: "#26547C" },
  { mood: "Angry", color: "#EF476F" }
];

const starterMoods = [
  { date: "2024-03-02", color: "#5AB3E6" },
  { date: "2024-03-03", color: "#FFD166" },
  { date: "2024-03-05", color: "#06D6A0" },
  { date: "2024-03-08", color: "#26547C" },
  { date: "2024-03-09", color: "#EF476F" },
  { date: "2024-03-12", color: "#FFD166" },
  { date: "2024-03-15", color: "#A8A8A8" },
  { date: "2024-03-18", color: "#5AB3E6" },
  { date: "2024-03-21", color: "#06D6A0" },
  { date: "2024-03-24", color: "#FFD166" }
];

const STORAGE_PREFIX = "moodmap.";
const USERS_KEY = `${STORAGE_PREFIX}users`;
const CURRENT_USER_KEY = `${STORAGE_PREFIX}currentUser`;

let currentUser = null;
let authMode = "signIn";

const gridElement = document.getElementById("moodGrid");
const paletteElement = document.getElementById("palette");
const legendList = document.getElementById("legendList");
const logButton = document.getElementById("logMoodButton");
const modal = document.getElementById("moodModal");
const streakCount = document.getElementById("streakCount");
const gridMonth = document.getElementById("gridMonth");
const previousMonthButton = document.getElementById("previousMonth");
const nextMonthButton = document.getElementById("nextMonth");
const currentDateLabel = document.getElementById("currentDate");
const appElement = document.querySelector(".app");
const authPanel = document.getElementById("authPanel");
const signOutButton = document.getElementById("signOutButton");

const signInForm = document.getElementById("signInForm");
const createForm = document.getElementById("createForm");
const switchToCreate = document.getElementById("switchToCreate");
const switchToSignIn = document.getElementById("switchToSignIn");
const signInUsernameInput = document.getElementById("signInUsername");
const createUsernameInput = document.getElementById("createUsername");
const authSubtitle = document.getElementById("authSubtitle");

const comboElements = {
  signIn: document.getElementById("signInCombo"),
  create: document.getElementById("createCombo")
};

const padElements = {
  signIn: document.getElementById("signInPad"),
  create: document.getElementById("createPad")
};

const messageElements = {
  signIn: document.getElementById("signInMessage"),
  create: document.getElementById("createMessage")
};

const comboState = {
  signIn: [],
  create: []
};

let currentViewDate = (() => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
})();

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function getISODate(date) {
  return date.toISOString().split("T")[0];
}

function getMoodColorByName(name) {
  return palette.find((entry) => entry.mood === name)?.color ?? "#f1f5f9";
}

function updateComboUI(key) {
  const element = comboElements[key];
  if (!element) return;

  element.innerHTML = "";

  for (let index = 0; index < 3; index += 1) {
    const mood = comboState[key][index];
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "auth__combo-slot";

    if (mood) {
      const color = getMoodColorByName(mood);
      slot.classList.add("auth__combo-slot--filled");
      slot.innerHTML = `
        <span class="auth__combo-swatch" style="background: ${color}"></span>
        <span>${mood}</span>
      `;
    } else {
      slot.innerHTML = `<span class="auth__combo-placeholder">Mood ${index + 1}</span>`;
    }

    slot.addEventListener("click", () => {
      if (!mood) return;
      comboState[key].splice(index, 1);
      updateComboUI(key);
    });

    element.appendChild(slot);
  }
}

function handleMoodSelection(key, mood) {
  const state = comboState[key];
  if (!state) return;
  if (state.length >= 3) {
    setAuthMessage(key, "Combo full. Tap a mood bubble to remove one.", "info");
    return;
  }

  state.push(mood);
  setAuthMessage(key, "");
  updateComboUI(key);
}

function populateMoodPad(key) {
  const pad = padElements[key];
  if (!pad) return;

  pad.innerHTML = "";

  palette.forEach(({ mood, color }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "auth__pad-option";
    button.innerHTML = `
      <span class="auth__pad-swatch" style="background: ${color}"></span>
      <span>${mood}</span>
    `;

    button.addEventListener("click", () => {
      handleMoodSelection(key, mood);
    });

    pad.appendChild(button);
  });
}

function resetCombo(key) {
  comboState[key] = [];
  updateComboUI(key);
  setAuthMessage(key, "");
}

function setAuthMessage(target, message, tone = "info") {
  const element = messageElements[target];
  if (!element) return;

  element.textContent = message;
  if (message) {
    element.dataset.tone = tone;
  } else {
    delete element.dataset.tone;
  }
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? {};
  } catch (error) {
    console.warn("Unable to parse stored users", error);
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function moodSequenceKey(sequence) {
  return sequence.join("|");
}

function ensureUserData(username) {
  const key = `${STORAGE_PREFIX}moods.${username}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(starterMoods));
  }
}

function getUserMoods(targetUser = currentUser) {
  if (!targetUser) {
    return [];
  }

  const key = `${STORAGE_PREFIX}moods.${targetUser}`;
  const stored = localStorage.getItem(key);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Unable to parse mood data", error);
    return [];
  }
}

function saveUserMoods(data, targetUser = currentUser) {
  if (!targetUser) return;
  const key = `${STORAGE_PREFIX}moods.${targetUser}`;
  localStorage.setItem(key, JSON.stringify(data));
}

function toggleAuthMode(mode) {
  authMode = mode;

  if (mode === "signIn") {
    signInForm.classList.remove("auth__form--hidden");
    createForm.classList.add("auth__form--hidden");
    authSubtitle.textContent = "Pick the three-mood combo you chose when you signed up.";
  } else {
    createForm.classList.remove("auth__form--hidden");
    signInForm.classList.add("auth__form--hidden");
    authSubtitle.textContent = "Invent a username and lock it with a trio of moods.";
  }

  authPanel?.setAttribute("data-mode", mode);
}

function showAuthPanel() {
  authPanel?.removeAttribute("hidden");
  appElement?.classList.add("app--hidden");
}

function showAppPanel() {
  authPanel?.setAttribute("hidden", "true");
  appElement?.classList.remove("app--hidden");
}

function setCurrentUser(username) {
  currentUser = username;

  if (username) {
    localStorage.setItem(CURRENT_USER_KEY, username);
    ensureUserData(username);
    showAppPanel();
    logButton.disabled = false;
    signOutButton.hidden = false;
    signOutButton.textContent = `Sign out (${username})`;
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
    showAuthPanel();
    logButton.disabled = true;
    signOutButton.hidden = true;
  }

  renderGrid();
}

function calculateStreak(data, today) {
  const set = new Set(data.map((item) => item.date));
  let streak = 0;
  const cursor = new Date(today);

  while (set.has(getISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function logMood(color) {
  if (!currentUser) {
    return;
  }

  const today = getISODate(new Date());
  const data = getUserMoods();
  const existing = data.find((item) => item.date === today);

  if (existing) {
    existing.color = color;
  } else {
    data.push({ date: today, color });
  }

  saveUserMoods(data);
  renderGrid();
}

function renderGrid() {
  const now = new Date();
  const viewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), 1);
  const firstDay = new Date(viewDate);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const data = getUserMoods();
  const todayISO = getISODate(now);
  const dataMap = new Map(data.map((item) => [item.date, item.color]));

  gridElement.innerHTML = "";
  gridElement.style.setProperty("--days", daysInMonth);

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");

    const cellContent = document.createElement("div");
    cellContent.className = "cell__content";

    const dayNumber = cellIndex - startOffset + 1;

    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber);
      const isoDate = getISODate(date);
      const color = dataMap.get(isoDate);

      if (color) {
        cell.classList.add("cell--filled");
        cell.style.background = color;
      }

      if (isoDate === todayISO) {
        cell.classList.add("cell--today");
      }

      const label = document.createElement("span");
      label.className = "cell__date";
      label.textContent = dayNumber;

      const moodLabel = document.createElement("span");
      moodLabel.className = "cell__mood";
      moodLabel.textContent = palette.find((entry) => entry.color === color)?.mood ?? "";

      cellContent.append(label, moodLabel);
      cell.appendChild(cellContent);
      cell.dataset.date = isoDate;
      cell.title = color ? `${moodLabel.textContent} on ${date.toDateString()}` : date.toDateString();
    } else {
      cell.classList.add("cell--empty");
      cellContent.style.visibility = "hidden";
      cell.appendChild(cellContent);
    }

    gridElement.appendChild(cell);
  }

  const streakValue = currentUser ? calculateStreak(data, now) : 0;
  streakCount.textContent = currentUser
    ? `${streakValue} day${streakValue === 1 ? "" : "s"}`
    : "Sign in to start";
  gridMonth.textContent = formatMonth(viewDate);
  currentDateLabel.textContent = formatDate(now);

  const isCurrentMonth =
    viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() === now.getMonth();

  nextMonthButton.disabled = isCurrentMonth;
}

function changeMonth(offset) {
  currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + offset, 1);
  renderGrid();
}

function hydrateLegend() {
  legendList.innerHTML = "";
  palette.forEach(({ mood, color }) => {
    const item = document.createElement("li");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-item__swatch" style=\"background: ${color}\"></span>
      <span>${mood}</span>
    `;
    legendList.appendChild(item);
  });
}

function hydratePalette() {
  paletteElement.innerHTML = "";
  palette.forEach(({ mood, color }) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "palette__option";
    option.dataset.color = color;
    option.dataset.mood = mood;
    option.innerHTML = `
      <span class="palette__swatch" style=\"background: ${color}\"></span>
      <span>${mood}</span>
    `;
    option.addEventListener("click", () => {
      modal.close();
      logMood(color);
    });
    paletteElement.appendChild(option);
  });
}

function initialiseAuth() {
  Object.keys(comboElements).forEach((key) => {
    updateComboUI(key);
    populateMoodPad(key);
  });

  document.querySelectorAll("[data-reset-combo]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-reset-combo");
      resetCombo(key);
    });
  });

  switchToCreate?.addEventListener("click", () => {
    toggleAuthMode("create");
    resetCombo("create");
    setAuthMessage("signIn", "");
    createUsernameInput.focus();
  });

  switchToSignIn?.addEventListener("click", () => {
    toggleAuthMode("signIn");
    resetCombo("signIn");
    setAuthMessage("create", "");
    signInUsernameInput.focus();
  });

  signOutButton.addEventListener("click", () => {
    setCurrentUser(null);
    toggleAuthMode("signIn");
    resetCombo("signIn");
    signInForm.reset();
    signInUsernameInput.focus();
  });

  signInForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = signInUsernameInput.value.trim();

    if (!username) {
      setAuthMessage("signIn", "Enter your username to continue.", "error");
      return;
    }

    if (comboState.signIn.length !== 3) {
      setAuthMessage("signIn", "Select your three moods in order.", "error");
      return;
    }

    const users = loadUsers();
    const secret = moodSequenceKey(comboState.signIn);

    if (!users[username]) {
      setAuthMessage("signIn", "We don't know that username yet. Try creating it.", "error");
      return;
    }

    if (users[username] !== secret) {
      setAuthMessage("signIn", "That mood combo doesn't match. Try again.", "error");
      return;
    }

    setAuthMessage("signIn", "");
    signInForm.reset();
    resetCombo("signIn");
    setCurrentUser(username);
  });

  createForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = createUsernameInput.value.trim();

    if (!username) {
      setAuthMessage("create", "Pick a username to get started.", "error");
      return;
    }

    if (comboState.create.length !== 3) {
      setAuthMessage("create", "Choose three moods to lock in your account.", "error");
      return;
    }

    const users = loadUsers();

    if (users[username]) {
      setAuthMessage("create", "That username is already taken. Try another.", "error");
      return;
    }

    users[username] = moodSequenceKey(comboState.create);
    saveUsers(users);
    ensureUserData(username);

    setAuthMessage("create", "Account created! Signing you in...", "success");
    createForm.reset();
    resetCombo("create");
    setCurrentUser(username);
  });

  toggleAuthMode("signIn");

  const storedUser = localStorage.getItem(CURRENT_USER_KEY);
  const knownUsers = loadUsers();

  if (storedUser && knownUsers[storedUser]) {
    setCurrentUser(storedUser);
  } else {
    setCurrentUser(null);
    signOutButton.hidden = true;
  }
}

logButton.addEventListener("click", () => {
  if (!currentUser) {
    showAuthPanel();
    toggleAuthMode("signIn");
    resetCombo("signIn");
    signInUsernameInput.focus();
    return;
  }

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.setAttribute("open", "true");
  }
});

modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  modal.close();
});

previousMonthButton.addEventListener("click", () => {
  changeMonth(-1);
});

nextMonthButton.addEventListener("click", () => {
  if (!nextMonthButton.disabled) {
    changeMonth(1);
  }
});

hydrateLegend();
hydratePalette();
renderGrid();
initialiseAuth();

