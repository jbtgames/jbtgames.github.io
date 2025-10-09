const DATA_ROOT = './data';
const settingsPromise = loadJSON(`${DATA_ROOT}/settings.json`);

const state = {
  view: 'home',
  settings: null,
  case: null,
  lawyers: null,
  jurors: null,
  judge: null,
  prompts: null,
  trialQueue: [],
  panel: [],
  votes: [],
  verdict: null
};

const dom = {
  views: document.querySelectorAll('.view'),
  navButtons: document.querySelectorAll('.nav-btn'),
  countdown: document.getElementById('countdown-clock'),
  skipToTrial: document.getElementById('skip-to-trial'),
  refreshTop: document.getElementById('refresh-top'),
  topCases: document.getElementById('top-cases-list'),
  submitBtn: document.getElementById('open-submit'),
  submitModal: document.getElementById('submit-modal'),
  transcript: document.getElementById('transcript'),
  proceed: document.getElementById('proceed-btn'),
  phaseIndicator: document.getElementById('phase-indicator'),
  caseTitle: document.getElementById('case-title'),
  caseMeta: document.getElementById('case-meta'),
  verdictCard: document.getElementById('verdict-card'),
  juryList: document.getElementById('jury-list'),
  pollFeedback: document.getElementById('poll-feedback')
};

init().catch((err) => console.error(err));

async function init() {
  state.settings = await settingsPromise;
  startCountdown(state.settings.scheduler);
  bindNavigation();
  bindHomeActions();
  bindCourtroomActions();
  bindPollActions();
  await loadTopCases();
}

function bindNavigation() {
  dom.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.view;
      if (!target || target === state.view) return;
      setView(target);
    });
  });
}

function setView(view) {
  state.view = view;
  dom.views.forEach((section) => {
    section.classList.toggle('active', section.id === view);
  });
  dom.navButtons.forEach((btn) => {
    const pressed = btn.dataset.view === view;
    btn.setAttribute('aria-pressed', String(pressed));
  });
}

function bindHomeActions() {
  dom.skipToTrial.addEventListener('click', async () => {
    await startTrial();
    setView('courtroom');
  });

  dom.refreshTop.addEventListener('click', () => loadTopCases());

  dom.submitBtn.addEventListener('click', () => {
    if (dom.submitModal?.showModal) {
      dom.submitModal.showModal();
    }
  });

  if (dom.submitModal) {
    dom.submitModal.addEventListener('close', () => {
      dom.submitModal.returnValue = 'close';
    });
  }
}

function bindCourtroomActions() {
  dom.proceed.addEventListener('click', handleNextPhase);
}

function bindPollActions() {
  document.querySelectorAll('[data-poll]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.poll;
      dom.pollFeedback.textContent = choice === 'agree'
        ? 'Logged. Thanks for weighing in.'
        : 'Noted. The community will see your dissent.';
    });
  });
}

function startCountdown(scheduler) {
  updateCountdown(scheduler);
  setInterval(() => updateCountdown(scheduler), 1000);
}

