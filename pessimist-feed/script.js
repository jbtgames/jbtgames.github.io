const basePosts = [
  {
    id: 1,
    author: 'Existential Ella',
    handle: '@voidmood',
    time: '8 minutes ago',
    type: 'quote',
    content:
      '"Hope is merely the first step on the road to inevitable disappointment."',
    tag: 'Quote',
  },
  {
    id: 2,
    author: 'Bleak Oracle',
    handle: '@sighsage',
    time: '24 minutes ago',
    type: 'proverb',
    content:
      'Somber proverb from Eastern Europe: "The tallest tree collects the most lightning."',
    tag: 'Proverb',
  },
  {
    id: 3,
    author: 'Doomscroll Dana',
    handle: '@nightfeed',
    time: '49 minutes ago',
    type: 'image',
    content: '"Even sunsets fade into darkness sooner than we expect."',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    tag: 'Dusk Snapshot',
  },
  {
    id: 4,
    author: 'Rainy Rowan',
    handle: '@cloudcover',
    time: '1 hour ago',
    type: 'quote',
    content: '"Every silver lining is just a cloud with better marketing."',
    tag: 'Quote',
  },
  {
    id: 5,
    author: 'Melancholy Mina',
    handle: '@drearydays',
    time: '2 hours ago',
    type: 'proverb',
    content:
      'Old sailor saying: "Calm seas are only the pause before the next storm."',
    tag: 'Proverb',
  },
  {
    id: 6,
    author: 'Tenebrous Theo',
    handle: '@dimlight',
    time: '4 hours ago',
    type: 'image',
    content: 'Captioned: "Every horizon is just the earth admitting it has limits."',
    image:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
    tag: 'Bleak Vista',
  },
  {
    id: 7,
    author: 'Cicada Sayer',
    handle: '@whisperwinter',
    time: '6 hours ago',
    type: 'quote',
    content:
      '"Midnight is not the middle of the night; it is the edge where tomorrow already starts to fail."',
    tag: 'Quote',
  },
  {
    id: 8,
    author: 'Gutter Prophet',
    handle: '@oilrain',
    time: '7 hours ago',
    type: 'proverb',
    content:
      'Dismal alley proverb: "Even the rats leave when the lights stop returning."',
    tag: 'Proverb',
  },
  {
    id: 9,
    author: 'Abandoned Aria',
    handle: '@emptytheatre',
    time: '9 hours ago',
    type: 'image',
    content: 'Captioned: "Curtains fall even when no one is clapping."',
    image:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80',
    tag: 'Ruined Stage',
  },
  {
    id: 10,
    author: 'Ashen Atlas',
    handle: '@forsakencities',
    time: '11 hours ago',
    type: 'quote',
    content:
      '"Tomorrow is a rumor started by people afraid of endings."',
    tag: 'Dispatch',
  },
  {
    id: 11,
    author: 'Graveyard Grace',
    handle: '@marrowmurmur',
    time: 'Yesterday',
    type: 'proverb',
    content:
      'Gravestone whisper: "The ground always keeps the last word."',
    tag: 'Proverb',
  },
  {
    id: 12,
    author: 'Midnight Mire',
    handle: '@tarstarlight',
    time: '2 days ago',
    type: 'image',
    content:
      'Captioned: "The moon is only a bruise the sky refuses to heal."',
    image:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
    tag: 'Night Scar',
  },
];

const authorDescriptors = [
  'Sable',
  'Faded',
  'Tenebrous',
  'Sighing',
  'Lonely',
  'Midnight',
  'Hollow',
  'Dusky',
  'Weary',
  'Forsaken',
  'Nocturnal',
  'Bleary',
  'Somber',
  'Rusted',
  'Waning',
];

const authorRoles = [
  'Archivist',
  'Cartographer',
  'Messenger',
  'Nomad',
  'Witness',
  'Chronicler',
  'Herald',
  'Seer',
  'Envoy',
  'Narrator',
  'Scribe',
  'Minstrel',
  'Courier',
  'Observer',
  'Emissary',
];

const handleRoots = [
  'void',
  'ashen',
  'morrowless',
  'nightcode',
  'ember',
  'frostline',
  'dread',
  'dusk',
  'hush',
  'umbra',
  'sigh',
  'gloom',
  'wane',
  'rust',
  'bleak',
];

