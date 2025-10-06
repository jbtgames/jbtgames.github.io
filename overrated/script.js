const subjects = Array.isArray(window.OVERRATED_SUBJECTS) ? window.OVERRATED_SUBJECTS : [];

const pointerState = {
  id: null,
  active: false,
  startX: 0,
  captureTarget: null
};

let cardStackEl;
let voteYesButton;
let voteNoButton;
let restartButton;
let progressCurrent;
let progressTotal;
let statusRegion;
let topList;
let activeCard;
let standbyCard;

let deck = [];
let activeIndex = 0;
let locked = false;

initializeWhenReady();

function initializeWhenReady() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
}

function setup() {
  activeCard = document.getElementById("current-card");
  standbyCard = document.getElementById("next-card");
  cardStackEl = document.getElementById("card-stack");
  voteYesButton = document.getElementById("vote-yes");
  voteNoButton = document.getElementById("vote-no");
  restartButton = document.getElementById("restart-button");
  progressCurrent = document.getElementById("progress-current");
  progressTotal = document.getElementById("progress-total");
  statusRegion = document.getElementById("sr-status");
  topList = document.getElementById("top-list");

  if (
    !activeCard ||
    !standbyCard ||
    !cardStackEl ||
    !voteYesButton ||
    !voteNoButton ||
    !restartButton ||
    !progressCurrent ||
    !progressTotal ||
    !statusRegion ||
    !topList
  ) {
    return;
  }

  voteYesButton.addEventListener("click", () => handleVote("overrated"));
  voteNoButton.addEventListener("click", () => handleVote("chill"));
  restartButton.addEventListener("click", () => startRound());

  renderTopOverrated();

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
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(pointerState.id);
      pointerState.captureTarget = event.currentTarget;
    }
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

  startRound();
}

function finalizePointerGesture() {
  if (!pointerState.active) return;
  if (
    pointerState.captureTarget &&
    typeof pointerState.captureTarget.releasePointerCapture === "function"
  ) {
    pointerState.captureTarget.releasePointerCapture(pointerState.id);
  }
  pointerState.active = false;
  pointerState.id = null;
  pointerState.startX = 0;
  pointerState.captureTarget = null;
  activeCard.style.transition = "";
  activeCard.style.transform = "";
  activeCard.style.opacity = "";
}

function startRound() {
  deck = shuffle(subjects);
  activeIndex = 0;
  locked = false;

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
    .map(
      (stat) =>
        `<span class="stat-pill" role="listitem"><span class="stat-icon" aria-hidden="true">${stat.icon}</span><strong>${stat.value}</strong><small>${stat.label}</small></span>`
    )
    .join("");

  card.innerHTML = `
    <figure class="subject-media">
      <img src="${subject.image}" alt="${subject.imageAlt || subject.name}" loading="lazy" />
    </figure>
    <div class="subject-meta">
      <span class="subject-type">${getTypeEmoji(subject.type)} ${subject.type}</span>
      <span class="subject-year">${subject.year}</span>
    </div>
    <h2 class="subject-title">${subject.name}</h2>
    <p class="subject-description">${subject.description}</p>
    <div class="subject-stats" role="list">${statsMarkup}</div>
    <span class="subject-origin">${subject.origin}</span>
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

function renderTopOverrated() {
  const topFive = [...subjects]
    .filter((item) => typeof item.overratedScore === "number")
    .sort((a, b) => b.overratedScore - a.overratedScore)
    .slice(0, 5);

  topList.innerHTML = topFive
    .map(
      (subject, index) => `
        <li class="top-item">
          <span class="top-rank">#${index + 1}</span>
          <figure class="top-thumb">
            <img src="${subject.image}" alt="${subject.imageAlt || subject.name}" loading="lazy" />
          </figure>
          <div class="top-meta">
            <span class="top-name">${subject.name}</span>
            <span class="top-type">${getTypeEmoji(subject.type)} ${subject.type} • ${subject.year}</span>
            <span class="top-score">${subject.overratedScore}% say overrated</span>
          </div>
        </li>
      `
    )
    .join("");
}

function clearCard(card) {
  prepareCard(card, "standby");
  card.innerHTML = "";
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
    Artist: "🎤",
    Album: "🎶",
    Movie: "🎬",
    Series: "📺",
    "Live Show": "🎤",
    Game: "🕹️",
    Single: "🎵",
    Franchise: "🦸",
    Product: "🚗",
    Event: "🎉",
    Trend: "🔥"
  };
  return map[type] || "✨";
}
