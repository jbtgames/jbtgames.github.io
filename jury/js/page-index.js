(function () {
  const store = window.JuryStore;
  const feed = document.getElementById('case-feed');
  const template = document.getElementById('case-card-template');
  const commentTemplate = document.getElementById('comment-chip-template');
  const statCases = document.getElementById('stat-cases');
  const statComments = document.getElementById('stat-comments');
  const statMood = document.getElementById('stat-mood');
  const statLastBot = document.getElementById('stat-last-bot');
  const nextBotCase = document.getElementById('next-bot-case');
  const nextBotComment = document.getElementById('next-bot-comment');
  const caseForm = document.getElementById('case-form');
  const formSuccess = document.getElementById('form-success');
  const resetButton = document.getElementById('reset-simulation');

  let currentSnapshot = null;

  const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  function formatRelativeTime(timestamp) {
    if (!timestamp) {
      return '--';
    }
    const diff = Date.now() - timestamp;
    const absDiff = Math.abs(diff);
    const units = [
      { limit: 60, divisor: 1, unit: 'second' },
      { limit: 3600, divisor: 60, unit: 'minute' },
      { limit: 86400, divisor: 3600, unit: 'hour' },
      { limit: 604800, divisor: 86400, unit: 'day' },
      { limit: 2629800, divisor: 604800, unit: 'week' }
    ];
    for (const { limit, divisor, unit } of units) {
      if (absDiff < limit * 1000) {
        const value = Math.round(diff / (divisor * 1000));
        return relativeFormatter.format(value, unit);
      }
    }
    const months = Math.round(diff / (2629800 * 1000));
    return relativeFormatter.format(months, 'month');
  }

  function formatCountdown(timestamp) {
    if (!timestamp) {
      return '--';
    }
    const diff = timestamp - Date.now();
    if (diff <= 0) {
      return 'seconds';
    }
    const seconds = Math.ceil(diff / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return `${minutes}m ${String(remain).padStart(2, '0')}s`;
  }

  function moodLabel(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
      return 'Neutral';
    }
    if (value > 0) {
      return `+${value.toFixed(2)}`;
    }
    return value.toFixed(2);
  }

  function moodClass(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
      return '';
    }
    return value > 0 ? 'meta-item__value--positive' : 'meta-item__value--negative';
  }

  function computeMood(comments) {
    if (!Array.isArray(comments) || comments.length === 0) {
      return 0;
    }
    const total = comments.reduce((sum, comment) => sum + (Number(comment.sentiment) || 0), 0);
    return total / comments.length;
  }

  function truncate(text, limit) {
    if (!text) {
      return '';
    }
    if (text.length <= limit) {
      return text;
    }
    return `${text.slice(0, limit - 1)}…`;
  }

  function titleCase(value) {
    if (!value) {
      return '';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function createCommentChip(comment) {
    const node = commentTemplate.content.firstElementChild.cloneNode(true);
    if (Number(comment.sentiment) > 0.1) {
      node.classList.add('positive');
    } else if (Number(comment.sentiment) < -0.1) {
      node.classList.add('negative');
    }
    node.querySelector('.comment-chip__user').textContent = `${comment.user} • ${formatRelativeTime(comment.createdAt)}`;
    node.querySelector('.comment-chip__text').textContent = truncate(comment.text, 220);
    return node;
  }

  function createCaseCard(caseItem) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.case-card');
    card.dataset.caseId = caseItem.id;

    const status = fragment.querySelector('.case-card__status');
    status.dataset.status = (caseItem.status || 'debate').toLowerCase();
    status.textContent = titleCase(caseItem.status || 'debate');

    fragment.querySelector('.case-card__time').textContent = formatRelativeTime(caseItem.lastActivity || caseItem.createdAt);
    fragment.querySelector('.case-card__title').textContent = caseItem.title;
    fragment.querySelector('.case-card__filed').textContent = `Filed by ${caseItem.filedBy}${
      caseItem.isBot ? ' • Bot' : ''
    }`;

    const summaryText = caseItem.summary || truncate(caseItem.story, 220);
    fragment.querySelector('.case-card__summary').textContent = summaryText;

    const storyWrapper = fragment.querySelector('.case-card__story');
    const storyText = fragment.querySelector('.case-card__story-text');
    storyText.textContent = caseItem.story;

    const toggleButton = fragment.querySelector('.case-card__toggle');
    toggleButton.addEventListener('click', () => {
      const hidden = storyWrapper.hasAttribute('hidden');
      if (hidden) {
        storyWrapper.removeAttribute('hidden');
        toggleButton.textContent = 'Hide story';
      } else {
        storyWrapper.setAttribute('hidden', '');
        toggleButton.textContent = 'Show full story';
      }
    });

    const tagsList = fragment.querySelector('.case-card__tags');
    tagsList.innerHTML = '';
    if (Array.isArray(caseItem.tags) && caseItem.tags.length) {
      caseItem.tags.forEach((tag) => {
        const li = document.createElement('li');
        li.className = 'tag';
        li.textContent = tag;
        tagsList.appendChild(li);
      });
    }

    const votesBalance = (caseItem.votes?.up || 0) - (caseItem.votes?.down || 0);
    const votesEl = fragment.querySelector('.meta-item__value--votes');
    votesEl.textContent = votesBalance >= 0 ? `+${votesBalance}` : votesBalance.toString();
    votesEl.classList.toggle('meta-item__value--positive', votesBalance > 0);
    votesEl.classList.toggle('meta-item__value--negative', votesBalance < 0);

    fragment.querySelector('.meta-item__value--comments').textContent = caseItem.comments?.length || 0;

    const moodValue = computeMood(caseItem.comments);
    const moodEl = fragment.querySelector('.meta-item__value--mood');
    moodEl.textContent = moodLabel(moodValue);
    moodEl.classList.remove('meta-item__value--positive', 'meta-item__value--negative');
    const moodClassName = moodClass(moodValue);
    if (moodClassName) {
      moodEl.classList.add(moodClassName);
    }

    const commentsWrapper = fragment.querySelector('.case-card__comments');
    commentsWrapper.innerHTML = '';
    if (Array.isArray(caseItem.comments) && caseItem.comments.length) {
      const sorted = [...caseItem.comments].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
      sorted.forEach((comment) => {
        commentsWrapper.appendChild(createCommentChip(comment));
      });
    } else {
      const empty = document.createElement('p');
      empty.className = 'case-card__empty-comments';
      empty.textContent = 'No comments yet. Be the first to weigh in.';
      commentsWrapper.appendChild(empty);
    }

    const link = fragment.querySelector('.case-card__link');
    link.href = `case.html?id=${encodeURIComponent(caseItem.id)}`;

    return fragment;
  }

  function renderCases(cases) {
    feed.innerHTML = '';
    if (!cases.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No cases yet. Submit one to start the debate.';
      feed.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    cases
      .slice()
      .sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
      .forEach((caseItem) => {
        fragment.appendChild(createCaseCard(caseItem));
      });
    feed.appendChild(fragment);
  }

  function updateStats(snapshot) {
    const cases = snapshot.cases || [];
    const totalComments = cases.reduce((sum, item) => sum + (item.comments?.length || 0), 0);
    const mood = cases.length
      ? cases.reduce((sum, item) => sum + computeMood(item.comments), 0) / cases.length
      : 0;
    const lastBot = Math.max(snapshot.bots?.lastCaseAt || 0, snapshot.bots?.lastCommentAt || 0);

    statCases.textContent = cases.length;
    statComments.textContent = totalComments;
    statMood.textContent = moodLabel(mood);
    statMood.classList.remove('meta-item__value--positive', 'meta-item__value--negative');
    const moodClassName = moodClass(mood);
    if (moodClassName) {
      statMood.classList.add(moodClassName);
    }
    statLastBot.textContent = lastBot ? formatRelativeTime(lastBot) : 'No activity yet';

    updateBotTimers(snapshot.bots);
  }

  function updateBotTimers(bots) {
    if (!bots) {
      nextBotCase.textContent = '--';
      nextBotComment.textContent = '--';
      return;
    }
    nextBotCase.textContent = formatCountdown(bots.nextCaseAt);
    nextBotComment.textContent = formatCountdown(bots.nextCommentAt);
  }

  function handleVote(event) {
    const button = event.target.closest('button[data-action="vote"]');
    if (!button) {
      return;
    }
    const card = button.closest('.case-card');
    if (!card) {
      return;
    }
    const caseId = card.dataset.caseId;
    const direction = button.dataset.direction;
    if (!caseId || !direction) {
      return;
    }
    button.disabled = true;
    try {
      store.vote(caseId, direction);
    } finally {
      setTimeout(() => {
        button.disabled = false;
      }, 400);
    }
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(caseForm);
    const title = (formData.get('title') || '').toString().trim();
    const story = (formData.get('story') || '').toString().trim();
    const filedBy = (formData.get('filedBy') || '').toString().trim() || 'Community Member';
    if (!title || !story) {
      return;
    }
    store.addCase({
      title,
      summary: truncate(story, 220),
      story,
      filedBy,
      status: 'debate',
      tags: ['community'],
      votes: { up: 0, down: 0 },
      comments: []
    });
    caseForm.reset();
    formSuccess.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      formSuccess.hidden = true;
    }, 4000);
  }

  async function handleReset() {
    resetButton.disabled = true;
    resetButton.textContent = 'Resetting…';
    await store.reset();
    const snapshot = await store.getState();
    currentSnapshot = snapshot;
    renderCases(snapshot.cases);
    updateStats(snapshot);
    resetButton.disabled = false;
    resetButton.textContent = 'Reset simulation';
  }

  function startTimerLoop() {
    setInterval(() => {
      if (currentSnapshot) {
        updateBotTimers(currentSnapshot.bots);
      }
    }, 1000);
  }

  async function initialise() {
    await store.ready();
    currentSnapshot = store.getState();
    renderCases(currentSnapshot.cases);
    updateStats(currentSnapshot);

    store.subscribe((snapshot) => {
      currentSnapshot = snapshot;
      renderCases(snapshot.cases);
      updateStats(snapshot);
    });

    feed.addEventListener('click', handleVote);
    caseForm.addEventListener('submit', handleFormSubmit);
    resetButton.addEventListener('click', handleReset);
    startTimerLoop();
  }

  initialise();
})();
