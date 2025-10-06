const STORAGE_KEY = 'socialsquare-posts-v1';
const BOOKMARK_KEY = 'socialsquare-bookmarks-v1';

const postTemplate = document.getElementById('postTemplate');
const feedEl = document.getElementById('feed');
const postForm = document.getElementById('postForm');
const postContent = document.getElementById('postContent');
const mediaUpload = document.getElementById('mediaUpload');
const tabs = document.querySelectorAll('.tab');
const menuButtons = document.querySelectorAll('.menu-item');
const panels = document.querySelectorAll('.panel');
const statPosts = document.getElementById('stat-posts');
const search = document.getElementById('search');

let activeTab = 'for-you';
let activeSection = 'feed';
const openComments = new Set();

const defaultPosts = [
  {
    id: crypto.randomUUID(),
    author: 'Jamie Doe',
    handle: '@jamiedoe',
    avatar: 'https://avatars.dicebear.com/api/initials/JD.svg',
    content: 'Exploring motion in UI design this week. Micro-interactions make such a difference! ✨',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    likes: 32,
    liked: false,
    bookmarked: false,
    following: true,
    comments: [
      {
        id: crypto.randomUUID(),
        author: 'Alex Rivers',
        handle: '@arivers',
        avatar: 'https://avatars.dicebear.com/api/initials/AR.svg',
        content: 'Totally! The little details create big delight.',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
      },
    ],
  },
  {
    id: crypto.randomUUID(),
    author: 'Taylor Green',
    handle: '@taylorgreen',
    avatar: 'https://avatars.dicebear.com/api/initials/TG.svg',
    content: 'Just wrapped our product beta! Huge thanks to everyone who tested and shared feedback. 🚀',
    timestamp: Date.now() - 1000 * 60 * 60 * 8,
    likes: 54,
    liked: false,
    bookmarked: true,
    following: false,
    comments: [],
  },
  {
    id: crypto.randomUUID(),
    author: 'Lena Nguyen',
    handle: '@lena.designs',
    avatar: 'https://avatars.dicebear.com/api/initials/LN.svg',
    content: 'Morning walk inspo: the city skyline, soft fog, and a warm cappuccino. ☕️🌆',
    media:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    likes: 97,
    liked: true,
    bookmarked: false,
    following: true,
    comments: [
      {
        id: crypto.randomUUID(),
        author: 'Jamie Doe',
        handle: '@jamiedoe',
        avatar: 'https://avatars.dicebear.com/api/initials/JD.svg',
        content: 'This photo is stunning. Captured the vibe perfectly!',
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
      },
    ],
  },
];

const loadState = () => {
  const storedPosts = localStorage.getItem(STORAGE_KEY);
  let posts = storedPosts ? JSON.parse(storedPosts) : defaultPosts;

  // Ensure shape matches defaults (handles migrations).
  posts = posts.map((post) => ({
    likes: 0,
    liked: false,
    bookmarked: false,
    following: false,
    comments: [],
    ...post,
  }));

  const storedBookmarks = localStorage.getItem(BOOKMARK_KEY);
  const bookmarkSet = new Set(storedBookmarks ? JSON.parse(storedBookmarks) : []);

  posts = posts.map((post) => ({
    ...post,
    bookmarked: bookmarkSet.has(post.id) || post.bookmarked,
  }));

  return posts.sort((a, b) => b.timestamp - a.timestamp);
};

let posts = loadState();

const MAX_POSTS = 60;
const BOT_MIN_DELAY = 35000;
const BOT_MAX_DELAY = 90000;
const BOT_INITIAL_MIN_DELAY = 6000;
const BOT_INITIAL_MAX_DELAY = 18000;

const randomBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  const bookmarkedIds = posts.filter((post) => post.bookmarked).map((post) => post.id);
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarkedIds));
};

const formatTime = (timestamp) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

const renderPosts = () => {
  feedEl.innerHTML = '';
  let filtered = posts;
  if (activeTab === 'following') {
    filtered = posts.filter((post) => post.following);
  } else if (activeTab === 'bookmarked') {
    filtered = posts.filter((post) => post.bookmarked);
  }

  if (filtered.length === 0) {
    feedEl.innerHTML = `<div class="empty">No posts here yet. Be the first to share something!</div>`;
    return;
  }

  filtered.forEach((post) => {
    const clone = postTemplate.content.firstElementChild.cloneNode(true);

    const avatar = clone.querySelector('.post-avatar');
    avatar.src = post.avatar;
    avatar.alt = `${post.author} avatar`;

    clone.querySelector('.user-name').textContent = post.author;
    clone.querySelector('.user-handle').textContent = post.handle;
    clone.querySelector('.timestamp').textContent = formatTime(post.timestamp);
    clone.dataset.id = post.id;

    clone.querySelector('.post-content').textContent = post.content;

    const mediaEl = clone.querySelector('.post-media');
    if (post.media) {
      mediaEl.src = post.media;
      mediaEl.classList.remove('hidden');
    } else {
      mediaEl.classList.add('hidden');
    }

    const likeButton = clone.querySelector('.like-button');
    likeButton.querySelector('span').textContent = post.likes;
    if (post.liked) {
      likeButton.classList.add('active');
    }

    const commentToggle = clone.querySelector('.comment-toggle');
    commentToggle.querySelector('span').textContent = post.comments.length;

    const bookmarkButton = clone.querySelector('.bookmark-button');
    if (post.bookmarked) {
      bookmarkButton.classList.add('active');
    }

    const commentsList = clone.querySelector('.comments-list');
    post.comments.forEach((comment) => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';
      commentEl.innerHTML = `
        <img class="comment-avatar" src="${comment.avatar}" alt="${comment.author} avatar" />
        <div>
          <p class="user-name">${comment.author} <span class="user-handle">${comment.handle}</span></p>
          <p>${comment.content}</p>
          <p class="timestamp">${formatTime(comment.timestamp)}</p>
        </div>
      `;
      commentsList.appendChild(commentEl);
    });

    const commentSection = clone.querySelector('.comments');
    if (openComments.has(post.id)) {
      commentSection.classList.remove('hidden');
    } else {
      commentSection.classList.add('hidden');
    }

    feedEl.appendChild(clone);
  });

  statPosts.textContent = posts.length;
};

