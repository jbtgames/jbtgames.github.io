const STORAGE_KEY = 'socialsquare-posts-v1';
const BOOKMARK_KEY = 'socialsquare-bookmarks-v1';
const FRIENDS_KEY = 'socialsquare-friends-v1';
const PROFILE_KEY = 'socialsquare-profile-v1';
const AUTH_KEY = 'socialsquare-auth-v1';
const SESSION_AUTH_KEY = 'socialsquare-session-auth-v1';
const MAIN_USER_ID = 'alex-rivers';

const postTemplate = document.getElementById('postTemplate');
const feedEl = document.getElementById('feed');
const postForm = document.getElementById('postForm');
const postContent = document.getElementById('postContent');
const mediaUpload = document.getElementById('mediaUpload');
const tabs = document.querySelectorAll('.tab');
const menuButtons = Array.from(document.querySelectorAll('.menu-item'));
const mobileNavButtons = Array.from(document.querySelectorAll('.mobile-nav__item'));
const panels = document.querySelectorAll('.panel');
const statPosts = document.getElementById('stat-posts');
const search = document.getElementById('search');
const profileOverlay = document.getElementById('profileOverlay');
const profileModalContent = document.getElementById('profileModalContent');

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const loginForm = document.getElementById('loginForm');
const loginName = document.getElementById('loginName');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const rememberMe = document.getElementById('rememberMe');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const sidebar = document.getElementById('sidebar');
const rightbar = document.getElementById('rightbar');
const topbarName = document.getElementById('topbarName');
const topbarAvatar = document.getElementById('topbarAvatar');
const userMenuToggle = document.getElementById('userMenuToggle');
const userMenu = document.getElementById('userMenu');
const logoutButton = document.getElementById('logoutButton');
const sidebarName = document.getElementById('sidebarName');
const sidebarHandle = document.getElementById('sidebarHandle');
const sidebarAvatar = document.getElementById('sidebarAvatar');
const profileName = document.getElementById('profileName');
const profileHandle = document.getElementById('profileHandle');
const profileAvatar = document.getElementById('profileAvatar');
const profileBio = document.getElementById('profileBio');
const welcomeTitle = document.getElementById('welcomeTitle');

const allSectionButtons = [...menuButtons, ...mobileNavButtons];
const navToggleButtons = document.querySelectorAll('[data-toggle-drawer]');

let activeTab = 'for-you';
let activeSection = 'feed';
const openComments = new Set();

