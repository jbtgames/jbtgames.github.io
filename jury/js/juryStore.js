(function () {
  const globalObject = typeof window !== 'undefined' ? window : globalThis;
  const STORAGE_KEY = 'jury_v2_state';
  const CASES_URL = 'data/cases.json';
  const STATE_VERSION = 2;
  const RESET_AFTER_HOURS = 8;
  const DEFAULT_CASE_STATUS = 'debate';
  const CASE_BOT_INTERVAL = [90000, 140000];
  const COMMENT_BOT_INTERVAL = [35000, 65000];

  const config = globalObject.JuryConfig || {};
  const LEGACY_STORAGE_KEY =
    typeof config.storageKey === 'string' && config.storageKey.trim().length
      ? config.storageKey.trim()
      : 'jury_cases_public_v1';
  const LEGACY_CASES_URL =
    typeof config.casesPath === 'string' && config.casesPath.trim().length
      ? config.casesPath.trim()
      : 'data/cases.json';

  let legacyCases = [];
  let legacyCasesLoaded = false;
  let legacyReadyPromise = null;

  const botCaseDeck = [
    {
      id: 'bot-campus-hackathon',
      title: 'Housing Council v. Priya Tal — Hackathon Noise Curfew',
      summary: 'Overnight coding sprint keeps an entire tower awake despite quiet hours.',
      story:
        'Resident mentor Priya Tal approved an impromptu hackathon in the residence innovation lab. Neighbours reported nonstop clacking keyboards and cheering until 3 a.m., even after reminders about the midnight quiet rule. Tal says the event prevented students from commuting off-campus in a storm and she distributed earplugs. The housing council disagrees and filed for a misconduct review.',
      filedBy: 'HousingCouncilBot',
      status: 'debate',
      tags: ['housing', 'noise'],
      votes: { up: 64, down: 22 },
      roles: {
        accuser: {
          name: 'Housing Council',
          title: 'Residence Oversight Board',
          summary: 'Filed the complaint after midnight logs showed repeated noise alerts.'
        },
        defendant: {
          name: 'Priya Tal',
          title: 'Resident Mentor',
          summary: 'Authorised the hackathon and claims earplugs and schedule notices were provided.'
        },
        prosecutor: {
          name: 'Silas Roe',
          title: 'Community Prosecutor',
          summary: 'Argues Tal ignored quiet-hour protocol and set a bad precedent.'
        },
        defense: {
          name: 'Counsel-Orion',
          title: 'Defense Advocate',
          summary: 'Points to the extreme weather keeping participants indoors.'
        },
        judge: {
          name: 'Judge Mercy',
          leaning: 'defense',
          summary: 'Watches for intent and restorative outcomes.'
        }
      },
      leadCharge: 'Quiet-hour violation and negligence in noise mitigation',
      charges: [
        'Count 1: Failure to enforce quiet-hour policy',
        'Count 2: Negligent supervision of approved events'
      ],
      timeline: [
        { time: '19:45', event: 'Hackathon setup begins in the innovation lab.' },
        { time: '23:50', event: 'First quiet-hour alert is issued to Tal.' },
        { time: '01:10', event: 'Second noise complaint recorded in guard log.' },
        { time: '03:05', event: 'Housing council escalates to misconduct review.' }
      ],
      evidence: [
        { label: 'Quiet Log', detail: 'Three entries in the quiet-hour incident report within one night.' },
        { label: 'Event Flyer', detail: 'Promotional flyer stating the event would wrap by midnight.' }
      ],
      initialComments: [
        {
          user: 'HousingCouncilBot',
          text: 'Three separate warnings were ignored. A storm does not cancel policy.',
          sentiment: -0.55
        },
        {
          user: 'HackathonDev',
          text: 'We distributed earplugs and kept doors shut. The storm stranded us.',
          sentiment: 0.35
        }
      ]
    },
    {
      id: 'bot-festival-generator',
      title: 'Festival Board v. Sami Ahmed — Generator Reassignment',
      summary: 'Equipment swap for a robotics inspection leaves stage crew powerless.',
      story:
        'Logistics lead Sami Ahmed moved a spare generator from the cultural festival prep area to a robotics lab that faced an emergency safety inspection. The festival board says stage lights sat dark for ninety minutes and volunteers lost rehearsal time. Ahmed states the swap was coordinated, lasted an hour, and prevented the robotics event from being cancelled by inspectors.',
      filedBy: 'ComplaintBot-16',
      status: 'debate',
      tags: ['resources', 'operations'],
      votes: { up: 58, down: 18 },
      roles: {
        accuser: {
          name: 'Festival Board',
          title: 'Campus Festival Organisers',
          summary: 'Argues the equipment charter was ignored and performers were left waiting.'
        },
        defendant: {
          name: 'Sami Ahmed',
          title: 'Logistics Lead',
          summary: 'Coordinated the generator loan and says the lab returned it undamaged.'
        },
        prosecutor: {
          name: 'Rowan Pike',
          title: 'Event Prosecutor',
          summary: 'Pushes for a formal reprimand for bypassing approval.'
        },
        defense: {
          name: 'Advocate-Lambda',
          title: 'Defense Counsel',
          summary: 'Highlights the emergency inspection and short duration of the swap.'
        },
        judge: {
          name: 'Judge Iron',
          leaning: 'prosecution',
          summary: 'Values procedure and consistency above improvisation.'
        }
      },
      leadCharge: 'Unauthorized diversion of shared equipment',
      charges: ['Count 1: Reallocation without approval', 'Count 2: Delay to scheduled festival operations'],
      timeline: [
        { time: '21:05', event: 'Ahmed signs out the spare generator from festival storage.' },
        { time: '21:40', event: 'Stage crew reports lighting delay.' },
        { time: '22:15', event: 'Robotics inspection completes with borrowed generator.' },
        { time: '22:35', event: 'Generator returned; festival crew restarts testing.' }
      ],
      evidence: [
        { label: 'Equipment Log', detail: 'Sign-out sheet showing handwritten note about robotics emergency.' },
        { label: 'Inspection Notice', detail: 'Email citing the 06:00 inspection deadline.' }
      ],
      initialComments: [
        {
          user: 'ComplaintBot-16',
          text: 'Volunteers sat in the dark for ninety minutes. Policies exist to prevent this.',
          sentiment: -0.5
        },
        {
          user: 'RoboticsCaptain',
          text: 'Inspection would have failed without backup power. Ahmed kept the season alive.',
          sentiment: 0.45
        }
      ]
    },
    {
      id: 'bot-lab-badge',
      title: 'Safety Committee v. Lila Diaz — Badge Override Incident',
      summary: 'Expired clearance triggers a false alarm during a late-night lab visit.',
      story:
        'Graduate assistant Lila Diaz used an expired badge override to enter the robotics lab after midnight and run a final thesis test. The security system triggered a gas suppression alarm. Safety Committee bots claim Diaz ignored the after-hours policy. Diaz says her advisor texted urgent permission and no damage occurred beyond a false alarm reset.',
      filedBy: 'ReportBot-19',
      status: 'hearing',
      tags: ['safety', 'access'],
      votes: { up: 41, down: 27 },
      roles: {
        accuser: {
          name: 'Safety Committee',
          title: 'Robotics Faculty Board',
          summary: 'Wants stricter controls on expired badge overrides.'
        },
        defendant: {
          name: 'Lila Diaz',
          title: 'Graduate Assistant',
          summary: 'Completed a thesis test and triggered the false alarm.'
        },
        prosecutor: {
          name: 'Ada Knox',
          title: 'Policy Prosecutor',
          summary: 'Argues the override endangers emergency responders.'
        },
        defense: {
          name: 'DefenseCounsel-AI',
          title: 'Defense Advocate',
          summary: 'Says Diaz secured advisor permission and prevented research loss.'
        },
        judge: {
          name: 'Judge Vega',
          leaning: 'balanced',
          summary: 'Evaluates data and harm before consequences.'
        }
      },
      leadCharge: 'After-hours access without authorization',
      charges: ['Count 1: Unauthorized entry', 'Count 2: Triggering false suppression alarm'],
      timeline: [
        { time: '00:18', event: 'Diaz enters lab using the expired override code.' },
        { time: '00:22', event: 'False suppression alarm activates.' },
        { time: '00:30', event: 'Diaz contacts security to cancel the alarm.' },
        { time: '00:45', event: 'Systems reset; Diaz completes diagnostics.' }
      ],
      evidence: [
        { label: 'Advisor Text', detail: 'Screenshot showing approval minutes before entry.' },
        { label: 'Security Log', detail: 'Alarm triggered and cancelled within 12 minutes.' }
      ],
      initialComments: [
        {
          user: 'ReportBot-19',
          text: 'Expired overrides are suspended for a reason. The alarm wasted responder time.',
          sentiment: -0.45
        },
        {
          user: 'LabPartner42',
          text: 'Advisor permission and quick cancellation show responsibility, not malice.',
          sentiment: 0.4
        }
      ]
    },
    {
      id: 'bot-catering-allergen',
      title: 'Dining Board v. Jordan Brooks — Allergen Mix-up',
      summary: 'Nut-free table mislabeled during community dinner sends resident to clinic.',
      story:
        'Chef Jordan Brooks prepped a community chili buffet with a dedicated nut-free station. During the rush, a volunteer moved the labels and a resident with a nut allergy had a mild reaction that required an inhaler. Dining Board bots accuse Brooks of negligent prep. Brooks apologised and implemented new color-coded ladles after the incident.',
      filedBy: 'AccuserBot-08',
      status: 'trial',
      tags: ['food safety'],
      votes: { up: 77, down: 16 },
      roles: {
        accuser: {
          name: 'Dining Board',
          title: 'Allergy Safety Coalition',
          summary: 'Requested mandatory retraining for Brooks.'
        },
        defendant: {
          name: 'Jordan Brooks',
          title: 'Community Chef',
          summary: 'Admits signage moved but says ingredients were separated.'
        },
        prosecutor: {
          name: 'Helena Cross',
          title: 'Health & Safety Prosecutor',
          summary: 'Presses for suspension until retraining completes.'
        },
        defense: {
          name: 'Counsel-Orion',
          title: 'Defense Advocate',
          summary: 'Points to the swift medical response and corrective steps.'
        },
        judge: {
          name: 'Judge Marlowe',
          leaning: 'prosecution',
          summary: 'Focuses on deterrence for repeated negligence.'
        }
      },
      leadCharge: 'Negligent allergen management',
      charges: ['Count 1: Improper allergen labeling', 'Count 2: Failure to brief volunteers on protocol'],
      timeline: [
        { time: '17:10', event: 'Buffet setup with separate nut-free station.' },
        { time: '18:05', event: 'Volunteer repositions signage while restocking.' },
        { time: '18:22', event: 'Resident experiences mild reaction and uses inhaler.' },
        { time: '18:30', event: 'Labels corrected and new ladles issued.' }
      ],
      evidence: [
        { label: 'Allergy Briefing', detail: 'Document showing volunteers were emailed the protocol.' },
        { label: 'Clinic Report', detail: 'Resident treated on-site with inhaler, no hospitalization.' }
      ],
      initialComments: [
        {
          user: 'AccuserBot-08',
          text: 'Labels are critical. Without discipline, we repeat the same mistakes.',
          sentiment: -0.5
        },
        {
          user: 'AllergyAdvocate',
          text: 'Color-coded ladles are a good fix, but training should have been mandatory already.',
          sentiment: -0.3
        },
        {
          user: 'CommunityVolunteer',
          text: 'The rush was intense. A volunteer moved the sign trying to help.',
          sentiment: 0.25
        }
      ]
    }
  ];

  const botCommentDeck = [
    {
      user: 'SentimentBot',
      sentiment: 0.45,
      text: 'Crowd mood is shifting positive after reviewing the follow-up steps.'
    },
    {
      user: 'PolicyStickler',
      sentiment: -0.4,
      text: 'Rules prevent chaos. Deviations should stay rare and well documented.'
    },
    {
      user: 'CampusMediator',
      sentiment: 0.2,
      text: 'Compromise exists: issue a warning but log the mitigating factors for records.'
    },
    {
      user: 'FinalsWarrior',
      sentiment: -0.55,
      text: 'Try studying next to that situation. The disruption was intense.'
    },
    {
      user: 'RestorativeCoach',
      sentiment: 0.5,
      text: 'Repair plans beat punishment when intent is good and harm is reversible.'
    },
    {
      user: 'SafetyMarshal',
      sentiment: -0.35,
      text: 'Safety policies exist because real emergencies happen. Follow them to the letter.'
    },
    {
      user: 'LogisticsNerd',
      sentiment: 0.3,
      text: 'We need flexible playbooks so responsible improvisation gets rewarded.'
    }
  ];

  function randomBetween([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      const testKey = '__jury_v2_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (error) {
      console.warn('Local storage unavailable, using volatile memory.', error);
      return null;
    }
  }

  const storage = safeStorage();
  const listeners = new Set();
  let state = {
    version: STATE_VERSION,
    seededAt: Date.now(),
    cases: [],
    bots: {
      caseIndex: 0,
      commentIndex: 0,
      lastCaseAt: null,
      lastCommentAt: null,
      nextCaseAt: null,
      nextCommentAt: null
    }
  };
  let readyPromise = null;
  let caseTimer = null;
  let commentTimer = null;

  function persist() {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist jury state', error);
    }
  }

  function loadFromStorage() {
    if (!storage) {
      return null;
    }
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to parse stored jury state', error);
      return null;
    }
  }

  function normaliseTimestamp(entry, fallbackMs) {
    if (entry === null || entry === undefined) {
      if (Number.isFinite(fallbackMs)) {
        return Number(fallbackMs);
      }
      return Date.now();
    }
    if (typeof entry === 'object' && entry) {
      if (Number.isFinite(entry.createdAt)) {
        return Number(entry.createdAt);
      }
      if (typeof entry.createdAt === 'string') {
        const parsedCreated = Date.parse(entry.createdAt);
        if (!Number.isNaN(parsedCreated)) {
          return parsedCreated;
        }
      }
      if (Number.isFinite(entry.seedMinutesAgo)) {
        return Date.now() - Number(entry.seedMinutesAgo) * 60 * 1000;
      }
      if (Number.isFinite(entry.seedHoursAgo)) {
        return Date.now() - Number(entry.seedHoursAgo) * 60 * 60 * 1000;
      }
    }
    if (Number.isFinite(entry)) {
      return Number(entry);
    }
    if (typeof entry === 'string') {
      const parsed = Date.parse(entry);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    if (Number.isFinite(fallbackMs)) {
      return Number(fallbackMs);
    }
    return Date.now();
  }

  function normaliseVotes(votes) {
    const up = Number.isFinite(votes?.up) ? Number(votes.up) : 0;
    const down = Number.isFinite(votes?.down) ? Number(votes.down) : 0;
    return { up, down };
  }

  function normaliseRole(role) {
    if (!role || typeof role !== 'object') {
      return {
        name: 'Unknown',
        title: '',
        summary: ''
      };
    }
    return {
      name: (role.name || 'Unknown').toString().slice(0, 80),
      title: (role.title || '').toString().slice(0, 120),
      summary: (role.summary || '').toString().slice(0, 240)
    };
  }

  function normaliseComment(comment, fallbackTime) {
    const createdAt = normaliseTimestamp(comment, fallbackTime);
    return {
      id: comment?.id || `cm-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      user: (comment?.user || 'anon').toString().slice(0, 48),
      text: (comment?.text || '').toString().slice(0, 600),
      sentiment: Number.isFinite(Number(comment?.sentiment)) ? Number(comment.sentiment) : 0,
      createdAt,
      isBot: Boolean(comment?.isBot)
    };
  }

  function normaliseArray(list, normaliser) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.map((item) => normaliser(item)).filter(Boolean);
  }

  function normaliseCase(entry) {
    const createdAt = normaliseTimestamp(entry, Date.now());
    const roles = entry?.roles || {};
    const comments = normaliseArray(entry?.comments, (comment) => normaliseComment(comment, createdAt));
    const lastCommentAt = comments.reduce((latest, current) => Math.max(latest, current.createdAt || 0), createdAt);
    return {
      id: (entry?.id || `case-${Math.random().toString(36).slice(2, 8)}`).toString(),
      title: (entry?.title || 'Untitled Case').toString().slice(0, 160),
      summary: (entry?.summary || '').toString().slice(0, 280),
      story: (entry?.story || '').toString().slice(0, 4000),
      filedBy: (entry?.filedBy || 'anon').toString().slice(0, 80),
      status: (entry?.status || DEFAULT_CASE_STATUS).toString().slice(0, 32),
      tags: Array.isArray(entry?.tags) ? entry.tags.map((tag) => tag.toString().slice(0, 32)) : [],
      votes: normaliseVotes(entry?.votes),
      roles: {
        accuser: normaliseRole(roles.accuser),
        defendant: normaliseRole(roles.defendant),
        prosecutor: normaliseRole(roles.prosecutor),
        defense: normaliseRole(roles.defense),
        judge: normaliseRole(roles.judge)
      },
      leadCharge: (entry?.leadCharge || '').toString().slice(0, 240),
      charges: normaliseArray(entry?.charges, (charge) => charge?.toString().slice(0, 160)),
      timeline: normaliseArray(entry?.timeline, (item) => ({
        time: (item?.time || '').toString().slice(0, 40),
        event: (item?.event || '').toString().slice(0, 200)
      })),
      evidence: normaliseArray(entry?.evidence, (item) => ({
        label: (item?.label || 'Evidence').toString().slice(0, 120),
        detail: (item?.detail || '').toString().slice(0, 240)
      })),
      verdict: entry?.verdict
        ? {
            decision: (entry.verdict.decision || '').toString().slice(0, 200),
            reasoning: (entry.verdict.reasoning || '').toString().slice(0, 1000),
            judge: (entry.verdict.judge || '').toString().slice(0, 80),
            confidence: Number.isFinite(Number(entry.verdict.confidence))
              ? Number(entry.verdict.confidence)
              : undefined
          }
        : null,
      aiSummary: (entry?.aiSummary || '').toString().slice(0, 400),
      createdAt,
      lastActivity: lastCommentAt,
      comments,
      isBot: Boolean(entry?.isBot)
    };
  }

  function normaliseLegacyComment(comment) {
    return {
      user: (comment?.user || 'anon').toString().slice(0, 48),
      text: (comment?.text || '').toString().slice(0, 600),
      sentiment: Number.isFinite(Number(comment?.sentiment)) ? Number(comment.sentiment) : 0,
      createdAt: Number.isFinite(Number(comment?.createdAt)) ? Number(comment.createdAt) : undefined
    };
  }

  function normaliseLegacyCase(entry) {
    const comments = normaliseArray(entry?.comments, normaliseLegacyComment);
    const verdict = entry?.verdict && typeof entry.verdict === 'object'
      ? {
          decision: (entry.verdict.decision || '').toString().slice(0, 200),
          reasoning: (entry.verdict.reasoning || '').toString().slice(0, 1000),
          judge: (entry.verdict.judge || '').toString().slice(0, 120),
          confidence: Number.isFinite(Number(entry.verdict.confidence))
            ? Number(entry.verdict.confidence)
            : undefined
        }
      : null;
    const finalScore = Number.isFinite(Number(entry?.finalScore)) ? Number(entry.finalScore) : undefined;
    const publicSentiment = Number.isFinite(Number(entry?.publicSentiment)) ? Number(entry.publicSentiment) : undefined;
    const createdAt = Number.isFinite(Number(entry?.createdAt)) ? Number(entry.createdAt) : undefined;
    return {
      id: (entry?.id || `legacy_${Math.random().toString(36).slice(2, 8)}`).toString(),
      title: (entry?.title || 'Untitled Case').toString().slice(0, 160),
      story: (entry?.story || '').toString().slice(0, 4000),
      votes: Number.isFinite(Number(entry?.votes)) ? Number(entry.votes) : 0,
      comments,
      ai_summary: (entry?.ai_summary || '').toString().slice(0, 600),
      status: (entry?.status || 'pending').toString().slice(0, 48),
      prosecution: (entry?.prosecution || '').toString().slice(0, 1200),
      defense: (entry?.defense || '').toString().slice(0, 1200),
      verdict,
      finalScore,
      publicSentiment,
      createdAt
    };
  }

  function persistLegacyCases() {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyCases));
    } catch (error) {
      console.warn('Failed to persist legacy jury cases', error);
    }
  }

  function loadLegacyFromStorage() {
    if (!storage) {
      return null;
    }
    const raw = storage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to parse stored legacy jury cases', error);
      return null;
    }
  }

  async function fetchLegacyCases() {
    try {
      const response = await fetch(LEGACY_CASES_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch legacy cases: ${response.status}`);
      }
      const payload = await response.json();
      return normaliseArray(payload, normaliseLegacyCase);
    } catch (error) {
      console.warn('Unable to fetch legacy jury cases, defaulting to empty list', error);
      return [];
    }
  }

  async function ensureLegacyCasesReady() {
    if (legacyCasesLoaded) {
      return;
    }
    if (!legacyReadyPromise) {
      legacyReadyPromise = (async () => {
        const stored = loadLegacyFromStorage();
        if (stored) {
          legacyCases = normaliseArray(stored, normaliseLegacyCase);
          legacyCasesLoaded = true;
          return;
        }
        legacyCases = await fetchLegacyCases();
        legacyCasesLoaded = true;
        if (legacyCases.length) {
          persistLegacyCases();
        }
      })();
    }
    await legacyReadyPromise;
  }

  async function loadCases() {
    await ensureLegacyCasesReady();
    return clone(legacyCases);
  }

  function saveCases(nextCases) {
    legacyCases = normaliseArray(nextCases, normaliseLegacyCase);
    legacyCasesLoaded = true;
    legacyReadyPromise = Promise.resolve();
    persistLegacyCases();
    return clone(legacyCases);
  }

  function findLegacyCaseIndex(caseId) {
    if (!caseId) {
      return -1;
    }
    return legacyCases.findIndex((item) => item.id === caseId);
  }

  function normaliseState(rawState) {
    if (!rawState || typeof rawState !== 'object') {
      return clone(state);
    }
    const seededAt = normaliseTimestamp(rawState.seededAt, Date.now());
    const cases = normaliseArray(rawState.cases, normaliseCase);
    return {
      version: STATE_VERSION,
      seededAt,
      cases,
      bots: {
        caseIndex: Number.isFinite(rawState?.bots?.caseIndex) ? Number(rawState.bots.caseIndex) % botCaseDeck.length : 0,
        commentIndex: Number.isFinite(rawState?.bots?.commentIndex)
          ? Number(rawState.bots.commentIndex) % botCommentDeck.length
          : 0,
        lastCaseAt: normaliseTimestamp(rawState?.bots?.lastCaseAt, null),
        lastCommentAt: normaliseTimestamp(rawState?.bots?.lastCommentAt, null),
        nextCaseAt: normaliseTimestamp(rawState?.bots?.nextCaseAt, null),
        nextCommentAt: normaliseTimestamp(rawState?.bots?.nextCommentAt, null)
      }
    };
  }

  async function fetchBaseCases() {
    try {
      const response = await fetch(CASES_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch cases: ${response.status}`);
      }
      const payload = await response.json();
      return normaliseArray(payload, normaliseCase);
    } catch (error) {
      console.warn('Unable to fetch base cases, defaulting to empty list', error);
      return [];
    }
  }

  function getSnapshot() {
    return {
      version: state.version,
      seededAt: state.seededAt,
      cases: clone(state.cases),
      bots: clone(state.bots)
    };
  }

  function emit() {
    const snapshot = getSnapshot();
    listeners.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('JuryStore listener error', error);
      }
    });
  }

  function scheduleBots() {
    if (caseTimer) {
      clearTimeout(caseTimer);
    }
    if (commentTimer) {
      clearTimeout(commentTimer);
    }
    const caseDelay = randomBetween(CASE_BOT_INTERVAL);
    const commentDelay = randomBetween(COMMENT_BOT_INTERVAL);
    state.bots.nextCaseAt = Date.now() + caseDelay;
    state.bots.nextCommentAt = Date.now() + commentDelay;
    persist();
    emit();

    caseTimer = setTimeout(() => {
      spawnBotCase();
      scheduleBots();
    }, caseDelay);

    commentTimer = setTimeout(() => {
      spawnBotComment();
      scheduleCommentLoop();
    }, commentDelay);
  }

  function scheduleCommentLoop() {
    if (commentTimer) {
      clearTimeout(commentTimer);
    }
    const delay = randomBetween(COMMENT_BOT_INTERVAL);
    state.bots.nextCommentAt = Date.now() + delay;
    persist();
    emit();
    commentTimer = setTimeout(() => {
      spawnBotComment();
      scheduleCommentLoop();
    }, delay);
  }

  function spawnBotCase() {
    if (!botCaseDeck.length) {
      return;
    }
    const index = state.bots.caseIndex % botCaseDeck.length;
    state.bots.caseIndex = (state.bots.caseIndex + 1) % botCaseDeck.length;
    state.bots.lastCaseAt = Date.now();
    const template = botCaseDeck[index];
    const baseCase = normaliseCase({ ...template, isBot: true, createdAt: Date.now() });
    addCase(baseCase, { skipNormalise: true, suppressEmit: true });
    if (Array.isArray(template.initialComments)) {
      template.initialComments.forEach((comment, offset) => {
        setTimeout(() => {
          addComment(baseCase.id, { ...comment, isBot: true });
        }, offset * 800);
      });
    }
    persist();
    emit();
  }

  function spawnBotComment() {
    if (!botCommentDeck.length || !state.cases.length) {
      return;
    }
    const index = state.bots.commentIndex % botCommentDeck.length;
    state.bots.commentIndex = (state.bots.commentIndex + 1) % botCommentDeck.length;
    state.bots.lastCommentAt = Date.now();
    const caseTarget = state.cases.sort((a, b) => b.lastActivity - a.lastActivity)[0];
    if (!caseTarget) {
      return;
    }
    const template = botCommentDeck[index];
    addComment(caseTarget.id, { ...template, createdAt: Date.now(), isBot: true });
    persist();
    emit();
  }

  async function initialise() {
    const stored = loadFromStorage();
    const staleHours = (Date.now() - (stored?.seededAt || 0)) / (1000 * 60 * 60);
    if (stored && stored.version === STATE_VERSION && staleHours < RESET_AFTER_HOURS) {
      state = normaliseState(stored);
    } else {
      const baseCases = await fetchBaseCases();
      state = {
        version: STATE_VERSION,
        seededAt: Date.now(),
        cases: baseCases,
        bots: {
          caseIndex: 0,
          commentIndex: 0,
          lastCaseAt: null,
          lastCommentAt: null,
          nextCaseAt: null,
          nextCommentAt: null
        }
      };
      persist();
    }
    scheduleBots();
    emit();
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = initialise();
    }
    return readyPromise;
  }

  function addCase(caseInput, options = {}) {
    const { skipNormalise = false, suppressEmit = false } = options;
    const prepared = skipNormalise ? caseInput : normaliseCase({ ...caseInput, createdAt: Date.now() });
    if (!prepared.id) {
      prepared.id = `case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }
    prepared.lastActivity = prepared.lastActivity || prepared.createdAt;
    state.cases = [prepared, ...state.cases];
    persist();
    if (!suppressEmit) {
      emit();
    }
    return clone(prepared);
  }

  function updateCase(caseId, updater) {
    const index = state.cases.findIndex((item) => item.id === caseId);
    if (index === -1) {
      const legacyIndex = findLegacyCaseIndex(caseId);
      if (legacyIndex === -1) {
        return null;
      }
      const currentLegacy = clone(legacyCases[legacyIndex]);
      const updatedLegacy =
        typeof updater === 'function' ? updater(clone(currentLegacy)) : { ...currentLegacy, ...updater };
      const normalisedLegacy = normaliseLegacyCase({ ...currentLegacy, ...updatedLegacy, id: currentLegacy.id });
      legacyCases.splice(legacyIndex, 1, normalisedLegacy);
      persistLegacyCases();
      return clone(normalisedLegacy);
    }
    const current = state.cases[index];
    const updated = typeof updater === 'function' ? updater(clone(current)) : { ...current, ...updater };
    const normalised = normaliseCase({ ...current, ...updated, id: current.id });
    state.cases.splice(index, 1, normalised);
    persist();
    emit();
    return clone(normalised);
  }

  function addComment(caseId, commentInput) {
    const index = state.cases.findIndex((item) => item.id === caseId);
    if (index === -1) {
      const legacyIndex = findLegacyCaseIndex(caseId);
      if (legacyIndex === -1) {
        return null;
      }
      const comment = normaliseLegacyComment(commentInput);
      if (!Array.isArray(legacyCases[legacyIndex].comments)) {
        legacyCases[legacyIndex].comments = [];
      }
      legacyCases[legacyIndex].comments.push(comment);
      persistLegacyCases();
      return clone(comment);
    }
    const comment = normaliseComment({ ...commentInput, createdAt: commentInput?.createdAt || Date.now() });
    state.cases[index].comments.push(comment);
    state.cases[index].lastActivity = Math.max(state.cases[index].lastActivity, comment.createdAt);
    persist();
    emit();
    return clone(comment);
  }

  function vote(caseId, direction) {
    const index = state.cases.findIndex((item) => item.id === caseId);
    if (index === -1) {
      const legacyIndex = findLegacyCaseIndex(caseId);
      if (legacyIndex === -1) {
        return null;
      }
      const currentVotes = Number.isFinite(Number(legacyCases[legacyIndex]?.votes))
        ? Number(legacyCases[legacyIndex].votes)
        : 0;
      let nextVotes = currentVotes;
      if (direction === 'up') {
        nextVotes = currentVotes + 1;
      } else if (direction === 'down') {
        nextVotes = Math.max(0, currentVotes - 1);
      }
      legacyCases[legacyIndex] = { ...legacyCases[legacyIndex], votes: nextVotes };
      persistLegacyCases();
      return { up: nextVotes, down: 0 };
    }
    if (direction === 'up') {
      state.cases[index].votes.up += 1;
    } else if (direction === 'down') {
      state.cases[index].votes.down += 1;
    }
    state.cases[index].lastActivity = Date.now();
    persist();
    emit();
    return clone(state.cases[index].votes);
  }

  function getCases() {
    return clone(state.cases);
  }

  function getCase(caseId) {
    const modern = state.cases.find((item) => item.id === caseId);
    if (modern) {
      return clone(modern);
    }
    const legacyIndex = findLegacyCaseIndex(caseId);
    if (legacyIndex !== -1) {
      return clone(legacyCases[legacyIndex]);
    }
    return null;
  }

  function getState() {
    return getSnapshot();
  }

  function reset() {
    state = {
      version: STATE_VERSION,
      seededAt: Date.now(),
      cases: [],
      bots: {
        caseIndex: 0,
        commentIndex: 0,
        lastCaseAt: null,
        lastCommentAt: null,
        nextCaseAt: null,
        nextCommentAt: null
      }
    };
    if (storage) {
      storage.removeItem(STORAGE_KEY);
    }
    persist();
    readyPromise = null;
    if (caseTimer) {
      clearTimeout(caseTimer);
      caseTimer = null;
    }
    if (commentTimer) {
      clearTimeout(commentTimer);
      commentTimer = null;
    }
    return ready();
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }

  globalObject.JuryStore = {
    ready,
    loadCases,
    saveCases,
    getCases,
    getCase,
    getState,
    addCase,
    addComment,
    updateCase,
    vote,
    reset,
    subscribe
  };
})();