const addPostToFeed = (post) => {
  posts = [post, ...posts];
  if (posts.length > MAX_POSTS) {
    posts = posts.slice(0, MAX_POSTS);
  }
  saveState();
  renderPosts();
};

const resetComposer = () => {
  postContent.value = '';
  mediaUpload.value = '';
};

const handleNewPost = async (event) => {
  event.preventDefault();
  const text = postContent.value.trim();
  if (!text) return;

  const file = mediaUpload.files[0];
  let mediaUrl = null;

  if (file) {
    mediaUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  const newPost = {
    id: crypto.randomUUID(),
    author: 'Alex Rivers',
    handle: '@arivers',
    avatar: 'https://avatars.dicebear.com/api/initials/AR.svg',
    content: text,
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    bookmarked: false,
    following: true,
    media: mediaUrl,
    comments: [],
  };

  addPostToFeed(newPost);
  resetComposer();
};

const findPost = (id) => posts.find((post) => post.id === id);

feedEl.addEventListener('click', (event) => {
  const article = event.target.closest('.post');
  if (!article) return;
  const postId = article.dataset.id;
  const post = findPost(postId);
  if (!post) return;

  if (event.target.closest('.like-button')) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    saveState();
    renderPosts();
  }

  if (event.target.closest('.bookmark-button')) {
    post.bookmarked = !post.bookmarked;
    saveState();
    renderPosts();
  }

  if (event.target.closest('.comment-toggle')) {
    if (openComments.has(post.id)) {
      openComments.delete(post.id);
    } else {
      openComments.add(post.id);
    }
    renderPosts();
  }
});

feedEl.addEventListener('submit', (event) => {
  if (!event.target.matches('.comment-form')) return;
  event.preventDefault();

  const article = event.target.closest('.post');
  const postId = article.dataset.id;
  const post = findPost(postId);
  if (!post) return;

  const input = event.target.querySelector('input[name="comment"]');
  const text = input.value.trim();
  if (!text) return;

  post.comments.push({
    id: crypto.randomUUID(),
    author: 'Alex Rivers',
    handle: '@arivers',
    avatar: 'https://avatars.dicebear.com/api/initials/AR.svg',
    content: text,
    timestamp: Date.now(),
  });

  saveState();
  renderPosts();
});

postForm.addEventListener('submit', handleNewPost);

mediaUpload.addEventListener('change', () => {
  const labelSpan = mediaUpload.closest('label').querySelector('span');
  if (!mediaUpload.files[0]) {
    labelSpan.textContent = '📷 Add photo';
    return;
  }
  const fileName = mediaUpload.files[0].name;
  labelSpan.textContent = `📷 ${fileName}`;
});

if (search) {
  search.addEventListener('input', (event) => {
    const term = event.target.value.toLowerCase();
    const articles = feedEl.querySelectorAll('.post');
    articles.forEach((article) => {
      const content = article.querySelector('.post-content').textContent.toLowerCase();
      const author = article.querySelector('.user-name').textContent.toLowerCase();
      const handle = article.querySelector('.user-handle').textContent.toLowerCase();
      const match = content.includes(term) || author.includes(term) || handle.includes(term);
      article.classList.toggle('hidden', term && !match);
    });
  });
}

