import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const palette = [
  { mood: "Joy", color: "#FFD166" },
  { mood: "Calm", color: "#5AB3E6" },
  { mood: "Focused", color: "#06D6A0" },
  { mood: "Tired", color: "#A8A8A8" },
  { mood: "Sad", color: "#26547C" },
  { mood: "Angry", color: "#EF476F" }
];

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
const authTabs = document.querySelectorAll("[data-auth-tab]");
const authForms = document.querySelectorAll("[data-auth-form]");
const authNotice = document.getElementById("authNotice");
const authTitle = document.getElementById("authTitle");

const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");

const registerForm = document.getElementById("registerForm");
const registerNameInput = document.getElementById("registerName");
const registerEmailInput = document.getElementById("registerEmail");
const registerPasswordInput = document.getElementById("registerPassword");
const registerConfirmInput = document.getElementById("registerConfirm");
const registerMessage = document.getElementById("registerMessage");

const firebaseConfig = window.moodMapFirebaseConfig;

let firebaseReady = false;
let appInstance;
let auth;
let db;
let user = null;
let moodEntries = [];
let currentViewDate = (() => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
})();
let unsubscribeMoods = null;

const status = {
  pendingLogin: false,
  pendingRegister: false
};

function setFormsEnabled(isEnabled) {
  [loginForm, registerForm].forEach((form) => {
    if (!form) return;
    Array.from(form.elements).forEach((element) => {
      element.disabled = !isEnabled;
    });
  });
}

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

function setAuthMessage(target, message, tone = "info") {
  const element = target === "login" ? loginMessage : registerMessage;
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = message ? tone : "";
  if (!message) {
    delete element.dataset.tone;
  }
}

function setAuthNotice(message) {
  if (!authNotice) return;
  if (message) {
    authNotice.removeAttribute("hidden");
    authNotice.textContent = message;
  } else {
    authNotice.setAttribute("hidden", "true");
    authNotice.textContent = "";
  }
}

