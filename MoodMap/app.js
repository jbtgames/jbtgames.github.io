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
const USER_META_PREFIX = `${STORAGE_PREFIX}meta.`;

let currentUser = null;
let authMode = "signIn";
let activeView = "map";
let hasPromptedForToday = false;
let modalContextDate = null;

const gridElement = document.getElementById("moodGrid");
const paletteElement = document.getElementById("palette");
const legendList = document.getElementById("legendList");
const logButton = document.getElementById("logMoodButton");
const modal = document.getElementById("moodModal");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const clearMoodButton = document.getElementById("clearMoodButton");
const streakCount = document.getElementById("streakCount");
const gridMonth = document.getElementById("gridMonth");
const previousMonthButton = document.getElementById("previousMonth");
const nextMonthButton = document.getElementById("nextMonth");
const currentDateLabel = document.getElementById("currentDate");
const appElement = document.querySelector(".app");
const authPanel = document.getElementById("authPanel");
const signOutButton = document.getElementById("signOutButton");
const mapView = document.getElementById("mapView");
const historyView = document.getElementById("historyView");
const historyTimeline = document.getElementById("historyTimeline");
const historyCalendar = document.getElementById("historyCalendar");
const historyEmptyState = document.getElementById("historyEmpty");
const navButtons = Array.from(document.querySelectorAll("[data-view-target]"));

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

function getMoodNameByColor(color) {
  return palette.find((entry) => entry.color === color)?.mood ?? null;
}

function normalizeToISO(dateInput) {
  if (!dateInput) {
    return getISODate(new Date());
  }

  if (typeof dateInput === "string") {
    return dateInput;
  }

  const candidate = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(candidate.valueOf())) {
    return getISODate(new Date());
  }

  return getISODate(candidate);
}

