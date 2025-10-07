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
      verdict: item?.verdict && typeof item.verdict === 'object' ? clone(item.verdict) : null
    };
    if (Number.isFinite(Number(item?.finalScore))) {
      base.finalScore = Number(item.finalScore);
    }
    const sentiment = Number.isFinite(Number(item?.publicSentiment))
      ? Number(item.publicSentiment)
      : computeAverageSentiment(comments);
    base.publicSentiment = sentiment;
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

  function generateArgument(role, story) {
    const intro = (story || '')
      .split(/(?<=[.!?])\s+/)
      .slice(0, 2)
      .join(' ')
      .trim();
    if (role === 'prosecution') {
      return `The prosecution argues that the actor's choices created tangible harm. ${intro} This reflects avoidable disrespect for shared boundaries and poor communication.`;
    }
    return `The defense highlights the context and intent behind the decision. ${intro} Considering the pressures involved, the actor attempted to minimise fallout while solving an urgent problem.`;
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

  function judgeVerdict(story, prosecution, defense, summary) {
    const severity = Math.max(0, prosecution.length - defense.length);
    const judgeScore = severity > 0 ? 70 : 30;
    const toneLine = summary.lines.find((line) => line.toLowerCase().includes('crowd tone')) || '';
    const publicScore = toneLine.includes('supportive') ? 30 : toneLine.includes('critical') ? 70 : 50;
    const juryScore = Math.round((summary.average + 1) * 50);
    const finalScore = Math.max(0, Math.min(100, Math.round(0.5 * judgeScore + 0.3 * publicScore + 0.2 * juryScore)));

    let decision;
    if (finalScore <= 25) decision = 'Morally Justified';
    else if (finalScore <= 50) decision = 'Mostly Justified';
    else if (finalScore <= 75) decision = 'Morally Wrong';
    else decision = 'Severe Violation';

    return {
      decision,
      reasoning: `Considering the arguments and public reaction (${toneLine || 'no sentiment yet'}), the judge leans toward ${decision.toLowerCase()}.`,
      confidence: 65,
      judge: 'Judge Iron',
      finalScore
    };
  }

  function processCaseForVerdict(caseItem) {
    const base = normaliseCase(caseItem);
    const summary = summariseComments(base.comments);
    const prosecution = generateArgument('prosecution', base.story);
    const defense = generateArgument('defense', base.story);
    const verdict = judgeVerdict(base.story, prosecution, defense, summary);
    base.prosecution = prosecution;
    base.defense = defense;
    base.ai_summary = summary.lines.join('\n');
    base.publicSentiment = summary.average;
    base.status = 'judged';
    base.verdict = {
      decision: verdict.decision,
      reasoning: verdict.reasoning,
      confidence: verdict.confidence,
      judge: verdict.judge
    };
    base.finalScore = verdict.finalScore;
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
    processCaseForVerdict
  };
})();
