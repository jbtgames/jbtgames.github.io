const palette = [
  { mood: "Joy", color: "#FFD166" },
  { mood: "Calm", color: "#5AB3E6" },
  { mood: "Focused", color: "#06D6A0" },
  { mood: "Tired", color: "#A8A8A8" },
  { mood: "Sad", color: "#26547C" },
  { mood: "Angry", color: "#EF476F" }
];

const mockMoods = [
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

const gridElement = document.getElementById("moodGrid");
const paletteElement = document.getElementById("palette");
const legendList = document.getElementById("legendList");
const logButton = document.getElementById("logMoodButton");
const modal = document.getElementById("moodModal");
const streakCount = document.getElementById("streakCount");
const gridMonth = document.getElementById("gridMonth");
const currentDateLabel = document.getElementById("currentDate");

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

function hydrateLegend() {
  legendList.innerHTML = "";
  palette.forEach(({ mood, color }) => {
    const item = document.createElement("li");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-item__swatch" style="background: ${color}"></span>
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
      <span class="palette__swatch" style="background: ${color}"></span>
      <span>${mood}</span>
    `;
    option.addEventListener("click", () => {
      modal.close();
      logMood(color);
    });
    paletteElement.appendChild(option);
  });
}

function getMockData() {
  return JSON.parse(localStorage.getItem("moodmap.moods")) ?? mockMoods;
}

function saveMockData(data) {
  localStorage.setItem("moodmap.moods", JSON.stringify(data));
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
  const today = getISODate(new Date());
  const data = getMockData();
  const existing = data.find((item) => item.date === today);

  if (existing) {
    existing.color = color;
  } else {
    data.push({ date: today, color });
  }

  saveMockData(data);
  renderGrid();
}

function renderGrid() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const data = getMockData();
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
      const date = new Date(now.getFullYear(), now.getMonth(), dayNumber);
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

  streakCount.textContent = `${calculateStreak(data, now)} day${calculateStreak(data, now) === 1 ? "" : "s"}`;
  gridMonth.textContent = formatMonth(now);
  currentDateLabel.textContent = formatDate(now);
}

logButton.addEventListener("click", () => {
  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    // Fallback for browsers without dialog support
    modal.setAttribute("open", "true");
  }
});

modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  modal.close();
});

hydrateLegend();
hydratePalette();
renderGrid();
