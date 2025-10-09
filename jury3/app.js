
/**
 * Jury Game 3.0 runtime scaffold
 * -----------------------------------------
 * Lightweight utilities for orchestrating the hourly trial loop
 * against the JSON data packs stored in /data. Everything here is
 * deterministic and cache-aware so the front-end can fetch only what
 * it needs per view.
 */

const JuryRuntime = (() => {
  const dataCache = new Map();
  const INBOX_PATH = './data/cases.inbox.json';
  const INBOX_LIMIT = 50;

  async function loadJSON(path, { bust = false } = {}) {
    if (!bust && dataCache.has(path)) {
      return dataCache.get(path);
    }
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    const json = await response.json();
    dataCache.set(path, json);
    return json;
  }

  async function loadInbox({ bust = false } = {}) {
    const payload = await loadJSON(INBOX_PATH, { bust });
    const cases = Array.isArray(payload?.cases) ? payload.cases.slice(0, INBOX_LIMIT) : [];
    const normalized = { ...payload, cases };
    dataCache.set(INBOX_PATH, normalized);
    return normalized;
  }

  async function loadSettings() {
    return loadJSON('./data/settings.json');
  }

  async function loadCaseById(id) {
    const sources = [
      INBOX_PATH,
      './data/cases.queue.json',
      './data/cases.archive.json'
    ];

    for (const path of sources) {
      const payload = path === INBOX_PATH ? await loadInbox() : await loadJSON(path);
      if (Array.isArray(payload?.cases)) {
        const match = payload.cases.find((c) => c.id === id);
        if (match) return match;
      }
      if (Array.isArray(payload?.ids)) {
        if (payload.ids.includes(id)) {
          return loadInbox().then((inbox) =>
            inbox.cases.find((c) => c.id === id)
          );
        }
      }
    }
    throw new Error(`Case ${id} not found in sources.`);
  }

  function computeHotScore(entry, rankingSettings, now = new Date()) {
    const weights = rankingSettings.hotScoreWeights;
    const created = new Date(entry.createdAt || now);
    const ageHours = (now - created) / 36e5;
    const halfLife = weights.ageHalfLifeHours || 12;
    const decay = Math.pow(0.5, ageHours / halfLife);
    const signals = entry.signals || { upvotes: 0, downvotes: 0, reports: 0 };
    const base = (signals.upvotes || 0) * (weights.upvotes ?? 1);
    const downs = (signals.downvotes || 0) * Math.abs(weights.downvotes ?? 0);
    const reports = (signals.reports || 0) * Math.abs(weights.reportPenalty ?? 0);
    return base - downs - reports + decay;
  }

  function rankAndPickTop(entries, rankingSettings, now = new Date()) {
    if (!entries?.length) return null;
    const scored = entries
      .map((entry) => ({
        entry,
        score: computeHotScore(entry, rankingSettings, now)
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0].entry;
  }

  const transientState = {
    queue: [],
    archive: []
  };

  async function writeQueue(ids) {
    transientState.queue = [...ids];
    const payload = { ids: [...ids] };
    dataCache.set('./data/cases.queue.json', payload);
    // In production this would persist to a database / API.
    console.debug('Queue updated', transientState.queue);
    return payload;
  }

  async function loadQueue({ bust = false } = {}) {
    const queue = await loadJSON('./data/cases.queue.json', { bust });
    const ids = Array.isArray(queue?.ids) ? queue.ids : [];
    if (!transientState.queue.length || bust) {
      transientState.queue = [...ids];
    }
    return transientState.queue;
  }

  async function pickHourlyCase(now = new Date()) {
    const settings = await loadSettings();
    const inbox = await loadInbox();
    const chosen = rankAndPickTop(inbox.cases, settings.ranking, now);
    if (!chosen) return null;
    await writeQueue([chosen.id]);
    return chosen;
  }

  async function prepareQueue({ count = 3, now = new Date() } = {}) {
    const settings = await loadSettings();
    const inbox = await loadInbox();
    if (!Array.isArray(inbox?.cases) || !inbox.cases.length) return [];

    const ranked = inbox.cases
      .map((entry) => ({
        id: entry.id,
        score: computeHotScore(entry, settings.ranking, now)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, count));

    const ids = ranked.map((item) => item.id);
    await writeQueue(ids);
    return ids;
  }

  async function drawNextQueuedCase({ now = new Date() } = {}) {
    const queue = await loadQueue();
    if (!queue.length) {
      const prepared = await prepareQueue({ count: 1, now });
      if (!prepared.length) return null;
    }

    const [nextId, ...rest] = transientState.queue;
    await writeQueue(rest);
    if (!nextId) return null;
    return loadCaseById(nextId);
  }

  function hashSeed(...parts) {
    const str = parts.join('::');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // force 32-bit
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function pickTemplateLine(lawyer, phase, seed) {
    const lines = lawyer.templates?.[phase] ?? [];
    if (!lines.length) return '';
    const random = seededRandom(seed);
    const index = Math.floor(random() * lines.length);
    return lines[index];
  }

  function fillTemplate(template, vars = {}, fallbacks = {}) {
    return template.replace(/\{(.*?)\}/g, (_, key) => {
      return (vars[key] ?? fallbacks[key] ?? `{${key}}`);
    });
  }

  function speak(lawyer, phase, caseData, roundKey, prompts, sideLabel) {
    const seed = hashSeed(caseData.id, phase, lawyer.id, String(roundKey));
    const template = pickTemplateLine(lawyer, phase, seed);
    const filled = fillTemplate(template, { ...caseData, side: sideLabel }, prompts.lawyerFill?.fallbacks);
    return {
      by: lawyer.id,
      phase,
      round: roundKey,
      text: filled
    };
  }

  function sampleJurors(jurors, count, seed) {
    const rng = seededRandom(seed);
    const pool = [...jurors];
    const selection = [];
    while (selection.length < count && pool.length) {
      const index = Math.floor(rng() * pool.length);
      selection.push(pool.splice(index, 1)[0]);
    }
    return selection;
  }

  function jurorVote(juror, caseData, transcript) {
    const weights = juror.voteHeuristics?.weights ?? {};
    const analysis = {
      facts: transcript.filter((line) => /facts?/i.test(line.text)).length,
      precedent: transcript.filter((line) => /precedent|standard|cite/i.test(line.text)).length,
      empathy: transcript.filter((line) => /harm|impact|story/i.test(line.text)).length,
      fairness: transcript.filter((line) => /fair|principle|standard/i.test(line.text)).length,
      practicality: transcript.filter((line) => /mitigation|workable|practical/i.test(line.text)).length
    };
    const scoreA = analysis.facts * (weights.facts ?? 0) +
      analysis.precedent * (weights.precedent ?? 0) +
      analysis.empathy * (weights.empathy ?? 0) +
      analysis.fairness * (weights.fairness ?? 0) +
      analysis.practicality * (weights.practicality ?? 0);

    const scoreB = scoreA * 0.95; // placeholder offset; refine with richer heuristics
    if (Math.abs(scoreA - scoreB) < 0.01) {
      return juror.voteHeuristics?.tiebreak ?? 'abstain';
    }
    return scoreA > scoreB ? 'A' : 'B';
  }

  function tallyVotes(votes) {
    return votes.reduce(
      (acc, vote) => {
        acc[vote] = (acc[vote] ?? 0) + 1;
        return acc;
      },
      { A: 0, B: 0, abstain: 0 }
    );
  }

  function majority(votes) {
    const tally = tallyVotes(votes);
    if (tally.A === tally.B) {
      return tally.abstain > 0 ? 'split' : 'A';
    }
    return tally.A > tally.B ? 'A' : 'B';
  }

  function extractFactors(transcript) {
    return transcript
      .filter((line) => /because|since|therefore|factor/i.test(line.text))
      .slice(-3)
      .map((line) => line.text);
  }

  function formatSplit({ A, B, abstain }) {
    const main = `${A}-${B}`;
    if (!abstain) return main;
    return `${main} • ${abstain} abstain`;
  }

  function formatVerdict(judge, winner, factors, votes) {
    const tally = tallyVotes(votes);
    const useFactors = factors.length ? factors : ['the overall balance of evidence'];
    const seed = hashSeed('verdict', winner, useFactors.join('|'));
    const random = seededRandom(seed);
    const templateIndex = Math.floor(random() * judge.verdictTemplates.length);
    const template = judge.verdictTemplates[templateIndex];
    const joiner = ', ';
    const text = fillTemplate(template, {
      winner,
      factors: useFactors.join(joiner)
    });
    return {
      winner,
      factors: useFactors,
      text,
      tally,
      split: formatSplit(tally)
    };
  }

  async function deliberateCase(caseId) {
    const settings = await loadSettings();
    const [lawyersPack, jurorsPack, prompts, caseData] = await Promise.all([
      loadJSON('./data/lawyers.json'),
      loadJSON('./data/jurors.json'),
      loadJSON('./data/prompts.json'),
      loadCaseById(caseId)
    ]);

    const lawyers = lawyersPack.lawyers;
    const jurors = jurorsPack.jurors;
    const pair = {
      A: lawyers[0],
      B: lawyers[1]
    };

    const transcript = [];
    const rounds = settings.trial.rounds;

    transcript.push(speak(pair.A, 'opening', caseData, 0, prompts, 'A'));
    transcript.push(speak(pair.B, 'opening', caseData, 0, prompts, 'B'));

    for (let round = 0; round < rounds; round += 1) {
      transcript.push(speak(pair.A, 'rebuttal', caseData, round, prompts, 'A'));
      transcript.push(speak(pair.B, 'rebuttal', caseData, round, prompts, 'B'));
    }

    transcript.push(speak(pair.A, 'closing', caseData, 'A', prompts, 'A'));
    transcript.push(speak(pair.B, 'closing', caseData, 'B', prompts, 'B'));

    const panel = sampleJurors(jurors, settings.trial.jurorCount, hashSeed(caseData.id, 'jurors'));
    const votes = panel.map((juror) => jurorVote(juror, caseData, transcript));
    const winner = majority(votes);
    const factors = extractFactors(transcript);

    return {
      case: caseData,
      pair,
      transcript,
      panel,
      votes,
      winner,
      factors
    };
  }

  async function buildJudgeVerdict(deliberation) {
    if (!deliberation?.case?.id) {
      throw new Error('Cannot prepare judge verdict without a deliberated case.');
    }
    const judge = await loadJSON('./data/judge.json');
    const winner = deliberation.winner ?? majority(deliberation.votes ?? []);
    const factors = deliberation.factors ?? [];
    const verdict = formatVerdict(judge, winner, factors, deliberation.votes ?? []);
    return {
      ...deliberation,
      verdict
    };
  }

  async function runTrial(caseId) {
    const deliberation = await deliberateCase(caseId);
    return buildJudgeVerdict(deliberation);
  }

  async function recordVerdict(trialResult, decidedAt = new Date()) {
    if (!trialResult?.case?.id) {
      throw new Error('Cannot record verdict without a case id.');
    }
    const archive = await loadJSON('./data/cases.archive.json', { bust: true });
    const existing = Array.isArray(archive?.cases) ? archive.cases : [];
    const entry = {
      id: trialResult.case.id,
      case: trialResult.case,
      panel: trialResult.panel,
      votes: trialResult.votes,
      transcript: trialResult.transcript,
      verdict: {
        winner: trialResult.verdict.winner,
        split: trialResult.verdict.split,
        factors: trialResult.verdict.factors
      },
      summary: trialResult.verdict.text,
      decidedAt: decidedAt.toISOString()
    };
    const updated = [
      ...existing.filter((item) => item.id !== entry.id),
      entry
    ];
    const payload = { cases: updated };
    transientState.archive = updated;
    dataCache.set('./data/cases.archive.json', payload);
    console.debug('Archive updated', entry);
    return entry;
  }

  async function progressTrial({ now = new Date() } = {}) {
    const deliberation = await deliberateQueuedCase({ now });
    if (!deliberation) return null;
    return runJudgeRuling(deliberation, { now });
  }

  async function deliberateQueuedCase({ now = new Date() } = {}) {
    const caseData = await drawNextQueuedCase({ now });
    if (!caseData) return null;
    return deliberateCase(caseData.id);
  }

  async function runJudgeRuling(deliberation, { now = new Date() } = {}) {
    const result = await buildJudgeVerdict(deliberation);
    await recordVerdict(result, now);
    return result;
  }

  /**
   * Call Groq's chat completion endpoint to score a case using an external model.
   * The helpers stay deterministic by only formatting the prompt and handling the
   * HTTP call — no secrets are stored in state.
   */
  async function requestGroqVerdict({
    apiKey,
    caseData,
    transcript = [],
    model = 'llama3-70b-8192',
    signal
  } = {}) {
    if (!apiKey) {
      throw new Error('Groq API key is required.');
    }
    if (!caseData) {
      throw new Error('A case must be queued before requesting Groq reasoning.');
    }

    const summaryLines = [
      `Case ID: ${caseData.id}`,
      `Title: ${caseData.title}`,
      `Context: ${caseData.context}`,
      `Side A position: ${caseData.sideA}`,
      `Side B position: ${caseData.sideB}`
    ];

    if (Array.isArray(caseData.tags) && caseData.tags.length) {
      summaryLines.push(`Tags: ${caseData.tags.join(', ')}`);
    }

    const transcriptLines = Array.isArray(transcript)
      ? transcript
          .map((line) => `${line.by?.toUpperCase() ?? 'UNKNOWN'} (${line.phase}): ${line.text}`)
          .slice(-12)
      : [];

    const userPrompt = [
      'Review the following civic dispute and act as a neutral deliberation analyst.',
      'Assess both arguments and produce a balanced verdict with a short rationale and explicit vote tally.',
      '',
      summaryLines.join('\n'),
      '',
      transcriptLines.length
        ? ['Recent transcript snippets:', ...transcriptLines].join('\n')
        : 'No transcript is available yet; base your reasoning on the brief alone.',
      '',
      'Respond in the following JSON shape:',
      '{"winner": "A or B or split", "summary": "2-3 sentence rationale", "factors": ["key factor"], "recommended_actions": ["next step"], "confidence": "high/medium/low"}'
    ].join('\n');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content:
              'You are an impartial civic juror AI. Weigh evidence from both sides, explain your reasoning, and keep tone professional.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      }),
      signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq request failed: ${response.status} ${text}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? '';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      parsed = {
        winner: 'undetermined',
        summary: content || 'Groq did not return structured JSON.',
        factors: [],
        recommended_actions: [],
        confidence: 'unknown'
      };
    }

    return {
      model,
      content,
      parsed,
      raw: payload
    };
  }

  return {
    loadJSON,
    loadInbox,
    loadSettings,
    loadCaseById,
    computeHotScore,
    rankAndPickTop,
    pickHourlyCase,
    prepareQueue,
    drawNextQueuedCase,
    deliberateCase,
    deliberateQueuedCase,
    buildJudgeVerdict,
    runTrial,
    recordVerdict,
    progressTrial,
    runJudgeRuling,
    requestGroqVerdict,
    _state: transientState
  };
})();

window.JuryRuntime = JuryRuntime;