const profiles = {
  'alex-rivers': {
    id: 'alex-rivers',
    name: 'Alex Rivers',
    handle: '@arivers',
    avatar: 'https://avatars.dicebear.com/api/initials/AR.svg',
    location: 'Portland, OR',
    tags: ['Product Design', 'Playful UX', 'Urban photography'],
    bio: 'Product designer exploring playful experiences. Amateur photographer and tea enthusiast.',
    stats: { posts: 0, followers: '1,204', following: '536' },
    highlights: [
      'Sketching a whimsical onboarding for the NebulaUI playground.',
      'Curating photo essays from city walks on weekends.',
    ],
    focus: ['Motion principles', 'Creative prototyping', 'Community design jams'],
    mutuals: ['Jamie Doe', 'Taylor Green', 'Lena Nguyen'],
  },
  'jamie-doe': {
    id: 'jamie-doe',
    name: 'Jamie Doe',
    handle: '@jamiedoe',
    avatar: 'https://avatars.dicebear.com/api/initials/JD.svg',
    location: 'Seattle, WA',
    tags: ['Design Systems', 'Speaking'],
    bio: 'Design system lead sharing micro-interactions and inclusive tooling tips.',
    stats: { posts: '482', followers: '18.5k', following: '1,102' },
    highlights: [
      'Hosting a live stream on progressive disclosure this Friday.',
      'Building a new accessibility checklist template.',
    ],
    focus: ['Component governance', 'Community mentoring'],
    mutuals: ['Alex Rivers', 'Taylor Green'],
  },
  'taylor-green': {
    id: 'taylor-green',
    name: 'Taylor Green',
    handle: '@taylorgreen',
    avatar: 'https://avatars.dicebear.com/api/initials/TG.svg',
    location: 'Vancouver, BC',
    tags: ['Product Ops', 'Launches'],
    bio: 'Product manager translating discovery into launches. Coffee connoisseur.',
    stats: { posts: '356', followers: '9,876', following: '803' },
    highlights: [
      'Shipping the beta for HorizonCollab.',
      'Planning community office hours this weekend.',
    ],
    focus: ['Roadmapping', 'Feedback synthesis'],
    mutuals: ['Alex Rivers', 'Jamie Doe'],
  },
  'lena-nguyen': {
    id: 'lena-nguyen',
    name: 'Lena Nguyen',
    handle: '@lena.designs',
    avatar: 'https://avatars.dicebear.com/api/initials/LN.svg',
    location: 'Austin, TX',
    tags: ['Visual storytelling', 'Photography'],
    bio: 'Designing cinematic brand identities and chasing golden hour light.',
    stats: { posts: '624', followers: '24.2k', following: '1,502' },
    highlights: [
      'Launching the Aurora brand kit soon.',
      'Printing a zine of skyline sketches.',
    ],
    focus: ['Color grading', 'Brand systems'],
    mutuals: ['Alex Rivers', 'Milo Hart'],
  },
  'marcus-clark': {
    id: 'marcus-clark',
    name: 'Marcus Clark',
    handle: '@marcus.codes',
    avatar: 'https://avatars.dicebear.com/api/initials/MC.svg',
    location: 'Denver, CO',
    tags: ['Web performance', 'DX'],
    bio: 'Full-stack engineer crafting snappy experiences and docs developers love.',
    stats: { posts: '273', followers: '6,482', following: '421' },
    highlights: ['Documenting a DX audit checklist.', 'Sharing render performance profiles.'],
    focus: ['Edge rendering', 'Tooling'],
    mutuals: ['Nova Sparks', 'Alex Rivers'],
  },
  'sara-malik': {
    id: 'sara-malik',
    name: 'Sara Malik',
    handle: '@saramalik',
    avatar: 'https://avatars.dicebear.com/api/initials/SM.svg',
    location: 'Chicago, IL',
    tags: ['Community', 'Growth'],
    bio: 'Community strategist building playful onboarding and retention rituals.',
    stats: { posts: '198', followers: '12.1k', following: '982' },
    highlights: ['Leading a community storytelling challenge.', 'Hosting a growth roundtable next week.'],
    focus: ['Lifecycle journeys', 'Activation'],
    mutuals: ['Alex Rivers', 'Chloe Winters'],
  },
  'nova-sparks': {
    id: 'nova-sparks',
    name: 'Nova Sparks',
    handle: '@nova.codes',
    avatar: 'https://avatars.dicebear.com/api/initials/NS.svg',
    location: 'Remote · OrbitOps',
    tags: ['Creative code', 'Realtime'],
    bio: 'Creative technologist prototyping luminous dashboards and realtime toys.',
    stats: { posts: '842', followers: '31.4k', following: '1,906' },
    highlights: ['Pairing on WebGL accents for NebulaUI.', 'Documented a new adaptive theming recipe.'],
    focus: ['Realtime collaboration', 'Design systems'],
    mutuals: ['Alex Rivers', 'Marcus Clark'],
  },
  'milo-hart': {
    id: 'milo-hart',
    name: 'Milo Hart',
    handle: '@milohart',
    avatar: 'https://avatars.dicebear.com/api/initials/MH.svg',
    location: 'Brooklyn, NY',
    tags: ['Street photography', 'Analog'],
    bio: 'Photographer documenting city pulse and blending analog textures into digital stories.',
    stats: { posts: '1,128', followers: '45.8k', following: '2,104' },
    highlights: ['Sequencing the Wanderlight series gallery.', 'Hosting a night photography walk.'],
    focus: ['Long exposure', 'Editorial sequencing'],
    mutuals: ['Alex Rivers', 'Lena Nguyen'],
  },
  'chloe-winters': {
    id: 'chloe-winters',
    name: 'Chloe Winters',
    handle: '@chloewell',
    avatar: 'https://avatars.dicebear.com/api/initials/CW.svg',
    location: 'San Diego, CA',
    tags: ['Wellness', 'Sound design'],
    bio: 'Sound designer layering calming rituals and mindful playlists for everyday resets.',
    stats: { posts: '564', followers: '22.6k', following: '1,305' },
    highlights: ['Mixing a new Quiet Morning playlist.', 'Piloting skyline yoga sessions.'],
    focus: ['Breathwork scoring', 'Sonic storytelling'],
    mutuals: ['Alex Rivers', 'Sara Malik'],
  },
};