menuButtons.forEach((button) => {
  button.addEventListener('click', () => {
    menuButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    activeSection = button.dataset.section;

    panels.forEach((panel) => {
      if (panel.id === activeSection) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    feedEl.classList.toggle('hidden', activeSection !== 'feed');
    if (activeSection === 'feed') {
      renderPosts();
    }
  });
});

const sharedVocabulary = {
  emoji: ['✨', '🚀', '🎨', '🌟', '🔥', '💡', '📸', '🤖', '🌿', '🎧'],
  mood: ['focus', 'momentum', 'curiosity', 'calm energy', 'flow state'],
  location: [
    'the downtown studio',
    'a rooftop workspace',
    'the light-filled loft',
    'the co-working lab',
    'the riverside park bench',
  ],
};

const botAccounts = [
  {
    id: 'nova-sparks',
    name: 'Nova Sparks',
    handle: '@nova.codes',
    avatar: 'https://avatars.dicebear.com/api/initials/NS.svg',
    vocabulary: {
      project: ['NebulaUI', 'LumenKit', 'Pulseboard', 'OrbitOps dashboard'],
      feature: ['real-time collaboration', 'adaptive theming', 'edge caching'],
      stack: ['TypeScript', 'Svelte', 'WebGL accents', 'serverless functions'],
      insight: [
        'keeping renders at 60fps',
        'aligning gradients with accessibility',
        'mapping journeys end-to-end',
      ],
    },
    prompts: [
      {
        template: 'Shipped a new {project} build focused on {feature}. {emoji}',
        likes: [38, 120],
      },
      {
        template: 'Prototyping {project} with a mix of {stack} — {insight}. {emoji}',
        likes: [24, 80],
      },
      {
        template: 'Sneak peek of tomorrow\'s {project} review from {location}. {emoji}',
        mediaPool: [
          'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1551292831-023188e78222?auto=format&fit=crop&w=1000&q=80',
        ],
        likes: [42, 130],
      },
    ],
  },
  {
    id: 'milo-hart',
    name: 'Milo Hart',
    handle: '@milohart',
    avatar: 'https://avatars.dicebear.com/api/initials/MH.svg',
    vocabulary: {
      project: ['Wanderlight series', 'City Pulse photo essay', 'Analog Echo zine'],
      feature: ['soft light', 'long exposures', 'monochrome edits'],
      journey: ['sunrise ride', 'evening stroll', 'late-night wander'],
    },
    prompts: [
      {
        template: '{journey} through {location} today — chasing {feature}. {emoji}',
        mediaPool: [
          'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1000&q=80',
        ],
        likes: [55, 160],
      },
      {
        template: 'Sequencing shots for {project}. Keeping notes on {feature}. {emoji}',
        likes: [31, 90],
      },
      {
        template: 'Printed a proof for {project} — the tones landed exactly where I hoped. {emoji}',
        likes: [26, 75],
      },
    ],
  },
  {
    id: 'chloe-winters',
    name: 'Chloe Winters',
    handle: '@chloewell',
    avatar: 'https://avatars.dicebear.com/api/initials/CW.svg',
    vocabulary: {
      project: ['Quiet Morning playlist', 'Breathwork loop', 'Skyline yoga flow'],
      feature: ['slow tempo layers', 'grounding cues', 'gentle resets'],
      ritual: ['sunrise session', 'lunch break reset', 'twilight cooldown'],
      ingredient: ['citrus + mint water', 'lavender steam', 'eucalyptus mist'],
    },
    prompts: [
      {
        template: '{ritual} complete with {ingredient}. Drafting notes for {project}. {emoji}',
        likes: [20, 70],
      },
      {
        template: 'Layered {feature} into the next {project}. {emoji}',
        likes: [18, 60],
      },
      {
        template: 'Captured the mood board for {project}. {emoji}',
        mediaPool: [
          'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1515871204537-9d3b18b8cdf4?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80',
        ],
        likes: [34, 95],
      },
    ],
  },
];

const buildContent = (template, replacements) =>
  template.replace(/\{(\w+)\}/g, (_, key) => {
    const replacement = replacements[key];
    if (!replacement) return '';
    if (Array.isArray(replacement)) {
      return randomChoice(replacement);
    }
    if (typeof replacement === 'function') {
      return replacement();
    }
    return replacement;
  });

const generateBotPost = (bot) => {
  const prompt = randomChoice(bot.prompts);
  const replacements = { ...sharedVocabulary, ...bot.vocabulary };
  let media = null;

  if (prompt.mediaPool && prompt.mediaPool.length > 0) {
    const shouldAttach = Math.random() > 0.25;
    if (shouldAttach) {
      media = randomChoice(prompt.mediaPool);
    }
  }

  const content = buildContent(prompt.template, replacements);
  const likeRange = prompt.likes || [18, 60];

  return {
    id: crypto.randomUUID(),
    author: bot.name,
    handle: bot.handle,
    avatar: bot.avatar,
    content,
    timestamp: Date.now(),
    likes: randomBetween(likeRange[0], likeRange[1]),
    liked: false,
    bookmarked: false,
    following: true,
    media,
    comments: [],
  };
};

const scheduleBotPost = (bot, minDelay, maxDelay) => {
  const delay = randomBetween(minDelay, maxDelay);
  setTimeout(() => {
    const newPost = generateBotPost(bot);
    addPostToFeed(newPost);
    scheduleBotPost(bot, BOT_MIN_DELAY, BOT_MAX_DELAY);
  }, delay);
};

const initializeBots = () => {
  botAccounts.forEach((bot) => {
    scheduleBotPost(bot, BOT_INITIAL_MIN_DELAY, BOT_INITIAL_MAX_DELAY);
  });
};

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((btn) => btn.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    renderPosts();
  });
});

renderPosts();
initializeBots();