const handleSuffixes = [
  'scribe',
  'signal',
  'relay',
  'archive',
  'ledger',
  'echo',
  'index',
  'diary',
  'script',
  'memo',
  'relay',
  'scroll',
  'report',
  'feed',
  'log',
];

const quoteSubjects = [
  'Hope',
  'The dawn',
  'Tomorrow',
  'Second chances',
  'Promised rain',
  'Silent prayers',
  'Halfhearted smiles',
  'Unsent letters',
  'Forgotten dreams',
  'Lonely lanterns',
  'Empty trains',
  'Idle comets',
  'Sleepless rooftops',
  'Weathered vows',
  'Half remembered victories',
];

const quoteActions = [
  'is just the first footstep toward surrender',
  'arrives late and leaves early',
  'is a rumor spread by restless clocks',
  'tastes like promises grown stale',
  'wears the same mask as regret',
  'collects dust in the hall of maybe',
  'breaks apart before it even hits the ground',
  'borrows courage at ruinous interest',
  'flickers only to remind us of the dark',
  'drifts somewhere between memory and myth',
  'stretches thin across an unending dusk',
  'trips over the same shadow every night',
  'sits quiet beside the undone tasks',
  'rolls back like tide from a poisoned shore',
  'unravels in the draft of a closing door',
];

const proverbSources = [
  'Northern ferry decks',
  'abandoned observatories',
  'sunless valleys',
  'forgotten border towns',
  'midnight parliaments',
  'underground atriums',
  'derelict radio towers',
  'storm-tossed harbors',
  'deserted transit lines',
  'candlelit archives',
  'echoing cathedrals',
  'frostbitten markets',
  'overtired night schools',
  'half-lit plazas',
  'railway waiting rooms',
];

const proverbLessons = [
  'The horizon is just the lie we tell the dark',
  'Every promise collects rust overnight',
  'Silence always wins the loudest argument',
  'Even the moon owes debts it cannot repay',
  'Lanterns burn out before the path is found',
  'Echoes return carrying heavier news',
  'The quietest rooms house the sternest ghosts',
  'Time only stops to watch us stumble',
  'Cold winds memorize every farewell',
  'Distant thunder rehearses the verdict',
  'Footsteps fade faster than regrets',
  'Still water hides the deepest doubt',
  'Ashes remember more than the flame',
  'Long nights raise patient questions',
  'Shadows know the map of every retreat',
];

const imageMoods = [
  'Every skyline eventually bows to the fog',
  'Bridges wait for footsteps that never return',
  'Empty stairwells echo with unfinished plans',
  'Streetlights rehearse the language of goodbyes',
  'The ocean keeps all the cancelled itineraries',
  'Broken clocks still announce the end of things',
  'Cathedrals sigh when the congregation leaves',
  'Snowdrifts archive the letters we never sent',
  'The last ferry horn knows everyone by name',
  'Vacant diners hum a key of minor resignation',
  'Escalators climb toward a shuttered evening',
  'Alleys breathe the heat of forgotten engines',
  'Graveyards hum with half finished lullabies',
  'Warehouses guard the dust of failed parades',
  'Fire escapes point nowhere in particular',
];

const timeGenerators = [
  () => `${Math.ceil(randomInRange(3, 58))} minutes ago`,
  () => `${Math.ceil(randomInRange(1, 12))} hours ago`,
  () => `${Math.ceil(randomInRange(2, 5))} days ago`,
  () => `${Math.ceil(randomInRange(2, 9))} weeks ago`,
  () => `${Math.ceil(randomInRange(3, 11))} months ago`,
];

const imageSources = [
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  'https://images.unsplash.com/photo-1500534321413-85b859e71adf',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e',
  'https://images.unsplash.com/photo-1500530855697-343f3794ba05',
  'https://images.unsplash.com/photo-1491557345352-5929e343eb89',
];

const tagsByType = {
  quote: ['Quote', 'Dispatch', 'Night Quote', 'Signal'],
  proverb: ['Proverb', 'Old Warning', 'Folk Sigh', 'Weathered Saying'],
  image: ['Bleak Vista', 'Dusk Snapshot', 'Twilight Proof', 'Gloom Study'],
};

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const slugifyHandle = (descriptor, suffix) =>
  `@${descriptor}${suffix}`.replace(/\s+/g, '').toLowerCase();