const profileHandleLookup = Object.fromEntries(
  Object.values(profiles).map((profile) => [profile.handle, profile.id])
);

const defaultFriendIds = ['jamie-doe'];

const baseMainProfile = JSON.parse(JSON.stringify(profiles[MAIN_USER_ID]));

const getMainProfile = () => profiles[MAIN_USER_ID] || baseMainProfile;

const getMainFirstName = () => {
  const name = getMainProfile().name || 'Alex Rivers';
  const [first] = name.split(' ');
  return first || name;
};

const applyStoredProfile = () => {
  const stored = localStorage.getItem(PROFILE_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    profiles[MAIN_USER_ID] = {
      ...profiles[MAIN_USER_ID],
      ...parsed,
    };
  } catch (error) {
    console.error('Failed to parse stored profile', error);
    localStorage.removeItem(PROFILE_KEY);
  }
};

applyStoredProfile();

const updateMainUserUI = () => {
  const profile = getMainProfile();
  if (topbarName) {
    topbarName.textContent = getMainFirstName();
  }
  if (topbarAvatar) {
    topbarAvatar.src = profile.avatar;
    topbarAvatar.alt = `${profile.name} avatar`;
  }
  if (sidebarName) {
    sidebarName.textContent = profile.name;
  }
  if (sidebarHandle) {
    sidebarHandle.textContent = profile.handle;
  }
  if (sidebarAvatar) {
    sidebarAvatar.src = profile.avatar;
    sidebarAvatar.alt = `${profile.name} avatar`;
  }
  if (profileName) {
    profileName.textContent = profile.name;
  }
  if (profileHandle) {
    profileHandle.textContent = profile.handle;
  }
  if (profileAvatar) {
    profileAvatar.src = profile.avatar;
    profileAvatar.alt = `${profile.name} avatar`;
  }
  if (profileBio && profile.bio) {
    profileBio.textContent = profile.bio;
  }
  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome back, ${getMainFirstName()}`;
  }
  if (postContent) {
    postContent.placeholder = `What's on your mind, ${getMainFirstName()}?`;
  }
};

updateMainUserUI();

const persistMainProfile = () => {
  try {
    const profile = getMainProfile();
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        name: profile.name,
        handle: profile.handle,
        avatar: profile.avatar,
        bio: profile.bio,
      })
    );
  } catch (error) {
    console.error('Failed to persist profile', error);
  }
};

const closeUserMenu = () => {
  if (!userMenu) return;
  if (!userMenu.classList.contains('hidden')) {
    userMenu.classList.add('hidden');
    userMenuToggle?.setAttribute('aria-expanded', 'false');
  }
};

const openUserMenu = () => {
  if (!userMenu) return;
  userMenu.classList.remove('hidden');
  userMenuToggle?.setAttribute('aria-expanded', 'true');
};

