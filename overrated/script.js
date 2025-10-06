(() => {
  const subjects = Array.isArray(window.OVERRATED_SUBJECTS)
    ? window.OVERRATED_SUBJECTS
    : [];

  const pointer = {
    active: false,
    id: null,
    startX: 0,
    captureTarget: null
  };

  const state = {
    deck: [],
    index: 0,
    locked: false
  };

  const dom = {};
  let activeCard;
  let standbyCard;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    dom.wrapper = document.getElementById("card-wrapper");
    dom.voteYes = document.getElementById("action-yes");
    dom.voteNo = document.getElementById("action-no");
    dom.restart = document.getElementById("restart");
    dom.progressCurrent = document.getElementById("progress-current");
    dom.progressTotal = document.getElementById("progress-total");
    dom.status = document.getElementById("aria-status");
    dom.leaderboard = document.getElementById("leaderboard-list");
    activeCard = document.getElementById("card-current");
    standbyCard = document.getElementById("card-standby");

    if (
      !dom.wrapper ||
      !dom.voteYes ||
      !dom.voteNo ||
      !dom.restart ||
      !dom.progressCurrent ||
      !dom.progressTotal ||
      !dom.status ||
      !dom.leaderboard ||
      !activeCard ||
      !standbyCard
    ) {
      return;
    }

    dom.voteYes.addEventListener("click", () => handleVote("overrated"));
    dom.voteNo.addEventListener("click", () => handleVote("chill"));
    dom.restart.addEventListener("click", resetDeck);

    document.addEventListener("keydown", (event) => {
      if (state.locked || state.index >= state.deck.length) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleVote("overrated");
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleVote("chill");
      }
    });

    dom.wrapper.addEventListener("pointerdown", onPointerDown);
    dom.wrapper.addEventListener("pointermove", onPointerMove);
    dom.wrapper.addEventListener("pointerup", onPointerUp);
    dom.wrapper.addEventListener("pointercancel", finalizePointerGesture);

    renderLeaderboard();
    resetDeck();
  }

  function onPointerDown(event) {
    if (state.locked || state.index >= state.deck.length) return;
    pointer.active = true;
    pointer.id = event.pointerId;
    pointer.startX = event.clientX;
    if (typeof dom.wrapper.setPointerCapture === "function") {
      dom.wrapper.setPointerCapture(pointer.id);
      pointer.captureTarget = dom.wrapper;
    }
    if (activeCard) {
      activeCard.style.transition = "none";
    }
  }

  function onPointerMove(event) {
    if (!pointer.active || event.pointerId !== pointer.id) return;
    if (!activeCard) return;

    const deltaX = event.clientX - pointer.startX;
    const rotation = deltaX / 14;
    const fade = Math.min(Math.abs(deltaX) / 260, 0.45);

    activeCard.style.transform = `translate3d(${deltaX}px, 0, 0) rotate(${rotation}deg)`;
    activeCard.style.opacity = `${1 - fade}`;
  }

  function onPointerUp(event) {
    if (!pointer.active || event.pointerId !== pointer.id) return;
    const deltaX = event.clientX - pointer.startX;
    finalizePointerGesture();

    const threshold = dom.wrapper.clientWidth * 0.25;
    if (Math.abs(deltaX) > threshold) {
      handleVote(deltaX > 0 ? "overrated" : "chill");
    }
  }

  function finalizePointerGesture() {
    if (!pointer.active) return;
    if (
      pointer.captureTarget &&
      typeof pointer.captureTarget.releasePointerCapture === "function"
    ) {
      pointer.captureTarget.releasePointerCapture(pointer.id);
    }
    pointer.active = false;
    pointer.id = null;
    pointer.startX = 0;
    pointer.captureTarget = null;
    if (activeCard) {
      activeCard.style.transition = "";
      activeCard.style.transform = "";
      activeCard.style.opacity = "";
    }
  }

  function resetDeck() {
    state.deck = shuffle(subjects);
    state.index = 0;
    state.locked = false;

    updateProgress(state.deck.length ? 1 : 0, state.deck.length);
    dom.restart.hidden = true;
    setButtonsDisabled(!state.deck.length);

    prepareCard(activeCard, "current");
    prepareCard(standbyCard, "standby");

    if (!state.deck.length) {
      renderEmpty(activeCard);
      return;
    }

    renderSubject(activeCard, state.deck[0]);
    announceSubject(state.deck[0]);

    const upcoming = state.deck[1];
    if (upcoming) {
      renderSubject(standbyCard, upcoming);
    } else {
      clearCard(standbyCard);
    }
  }

  function handleVote(choice) {
    if (state.locked || state.index >= state.deck.length) return;

    state.locked = true;
    setButtonsDisabled(true);

    const subject = state.deck[state.index];
    announceVote(subject, choice);

    const outgoing = activeCard;
    const incoming = standbyCard;
    const direction = choice === "overrated" ? "right" : "left";

    if (outgoing) {
      outgoing.classList.add("leaving", `swipe-${direction}`);
    }

    window.setTimeout(() => {
      if (outgoing) {
        outgoing.classList.remove("leaving", "swipe-right", "swipe-left");
        prepareCard(outgoing, "standby");
      }

      state.index += 1;
      const hasNext = state.index < state.deck.length;

      if (hasNext) {
        if (incoming) {
          prepareCard(incoming, "current");
          renderSubject(incoming, state.deck[state.index]);
          announceSubject(state.deck[state.index]);
        }

        activeCard = incoming;
        standbyCard = outgoing;

        updateProgress(state.index + 1, state.deck.length);

        const upcoming = state.deck[state.index + 1];
        if (upcoming && standbyCard) {
          renderSubject(standbyCard, upcoming);
        } else if (standbyCard) {
          clearCard(standbyCard);
        }

        state.locked = false;
        setButtonsDisabled(false);
      } else {
        activeCard = incoming;
        standbyCard = outgoing;
        if (activeCard) {
          prepareCard(activeCard, "current");
          renderFinished(activeCard);
        }
        updateProgress(state.deck.length, state.deck.length);
        dom.restart.hidden = false;
        dom.restart.focus();
        state.locked = false;
      }
    }, 280);
  }

  function renderSubject(card, subject) {
    if (!card) return;
    card.style.setProperty("--card-accent", subject.accent || "transparent");

    const statsMarkup = Array.isArray(subject.stats)
      ? subject.stats
          .map(
            (stat) => `
              <li class="stat-chip" role="listitem">
                <span class="stat-icon" aria-hidden="true">${stat.icon}</span>
                <span class="stat-value">${stat.value}</span>
                <span class="stat-label">${stat.label}</span>
              </li>
            `
          )
          .join("")
      : "";

    card.innerHTML = `
      <figure class="subject-photo">
        <img src="${subject.image}" alt="${subject.imageAlt || subject.name}" loading="lazy" />
      </figure>
      <div class="subject-details">
        <div class="subject-header">
          <span class="subject-type">${getTypeEmoji(subject.type)} ${subject.type}</span>
          <span class="subject-year">${subject.year}</span>
        </div>
        <h2 class="subject-title">${subject.name}</h2>
        <p class="subject-origin">${subject.origin}</p>
        <p class="subject-description">${subject.description}</p>
        <ul class="subject-stats" role="list">${statsMarkup}</ul>
      </div>
    `;
  }

  function renderFinished(card) {
    card.classList.add("finished");
    card.style.removeProperty("--card-accent");
    card.innerHTML = `
      <div class="finished-inner">
        <h2>That's a wrap</h2>
        <p>You have voted on every pick. Shuffle again for a fresh round of debates.</p>
      </div>
    `;
    setButtonsDisabled(true);
    dom.status.textContent = "Deck finished. Shuffle again for fresh topics.";
  }

  function renderEmpty(card) {
    card.classList.add("finished");
    card.style.removeProperty("--card-accent");
    card.innerHTML = `
      <div class="finished-inner">
        <h2>No topics yet</h2>
        <p>Come back soon for more culture debates to swipe on.</p>
      </div>
    `;
    setButtonsDisabled(true);
    dom.status.textContent = "No topics available right now.";
  }

  function renderLeaderboard() {
    if (!dom.leaderboard) return;
    const topFive = [...subjects]
      .filter((item) => typeof item.overratedScore === "number")
      .sort((a, b) => b.overratedScore - a.overratedScore)
      .slice(0, 5);

    dom.leaderboard.innerHTML = topFive
      .map(
        (subject, index) => `
          <li class="leaderboard-item">
            <span class="leaderboard-rank">#${index + 1}</span>
            <figure class="leaderboard-photo">
              <img src="${subject.image}" alt="${subject.imageAlt || subject.name}" loading="lazy" />
            </figure>
            <div class="leaderboard-details">
              <span class="leaderboard-name">${subject.name}</span>
              <span class="leaderboard-meta">${getTypeEmoji(subject.type)} ${subject.type} • ${subject.year}</span>
            </div>
            <span class="leaderboard-score">${subject.overratedScore}% say overrated</span>
          </li>
        `
      )
      .join("");
  }

  function clearCard(card) {
    if (!card) return;
    prepareCard(card, "standby");
    card.innerHTML = "";
  }

  function prepareCard(card, role) {
    if (!card) return;
    card.className = role === "current" ? "card current" : "card standby";
    card.style.removeProperty("--card-accent");
    card.style.opacity = "";
    card.style.transform = "";
    if (role === "current") {
      card.removeAttribute("aria-hidden");
    } else {
      card.setAttribute("aria-hidden", "true");
    }
  }

  function setButtonsDisabled(state) {
    dom.voteYes.disabled = state;
    dom.voteNo.disabled = state;
    dom.voteYes.setAttribute("aria-disabled", state ? "true" : "false");
    dom.voteNo.setAttribute("aria-disabled", state ? "true" : "false");
  }

  function announceSubject(subject) {
    dom.status.textContent = `${subject.name}. ${subject.type} • ${subject.year}.`;
  }

  function announceVote(subject, vote) {
    const label = vote === "overrated" ? "Overrated" : "Not overrated";
    dom.status.textContent = `You voted ${label} for ${subject.name}.`;
  }

  function updateProgress(current, total) {
    dom.progressCurrent.textContent = `${Math.min(current, total)}`;
    dom.progressTotal.textContent = `${total}`;
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
})();
