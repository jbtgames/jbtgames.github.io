const posts = [
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

const shuffle = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const formatMeta = (post) => `${post.handle} • ${post.time}`;

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

refreshButton.addEventListener('click', () => {
  refreshButton.classList.add('is-loading');
  refreshButton.disabled = true;
  refreshButton.textContent = 'Refreshing gloom…';

  setTimeout(() => {
    renderFeed(shuffle(posts));
    updateAtmosphere();
    refreshButton.classList.remove('is-loading');
    refreshButton.disabled = false;
    refreshButton.textContent = 'Refresh Gloom';
  }, 700);
});

renderFeed(shuffle(posts));
updateAtmosphere();