const closeDrawers = () => {
  sidebar?.classList.remove('is-open');
  rightbar?.classList.remove('is-open');
  drawerBackdrop?.classList.add('hidden');
  document.body.classList.remove('drawer-open');
};

const openDrawer = (drawer) => {
  if (!drawer) return;
  if (drawer === sidebar) {
    rightbar?.classList.remove('is-open');
  } else if (drawer === rightbar) {
    sidebar?.classList.remove('is-open');
  }
  drawer.classList.add('is-open');
  drawerBackdrop?.classList.remove('hidden');
  document.body.classList.add('drawer-open');
  closeUserMenu();
};

const loadFriends = () => {
  try {
    const stored = localStorage.getItem(FRIENDS_KEY);
    if (!stored) return new Set(defaultFriendIds);
    const parsed = JSON.parse(stored);
    return new Set(parsed);
  } catch (error) {
    console.error('Failed to parse stored friends', error);
    return new Set(defaultFriendIds);
  }
};

let friends = loadFriends();

const saveFriends = () => {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify([...friends]));
};

const isFriend = (profileId) => friends.has(profileId);

const updateFriendButtons = (profileId) => {
  document
    .querySelectorAll(`[data-action="friend"][data-profile-id="${profileId}"]`)
    .forEach((button) => {
      if (profileId === MAIN_USER_ID) {
        button.classList.add('hidden');
        return;
      }

      button.classList.remove('hidden');
      const friend = isFriend(profileId);
      button.textContent = friend ? 'Friends' : 'Add friend';
      button.classList.toggle('is-friend', friend);
      button.setAttribute('aria-pressed', friend ? 'true' : 'false');
    });
};

const updateAllFriendButtons = () => {
  Object.keys(profiles).forEach(updateFriendButtons);
};

const mainProfileSnapshot = getMainProfile();

const defaultPosts = [
  {
    id: crypto.randomUUID(),
    author: 'Jamie Doe',
    handle: '@jamiedoe',
    avatar: 'https://avatars.dicebear.com/api/initials/JD.svg',
    content:
      'Exploring motion in UI design this week. Micro-interactions make such a difference! ✨',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    likes: 32,
    liked: false,
    bookmarked: false,
    following: true,
    profileId: 'jamie-doe',
    comments: [
      {
        id: crypto.randomUUID(),
        author: mainProfileSnapshot.name,
        handle: mainProfileSnapshot.handle,
        avatar: mainProfileSnapshot.avatar,
        content: 'Totally! The little details create big delight.',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        profileId: MAIN_USER_ID,
      },
    ],
  },
  {
    id: crypto.randomUUID(),
    author: 'Taylor Green',
    handle: '@taylorgreen',
    avatar: 'https://avatars.dicebear.com/api/initials/TG.svg',
    content:
      'Just wrapped our product beta! Huge thanks to everyone who tested and shared feedback. 🚀',
    timestamp: Date.now() - 1000 * 60 * 60 * 8,
    likes: 54,
    liked: false,
    bookmarked: true,
    following: false,
    profileId: 'taylor-green',
    comments: [],
  },
  {
    id: crypto.randomUUID(),
    author: 'Lena Nguyen',
    handle: '@lena.designs',
    avatar: 'https://avatars.dicebear.com/api/initials/LN.svg',
    content:
      'Morning walk inspo: the city skyline, soft fog, and a warm cappuccino. ☕️🌆',
    media:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    likes: 97,
    liked: true,
    bookmarked: false,
    following: true,
    profileId: 'lena-nguyen',
    comments: [
      {
        id: crypto.randomUUID(),
        author: 'Jamie Doe',
        handle: '@jamiedoe',
        avatar: 'https://avatars.dicebear.com/api/initials/JD.svg',
        content: 'This photo is stunning. Captured the vibe perfectly!',
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
        profileId: 'jamie-doe',
      },
    ],
  },
];