const buildQuoteContent = () =>
  `"${pick(quoteSubjects)} ${pick(quoteActions)}."`;

const buildProverbContent = () =>
  `Bleak proverb from ${pick(proverbSources)}: "${pick(proverbLessons)}."`;

const buildImageContent = () => `Captioned: "${pick(imageMoods)}."`;

const buildGeneratedPosts = (count) => {
  const generated = [];
  const types = ['quote', 'proverb', 'image'];

  for (let i = 0; i < count; i += 1) {
    const type = types[i % types.length];
    const descriptor = pick(authorDescriptors);
    const role = pick(authorRoles);
    const author = `${descriptor} ${role}`;
    const handle = slugifyHandle(pick(handleRoots), pick(handleSuffixes));
    const time = pick(timeGenerators)();

    let content = '';
    let image = undefined;

    if (type === 'quote') {
      content = buildQuoteContent();
    } else if (type === 'proverb') {
      content = buildProverbContent();
    } else {
      content = buildImageContent();
      const imageSource = pick(imageSources);
      image = `${imageSource}?auto=format&fit=crop&w=900&q=80&sig=${i + 1}`;
    }

    generated.push({
      id: basePosts.length + i + 1,
      author,
      handle,
      time,
      type,
      content,
      image,
      tag: pick(tagsByType[type]),
    });
  }

  return generated;
};

const TARGET_POST_COUNT = basePosts.length * 100;
const generatedPosts = buildGeneratedPosts(
  Math.max(TARGET_POST_COUNT - basePosts.length, 0),
);
const posts = [...basePosts, ...generatedPosts];

const gradients = [
  'linear-gradient(140deg, rgba(182, 77, 88, 0.42), rgba(34, 39, 58, 0.3))',
  'linear-gradient(135deg, rgba(56, 61, 82, 0.55), rgba(18, 19, 28, 0.4))',
  'linear-gradient(130deg, rgba(99, 42, 50, 0.48), rgba(12, 13, 21, 0.45))',
];

const feed = document.getElementById('feed');
const template = document.getElementById('post-template');
const filterButtons = document.querySelectorAll('.filter-button');
const refreshButton = document.getElementById('refreshButton');
const gloomBar = document.querySelector('.gloom-bar');
const gloomBarFill = document.getElementById('gloomBarFill');
const gloomValue = document.getElementById('gloomValue');
const tickerText = document.getElementById('tickerText');
const autoRefreshToggle = document.getElementById('autoRefreshToggle');
const autoRefreshStatus = document.getElementById('autoRefreshStatus');
const lastRefresh = document.getElementById('lastRefresh');
const trendList = document.getElementById('trendList');
const newsletterForm = document.getElementById('newsletterForm');
const newsletterMessage = document.getElementById('newsletterMessage');

const gloomReadings = [
  {
    value: 91,
    message: 'Tonight the streetlights hum elegies for unpaid dreams.',
  },
  {
    value: 87,
    message: 'Citywide insomnia alert: hope has been declared a noise violation.',
  },
  {
    value: 94,
    message: 'A thousand unread apologies just flickered out in the queue.',
  },
  {
    value: 89,
    message: 'Forecast: relentless drizzle, suitable for mourning plans.',
  },
  {
    value: 96,
    message: 'Hospitals report a surge in unshakable déjà vu about endings.',
  },
  {
    value: 92,
    message: 'Public service reminder: even the sunrise showed up late and dim.',
  },
];

const trendSeeds = [
  'Recurring sunless dreams',
  'Fogbound resolutions',
  'Moonlit second thoughts',
  'Unsent apologies queue',
  'Static-drenched lullabies',
  'Fire escape confessions',
  'Citywide déjà vu',
  'Ghosted group chats',
  'Unread eulogies',
];

const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const randomInRange = (min, max) => Math.random() * (max - min) + min;

const formatMeta = (post) => `${post.handle} • ${post.time}`;

