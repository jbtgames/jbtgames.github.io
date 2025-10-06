const subjects = [
  {
    id: "midnight-pop",
    name: "Midnight Aurora",
    type: "Album",
    year: 2022,
    origin: "Nova Reign",
    description:
      "Synth-drenched pop that topped every playlist for a year straight. Is the neon glow still dazzling or starting to flicker?",
    stats: [
      { icon: "🎧", label: "Streams", value: "2.4B" },
      { icon: "🏆", label: "Awards", value: "5 major wins" }
    ],
    accent:
      "radial-gradient(circle at top right, rgba(255, 120, 196, 0.45), transparent 65%)"
  },
  {
    id: "moonfall",
    name: "Moonfall: Beyond the Rift",
    type: "Movie",
    year: 2021,
    origin: "R. K. Vega",
    description:
      "The space opera that promised to redefine sci-fi blockbusters. Fans call it visionary, critics call it very loud.",
    stats: [
      { icon: "🍿", label: "Box Office", value: "$1.3B" },
      { icon: "⭐", label: "Fan score", value: "91/100" }
    ],
    accent:
      "radial-gradient(circle at top left, rgba(120, 176, 255, 0.4), transparent 60%)"
  },
  {
    id: "spectrum-series",
    name: "Spectrum High",
    type: "Series",
    year: 2020,
    origin: "Channel Wave",
    description:
      "Teen drama turned cultural phenomenon. Eight seasons of cliffhangers, love triangles, and somehow still in high school.",
    stats: [
      { icon: "📺", label: "Seasons", value: "8 and counting" },
      { icon: "💬", label: "Memes", value: "Trending weekly" }
    ],
    accent:
      "radial-gradient(circle at bottom right, rgba(255, 180, 84, 0.45), transparent 60%)"
  },
  {
    id: "pulse-festival",
    name: "Pulsewave Festival",
    type: "Live Show",
    year: 2023,
    origin: "Global",
    description:
      "Three days of lasers, bass drops, and tickets that sell out before the lineup even drops. Worth the scramble?",
    stats: [
      { icon: "🎟️", label: "Tickets", value: "250k sold" },
      { icon: "🌐", label: "Livestream", value: "41M viewers" }
    ],
    accent:
      "radial-gradient(circle at center, rgba(120, 255, 214, 0.4), transparent 65%)"
  },
  {
    id: "retro-remake",
    name: "Chrono Legend Remake",
    type: "Game",
    year: 2024,
    origin: "Realmforge",
    description:
      "Beloved classic rebuilt with hyper-realistic graphics. Nostalgia says masterpiece, purists say leave the pixels alone.",
    stats: [
      { icon: "🕹️", label: "Preorders", value: "8.2M" },
      { icon: "🗳️", label: "User polls", value: "74% hype" }
    ],
    accent:
      "radial-gradient(circle at bottom left, rgba(196, 169, 255, 0.45), transparent 60%)"
  },
  {
    id: "viral-single",
    name: "Looped In (feat. June)",
    type: "Single",
    year: 2023,
    origin: "Luna Kai",
    description:
      "A hook so catchy it practically lives on short-form video. Is it genius production or just algorithm fuel?",
    stats: [
      { icon: "🎵", label: "Clips made", value: "11M" },
      { icon: "📈", label: "Chart run", value: "14 weeks #1" }
    ],
    accent:
      "radial-gradient(circle at top, rgba(255, 132, 132, 0.42), transparent 70%)"
  }
];

const currentCardEl = document.getElementById("current-card");
const nextCardEl = document.getElementById("next-card");
const cardStackEl = document.getElementById("card-stack");
const voteYesButton = document.getElementById("vote-yes");
const voteNoButton = document.getElementById("vote-no");
const restartButton = document.getElementById("restart-button");
const progressCurrent = document.getElementById("progress-current");
const progressTotal = document.getElementById("progress-total");
const statusRegion = document.getElementById("sr-status");

let deck = [];
let activeIndex = 0;
let locked = false;
let activeCard = currentCardEl;
let standbyCard = nextCardEl;

const pointerState = {
  id: null,
  active: false,
  startX: 0
};

startRound();

voteYesButton.addEventListener("click", () => handleVote("overrated"));
voteNoButton.addEventListener("click", () => handleVote("chill"));
restartButton.addEventListener("click", () => startRound());

document.addEventListener("keydown", (event) => {
  if (locked || activeIndex >= deck.length) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    handleVote("overrated");
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    handleVote("chill");
  }
});

cardStackEl.addEventListener("pointerdown", (event) => {
  if (locked || activeIndex >= deck.length) return;
  pointerState.active = true;
  pointerState.id = event.pointerId;
  pointerState.startX = event.clientX;
  activeCard.setPointerCapture(pointerState.id);
  activeCard.style.transition = "none";
});

cardStackEl.addEventListener("pointermove", (event) => {
  if (!pointerState.active || event.pointerId !== pointerState.id) return;
  const deltaX = event.clientX - pointerState.startX;
  const rotation = deltaX / 14;
  activeCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
  const fade = Math.min(Math.abs(deltaX) / 260, 0.4);
  activeCard.style.opacity = `${1 - fade}`;
});