const loadState = () => {
  const storedPosts = localStorage.getItem(STORAGE_KEY);
  let posts = storedPosts ? JSON.parse(storedPosts) : defaultPosts;

  posts = posts.map((post) => ({
    likes: 0,
    liked: false,
    bookmarked: false,
    following: false,
    comments: [],
    profileId: profileHandleLookup[post.handle] || post.profileId || null,
    botReactions: {},
    ...post,
  }));

  const storedBookmarks = localStorage.getItem(BOOKMARK_KEY);
  const bookmarkSet = new Set(storedBookmarks ? JSON.parse(storedBookmarks) : []);

  posts = posts.map((post) => ({
    ...post,
    bookmarked: bookmarkSet.has(post.id) || post.bookmarked,
    comments: (post.comments || []).map((comment) => ({
      profileId: profileHandleLookup[comment.handle] || comment.profileId || null,
      ...comment,
    })),
    botReactions: post.botReactions || {},
  }));

  return posts.sort((a, b) => b.timestamp - a.timestamp);
};

let posts = loadState();

const MAX_POSTS = 60;
const BOT_MIN_DELAY = 35000;
const BOT_MAX_DELAY = 90000;
const BOT_INITIAL_MIN_DELAY = 6000;
const BOT_INITIAL_MAX_DELAY = 18000;
const BOT_REACTION_MIN_DELAY = 6000;
const BOT_REACTION_MAX_DELAY = 16000;

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

