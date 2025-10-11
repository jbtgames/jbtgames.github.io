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
];

const gradients = [
  'linear-gradient(135deg, rgba(245, 115, 115, 0.4), rgba(62, 70, 90, 0.4))',
  'linear-gradient(135deg, rgba(71, 90, 107, 0.45), rgba(32, 25, 42, 0.45))',
  'linear-gradient(135deg, rgba(83, 63, 75, 0.45), rgba(15, 18, 25, 0.45))',
];

const feed = document.getElementById('feed');
const template = document.getElementById('post-template');
const filterButtons = document.querySelectorAll('.filter-button');
const refreshButton = document.getElementById('refreshButton');

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
    refreshButton.classList.remove('is-loading');
    refreshButton.disabled = false;
    refreshButton.textContent = 'Refresh Gloom';
  }, 700);
});

renderFeed(shuffle(posts));