cardStackEl.addEventListener("pointerup", (event) => {
  if (!pointerState.active || event.pointerId !== pointerState.id) return;
  const deltaX = event.clientX - pointerState.startX;
  finalizePointerGesture();
  const threshold = cardStackEl.clientWidth * 0.25;
  if (Math.abs(deltaX) > threshold) {
    handleVote(deltaX > 0 ? "overrated" : "chill");
  }
});

cardStackEl.addEventListener("pointercancel", (event) => {
  if (!pointerState.active || event.pointerId !== pointerState.id) return;
  finalizePointerGesture();
});

function finalizePointerGesture() {
  if (!pointerState.active) return;
  activeCard.releasePointerCapture(pointerState.id);
  pointerState.active = false;
  pointerState.id = null;
  pointerState.startX = 0;
  activeCard.style.transition = "";
  activeCard.style.transform = "";
  activeCard.style.opacity = "";
}

function startRound() {
  deck = shuffle(subjects);
  activeIndex = 0;
  locked = false;
  activeCard = currentCardEl;
  standbyCard = nextCardEl;

  progressTotal.textContent = deck.length;
  progressCurrent.textContent = deck.length ? 1 : 0;

  restartButton.hidden = true;
  setButtonsDisabled(deck.length === 0);

  prepareCard(activeCard, "current");
  prepareCard(standbyCard, "standby");

  if (!deck.length) {
    renderCompletion(activeCard);
    return;
  }

  renderSubject(activeCard, deck[0]);
  announceSubject(deck[0]);

  const upcoming = deck[1];
  if (upcoming) {
    renderSubject(standbyCard, upcoming);
    standbyCard.classList.add("incoming");
  } else {
    clearCard(standbyCard);
  }
}

function handleVote(vote) {
  if (locked || activeIndex >= deck.length) return;

  locked = true;
  setButtonsDisabled(true);

  const subject = deck[activeIndex];
  announceVote(subject, vote);

  const outgoing = activeCard;
  const incoming = standbyCard;
  const swipeClass = vote === "overrated" ? "swipe-right" : "swipe-left";
  outgoing.classList.add("leaving", swipeClass);

  window.setTimeout(() => {
    outgoing.classList.remove("leaving", "swipe-right", "swipe-left");
    prepareCard(outgoing, "standby");

    activeIndex += 1;
    const hasNext = activeIndex < deck.length;

    if (hasNext) {
      prepareCard(incoming, "current");
      renderSubject(incoming, deck[activeIndex]);
      announceSubject(deck[activeIndex]);
      activeCard = incoming;
      standbyCard = outgoing;
      progressCurrent.textContent = activeIndex + 1;

      const upcoming = deck[activeIndex + 1];
      if (upcoming) {
        prepareCard(standbyCard, "standby");
        renderSubject(standbyCard, upcoming);
        standbyCard.classList.add("incoming");
      } else {
        clearCard(standbyCard);
      }

      locked = false;
      setButtonsDisabled(false);
    } else {
      activeCard = incoming;
      standbyCard = outgoing;
      prepareCard(activeCard, "current");
      renderCompletion(activeCard);
      progressCurrent.textContent = deck.length;
      restartButton.hidden = false;
      restartButton.focus();
      locked = false;
    }
  }, 300);
}

function renderSubject(card, subject) {
  card.style.setProperty("--card-accent", subject.accent);
  const statsMarkup = subject.stats
    .map((stat) => `<span>${stat.icon}<strong>${stat.value}</strong> ${stat.label}</span>`)
    .join("");

  card.innerHTML = `
    <div class="subject-meta">
      <span class="subject-type">${getTypeEmoji(subject.type)} ${subject.type}</span>
      <span class="subject-year">${subject.year}</span>
    </div>
    <h2 class="subject-title">${subject.name}</h2>
    <p class="subject-description">${subject.description}</p>
    <div class="subject-stats">${statsMarkup}</div>
    <span class="subject-origin">Claim to fame: ${subject.origin}</span>
  `;
}

function renderCompletion(card) {
  card.classList.add("finished");
  card.style.removeProperty("--card-accent");
  card.innerHTML = `
    <div class="finished-inner">
      <h2>That's the deck</h2>
      <p>You've weighed in on every pick. Shuffle again to keep the takes coming.</p>
    </div>
  `;
  setButtonsDisabled(true);
  statusRegion.textContent = "Deck finished. Shuffle again for fresh subjects.";
}

function clearCard(card) {
  prepareCard(card, "standby");
  card.innerHTML = "";
  card.classList.remove("incoming");
}

function prepareCard(card, role) {
  card.className = role === "current" ? "subject-card current" : "subject-card standby";
  if (role === "current") {
    card.removeAttribute("aria-hidden");
  } else {
    card.setAttribute("aria-hidden", "true");
  }
  card.style.removeProperty("--card-accent");
  card.innerHTML = "";
}

function setButtonsDisabled(state) {
  voteYesButton.disabled = state;
  voteNoButton.disabled = state;
}

function announceSubject(subject) {
  statusRegion.textContent = `${subject.name}. ${subject.type} • ${subject.year}.`;
}

function announceVote(subject, vote) {
  const label = vote === "overrated" ? "Overrated" : "Not overrated";
  statusRegion.textContent = `You voted ${label} for ${subject.name}.`;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getTypeEmoji(type) {
  const map = {
    Album: "🎶",
    Movie: "🎬",
    Series: "📺",
    "Live Show": "🎤",
    Game: "🕹️",
    Single: "🎵"
  };
  return map[type] || "✨";
}