const refreshOpenProfile = () => {
  if (!profileOverlay || profileOverlay.classList.contains('hidden')) {
    return;
  }
  const { profileId } = profileOverlay.dataset;
  if (!profileId) return;
  renderProfileModal(profileId);
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
    const myPosts = posts.filter((post) => post.profileId === MAIN_USER_ID).length;
    statPosts.textContent = myPosts;
    if (profiles[MAIN_USER_ID]) {
      profiles[MAIN_USER_ID].stats.posts = myPosts;
    }
    refreshOpenProfile();
    return;
  }

  filtered.forEach((post) => {
    const clone = postTemplate.content.firstElementChild.cloneNode(true);

    const avatar = clone.querySelector('.post-avatar');
    avatar.src = post.avatar;
    avatar.alt = `${post.author} avatar`;
    if (post.profileId) {
      avatar.dataset.profileId = post.profileId;
    }

    clone.querySelector('.user-name').textContent = post.author;
    clone.querySelector('.user-handle').textContent = post.handle;
    clone.querySelector('.timestamp').textContent = formatTime(post.timestamp);
    clone.dataset.id = post.id;
    if (post.profileId) {
      clone.dataset.profileId = post.profileId;
      clone.querySelector('.post-user').dataset.profileId = post.profileId;
    }

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
      const profileAttr = comment.profileId ? `data-profile-id="${comment.profileId}"` : '';
      commentEl.innerHTML = `
        <img class="comment-avatar" src="${comment.avatar}" alt="${comment.author} avatar" ${profileAttr} />
        <div>
          <p class="user-name" ${profileAttr}>${comment.author} <span class="user-handle">${comment.handle}</span></p>
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

  const myPosts = posts.filter((post) => post.profileId === MAIN_USER_ID).length;
  statPosts.textContent = myPosts;
  if (profiles[MAIN_USER_ID]) {
    profiles[MAIN_USER_ID].stats.posts = myPosts;
  }

  refreshOpenProfile();
};

const setActiveSection = (section) => {
  if (!section) return;
  activeSection = section;

  panels.forEach((panel) => {
    if (panel.id === section) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  const showFeed = section === 'feed';
  feedEl.classList.toggle('hidden', !showFeed);
  if (showFeed) {
    renderPosts();
  }

  allSectionButtons.forEach((button) => {
    if (button.dataset.section === section) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });

  closeDrawers();
  closeUserMenu();
};

const addPostToFeed = (post) => {
  posts = [post, ...posts];
  if (posts.length > MAX_POSTS) {
    posts = posts.slice(0, MAX_POSTS);
  }
  saveState();
  renderPosts();
  if (post.profileId === MAIN_USER_ID) {
    scheduleBotReactionsForPost(post);
  }
};

const resetComposer = () => {
  postContent.value = '';
  postContent.placeholder = `What's on your mind, ${getMainFirstName()}?`;
  mediaUpload.value = '';
  const labelSpan = mediaUpload.closest('label').querySelector('span');
  labelSpan.textContent = '📷 Add photo';
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

  const profile = getMainProfile();

  const newPost = {
    id: crypto.randomUUID(),
    author: profile.name,
    handle: profile.handle,
    avatar: profile.avatar,
    content: text,
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    bookmarked: false,
    following: true,
    media: mediaUrl,
    comments: [],
    profileId: MAIN_USER_ID,
    botReactions: {},
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

  const profile = getMainProfile();

  post.comments.push({
    id: crypto.randomUUID(),
    author: profile.name,
    handle: profile.handle,
    avatar: profile.avatar,
    content: text,
    timestamp: Date.now(),
    profileId: MAIN_USER_ID,
  });

  input.value = '';
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

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = loginEmail?.value.trim();
    const password = loginPassword?.value.trim();
    if (!email || !password) {
      return;
    }

    const nameValue = loginName?.value.trim();
    const displayName = nameValue || getMainProfile().name || baseMainProfile.name;
    const handleSeed = email.split('@')[0] || displayName.replace(/\s+/g, '');
    const sanitizedHandle = handleSeed.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const handle = `@${sanitizedHandle || 'arivers'}`;
    const avatarSeed = encodeURIComponent(displayName || handle.replace('@', '') || 'SocialSquare');
    const avatarUrl = `https://avatars.dicebear.com/api/initials/${avatarSeed}.svg`;

    profiles[MAIN_USER_ID] = {
      ...profiles[MAIN_USER_ID],
      name: displayName,
      handle,
      avatar: avatarUrl,
    };

    profileHandleLookup[handle] = MAIN_USER_ID;

    persistMainProfile();

    if (rememberMe?.checked) {
      localStorage.setItem(AUTH_KEY, 'true');
      sessionStorage.removeItem(SESSION_AUTH_KEY);
    } else {
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      localStorage.removeItem(AUTH_KEY);
    }

    updateMainUserUI();
    activeSection = 'feed';
    setAppVisibility(true);
    resetComposer();
    loginForm.reset();
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    localStorage.removeItem(PROFILE_KEY);
    profiles[MAIN_USER_ID] = JSON.parse(JSON.stringify(baseMainProfile));
    profileHandleLookup[profiles[MAIN_USER_ID].handle] = MAIN_USER_ID;
    updateMainUserUI();
    activeSection = 'feed';
    closeUserMenu();
    closeDrawers();
    setAppVisibility(false);
    loginForm?.reset();
  });
}

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

allSectionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const { section } = button.dataset;
    if (section) {
      setActiveSection(section);
    }
  });
});

navToggleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.toggleDrawer;
    const drawer = target === 'sidebar' ? sidebar : target === 'rightbar' ? rightbar : null;
    if (!drawer) return;
    if (drawer.classList.contains('is-open')) {
      closeDrawers();
    } else {
      openDrawer(drawer);
    }
  });
});

drawerBackdrop?.addEventListener('click', () => {
  closeDrawers();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 1024) {
    closeDrawers();
  }
});

if (userMenuToggle) {
  userMenuToggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (userMenu?.classList.contains('hidden')) {
      openUserMenu();
    } else {
      closeUserMenu();
    }
  });
}