const metricsConfig = [
  {
    valueEl: document.getElementById('globalDreadValue'),
    deltaEl: document.getElementById('globalDreadDelta'),
    noteEl: document.getElementById('globalDreadNote'),
    valueRange: [88, 98],
    deltaRange: [-1.4, 3.8],
    notes: [
      'Emergency skylight closings up across the grid.',
      'Crowd-funded optimism funds officially depleted.',
      'City squares dimmed to preserve collective sighs.',
      'Experts confirm: silver linings remain on back order.',
    ],
    formatValue: (value) => `${Math.round(value)}%`,
    formatDelta: (delta) => `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs last dusk`,
  },
  {
    valueEl: document.getElementById('resignationSpreadValue'),
    deltaEl: document.getElementById('resignationSpreadDelta'),
    noteEl: document.getElementById('resignationSpreadNote'),
    valueRange: [32, 64],
    deltaRange: [2, 9],
    notes: [
      'Transit systems report sighs louder than engines.',
      'Office plants filed formal complaints about morale.',
      'Rainy rooftops now classified as collective shrug zones.',
      'Civic centers issue advisory: bring your own gloom.',
    ],
    formatValue: (value) => `${Math.round(value)} cities`,
    formatDelta: (delta) => `${delta >= 0 ? '+' : ''}${Math.round(delta)} overnight`,
  },
  {
    valueEl: document.getElementById('ruminationValue'),
    deltaEl: document.getElementById('ruminationDelta'),
    noteEl: document.getElementById('ruminationNote'),
    valueRange: [62, 88],
    deltaRange: [-4, 9],
    notes: [
      'Collective insomnia peaking before the third yawn.',
      'Nightly worry playlists trending at maximum volume.',
      'Dream analysts confirm: endings now rerun hourly.',
      'Glow-in-the-dark regret charts selling out worldwide.',
    ],
    formatValue: (value) => `${Math.round(value)} mins`,
    formatDelta: (delta) => `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} tonight`,
  },
];

const renderPost = (post) => {
  const node = template.content.cloneNode(true);
  const postEl = node.querySelector('.post');
  const avatar = node.querySelector('.avatar');
  const author = node.querySelector('.author');
  const meta = node.querySelector('.meta');
  const content = node.querySelector('.post-content');
  const imageWrapper = node.querySelector('.post-image');

  avatar.style.background = gradients[post.id % gradients.length];
  author.textContent = post.author;
  meta.textContent = formatMeta(post);

  const contentFragment = document.createElement('p');
  contentFragment.textContent = post.content;
  content.appendChild(contentFragment);

  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = post.tag || post.type;
  content.appendChild(tag);

  if (post.image) {
    const img = document.createElement('img');
    img.src = post.image;
    img.alt = `Pessimistic illustration shared by ${post.author}`;
    imageWrapper.appendChild(img);
    imageWrapper.style.display = 'block';
  }

  postEl.dataset.type = post.type;
  return node;
};

const renderFeed = (data) => {
  feed.innerHTML = '';
  if (!data.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML =
      '<p>Even the gloom is quiet right now. Try refreshing for fresh despair.</p>';
    feed.appendChild(emptyState);
    return;
  }

  data.forEach((post) => {
    feed.appendChild(renderPost(post));
  });
};

const setActiveFilter = (activeButton) => {
  filterButtons.forEach((button) => {
    button.classList.toggle('active', button === activeButton);
  });
};

const updateAtmosphere = () => {
  const reading = gloomReadings[Math.floor(Math.random() * gloomReadings.length)];
  if (gloomBar && gloomBarFill && gloomValue) {
    gloomBarFill.style.width = `${reading.value}%`;
    gloomBar.setAttribute('aria-valuenow', reading.value);
    gloomValue.textContent = `${reading.value}%`;
  }
  if (tickerText) {
    tickerText.textContent = reading.message;
  }
};

const updateMetrics = () => {
  metricsConfig.forEach((metric) => {
    if (!metric.valueEl || !metric.deltaEl || !metric.noteEl) return;
    const value = randomInRange(metric.valueRange[0], metric.valueRange[1]);
    const delta = randomInRange(metric.deltaRange[0], metric.deltaRange[1]);
    const note = metric.notes[Math.floor(Math.random() * metric.notes.length)];

    metric.valueEl.textContent = metric.formatValue(value);
    metric.deltaEl.textContent = metric.formatDelta(delta);
    metric.noteEl.textContent = note;
  });
};

