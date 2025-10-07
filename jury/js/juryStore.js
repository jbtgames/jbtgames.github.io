(function () {
  const globalObject = typeof window !== 'undefined' ? window : globalThis;
  const config = (globalObject && globalObject.JuryConfig) || {};
  if (globalObject && globalObject.JuryConfig) {
    try {
      delete globalObject.JuryConfig;
    } catch (error) {
      globalObject.JuryConfig = undefined;
    }
  }
  const STORAGE_KEY = typeof config.storageKey === 'string' && config.storageKey.trim().length
    ? config.storageKey.trim()
    : 'jury_cases_v1';
  const CASES_PATH = typeof config.casesPath === 'string' && config.casesPath.trim().length
    ? config.casesPath.trim()
    : 'data/cases.json';
  const memoryFallback = (() => {
    const data = {};
    return {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
      },
      setItem(key, value) {
        data[key] = value;
      },
      removeItem(key) {
        delete data[key];
      }
    };
  })();

  const judgeDirectory = {
    'Judge Iron': {
      id: 'iron',
      leaning: 'prosecution',
      summary: 'Prefers strict adherence to codes and measurable restitution.',
      philosophy: 'Rule of law above emotion.',
      title: 'Presiding Judge'
    },
    'Judge Mercy': {
      id: 'mercy',
      leaning: 'defense',
      summary: 'Centers intent, harm reduction, and restorative practices.',
      philosophy: 'Compassion before consequence.',
      title: 'Presiding Judge'
    },
    'Judge Vega': {
      id: 'vega',
      leaning: 'balanced',
      summary: 'Balances policy with community outcomes and data-driven fairness.',
      philosophy: 'Equity through context.',
      title: 'Presiding Judge'
    },
    'Judge Marlowe': {
      id: 'marlowe',
      leaning: 'prosecution',
      summary: 'Believes accountability deters repeat negligence in shared spaces.',
      philosophy: 'Discipline builds trust.',
      title: 'Presiding Judge'
    }
  };

  function safeStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return memoryFallback;
      }
      const testKey = '__jury_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (error) {
      console.warn('Local storage unavailable, using in-memory fallback.', error);
      return memoryFallback;
    }
  }

  const storage = safeStorage();
  let cache = null;
  let baseLoadPromise = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function fetchBaseCases() {
    if (!baseLoadPromise) {
      baseLoadPromise = fetch(CASES_PATH)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to load base cases');
          }
          return response.json();
        })
        .catch((error) => {
          console.warn('Could not fetch base cases', error);
          return [];
        });
    }
    const result = await baseLoadPromise;
    return Array.isArray(result) ? clone(result) : [];
  }

  function normaliseComment(comment) {
    return {
      user: (comment?.user || 'anon').toString().slice(0, 40),
      text: (comment?.text || '').toString().slice(0, 500),
      sentiment: Number.isFinite(Number(comment?.sentiment)) ? Number(comment.sentiment) : 0
    };
  }

  function normaliseParty(party, fallbackName, fallbackTitle) {
    if (!party) {
      return {
        name: fallbackName,
        title: fallbackTitle,
        summary: '',
        role: fallbackTitle.toLowerCase(),
        roleNote: '',
        side: '',
        profile: ''
      };
    }
    if (typeof party === 'string') {
      return {
        name: party.slice(0, 80) || fallbackName,
        title: fallbackTitle,
        summary: '',
        role: fallbackTitle.toLowerCase(),
        roleNote: '',
        side: '',
        profile: ''
      };
    }
    return {
      name: (party?.name || fallbackName).toString().slice(0, 80),
      title: (party?.title || fallbackTitle).toString().slice(0, 120),
      summary: (party?.summary || '').toString().slice(0, 240),
      role: (party?.role || fallbackTitle.toLowerCase()).toString().slice(0, 40),
      roleNote: (party?.roleNote || '').toString().slice(0, 280),
      side: (party?.side || '').toString().slice(0, 40),
      profile: (party?.profile || '').toString().slice(0, 320)
    };
  }

  function normaliseCharge(entry) {
    return (entry || '').toString().slice(0, 160);
  }

  function normaliseTimelineEntry(entry) {
    return {
      time: (entry?.time || '').toString().slice(0, 40),
      event: (entry?.event || '').toString().slice(0, 200)
    };
  }

  function normaliseEvidenceItem(entry) {
    return {
      label: (entry?.label || 'Evidence').toString().slice(0, 80),
      detail: (entry?.detail || '').toString().slice(0, 240)
    };
  }

  function normaliseJuryBox(entry) {
    if (!entry || typeof entry !== 'object') {
      return {
        votesForProsecution: 0,
        votesForDefense: 0,
        stance: ''
      };
    }
    return {
      votesForProsecution: Number.isFinite(Number(entry.votesForProsecution))
        ? Number(entry.votesForProsecution)
        : 0,
      votesForDefense: Number.isFinite(Number(entry.votesForDefense)) ? Number(entry.votesForDefense) : 0,
      stance: (entry?.stance || '').toString().slice(0, 200)
    };
  }

  function normaliseVerdict(verdict) {
    if (!verdict || typeof verdict !== 'object') {
      return null;
    }
    const result = {
      decision: (verdict.decision || '').toString().slice(0, 200),
      reasoning: (verdict.reasoning || '').toString().slice(0, 900),
      judge: (verdict.judge || '').toString().slice(0, 80)
    };
    if (Number.isFinite(Number(verdict.confidence))) {
      result.confidence = Number(verdict.confidence);
    }
    if (Number.isFinite(Number(verdict.finalScore))) {
      result.finalScore = Number(verdict.finalScore);
    }
    if (verdict.siding) {
      result.siding = verdict.siding.toString().slice(0, 40);
    }
    if (verdict.leaning) {
      result.leaning = verdict.leaning.toString().slice(0, 40);
    }
    return result;
  }

  function normaliseJudgeProfile(profile, fallbackName) {
    const name = (profile?.name || fallbackName || 'Presiding Judge').toString().slice(0, 80);
    const directory = judgeDirectory[name] || {};
    return {
      name,
      title: (profile?.title || directory.title || 'Presiding Judge').toString().slice(0, 120),
      summary: (profile?.summary || directory.summary || '').toString().slice(0, 320),
      leaning: (profile?.leaning || directory.leaning || 'balanced').toString().slice(0, 40),
      philosophy: (profile?.philosophy || directory.philosophy || '').toString().slice(0, 240)
    };
  }

  function normaliseBotMeta(meta) {
    if (!meta || typeof meta !== 'object') {
      return {};
    }
    const result = {};
    if (meta.voiceLog && typeof meta.voiceLog === 'object' && !Array.isArray(meta.voiceLog)) {
      const entries = Object.entries(meta.voiceLog).reduce((acc, [user, day]) => {
        if (typeof user !== 'string' && typeof user !== 'number') {
          return acc;
        }
        const key = user.toString().slice(0, 80);
        if (!key) {
          return acc;
        }
        if (day === null || day === undefined) {
          return acc;
        }
        const value = day.toString().slice(0, 24);
        acc[key] = value;
        return acc;
      }, {});
      if (Object.keys(entries).length) {
        result.voiceLog = entries;
      }
    }
    if (meta.uploadedOn) {
      result.uploadedOn = meta.uploadedOn.toString().slice(0, 24);
    }
    if (meta.lastEngaged) {
      result.lastEngaged = meta.lastEngaged.toString().slice(0, 24);
    }
    if (Number.isFinite(Number(meta.trendingScore))) {
      result.trendingScore = Number(meta.trendingScore);
    }
    if (Number.isFinite(Number(meta.uploads))) {
      result.uploads = Number(meta.uploads);
    }
    return result;
  }

  function pickJudgeName(caseItem) {
    const names = Object.keys(judgeDirectory);
    if (!names.length) {
      return 'Judge Iron';
    }
    const spread = ((caseItem?.juryBox?.votesForProsecution || 0) - (caseItem?.juryBox?.votesForDefense || 0));
    if (spread >= 2) {
      const tough = names.filter((name) => judgeDirectory[name].leaning === 'prosecution');
      if (tough.length) {
        return tough[spread % tough.length];
      }
    }
    if (spread <= -2) {
      const lenient = names.filter((name) => judgeDirectory[name].leaning === 'defense');
      if (lenient.length) {
        return lenient[Math.abs(spread) % lenient.length];
      }
    }
    const id = (caseItem?.id || '').toString();
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return names[hash % names.length];
  }

  function computeAverageSentiment(comments = []) {
    if (!comments.length) return 0;
    const total = comments.reduce((acc, item) => acc + (Number(item.sentiment) || 0), 0);
    return total / comments.length;
  }

  function normaliseCase(item) {
    const comments = Array.isArray(item?.comments) ? item.comments.map(normaliseComment) : [];
    const base = {
      id: item?.id || `case_${Date.now().toString(36)}`,
      title: (item?.title || 'Untitled case').toString(),
      story: (item?.story || '').toString(),
      votes: Number.isFinite(Number(item?.votes)) ? Number(item.votes) : 0,
      comments,
      ai_summary: typeof item?.ai_summary === 'string' ? item.ai_summary : '',
      status: item?.status === 'judged' ? 'judged' : 'pending',
      prosecution: typeof item?.prosecution === 'string' ? item.prosecution : '',
      defense: typeof item?.defense === 'string' ? item.defense : '',
      verdict: normaliseVerdict(item?.verdict)
    };
    base.createdAt = Number.isFinite(Number(item?.createdAt)) ? Number(item.createdAt) : Date.now();
    base.botMeta = normaliseBotMeta(item?.botMeta);
    if (Number.isFinite(Number(item?.finalScore))) {
      base.finalScore = Number(item.finalScore);
    }
    const sentiment = Number.isFinite(Number(item?.publicSentiment))
      ? Number(item.publicSentiment)
      : computeAverageSentiment(comments);
    base.publicSentiment = sentiment;
    const filedByName = (item?.filedBy || '').toString().slice(0, 80) || 'Court Clerk';
    base.filedBy = filedByName;
    base.parties = {
      accuser: normaliseParty(item?.accuser || item?.parties?.accuser, filedByName, 'Accuser'),
      prosecutor: normaliseParty(item?.prosecutor || item?.prosecutorProfile, 'Prosecutor', 'State Attorney'),
      defendant: normaliseParty(item?.defendant || item?.defendantProfile, 'Defendant', 'Accused'),
      defense: normaliseParty(item?.defenseCounsel || item?.defenseProfile || item?.defenceCounsel, 'Defense Counsel', 'Court-Appointed')
    };
    base.charges = Array.isArray(item?.charges) ? item.charges.map(normaliseCharge) : [];
    base.timeline = Array.isArray(item?.timeline) ? item.timeline.map(normaliseTimelineEntry) : [];
    base.evidence = Array.isArray(item?.evidence) ? item.evidence.map(normaliseEvidenceItem) : [];
    base.juryBox = normaliseJuryBox(item?.juryBox);
    base.judgeProfile = normaliseJudgeProfile(item?.judgeProfile, base.verdict?.judge);
    return base;
  }

  async function loadCases() {
    if (cache) {
      return clone(cache);
    }
    let stored;
    try {
      stored = storage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to read stored cases', error);
    }
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          cache = parsed.map(normaliseCase);
          return clone(cache);
        }
      } catch (error) {
        console.warn('Unable to parse stored cases', error);
      }
    }
    const baseCases = (await fetchBaseCases()).map(normaliseCase);
    cache = baseCases;
    persist();
    return clone(cache);
  }

  function persist() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to persist cases', error);
    }
  }

  function saveCases(list) {
    cache = Array.isArray(list) ? list.map(normaliseCase) : [];
    persist();
    return clone(cache);
  }

  function addCase(newCase) {
    if (!cache) {
      throw new Error('Cases not loaded yet');
    }
    const list = [normaliseCase(newCase), ...cache];
    return saveCases(list);
  }

  function updateCase(id, updater) {
    if (!cache) {
      throw new Error('Cases not loaded yet');
    }
    const list = cache.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const next = typeof updater === 'function' ? updater(clone(item)) : item;
      return normaliseCase(next);
    });
    const updatedList = saveCases(list);
    return updatedList.find((item) => item.id === id) || null;
  }

  function getCase(id) {
    if (!cache) {
      throw new Error('Cases not loaded yet');
    }
    return clone(cache.find((item) => item.id === id) || null);
  }

  function splitSentences(text) {
    return (text || '')
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  function selectSentence(sentences, keywords) {
    if (!Array.isArray(sentences) || !sentences.length) {
      return '';
    }
    const lowerKeywords = (keywords || []).map((keyword) => keyword.toLowerCase());
    return (
      sentences.find((sentence) => {
        const lowerSentence = sentence.toLowerCase();
        return lowerKeywords.some((keyword) => lowerSentence.includes(keyword));
      }) || sentences[0]
    );
  }

  function sentenceToClause(sentence) {
    if (!sentence) return '';
    return sentence.replace(/[.?!]+$/, '').trim();
  }

  function ensureSentence(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return '';
    return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  }

  function describeCharge(charges = []) {
    if (!Array.isArray(charges) || !charges.length) {
      return 'the filed allegation';
    }
    const lead = charges[0].replace(/^Count\s*\d+[:\-]?\s*/i, '').trim();
    if (!lead) {
      return 'the filed allegation';
    }
    if (charges.length === 1) {
      return lead;
    }
    return `${lead}${charges.length > 1 ? ' and related counts' : ''}`;
  }

  function describeEvidence(evidence = []) {
    if (!Array.isArray(evidence) || !evidence.length) {
      return '';
    }
    const first = evidence[0];
    const label = (first?.label || '').trim();
    const detail = (first?.detail || '').trim();
    if (label && detail) {
      return `${label.toLowerCase().includes('the') ? label : `the ${label.toLowerCase()}`} showing ${detail}`;
    }
    if (detail) {
      return detail;
    }
    return label;
  }

  function describeTimeline(timeline = []) {
    if (!Array.isArray(timeline) || !timeline.length) {
      return '';
    }
    const pivotal = timeline[Math.max(0, timeline.length - 1)];
    if (!pivotal || (!pivotal.time && !pivotal.event)) {
      return '';
    }
    const time = pivotal.time ? `${pivotal.time}, ` : '';
    return `${time}${pivotal.event}`;
  }

  function generateArgument(role, caseItem = {}) {
    const story = caseItem.story || '';
    const parties = caseItem.parties || {};
    const sentences = splitSentences(story);
    const prosecutionSentence = sentenceToClause(
      selectSentence(sentences, ['prosecutor', 'accuser', 'allege', 'report', 'charge', 'complaint'])
    );
    const defenseSentence = sentenceToClause(
      selectSentence(sentences, ['defense', 'defence', 'defendant', 'insist', 'explain', 'justify', 'counter'])
    );

    const caseTitle = (caseItem.title || 'this case').replace(/[.]+$/, '');
    const accuserName = parties.accuser?.name || caseItem.filedBy || 'the accuser';
    const defendantName = parties.defendant?.name || 'the defendant';
    const defendantTitle = parties.defendant?.title ? ` (${parties.defendant.title})` : '';
    const prosecutorName = parties.prosecutor?.name || 'the prosecutor';
    const defenseCounselName = parties.defense?.name || 'defense counsel';
    const chargeSummary = describeCharge(caseItem.charges);
    const evidenceSummary = describeEvidence(caseItem.evidence);
    const timelineSummary = describeTimeline(caseItem.timeline);

    if (role === 'prosecution') {
      const harmLine = prosecutionSentence
        ? ensureSentence(`${accuserName} recounts ${prosecutionSentence}`)
        : ensureSentence(`${accuserName} details how ${defendantName} triggered the complaint.`);
      const evidenceLine = evidenceSummary ? ensureSentence(`They lean on ${evidenceSummary}.`) : '';
      const timelineLine = timelineSummary
        ? ensureSentence(`The incident escalated at ${timelineSummary}.`)
        : '';
      const defenseLine = defenseSentence
        ? ensureSentence(
            `${defendantName} maintains ${defenseSentence}, yet ${prosecutorName} argues the harm still stands.`
          )
        : ensureSentence(`${prosecutorName} recognises the stated intent but presses for accountability.`);
      return [
        ensureSentence(
          `${prosecutorName} presents ${caseTitle} on behalf of ${accuserName}, focusing on ${chargeSummary}.`
        ),
        harmLine,
        evidenceLine,
        timelineLine,
        defenseLine
      ]
        .filter(Boolean)
        .join(' ');
    }

    const prosecutionLine = prosecutionSentence
      ? ensureSentence(`The prosecution says ${prosecutionSentence}`)
      : ensureSentence(`The prosecution claims ${defendantName} crossed a clear boundary.`);
    const contextLine = defenseSentence
      ? ensureSentence(`${defendantName}${defendantTitle} explains ${defenseSentence}.`)
      : ensureSentence(`${defendantName}${defendantTitle} explains the decision came from urgent context.`);
    const supportLine = evidenceSummary
      ? ensureSentence(`Counsel cites ${evidenceSummary} to show their perspective.`)
      : '';
    const timelineLine = timelineSummary
      ? ensureSentence(`They highlight that by ${timelineSummary}, their response reduced harm.`)
      : '';
    return [
      ensureSentence(
        `${defenseCounselName} defends ${defendantName}${defendantTitle}, arguing the context undercuts the charge.`
      ),
      prosecutionLine,
      contextLine,
      supportLine,
      timelineLine
    ]
      .filter(Boolean)
      .join(' ');
  }

  function summariseComments(comments = []) {
    if (!comments.length) {
      return {
        average: 0,
        lines: ['• No public comments yet.', '• Jury sentiment pending.']
      };
    }
    const average = computeAverageSentiment(comments);
    const tone = average > 0.25 ? 'supportive' : average < -0.25 ? 'critical' : 'mixed';
    const reasons = comments.slice(-3).map((comment) => `• ${comment.text.slice(0, 90)}`);
    return {
      average,
      lines: [`• Crowd tone: ${tone}.`, ...reasons]
    };
  }

  function judgeVerdict(caseItem, prosecution, defense, summary) {
    const judgeName = pickJudgeName(caseItem);
    const judgeInfo = judgeDirectory[judgeName] || {};
    const severity = Math.max(0, prosecution.length - defense.length);
    let judgeScore = severity > 0 ? 62 : 38;
    if (judgeInfo.leaning === 'prosecution') {
      judgeScore += 6;
    } else if (judgeInfo.leaning === 'defense') {
      judgeScore -= 6;
    }
    const toneLine = summary.lines.find((line) => line.toLowerCase().includes('crowd tone')) || '';
    const publicScore = toneLine.includes('supportive') ? 35 : toneLine.includes('critical') ? 65 : 50;
    const juryScore = Math.round((summary.average + 1) * 50);
    const box = caseItem?.juryBox || { votesForProsecution: 0, votesForDefense: 0 };
    const boxSpread = (Number(box.votesForProsecution) || 0) - (Number(box.votesForDefense) || 0);
    const spreadWeight = Math.max(-12, Math.min(12, boxSpread * 2));
    const weightedScore = Math.round(0.45 * judgeScore + 0.3 * publicScore + 0.25 * juryScore + spreadWeight);
    const finalScore = Math.max(0, Math.min(100, weightedScore));

    let decision;
    let siding;
    if (finalScore >= 65) {
      decision = 'GUILTY — Policy Breach Confirmed';
      siding = 'Prosecution';
    } else if (finalScore >= 50) {
      decision = 'RESPONSIBLE WITH MITIGATION';
      siding = 'Prosecution';
    } else {
      decision = 'NOT GUILTY — Emergency Defense Accepted';
      siding = 'Defense';
    }

    const commentCount = Array.isArray(caseItem?.comments) ? caseItem.comments.length : 0;
    const reasoning = `Judge ${judgeName} weighs ${commentCount} public submissions, the Jury Box split (${box.votesForProsecution || 0} for prosecution vs ${box.votesForDefense || 0} for defense), and ${toneLine || 'crowd sentiment'}, ultimately siding with the ${siding.toLowerCase()}.`;
    return {
      decision,
      reasoning,
      confidence: 72,
      judge: judgeName,
      finalScore,
      siding,
      judgeProfile: { ...judgeInfo, name: judgeName }
    };
  }

  function applyPartyContext(base, siding) {
    const accuserName = base.parties.accuser?.name || base.filedBy || 'the accuser';
    const defendantName = base.parties.defendant?.name || 'the defendant';
    if (base.parties.accuser) {
      base.parties.accuser.role = 'accuser';
      base.parties.accuser.side = 'Prosecution';
      if (!base.parties.accuser.roleNote) {
        base.parties.accuser.roleNote = `${accuserName} initiated the complaint and continues to press the tribunal.`;
      }
    }
    if (base.parties.prosecutor) {
      base.parties.prosecutor.role = 'prosecutor';
      base.parties.prosecutor.side = 'Prosecution';
      if (siding) {
        base.parties.prosecutor.roleNote =
          siding === 'Prosecution'
            ? `${base.parties.prosecutor.name} now pursues remedies for ${accuserName}.`
            : `${base.parties.prosecutor.name} notes the bench favoured mitigation.`;
      } else if (!base.parties.prosecutor.roleNote) {
        base.parties.prosecutor.roleNote = `${base.parties.prosecutor.name} prepares the state's reading of the evidence.`;
      }
    }
    if (base.parties.defense) {
      base.parties.defense.role = 'defense';
      base.parties.defense.side = 'Defense';
      if (siding) {
        base.parties.defense.roleNote =
          siding === 'Defense'
            ? `${base.parties.defense.name} successfully centered the mitigating context.`
            : `${base.parties.defense.name} records the ruling while planning next steps.`;
      } else if (!base.parties.defense.roleNote) {
        base.parties.defense.roleNote = `${base.parties.defense.name} builds the counter-narrative for ${defendantName}.`;
      }
    }
    if (base.parties.defendant) {
      base.parties.defendant.role = 'defendant';
      base.parties.defendant.side = 'Defense';
      if (siding) {
        base.parties.defendant.roleNote =
          siding === 'Defense'
            ? `${defendantName} hears the ruling as validation of their choices.`
            : `${defendantName} must now satisfy the remedies ordered by the bench.`;
      } else if (!base.parties.defendant.roleNote) {
        base.parties.defendant.roleNote = `${defendantName} prepares testimony explaining their decision.`;
      }
    }
  }

  function prepareCaseForDebate(caseItem) {
    const base = normaliseCase(caseItem);
    const summary = summariseComments(base.comments);
    base.prosecution = generateArgument('prosecution', base);
    base.defense = generateArgument('defense', base);
    base.ai_summary = summary.lines.join('\n');
    base.publicSentiment = summary.average;
    base.status = base.status === 'judged' ? 'judged' : 'pending';
    base.judgeProfile = normaliseJudgeProfile(base.judgeProfile, base.verdict?.judge);
    applyPartyContext(base, base.verdict?.siding);
    return base;
  }

  function processCaseForVerdict(caseItem) {
    const prepared = prepareCaseForDebate(caseItem);
    const summary = summariseComments(prepared.comments);
    const verdict = judgeVerdict(prepared, prepared.prosecution, prepared.defense, summary);
    const base = { ...prepared };
    base.status = 'judged';
    const verdictPayload = {
      decision: verdict.decision,
      reasoning: verdict.reasoning,
      confidence: verdict.confidence,
      judge: verdict.judge,
      finalScore: verdict.finalScore,
      siding: verdict.siding,
      leaning: verdict.judgeProfile?.leaning
    };
    base.verdict = normaliseVerdict(verdictPayload);
    base.finalScore = verdict.finalScore;
    base.judgeProfile = normaliseJudgeProfile(verdict.judgeProfile, verdict.judge);
    applyPartyContext(base, verdict.siding);
    return base;
  }

  window.JuryStore = {
    loadCases,
    saveCases,
    addCase,
    updateCase,
    getCase
  };

  window.JuryAI = {
    generateArgument,
    summariseComments,
    judgeVerdict,
    processCaseForVerdict,
    prepareCaseForDebate
  };
})();