const setAppVisibility = (visible) => {
  if (!authScreen || !appShell) return;
  if (visible) {
    closeDrawers();
    authScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    document.body.classList.remove('auth-visible');
    updateMainUserUI();
    setActiveSection(activeSection);
  } else {
    authScreen.classList.remove('hidden');
    appShell.classList.add('hidden');
    document.body.classList.add('auth-visible');
    closeDrawers();
    closeUserMenu();
  }
};

const isAuthenticated = () =>
  localStorage.getItem(AUTH_KEY) === 'true' || sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';

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
        template: "Sneak peek of tomorrow's {project} review from {location}. {emoji}",
        mediaPool: [
          'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1551292831-023188e78222?auto=format&fit=crop&w=1000&q=80',
        ],
        likes: [42, 130],
      },
    ],
    commentTemplates: [
      'Big fan of this energy, {name}! {emoji}',
      'Love how you framed this — totally in sync with {project}. {emoji}',
      'Bookmarking this for the {mood} playlist later. {emoji}',
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
    commentTemplates: [
      'This gives me serious inspiration for the next {project} set. {emoji}',
      'Vibes locked in — thanks for sparking tonight’s {journey}. {emoji}',
      'Saving this vision board energy, {name}! {emoji}',
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
    commentTemplates: [
      'Breathing in this perspective — perfect for a {ritual} reset. {emoji}',
      'Count me in for the next share like this, {name}. {emoji}',
      'This is the calm spark I needed between sessions. {emoji}',
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
    profileId: bot.id,
    botReactions: {},
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

const generateBotComment = (bot) => {
  if (!bot.commentTemplates || bot.commentTemplates.length === 0) return null;
  const replacements = {
    ...sharedVocabulary,
    ...bot.vocabulary,
    name: 'Alex',
  };
  const template = randomChoice(bot.commentTemplates);
  const content = buildContent(template, replacements);

  return {
    id: crypto.randomUUID(),
    author: bot.name,
    handle: bot.handle,
    avatar: bot.avatar,
    content,
    timestamp: Date.now(),
    profileId: bot.id,
  };
};

const scheduleBotReactionsForPost = (post) => {
  botAccounts.forEach((bot) => {
    const delay = randomBetween(BOT_REACTION_MIN_DELAY, BOT_REACTION_MAX_DELAY);
    setTimeout(() => {
      const targetPost = findPost(post.id);
      if (!targetPost || targetPost.profileId !== MAIN_USER_ID) {
        return;
      }

      if (!targetPost.botReactions) {
        targetPost.botReactions = {};
      }

      if (targetPost.botReactions[bot.id]) {
        return;
      }

      targetPost.likes += randomBetween(1, 3);
      const comment = generateBotComment(bot);
      if (comment) {
        targetPost.comments.push(comment);
      }

      targetPost.botReactions[bot.id] = true;
      saveState();
      renderPosts();
    }, delay);
  });
};

const renderProfileModal = (profileId) => {
  const profile = profiles[profileId];
  if (!profile || !profileModalContent) return;

  const friend = isFriend(profileId);
  const tags = (profile.tags || [])
    .map((tag) => `<span class="profile-modal__tag">${tag}</span>`)
    .join('');
  const stats = profile.stats
    ? Object.entries(profile.stats)
        .map(
          ([label, value]) => `
            <div class="profile-modal__stat">
              <span class="profile-modal__stat-value">${value}</span>
              <span class="stat-label">${label.charAt(0).toUpperCase() + label.slice(1)}</span>
            </div>
          `
        )
        .join('')
    : '';
  const highlights = profile.highlights && profile.highlights.length
    ? `
        <section class="profile-modal__section">
          <h3>Highlights</h3>
          <ul class="profile-modal__list">
            ${profile.highlights.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </section>
      `
    : '';
  const focus = profile.focus && profile.focus.length
    ? `
        <section class="profile-modal__section">
          <h3>Focus areas</h3>
          <ul class="profile-modal__list">
            ${profile.focus.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </section>
      `
    : '';
  const mutuals = profile.mutuals && profile.mutuals.length
    ? `
        <section class="profile-modal__section">
          <h3>Mutual friends</h3>
          <ul class="profile-modal__list">
            ${profile.mutuals.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </section>
      `
    : '';

  const friendAction =
    profileId === MAIN_USER_ID
      ? '<span class="friend-badge">This is you</span>'
      : `<button class="secondary ${friend ? 'is-friend' : ''}" data-action="friend" data-profile-id="${profileId}" aria-pressed="${friend}">${friend ? 'Friends' : 'Add friend'}</button>`;

  profileModalContent.innerHTML = `
    <div class="profile-modal__header">
      <img src="${profile.avatar}" alt="${profile.name} avatar" />
      <div class="profile-modal__meta">
        <h2 id="profileModalTitle">${profile.name}</h2>
        <p class="user-handle">${profile.handle}</p>
        ${profile.location ? `<p class="timestamp">${profile.location}</p>` : ''}
        ${tags ? `<div class="profile-modal__tags">${tags}</div>` : ''}
      </div>
    </div>
    ${profile.bio ? `<p class="profile-modal__bio">${profile.bio}</p>` : ''}
    <div class="profile-modal__actions">
      ${friendAction}
    </div>
    ${stats ? `<div class="profile-modal__stats">${stats}</div>` : ''}
    ${highlights}
    ${focus}
    ${mutuals}
  `;

  updateFriendButtons(profileId);

  const friendButton = profileModalContent.querySelector('[data-action="friend"]');
  if (friendButton) {
    friendButton.focus({ preventScroll: true });
  }
};

const openProfile = (profileId) => {
  if (!profileOverlay) return;
  profileOverlay.dataset.profileId = profileId;
  profileOverlay.classList.remove('hidden');
  profileOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  renderProfileModal(profileId);
};

const closeProfile = () => {
  if (!profileOverlay) return;
  profileOverlay.classList.add('hidden');
  profileOverlay.setAttribute('aria-hidden', 'true');
  profileOverlay.dataset.profileId = '';
  if (profileModalContent) {
    profileModalContent.innerHTML = '';
  }
  document.body.style.overflow = '';
};

const tabsInit = () => {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((btn) => btn.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderPosts();
    });
  });
};

