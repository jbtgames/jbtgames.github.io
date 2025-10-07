(function () {
  const store = window.JuryStore;
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  const shell = document.getElementById('case-shell');
  const caseContent = document.getElementById('case-content');
  const commentSection = document.getElementById('comment-section');
  const statusEl = document.getElementById('case-status');
  const updatedEl = document.getElementById('case-updated');
  const titleEl = document.getElementById('case-title');
  const filedEl = document.getElementById('case-filed');
  const summaryEl = document.getElementById('case-summary');
  const leadChargeEl = document.getElementById('case-lead-charge');
  const leadChargeWrap = leadChargeEl?.parentElement;
  const storyEl = document.getElementById('case-story');
  const chargesList = document.getElementById('case-charges');
  const evidenceList = document.getElementById('case-evidence');
  const timelineList = document.getElementById('case-timeline');
  const rosterList = document.getElementById('roster-list');
  const verdictSection = document.getElementById('verdict-section');
  const verdictDecision = document.getElementById('verdict-decision');
  const verdictReasoning = document.getElementById('verdict-reasoning');
  const verdictMeta = document.getElementById('verdict-meta');
  const statVotes = document.getElementById('stat-votes');
  const statVoteBreakdown = document.getElementById('stat-vote-breakdown');
  const statMood = document.getElementById('stat-mood');
  const statMoodNote = document.getElementById('stat-mood-note');
  const statComments = document.getElementById('stat-comments');
  const statLastActivity = document.getElementById('stat-last-activity');
  const commentMood = document.getElementById('comment-mood');
  const commentFeed = document.getElementById('comment-feed');
  const commentForm = document.getElementById('comment-form');
  const voteUp = document.getElementById('vote-up');
  const voteDown = document.getElementById('vote-down');
  const timelineTemplate = document.getElementById('timeline-entry-template');
  const commentTemplate = document.getElementById('comment-card-template');

  if (!caseId) {
    shell.innerHTML = '<p class="note-text">No case selected. <a href="index.html">Return to the docket.</a></p>';
    return;
  }

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

  function moodLabel(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
      return 'Neutral';
    }
    if (value > 0) {
      return `+${value.toFixed(2)}`;
    }
    return value.toFixed(2);
  }

  function moodNote(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
      return 'Crowd is evenly split.';
    }
    return value > 0 ? 'Crowd leans supportive.' : 'Crowd leans critical.';
  }

  function moodClass(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) {
      return '';
    }
    return value > 0 ? 'positive' : 'negative';
  }

  function computeMood(comments) {
    if (!Array.isArray(comments) || comments.length === 0) {
      return 0;
    }
    const total = comments.reduce((sum, comment) => sum + (Number(comment.sentiment) || 0), 0);
    return total / comments.length;
  }

  function renderList(list, target, emptyText) {
    target.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      if (emptyText) {
        const li = document.createElement('li');
        li.className = 'note-text';
        li.textContent = emptyText;
        target.appendChild(li);
      }
      return;
    }
    list.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = entry;
      target.appendChild(li);
    });
  }

  function renderEvidence(list) {
    evidenceList.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      const li = document.createElement('li');
      li.className = 'note-text';
      li.textContent = 'No evidence submitted yet.';
      evidenceList.appendChild(li);
      return;
    }
    list.forEach((item) => {
      const li = document.createElement('li');
      const label = document.createElement('strong');
      label.textContent = `${item.label}: `;
      const detail = document.createElement('span');
      detail.textContent = item.detail;
      li.appendChild(label);
      li.appendChild(detail);
      evidenceList.appendChild(li);
    });
  }

  function renderTimeline(list) {
    timelineList.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      const li = document.createElement('li');
      li.className = 'note-text';
      li.textContent = 'Timeline not yet documented.';
      timelineList.appendChild(li);
      return;
    }
    list.forEach((item) => {
      const node = timelineTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector('.timeline-entry__time').textContent = item.time;
      node.querySelector('.timeline-entry__event').textContent = item.event;
      timelineList.appendChild(node);
    });
  }

  function renderRoster(roles) {
    rosterList.innerHTML = '';
    const labels = {
      accuser: 'Accuser',
      prosecutor: 'Prosecutor',
      defendant: 'Defendant',
      defense: 'Defense Counsel',
      judge: 'Presiding Judge'
    };
    Object.entries(labels).forEach(([key, label]) => {
      const role = roles?.[key];
      if (!role) {
        return;
      }
      const li = document.createElement('li');
      li.className = 'detail-card';
      const labelEl = document.createElement('span');
      labelEl.className = 'detail-card__label';
      labelEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.className = 'detail-card__value';
      valueEl.textContent = role.name;
      const summaryEl = document.createElement('p');
      summaryEl.className = 'note-text';
      summaryEl.textContent = role.summary;
      li.appendChild(labelEl);
      li.appendChild(valueEl);
      if (role.title) {
        const title = document.createElement('p');
        title.className = 'note-text';
        title.textContent = role.title;
        li.appendChild(title);
      }
      li.appendChild(summaryEl);
      rosterList.appendChild(li);
    });
  }

  function renderComments(comments) {
    commentFeed.innerHTML = '';
    if (!Array.isArray(comments) || comments.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'note-text';
      empty.textContent = 'No comments yet. Add your take below.';
      commentFeed.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    comments
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((comment) => {
        const node = commentTemplate.content.firstElementChild.cloneNode(true);
        const moodClassName = moodClass(comment.sentiment);
        if (moodClassName) {
          node.classList.add(moodClassName);
        }
        node.querySelector('.comment-card__user').textContent = comment.user;
        node.querySelector('.comment-card__time').textContent = formatRelativeTime(comment.createdAt);
        node.querySelector('.comment-card__text').textContent = comment.text;
        fragment.appendChild(node);
      });
    commentFeed.appendChild(fragment);
  }

  function renderCase(caseItem) {
    caseContent.hidden = false;
    commentSection.hidden = false;

    statusEl.dataset.status = (caseItem.status || 'debate').toLowerCase();
    statusEl.textContent = (caseItem.status || 'Debate').charAt(0).toUpperCase() + (caseItem.status || 'debate').slice(1);
    updatedEl.textContent = `Updated ${formatRelativeTime(caseItem.lastActivity || caseItem.createdAt)}`;
    titleEl.textContent = caseItem.title;
    filedEl.textContent = `Filed by ${caseItem.filedBy}${caseItem.isBot ? ' • Bot' : ''}`;
    const summary = (caseItem.summary || '').trim();
    if (summary.length) {
      summaryEl.textContent = summary;
      summaryEl.style.display = '';
    } else {
      summaryEl.textContent = '';
      summaryEl.style.display = 'none';
    }
    if (leadChargeWrap) {
      const leadCharge = (caseItem.leadCharge || '').trim();
      if (leadCharge.length) {
        leadChargeEl.textContent = leadCharge;
        leadChargeWrap.style.display = '';
      } else {
        leadChargeEl.textContent = '';
        leadChargeWrap.style.display = 'none';
      }
    }
    storyEl.textContent = caseItem.story;

    renderList(caseItem.charges, chargesList, 'No formal charges listed.');
    renderEvidence(caseItem.evidence);
    renderTimeline(caseItem.timeline);
    renderRoster(caseItem.roles);
    renderComments(caseItem.comments);

    const votesBalance = (caseItem.votes?.up || 0) - (caseItem.votes?.down || 0);
    statVotes.textContent = votesBalance >= 0 ? `+${votesBalance}` : votesBalance;
    statVoteBreakdown.textContent = `${caseItem.votes?.up || 0} support • ${caseItem.votes?.down || 0} oppose`;

    const moodValue = computeMood(caseItem.comments);
    statMood.textContent = moodLabel(moodValue);
    statMood.classList.remove('meta-item__value--positive', 'meta-item__value--negative');
    if (moodValue > 0.05) {
      statMood.classList.add('meta-item__value--positive');
    } else if (moodValue < -0.05) {
      statMood.classList.add('meta-item__value--negative');
    }
    statMoodNote.textContent = moodNote(moodValue);
    statComments.textContent = caseItem.comments?.length || 0;
    statLastActivity.textContent = `Last activity ${formatRelativeTime(caseItem.lastActivity || caseItem.createdAt)}`;

    commentMood.textContent = `Mood: ${moodLabel(moodValue)}`;
    commentMood.classList.remove('positive', 'negative');
    const commentMoodClass = moodClass(moodValue);
    if (commentMoodClass) {
      commentMood.classList.add(commentMoodClass);
    }

    if (caseItem.verdict) {
      verdictSection.hidden = false;
      verdictDecision.textContent = caseItem.verdict.decision;
      verdictReasoning.textContent = caseItem.verdict.reasoning;
      const judgeInfo = caseItem.verdict.judge ? `Judge ${caseItem.verdict.judge}` : 'Unspecified judge';
      const confidence = Number.isFinite(caseItem.verdict.confidence)
        ? ` • Confidence ${Math.round(caseItem.verdict.confidence * 100)}%`
        : '';
      verdictMeta.textContent = `${judgeInfo}${confidence}`;
    } else {
      verdictSection.hidden = true;
    }
  }

  function handleCommentSubmit(event) {
    event.preventDefault();
    const formData = new FormData(commentForm);
    const user = (formData.get('user') || '').toString().trim() || 'CourtWatcher';
    const text = (formData.get('text') || '').toString().trim();
    const sentiment = Number.parseFloat(formData.get('sentiment'));
    if (!text) {
      return;
    }
    store.addComment(caseId, { user, text, sentiment });
    commentForm.reset();
  }

  function handleVote(event) {
    const direction = event.currentTarget.dataset.direction;
    if (!direction) {
      return;
    }
    event.currentTarget.disabled = true;
    try {
      store.vote(caseId, direction);
    } finally {
      setTimeout(() => {
        event.currentTarget.disabled = false;
      }, 400);
    }
  }

  async function initialise() {
    await store.ready();
    let caseItem = store.getCase(caseId);
    if (!caseItem) {
      const snapshot = store.getState();
      caseItem = snapshot.cases.find((item) => item.id === caseId);
    }
    if (!caseItem) {
      shell.innerHTML = '<p class="note-text">Case not found. <a href="index.html">Return to the docket.</a></p>';
      return;
    }
    renderCase(caseItem);

    store.subscribe((snapshot) => {
      const updated = snapshot.cases.find((item) => item.id === caseId);
      if (updated) {
        renderCase(updated);
      }
    });

    commentForm.addEventListener('submit', handleCommentSubmit);
    voteUp.addEventListener('click', handleVote);
    voteDown.addEventListener('click', handleVote);
  }

  initialise();
})();