function toggleForm(mode) {
  authTabs.forEach((tab) => {
    const isActive = tab.dataset.authTab === mode;
    tab.classList.toggle("auth__tab--active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  authForms.forEach((form) => {
    form.toggleAttribute("hidden", form.dataset.authForm !== mode);
  });

  authTitle.textContent = mode === "login" ? "Welcome back" : "Create your MoodMap";

  if (mode === "login") {
    loginEmailInput?.focus();
  } else {
    registerNameInput?.focus();
  }
}

function hydrateLegend() {
  legendList.innerHTML = "";
  palette.forEach(({ mood, color }) => {
    const item = document.createElement("li");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-item__swatch" style="background:${color}"></span>
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
      <span class="palette__swatch" style="background:${color}"></span>
      <span>${mood}</span>
    `;
    option.addEventListener("click", () => {
      modal.close();
      logMood(color, mood);
    });
    paletteElement.appendChild(option);
  });
}

function calculateStreak(data, today) {
  const dates = new Set(data.map((item) => item.date));
  let streak = 0;
  const cursor = new Date(today);

  while (dates.has(getISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function renderGrid() {
  const now = new Date();
  const viewDate = new Date(
    currentViewDate.getFullYear(),
    currentViewDate.getMonth(),
    1
  );
  const firstDay = new Date(viewDate);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();
  const todayISO = getISODate(now);
  const dataMap = new Map(moodEntries.map((entry) => [entry.date, entry.color]));
  const moodMap = new Map(moodEntries.map((entry) => [entry.date, entry.mood]));

  gridElement.innerHTML = "";
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");

    const cellContent = document.createElement("div");
    cellContent.className = "cell__content";

    const dayNumber = cellIndex - startOffset + 1;

    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      const date = new Date(
        viewDate.getFullYear(),
        viewDate.getMonth(),
        dayNumber
      );
      const isoDate = getISODate(date);
      const color = dataMap.get(isoDate);
      const mood = moodMap.get(isoDate);

      if (color) {
        cell.classList.add("cell--filled");
        cell.style.setProperty("--cell-color", color);
      }

      if (isoDate === todayISO) {
        cell.classList.add("cell--today");
      }

      const label = document.createElement("span");
      label.className = "cell__date";
      label.textContent = dayNumber;

      const moodLabel = document.createElement("span");
      moodLabel.className = "cell__mood";
      moodLabel.textContent = mood ?? "";

      cellContent.append(label, moodLabel);
      cell.appendChild(cellContent);
      cell.dataset.date = isoDate;
      cell.title = mood ? `${mood} on ${date.toDateString()}` : date.toDateString();
    } else {
      cell.classList.add("cell--empty");
      cellContent.setAttribute("aria-hidden", "true");
      cell.appendChild(cellContent);
    }

    gridElement.appendChild(cell);
  }

  const streakValue = user ? calculateStreak(moodEntries, now) : 0;
  streakCount.textContent = user
    ? `${streakValue} day${streakValue === 1 ? "" : "s"}`
    : "Sign in to start";
  gridMonth.textContent = formatMonth(viewDate);
  currentDateLabel.textContent = formatDate(now);

  const isCurrentMonth =
    viewDate.getFullYear() === now.getFullYear() &&
    viewDate.getMonth() === now.getMonth();

  nextMonthButton.disabled = isCurrentMonth;
}

function logMood(color, mood) {
  if (!user || !firebaseReady) {
    return;
  }

  const today = getISODate(new Date());
  const moodDoc = doc(db, "users", user.uid, "moods", today);

  setDoc(moodDoc, {
    date: today,
    color,
    mood,
    updatedAt: Date.now()
  });
}

function changeMonth(offset) {
  currentViewDate = new Date(
    currentViewDate.getFullYear(),
    currentViewDate.getMonth() + offset,
    1
  );
  renderGrid();
}

function unsubscribeFromMoods() {
  if (unsubscribeMoods) {
    unsubscribeMoods();
    unsubscribeMoods = null;
  }
}

function subscribeToMoods(currentUser) {
  unsubscribeFromMoods();

  if (!currentUser || !firebaseReady) {
    moodEntries = [];
    renderGrid();
    return;
  }

  const moodsQuery = query(
    collection(db, "users", currentUser.uid, "moods"),
    orderBy("date", "asc")
  );

  unsubscribeMoods = onSnapshot(moodsQuery, (snapshot) => {
    moodEntries = snapshot.docs.map((docSnapshot) => docSnapshot.data());
    renderGrid();
  });
}

function showAppPanel() {
  authPanel?.setAttribute("hidden", "true");
  appElement?.classList.remove("app--hidden");
}

function showAuthPanel() {
  authPanel?.removeAttribute("hidden");
  appElement?.classList.add("app--hidden");
}

function setLoadingState(form, isLoading) {
  const button = form.querySelector("button[type='submit']");
  if (button) {
    button.disabled = isLoading;
    button.dataset.loading = isLoading ? "true" : "false";
  }
}

function initialiseFirebase() {
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    setAuthNotice(
      "Add your Firebase configuration in MoodMap/firebase-config.js to enable secure sign-in."
    );
    setFormsEnabled(false);
    showAuthPanel();
    logButton.disabled = true;
    signOutButton.hidden = true;
    firebaseReady = false;
    return;
  }

  setAuthNotice("");
  setFormsEnabled(true);
  appInstance = initializeApp(firebaseConfig);
  auth = getAuth(appInstance);
  db = getFirestore(appInstance);
  firebaseReady = true;

  onAuthStateChanged(auth, (firebaseUser) => {
    user = firebaseUser;

    if (user) {
      showAppPanel();
      logButton.disabled = false;
      signOutButton.hidden = false;
      signOutButton.textContent = `Sign out (${user.displayName || user.email})`;
      subscribeToMoods(user);
    } else {
      showAuthPanel();
      logButton.disabled = true;
      signOutButton.hidden = true;
      moodEntries = [];
      renderGrid();
    }
  });
}

function initialiseAuth() {
  toggleForm("login");

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.authTab;
      toggleForm(mode);
    });
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!firebaseReady) return;

    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    if (!email || !password) {
      setAuthMessage("login", "Enter your email and password.", "error");
      return;
    }

    setAuthMessage("login", "");
    setLoadingState(loginForm, true);
    status.pendingLogin = true;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        loginForm.reset();
      })
      .catch((error) => {
        setAuthMessage("login", error.message.replace("Firebase:", "").trim(), "error");
      })
      .finally(() => {
        status.pendingLogin = false;
        setLoadingState(loginForm, false);
      });
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!firebaseReady) return;

    const displayName = registerNameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerConfirmInput.value;

    if (!displayName) {
      setAuthMessage("register", "Share a name to personalize your map.", "error");
      registerNameInput.focus();
      return;
    }

    if (!email) {
      setAuthMessage("register", "Enter an email address.", "error");
      registerEmailInput.focus();
      return;
    }

    if (password.length < 6) {
      setAuthMessage("register", "Password must be at least 6 characters.", "error");
      registerPasswordInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      setAuthMessage("register", "Passwords do not match.", "error");
      registerConfirmInput.focus();
      return;
    }

    setAuthMessage("register", "");
    setLoadingState(registerForm, true);
    status.pendingRegister = true;

    createUserWithEmailAndPassword(auth, email, password)
      .then(async ({ user: newUser }) => {
        if (displayName) {
          await updateProfile(newUser, { displayName });
        }
        registerForm.reset();
        toggleForm("login");
        setAuthMessage("login", "Account created! Sign in to start logging moods.", "success");
      })
      .catch((error) => {
        setAuthMessage("register", error.message.replace("Firebase:", "").trim(), "error");
      })
      .finally(() => {
        status.pendingRegister = false;
        setLoadingState(registerForm, false);
      });
  });

  signOutButton.addEventListener("click", () => {
    if (!firebaseReady) return;
    signOut(auth);
  });
}

function bindInteractions() {
  logButton.addEventListener("click", () => {
    if (!user) {
      showAuthPanel();
      toggleForm("login");
      loginEmailInput.focus();
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
}

hydrateLegend();
hydratePalette();
renderGrid();
initialiseAuth();
bindInteractions();
initialiseFirebase();