const updateTrends = () => {
  if (!trendList) return;
  const fragment = document.createDocumentFragment();
  trendList.innerHTML = '';

  shuffle(trendSeeds)
    .slice(0, 4)
    .forEach((topic) => {
      const change = Math.round(randomInRange(-6, 9));
      const intensity = Math.round(randomInRange(72, 97));

      const item = document.createElement('li');
      item.className = 'trend-item';

      const topicEl = document.createElement('span');
      topicEl.className = 'trend-topic';
      topicEl.textContent = topic;

      const intensityEl = document.createElement('span');
      intensityEl.className = 'trend-intensity';
      intensityEl.textContent = `Intensity ${intensity}`;

      const changeEl = document.createElement('span');
      let changeClass = 'trend-flat';
      let icon = '■';
      if (change > 0) {
        changeClass = 'trend-up';
        icon = '▲';
      } else if (change < 0) {
        changeClass = 'trend-down';
        icon = '▼';
      }
      changeEl.className = `trend-change ${changeClass}`;
      changeEl.textContent = `${icon} ${change > 0 ? '+' : ''}${change}`;

      item.append(topicEl, intensityEl, changeEl);
      fragment.appendChild(item);
    });

  trendList.appendChild(fragment);
};

const updateLastRefresh = () => {
  if (!lastRefresh) return;
  const now = new Date();
  lastRefresh.textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  lastRefresh.dataset.timestamp = now.toISOString();
};

const setAutoRefreshStatus = (message) => {
  if (autoRefreshStatus) {
    autoRefreshStatus.textContent = message;
  }
};

const performRefresh = () => {
  renderFeed(shuffle(posts));
  updateAtmosphere();
  updateMetrics();
  updateTrends();
  updateLastRefresh();
};

const REFRESH_DELAY = 700;
const AUTO_REFRESH_INTERVAL = 30000;
let autoRefreshTimer = null;

const refreshFeed = ({ showLoading = true } = {}) => {
  if (!refreshButton) {
    performRefresh();
    return;
  }

  if (!showLoading) {
    performRefresh();
    return;
  }

  refreshButton.classList.add('is-loading');
  refreshButton.disabled = true;
  refreshButton.textContent = 'Refreshing gloom…';

  setTimeout(() => {
    performRefresh();
    refreshButton.classList.remove('is-loading');
    refreshButton.disabled = false;
    refreshButton.textContent = 'Refresh Gloom';
  }, REFRESH_DELAY);
};

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    setActiveFilter(button);
    if (filter === 'all') {
      renderFeed(shuffle(posts));
    } else {
      const filtered = shuffle(posts).filter((post) => post.type === filter);
      renderFeed(filtered);
    }
  });
});

if (refreshButton) {
  refreshButton.addEventListener('click', () => refreshFeed());
}

if (autoRefreshToggle) {
  const startAutoRefresh = () => {
    refreshFeed({ showLoading: false });
    setAutoRefreshStatus('Auto-refresh enabled. Fresh despair scheduled every 30 seconds.');
    autoRefreshTimer = setInterval(() => refreshFeed({ showLoading: false }), AUTO_REFRESH_INTERVAL);
  };

  const stopAutoRefresh = () => {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    setAutoRefreshStatus('Auto-refresh disabled. Manual dread in effect.');
  };

  autoRefreshToggle.addEventListener('change', () => {
    if (autoRefreshToggle.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
}

if (newsletterForm && newsletterMessage) {
  let messageTimeout;

  const showMessage = (text, type) => {
    newsletterMessage.textContent = text;
    newsletterMessage.classList.remove('is-success', 'is-error');
    if (type) {
      newsletterMessage.classList.add(type);
    }
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    messageTimeout = setTimeout(() => {
      newsletterMessage.textContent = '';
      newsletterMessage.classList.remove('is-success', 'is-error');
    }, 6000);
  };

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(newsletterForm);
    const email = (formData.get('email') || '').toString().trim();

    if (!email || !isValidEmail(email)) {
      showMessage('Please provide a valid address the void can haunt.', 'is-error');
      return;
    }

    showMessage('Confirmed. Expect curated gloom soon.', 'is-success');
    newsletterForm.reset();
  });
}

performRefresh();
setAutoRefreshStatus('Auto-refresh disabled. Manual dread in effect.');