function updateCountdown(scheduler) {
  const now = new Date();
  const nextSlot = new Date(now);
  nextSlot.setMinutes(60, 0, 0);
  const diffMs = nextSlot - now;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  dom.countdown.textContent = `Next trial in ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function loadTopCases(limit = 3) {
  try {
    const inbox = await loadJSON(`${DATA_ROOT}/cases.inbox.json`);
    const ranked = [...inbox.cases].sort((a, b) => b.score - a.score).slice(0, limit);
    dom.topCases.innerHTML = '';
    ranked.forEach((c) => {
      const li = document.createElement('li');
      li.className = 'case-card';
      li.innerHTML = `
        <h3>${escapeHTML(c.title)}</h3>
        <p>${escapeHTML(summarise(c.context, 28))}</p>
        <div class="meta">
          <span>Score: ${c.score.toFixed(1)}</span>
          <span>Signals: ▲${c.signals?.upvotes ?? 0} ▼${c.signals?.downvotes ?? 0}</span>
        </div>
      `;
      li.addEventListener('click', async () => {
        await startTrial(c.id);
        setView('courtroom');
      });
      dom.topCases.appendChild(li);
    });
  } catch (err) {
    console.error('Failed to load top cases', err);
  }
}

async function startTrial(caseId) {
  dom.proceed.disabled = true;
  dom.phaseIndicator.textContent = 'Loading trial…';
  dom.transcript.innerHTML = '';
  dom.caseMeta.textContent = '';

  const [lawyersData, jurorsData, judgeData, promptsData] = await Promise.all([
    loadJSON(`${DATA_ROOT}/lawyers.json`),
    loadJSON(`${DATA_ROOT}/jurors.json`),
    loadJSON(`${DATA_ROOT}/judge.json`),
    loadJSON(`${DATA_ROOT}/prompts.json`)
  ]);

  state.lawyers = lawyersData.lawyers;
  state.jurors = jurorsData.jurors;
  state.judge = judgeData;
  state.prompts = promptsData;

  const queue = await loadJSON(`${DATA_ROOT}/cases.queue.json`);
  const id = caseId ?? queue.ids[0];
  state.case = await loadCaseById(id);

  if (!state.case) {
    dom.caseTitle.textContent = 'No case available.';
    dom.phaseIndicator.textContent = 'Queue empty.';
    return;
  }

  dom.caseTitle.textContent = state.case.title;
  dom.caseMeta.innerHTML = `
    <span>Submitted by ${escapeHTML(state.case.submittedBy)}</span>
    <span>${new Date(state.case.createdAt).toLocaleString()}</span>
  `;

  const pair = pickLawyerPair(state.lawyers, state.case.id);
  state.panel = sampleJurors(state.jurors, state.settings.trial.jurorCount, state.case.id);
  const trialPlan = buildTrialPlan({
    caseData: state.case,
    pair,
    prompts: state.prompts,
    settings: state.settings,
    judge: state.judge,
    panel: state.panel
  });

  state.trialQueue = trialPlan.queue;
  state.votes = trialPlan.votes;
  state.verdict = trialPlan.verdict;

  updateVerdictView(null);
  updateJuryList(state.panel, state.votes);

  dom.phaseIndicator.textContent = 'Ready for openings.';
  dom.proceed.disabled = false;
  dom.proceed.focus();
}

async function handleNextPhase() {
  if (!state.trialQueue.length) {
    dom.proceed.disabled = true;
    dom.phaseIndicator.textContent = 'Trial complete.';
    updateVerdictView(state.verdict);
    return;
  }

  dom.proceed.disabled = true;
  const step = state.trialQueue.shift();

  if (step.type === 'speech') {
    dom.phaseIndicator.textContent = `${step.phaseLabel} · ${step.speakerLabel}`;
    await renderUtterance(step);
    dom.proceed.disabled = false;
    dom.phaseIndicator.textContent = 'Proceed to next statement.';
  } else if (step.type === 'jury') {
    dom.phaseIndicator.textContent = 'Jury deliberates…';
    await renderUtterance(step);
    dom.proceed.disabled = false;
    dom.phaseIndicator.textContent = 'Proceed to verdict.';
  } else if (step.type === 'verdict') {
    updateVerdictView(state.verdict);
    dom.phaseIndicator.textContent = 'Verdict published.';
    dom.proceed.disabled = true;
  }
}

async function renderUtterance(step) {
  const template = document.getElementById('transcript-row');
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.speaker = step.speakerId;
  node.querySelector('.speaker').textContent = step.speakerLabel;
  node.querySelector('.phase').textContent = step.phaseLabel;
  const body = node.querySelector('.content');
  body.textContent = '';
  dom.transcript.appendChild(node);
  dom.transcript.scrollTop = dom.transcript.scrollHeight;

  await typeText(body, step.text, state.settings.trial.typingDelayMs);
}

function updateVerdictView(verdict) {
  if (!verdict) {
    dom.verdictCard.innerHTML = '<p class="placeholder">Verdict pending. Advance the trial to reach the decision.</p>';
    return;
  }

  dom.verdictCard.innerHTML = `
    <h2>${verdict.title}</h2>
    <p class="split">Jury split: ${verdict.split}</p>
    <p>${escapeHTML(verdict.text)}</p>
    <p class="factors">Key factors: ${escapeHTML(verdict.factors.join(state.prompts.verdictFactorsJoiner))}</p>
  `;
}

function updateJuryList(panel, votes) {
  dom.juryList.innerHTML = '';
  panel.forEach((juror, index) => {
    const vote = votes[index];
    const li = document.createElement('li');
    li.className = 'jury-member';
    li.innerHTML = `
      <span class="name">${escapeHTML(juror.name)}</span>
      <span class="voice">${escapeHTML(juror.voice)}</span>
      <span class="vote">Vote: ${formatVote(vote.vote)}</span>
      <span class="remark">${escapeHTML(vote.remark)}</span>
    `;
    dom.juryList.appendChild(li);
  });
}

function formatVote(vote) {
  if (vote === 'A') return 'Side A';
  if (vote === 'B') return 'Side B';
  return 'Abstain';
}

async function loadCaseById(id) {
  const inbox = await loadJSON(`${DATA_ROOT}/cases.inbox.json`);
  const fromInbox = inbox.cases.find((c) => c.id === id);
  if (fromInbox) return fromInbox;
  const archive = await loadJSON(`${DATA_ROOT}/cases.archive.json`);
  const archived = archive.cases.find((c) => c.id === id);
  return archived ?? null;
}

function pickLawyerPair(lawyers, caseId) {
  const rng = createPRNG(hashString(`${caseId}:pair`));
  const pool = [...lawyers];
  shuffle(pool, rng);
  return { A: pool[0], B: pool[1] };
}

function buildTrialPlan({ caseData, pair, prompts, settings, judge, panel }) {
  const queue = [];
  const variables = buildVariableBase(caseData);
  const rounds = settings.trial.rounds;

  queue.push(buildSpeechStep(pair.A, 'A', 'Opening Statement', fillTemplate(pickTemplate(pair.A.templates.opening, caseData.id, 'A:opening'), variablesForSide(variables, 'A'), prompts.fallbacks)));
  queue.push(buildSpeechStep(pair.B, 'B', 'Opening Statement', fillTemplate(pickTemplate(pair.B.templates.opening, caseData.id, 'B:opening'), variablesForSide(variables, 'B'), prompts.fallbacks)));

  for (let round = 0; round < rounds; round++) {
    const phaseLabel = `Rebuttal · Round ${round + 1}`;
    queue.push(buildSpeechStep(pair.A, 'A', phaseLabel, fillTemplate(pickTemplate(pair.A.templates.rebuttal, caseData.id, `A:rebuttal:${round}`), variablesForSide(variables, 'A', round), prompts.fallbacks)));
    queue.push(buildSpeechStep(pair.B, 'B', phaseLabel, fillTemplate(pickTemplate(pair.B.templates.rebuttal, caseData.id, `B:rebuttal:${round}`), variablesForSide(variables, 'B', round), prompts.fallbacks)));

    if (round === 0) {
      const judgeLine = pickJudgeLine(judge, caseData.id);
      queue.push({
        type: 'speech',
        speakerId: 'judge',
        speakerLabel: 'Judge',
        phaseLabel: 'Interjection',
        text: judgeLine
      });
    }
  }

  queue.push(buildSpeechStep(pair.A, 'A', 'Closing Statement', fillTemplate(pickTemplate(pair.A.templates.closing, caseData.id, 'A:closing'), variablesForSide(variables, 'A'), prompts.fallbacks)));
  queue.push(buildSpeechStep(pair.B, 'B', 'Closing Statement', fillTemplate(pickTemplate(pair.B.templates.closing, caseData.id, 'B:closing'), variablesForSide(variables, 'B'), prompts.fallbacks)));

  const { votes, remarks } = deliberate(panel, caseData, prompts, settings);

  remarks.forEach((remark, index) => {
    queue.push({
      type: 'jury',
      speakerId: 'juror',
      speakerLabel: panel[index].name,
      phaseLabel: 'Jury Deliberation',
      text: remark
    });
  });

  const verdict = decide(caseData, judge, prompts, votes);
  queue.push({ type: 'verdict' });

  return { queue, votes, verdict };
}

function buildSpeechStep(lawyer, side, phaseLabel, text) {
  return {
    type: 'speech',
    speakerId: `lawyer-${side}`,
    speakerLabel: `${lawyer.name} · Side ${side}`,
    phaseLabel,
    text
  };
}

function deliberate(panel, caseData, prompts, settings) {
  const votes = [];
  const remarks = [];
  panel.forEach((juror) => {
    const vote = jurorVote(juror, caseData);
    const remark = formatJurorRemark(juror, vote, prompts);
    vote.remark = remark;
    votes.push(vote);
    remarks.push(remark);
  });
  return { votes, remarks };
}

function decide(caseData, judge, prompts, votes) {
  const counts = votes.reduce((acc, v) => {
    const choice = v.vote;
    if (!acc[choice]) acc[choice] = 0;
    acc[choice] += 1;
    return acc;
  }, {});
  const a = counts.A ?? 0;
  const b = counts.B ?? 0;
  const abstain = counts.abstain ?? 0;
  let winner;
  if (a > b) winner = 'A';
  else if (b > a) winner = 'B';
  else winner = 'A';

  const split = `${a}–${b}`;
  const factors = extractFactors(caseData);
  const template = pickVerdictTemplate(judge, caseData.id);
  const winnerLabel = winner === 'A' ? 'Side A' : 'Side B';
  const text = template
    .replace('{winner}', winnerLabel)
    .replace('{factors}', factors.join(prompts.verdictFactorsJoiner));

  return {
    winner,
    split,
    abstain,
    factors,
    text,
    title: `Judgment for ${winnerLabel}`
  };
}

function extractFactors(caseData) {
  return [
    summarise(caseData.sideA, 8, true),
    summarise(caseData.sideB, 8, true)
  ];
}

function pickVerdictTemplate(judge, seedKey) {
  const template = pickTemplate(judge.verdictTemplates, seedKey, 'verdict');
  return template;
}

function pickJudgeLine(judge, caseId) {
  return pickTemplate(judge.interjections, caseId, 'judge');
}

function formatJurorRemark(juror, vote, prompts) {
  if (vote.vote === 'abstain') {
    return 'Still divided on the evidence; abstaining for now.';
  }
  const pattern = pickTemplate(prompts.jurorRemarkPatterns, `${juror.id}:${vote.vote}`, 'remark');
  const factors = Object.entries(juror.voteHeuristics.weights)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => factorLabel(key));
  const sideLabel = vote.vote === 'A' ? 'Side A' : 'Side B';
  return pattern
    .replace('{factorA}', factors[0])
    .replace('{factorB}', factors[1] ?? factors[0])
    .replace('{side}', sideLabel);
}

function jurorVote(juror, caseData) {
  const weights = juror.voteHeuristics.weights;
  let scoreA = 0;
  let scoreB = 0;
  Object.entries(weights).forEach(([factor, weight]) => {
    const valueA = signalFor(caseData, 'A', factor);
    const valueB = signalFor(caseData, 'B', factor);
    scoreA += valueA * weight;
    scoreB += valueB * weight;
  });
  const jitter = createPRNG(hashString(`${caseData.id}:${juror.id}:tilt`))() - 0.5;
  const delta = scoreA - scoreB + jitter * 0.05;
  let vote;
  if (delta > 0.02) vote = 'A';
  else if (delta < -0.02) vote = 'B';
  else vote = juror.voteHeuristics.tiebreak;
  return { vote, scoreA, scoreB };
}

function signalFor(caseData, side, factor) {
  const rng = createPRNG(hashString(`${caseData.id}:${side}:${factor}`));
  const base = rng();
  const adjustment = side === 'A' ? 0.05 : -0.05;
  return Math.min(0.95, Math.max(0.2, base + adjustment));
}

function variablesForSide(base, side) {
  const opponent = side === 'A' ? 'B' : 'A';
  return {
    ...base.common,
    ...base[side],
    opponent: `Side ${opponent}`,
    side: `Side ${side}`
  };
}

function buildVariableBase(caseData) {
  const contextSnippet = summarise(caseData.context, 32);
  const sideATitle = summarise(caseData.sideA, 24);
  const sideBTitle = summarise(caseData.sideB, 24);
  return {
    common: {
      thesis: contextSnippet,
      evidence: contextSnippet,
      facts: contextSnippet,
      harm: sideATitle,
      context: contextSnippet,
      badOutcome: 'lower standards for quiet enjoyment',
      precedent: 'relevant precedent',
      n: '2',
      elementReason: 'the duty of quiet enjoyment was unmet',
      keyBeat: 'the late-night disturbances',
      label: 'a nuisance',
      claim: 'they acted responsibly',
      counterfact: 'multiple complaints remain unresolved',
      standard: 'quiet enjoyment obligations',
      cite: 'controlling authority',
      expectedAction: 'responded promptly to complaints'
    },
    A: {
      thesis: sideATitle,
      harm: sideATitle
    },
    B: {
      thesis: sideBTitle,
      harm: sideBTitle
    }
  };
}

function pickTemplate(list, seedKey, suffix) {
  const rng = createPRNG(hashString(`${seedKey}:${suffix}`));
  const index = Math.floor(rng() * list.length);
  return list[index];
}

function fillTemplate(template, vars, fallbacks = {}) {
  return template.replace(/\{(.*?)\}/g, (_, key) => {
    return vars[key] ?? fallbacks[key] ?? key;
  });
}

function sampleJurors(jurors, count, caseId) {
  const rng = createPRNG(hashString(`${caseId}:jurors`));
  const pool = [...jurors];
  shuffle(pool, rng);
  return pool.slice(0, count);
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function summarise(text, wordLimit = 24, loose = false) {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= wordLimit) return text;
  const slice = words.slice(0, wordLimit).join(' ');
  return loose ? `${slice}` : `${slice}…`;
}

function escapeHTML(str) {
  const value = String(str ?? '');
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function factorLabel(key) {
  const labels = {
    facts: 'factual record',
    precedent: 'precedent',
    empathy: 'empathy',
    fairness: 'fairness',
    practicality: 'practicality'
  };
  return labels[key] ?? key;
}

function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function typeText(node, text, baseDelay = 250) {
  const safeText = String(text ?? '');
  const delay = Math.min(1500, baseDelay + safeText.length * 6);
  return new Promise((resolve) => {
    setTimeout(() => {
      node.textContent = safeText;
      dom.transcript.scrollTop = dom.transcript.scrollHeight;
      resolve();
    }, delay);
  });
}