function getUserMeta(username) {
  if (!username) return null;

  try {
    const stored = localStorage.getItem(`${USER_META_PREFIX}${username}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Unable to parse user meta", error);
    return null;
  }
}

function saveUserMeta(username, meta) {
  if (!username) return;
  const existing = getUserMeta(username) ?? {};
  const updated = { ...existing, ...meta };
  localStorage.setItem(`${USER_META_PREFIX}${username}`, JSON.stringify(updated));
}

function loadUserMoods(targetUser = currentUser) {
  if (!targetUser) {
    return [];
  }

  const key = `${STORAGE_PREFIX}moods.${targetUser}`;
  const stored = localStorage.getItem(key);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Unable to parse mood data", error);
    return [];
  }
}

function fillMissingDays(data, targetUser = currentUser) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const meta = getUserMeta(targetUser);
  let startDate = null;

  data.forEach((item) => {
    if (!item?.date) return;
    const parsed = new Date(item.date);
    if (Number.isNaN(parsed)) return;
    parsed.setHours(0, 0, 0, 0);
    if (!startDate || parsed < startDate) {
      startDate = parsed;
    }
  });

  if (meta?.createdAt) {
    const created = new Date(meta.createdAt);
    if (!Number.isNaN(created)) {
      created.setHours(0, 0, 0, 0);
      if (!startDate || created < startDate) {
        startDate = created;
      }
    }
  }

  if (!startDate) {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const moodMap = new Map();
  data.forEach((item) => {
    if (!item?.date) return;
    moodMap.set(item.date, item.color ?? null);
  });

  const filled = [];
  const cursor = new Date(startDate);
  let changed = false;

  while (cursor <= today) {
    const iso = getISODate(cursor);
    const storedColor = moodMap.has(iso) ? moodMap.get(iso) ?? null : null;
    if (!moodMap.has(iso)) {
      changed = true;
    } else if (moodMap.get(iso) !== storedColor) {
      changed = true;
    }
    filled.push({ date: iso, color: storedColor });
    cursor.setDate(cursor.getDate() + 1);
  }

  if (filled.length !== data.length) {
    changed = true;
  }

  return { data: filled, changed };
}

function ensureCompleteHistory(targetUser = currentUser) {
  const source = loadUserMoods(targetUser);
  const { data, changed } = fillMissingDays(source, targetUser);

  if (changed) {
    saveUserMoods(data, targetUser, { skipNormalization: true });
  }

  return data;
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
    if (starterMoods.length > 0) {
      const earliest = starterMoods.reduce(
        (min, item) => (item.date < min ? item.date : min),
        starterMoods[0].date
      );
      saveUserMeta(username, { createdAt: earliest });
    } else {
      saveUserMeta(username, { createdAt: getISODate(new Date()) });
    }
  } else if (!getUserMeta(username)) {
    const stored = loadUserMoods(username);
    const earliest = stored.length
      ? stored.reduce(
          (min, item) => (item.date < min ? item.date : min),
          stored[0].date
        )
      : getISODate(new Date());
    saveUserMeta(username, { createdAt: earliest });
  }
}

function getUserMoods(targetUser = currentUser) {
  if (!targetUser) {
    return [];
  }

  return ensureCompleteHistory(targetUser);
}

function saveUserMoods(data, targetUser = currentUser, options = {}) {
  if (!targetUser) return;
  const key = `${STORAGE_PREFIX}moods.${targetUser}`;
  localStorage.setItem(key, JSON.stringify(data));
  if (!options.skipNormalization) {
    ensureCompleteHistory(targetUser);
  }
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
    ensureCompleteHistory(username);
    showAppPanel();
    logButton.disabled = false;
    signOutButton.hidden = false;
    signOutButton.textContent = `Sign out (${username})`;
    hasPromptedForToday = false;
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
    showAuthPanel();
    logButton.disabled = true;
    signOutButton.hidden = true;
    hasPromptedForToday = false;
    setActiveView("map");
  }

  renderGrid();

  if (username) {
    promptForTodayIfNeeded();
  }
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

function logMood(color, targetDate = getISODate(new Date())) {
  if (!currentUser) {
    return;
  }

  const isoDate = normalizeToISO(targetDate);
  const data = getUserMoods();
  const existing = data.find((item) => item.date === isoDate);

  if (existing) {
    existing.color = color;
  } else {
    data.push({ date: isoDate, color });
  }

  saveUserMoods(data);
  if (isoDate === getISODate(new Date())) {
    hasPromptedForToday = true;
  }
  renderGrid();
}

function clearMoodForDate(targetDate) {
  if (!currentUser || !targetDate) {
    return;
  }

  const isoDate = normalizeToISO(targetDate);
  const data = getUserMoods();
  const existing = data.find((item) => item.date === isoDate);

  if (existing) {
    existing.color = null;
  } else {
    data.push({ date: isoDate, color: null });
  }

  saveUserMoods(data);

  if (isoDate === getISODate(new Date())) {
    hasPromptedForToday = false;
  }

  renderGrid();
}

function addDateInteractions(element, isoDate) {
  if (!element || !isoDate) return;

  const open = () => {
    openMoodModal(isoDate);
  };

  if (!element.hasAttribute("tabindex")) {
    element.tabIndex = 0;
  }

  element.addEventListener("click", open);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
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
      moodLabel.textContent = getMoodNameByColor(color) ?? "";

      cellContent.append(label, moodLabel);
      cell.appendChild(cellContent);
      cell.dataset.date = isoDate;
      cell.title = color ? `${moodLabel.textContent} on ${date.toDateString()}` : date.toDateString();

      if (currentUser) {
        cell.classList.add("cell--interactive");
        cell.tabIndex = 0;
        addDateInteractions(cell, isoDate);
      }
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

  renderHistory();
  promptForTodayIfNeeded();
}

function changeMonth(offset) {
  currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + offset, 1);
  renderGrid();
}

function renderTimeline(data) {
  if (!historyTimeline) return false;

  historyTimeline.innerHTML = "";

  if (!data.length) {
    return false;
  }

  const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 28);
  let hasLoggedMood = false;

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  recent.forEach((item) => {
    const moodName = item.color ? getMoodNameByColor(item.color) : null;
    if (item.color && moodName) {
      hasLoggedMood = true;
    }

    const entry = document.createElement("li");
    entry.className = "timeline__item";

    const swatch = document.createElement("span");
    swatch.className = "timeline__swatch";
    if (item.color) {
      swatch.style.background = item.color;
    } else {
      swatch.style.background = "linear-gradient(135deg, rgba(31, 42, 55, 0.1), rgba(31, 42, 55, 0.02))";
    }

    const details = document.createElement("div");
    details.className = "timeline__details";

    const dateLabel = document.createElement("span");
    dateLabel.className = "timeline__date";
    const entryDate = new Date(item.date);
    const isValidDate = !Number.isNaN(entryDate.valueOf());
    dateLabel.textContent = isValidDate ? dateFormatter.format(entryDate) : item.date;

    const moodLabel = document.createElement("span");
    moodLabel.className = "timeline__mood";
    moodLabel.textContent = moodName ? `${moodName} check-in` : "No mood logged";

    details.append(dateLabel, moodLabel);
    entry.append(swatch, details);

    if (currentUser && isValidDate) {
      entry.classList.add("timeline__item--interactive");
      entry.setAttribute("role", "button");
      entry.setAttribute("aria-label", `Update mood for ${formatDate(entryDate)}`);
      addDateInteractions(entry, item.date);
    }

    historyTimeline.appendChild(entry);
  });

  return hasLoggedMood;
}

function renderHistoryCalendar(data) {
  if (!historyCalendar) return;

  historyCalendar.innerHTML = "";

  if (!data.length) {
    return;
  }

  const monthBuckets = new Map();
  data.forEach((item) => {
    if (!item?.date) return;
    const date = new Date(item.date);
    if (Number.isNaN(date)) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthBuckets.has(key)) {
      monthBuckets.set(key, []);
    }
    monthBuckets.get(key).push(item);
  });

  if (monthBuckets.size === 0) {
    return;
  }

  const sortedKeys = Array.from(monthBuckets.keys()).sort(
    (a, b) => new Date(`${a}-01`) - new Date(`${b}-01`)
  );
  const keysToRender = sortedKeys.slice(-12);
  const todayISO = getISODate(new Date());

  keysToRender.forEach((key) => {
    const [year, month] = key.split("-").map(Number);
    const monthDate = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = monthDate.getDay();
    const monthData = monthBuckets.get(key) ?? [];
    const monthMap = new Map(monthData.map((entry) => [entry.date, entry.color]));

    const monthElement = document.createElement("section");
    monthElement.className = "history-calendar__month";

    const header = document.createElement("div");
    header.className = "history-calendar__header";

    const headerLabel = document.createElement("span");
    headerLabel.textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric"
    }).format(monthDate);

    const headerBadge = document.createElement("span");
    headerBadge.className = "history-calendar__badge";
    const loggedCount = monthData.filter((entry) => entry.color).length;
    headerBadge.textContent = loggedCount ? `${loggedCount} logged` : "No logs";

    header.append(headerLabel, headerBadge);

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "history-calendar__weekdays";
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
      const span = document.createElement("span");
      span.textContent = day;
      weekdaysRow.appendChild(span);
    });

    const grid = document.createElement("div");
    grid.className = "history-calendar__grid";

    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let index = 0; index < totalCells; index += 1) {
      const dayNumber = index - startOffset + 1;
      if (dayNumber <= 0 || dayNumber > daysInMonth) {
        const paddingCell = document.createElement("div");
        paddingCell.className = "history-calendar__cell history-calendar__cell--padding";
        paddingCell.setAttribute("aria-hidden", "true");
        grid.appendChild(paddingCell);
        continue;
      }

      const cellDate = new Date(year, month - 1, dayNumber);
      const iso = getISODate(cellDate);
      const color = monthMap.get(iso);

      const cell = document.createElement("div");
      cell.className = "history-calendar__cell";
      cell.dataset.day = String(dayNumber);

      if (color) {
        cell.dataset.color = color;
        cell.style.setProperty("--history-color", color);
        const moodName = getMoodNameByColor(color) ?? "Mood";
        cell.title = `${moodName} on ${cellDate.toDateString()}`;
      } else {
        cell.classList.add("history-calendar__cell--empty");
        cell.title = `No mood logged on ${cellDate.toDateString()}`;
      }

      if (iso === todayISO) {
        cell.classList.add("history-calendar__cell--today");
      }

      if (currentUser) {
        cell.classList.add("history-calendar__cell--interactive");
        cell.setAttribute("role", "button");
        addDateInteractions(cell, iso);
      }

      grid.appendChild(cell);
    }

    monthElement.append(header, weekdaysRow, grid);
    historyCalendar.appendChild(monthElement);
  });
}

function renderHistory() {
  if (!historyView) return;

  if (!currentUser) {
    if (historyTimeline) {
      historyTimeline.innerHTML = "";
    }
    if (historyCalendar) {
      historyCalendar.innerHTML = "";
    }
    if (historyEmptyState) {
      historyEmptyState.textContent = "Sign in to see your history.";
      historyEmptyState.classList.remove("view--hidden");
    }
    return;
  }

  const data = getUserMoods();

  if (!data.length) {
    if (historyTimeline) {
      historyTimeline.innerHTML = "";
    }
    if (historyCalendar) {
      historyCalendar.innerHTML = "";
    }
    if (historyEmptyState) {
      historyEmptyState.textContent = "Log your mood to start building your personal history.";
      historyEmptyState.classList.remove("view--hidden");
    }
    return;
  }

  const hasLoggedMood = renderTimeline(data);
  renderHistoryCalendar(data);

  if (historyEmptyState) {
    if (hasLoggedMood) {
      historyEmptyState.classList.add("view--hidden");
    } else {
      historyEmptyState.textContent = "Log your mood to start building your personal history.";
      historyEmptyState.classList.remove("view--hidden");
    }
  }
}

function setActiveView(view) {
  activeView = view;

  mapView?.classList.toggle("view--hidden", view !== "map");
  historyView?.classList.toggle("view--hidden", view !== "history");

  navButtons.forEach((button) => {
    const target = button.getAttribute("data-view-target");
    if (!target) return;
    button.classList.toggle("nav__item--active", target === view);
  });

  if (view === "history") {
    renderHistory();
  }
}

function updateModalForDate() {
  if (!modal || !modalContextDate) return;

  const data = getUserMoods();
  const entry = data.find((item) => item.date === modalContextDate) ?? null;
  const color = entry?.color ?? null;
  const moodName = color ? getMoodNameByColor(color) : null;
  const targetDate = new Date(modalContextDate);
  const isValidDate = !Number.isNaN(targetDate.valueOf());
  const todayISO = getISODate(new Date());

  if (modalTitle) {
    if (modalContextDate === todayISO) {
      modalTitle.textContent = "How are you feeling today?";
    } else if (isValidDate) {
      modalTitle.textContent = `Log your mood for ${formatDate(targetDate)}`;
    } else {
      modalTitle.textContent = "Log your mood";
    }
  }

  if (modalSubtitle) {
    if (moodName) {
      modalSubtitle.textContent = `Currently logged: ${moodName}. Tap a mood to update it.`;
    } else {
      modalSubtitle.textContent = "No mood logged yet. Tap a mood to log it.";
    }
  }

  if (clearMoodButton) {
    clearMoodButton.disabled = !color;
  }

  if (paletteElement) {
    Array.from(paletteElement.querySelectorAll(".palette__option")).forEach((option) => {
      const optionColor = option.getAttribute("data-color");
      const isActive = Boolean(color) && optionColor === color;
      option.classList.toggle("palette__option--active", isActive);
      option.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }
}

function handlePaletteSelection(color) {
  if (!currentUser) {
    modal.close();
    showAuthPanel();
    toggleAuthMode("signIn");
    return;
  }

  const targetDate = modalContextDate ?? getISODate(new Date());
  logMood(color, targetDate);

  if (modal.open) {
    modal.close();
  } else {
    modal.removeAttribute("open");
  }
}

function openMoodModal(targetDate = new Date()) {
  if (!modal) return;

  if (!currentUser) {
    showAuthPanel();
    toggleAuthMode("signIn");
    return;
  }

  modalContextDate = normalizeToISO(targetDate);
  updateModalForDate();

  if (typeof modal.showModal === "function") {
    if (!modal.open) {
      modal.showModal();
    }
  } else {
    modal.setAttribute("open", "true");
  }
}

function shouldPromptForToday() {
  if (!currentUser) return false;
  const todayISO = getISODate(new Date());
  const data = getUserMoods();
  const entry = data.find((item) => item.date === todayISO);
  return !entry || !entry.color;
}

function promptForTodayIfNeeded() {
  if (!currentUser || hasPromptedForToday) return;

  if (!shouldPromptForToday()) {
    hasPromptedForToday = true;
    return;
  }

  hasPromptedForToday = true;
  setTimeout(() => {
    openMoodModal(new Date());
  }, 200);
}

function hydrateLegend() {
  if (!legendList) return;
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
  if (!paletteElement) return;
  paletteElement.innerHTML = "";
  palette.forEach(({ mood, color }) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "palette__option";
    option.dataset.color = color;
    option.dataset.mood = mood;
    option.setAttribute("aria-pressed", "false");
    option.innerHTML = `
      <span class="palette__swatch" style=\"background: ${color}\"></span>
      <span>${mood}</span>
    `;
    option.addEventListener("click", () => {
      handlePaletteSelection(color);
    });
    paletteElement.appendChild(option);
  });

  if (modalContextDate) {
    updateModalForDate();
  }
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

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-view-target");
      if (!target) return;
      setActiveView(target);
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
    const todayISO = getISODate(new Date());
    saveUserMeta(username, { createdAt: todayISO });
    saveUserMoods([], username, { skipNormalization: true });
    ensureCompleteHistory(username);

    setAuthMessage("create", "Account created! Signing you in...", "success");
    createForm.reset();
    resetCombo("create");
    setCurrentUser(username);
  });

  toggleAuthMode("signIn");
  setActiveView(activeView);

  const storedUser = localStorage.getItem(CURRENT_USER_KEY);
  const knownUsers = loadUsers();

  if (storedUser && knownUsers[storedUser]) {
    setCurrentUser(storedUser);
  } else {
    setCurrentUser(null);
    signOutButton.hidden = true;
  }
}

clearMoodButton?.addEventListener("click", () => {
  if (!currentUser || !modalContextDate) return;
  clearMoodForDate(modalContextDate);
  if (typeof modal.close === "function") {
    modal.close();
  } else {
    modal.removeAttribute("open");
  }
});

logButton.addEventListener("click", () => {
  if (!currentUser) {
    showAuthPanel();
    toggleAuthMode("signIn");
    resetCombo("signIn");
    signInUsernameInput.focus();
    return;
  }

  openMoodModal(new Date());
});

modal.addEventListener("close", () => {
  modalContextDate = null;
  if (modalSubtitle) {
    modalSubtitle.textContent = "Tap a mood to log it.";
  }
  if (clearMoodButton) {
    clearMoodButton.disabled = true;
  }
  if (paletteElement) {
    Array.from(paletteElement.querySelectorAll(".palette__option")).forEach((option) => {
      option.classList.remove("palette__option--active");
      option.setAttribute("aria-pressed", "false");
    });
  }
});

modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  if (typeof modal.close === "function") {
    modal.close();
  } else {
    modal.removeAttribute("open");
  }
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