tabsInit();
const initialAuth = isAuthenticated();
setAppVisibility(initialAuth);
initializeBots();

posts
  .filter((post) => post.profileId === MAIN_USER_ID)
  .forEach((post) => {
    scheduleBotReactionsForPost(post);
  });

updateAllFriendButtons();

document.addEventListener('click', (event) => {
  if (
    userMenu &&
    !userMenu.classList.contains('hidden') &&
    !event.target.closest('.user-menu') &&
    !event.target.closest('#userMenuToggle')
  ) {
    closeUserMenu();
  }

  const friendButton = event.target.closest('[data-action="friend"]');
  if (friendButton) {
    const { profileId } = friendButton.dataset;
    if (profileId && profileId !== MAIN_USER_ID) {
      if (isFriend(profileId)) {
        friends.delete(profileId);
      } else {
        friends.add(profileId);
      }
      saveFriends();
      updateFriendButtons(profileId);
      refreshOpenProfile();
    }
    event.stopPropagation();
    return;
  }

  const profileTrigger = event.target.closest('[data-profile-id]');
  if (profileTrigger) {
    const { profileId } = profileTrigger.dataset;
    if (profileId) {
      openProfile(profileId);
    }
  }
});

if (profileOverlay) {
  profileOverlay.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-profile]')) {
      closeProfile();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (profileOverlay && !profileOverlay.classList.contains('hidden')) {
    closeProfile();
    return;
  }

  if (sidebar?.classList.contains('is-open') || rightbar?.classList.contains('is-open')) {
    closeDrawers();
  }

  if (userMenu && !userMenu.classList.contains('hidden')) {
    closeUserMenu();
  }
});
