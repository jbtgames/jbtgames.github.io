import {
  db,
  storage,
  auth,
  awardExperience,
  ensureUserDocument,
} from "./auth.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  increment,
  onSnapshot,
  where,
  runTransaction,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { botUserId } from "../config/firebaseConfig.js";

const POSTS_LIMIT = 40;

export function listenToFeed(callback) {
  const postsRef = collection(db, "posts");
  const rankedQuery = query(postsRef, orderBy("score", "desc"), orderBy("timestamp", "desc"), limit(POSTS_LIMIT));
  return onSnapshot(rankedQuery, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(items);
  });
}

export async function fetchDiscoverPosts() {
  const postsRef = collection(db, "posts");
  const discoverQuery = query(postsRef, orderBy("weekly_score", "desc"), limit(20));
  const snapshot = await getDocs(discoverQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function fetchTrendingWords() {
  const postsRef = collection(db, "posts");
  const trendingQuery = query(postsRef, orderBy("timestamp", "desc"), limit(100));
  const snapshot = await getDocs(trendingQuery);
  const wordCount = new Map();
  snapshot.forEach((docSnap) => {
    const text = docSnap.data().content || "";
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .forEach((word) => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
  });
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

export async function createPost({ content, file }) {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in to post.");
  await ensureUserDocument(user);

  let imageUrl = "";
  if (file) {
    const path = `posts/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    imageUrl = await getDownloadURL(storageRef);
  }

  const postsRef = collection(db, "posts");
  const xpReward = 20;
  const docRef = await addDoc(postsRef, {
    uid: user.uid,
    author: {
      uid: user.uid,
      username: user.displayName || user.email.split("@")[0],
      photoURL: user.photoURL || "",
    },
    content,
    image_url: imageUrl,
    timestamp: serverTimestamp(),
    likes: 0,
    dislikes: 0,
    comments_count: 0,
    score: 0,
    weekly_score: 0,
    xp_reward: xpReward,
  });

  await awardExperience(user.uid, xpReward);
  return docRef.id;
}

export async function addComment(postId, { content }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to comment.");
  await ensureUserDocument(user);

  const commentsRef = collection(db, "posts", postId, "comments");
  await addDoc(commentsRef, {
    uid: user.uid,
    content,
    timestamp: serverTimestamp(),
    author: {
      uid: user.uid,
      username: user.displayName || user.email.split("@")[0],
    },
  });
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { comments_count: increment(1), score: increment(8), weekly_score: increment(8) });
  await awardExperience(user.uid, 5);
}

export async function fetchComments(postId) {
  const commentsRef = collection(db, "posts", postId, "comments");
  const commentsQuery = query(commentsRef, orderBy("timestamp", "desc"), limit(20));
  const snapshot = await getDocs(commentsQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function toggleReaction(postId, value) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to react.");
  await ensureUserDocument(user);

  const postRef = doc(db, "posts", postId);
  const reactionRef = doc(db, "posts", postId, "reactions", user.uid);

  await runTransaction(db, async (transaction) => {
    const postSnap = await transaction.get(postRef);
    if (!postSnap.exists()) throw new Error("Post disappeared");
    const reactionSnap = await transaction.get(reactionRef);
    const current = reactionSnap.exists() ? reactionSnap.data().value : 0;
    let likes = postSnap.data().likes || 0;
    let dislikes = postSnap.data().dislikes || 0;

    if (current === value) {
      // undo reaction
      if (value === 1) likes -= 1;
      if (value === -1) dislikes -= 1;
      transaction.delete(reactionRef);
      transaction.update(postRef, {
        likes,
        dislikes,
        score: likes * 5 - dislikes * 2 + (postSnap.data().comments_count || 0) * 4,
        weekly_score: increment(-value * 3),
      });
      return;
    }

    if (current === 1) likes -= 1;
    if (current === -1) dislikes -= 1;

    if (value === 1) likes += 1;
    if (value === -1) dislikes += 1;

    transaction.set(reactionRef, { value, updated_at: serverTimestamp() });
    transaction.update(postRef, {
      likes,
      dislikes,
      score: likes * 5 - dislikes * 2 + (postSnap.data().comments_count || 0) * 4,
      weekly_score: increment(value === 1 ? 3 : -2),
    });
  });
}

export async function fetchLeaderboard(limitCount = 20) {
  const usersRef = collection(db, "users");
  const leadersQuery = query(usersRef, orderBy("xp", "desc"), limit(limitCount));
  const snapshot = await getDocs(leadersQuery);
  return snapshot.docs.map((docSnap, index) => ({
    id: docSnap.id,
    rank: index + 1,
    ...docSnap.data(),
  }));
}

export async function fetchProfile(uid) {
  const profileRef = doc(db, "users", uid);
  const snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function fetchUserPosts(uid) {
  const postsRef = collection(db, "posts");
  const profileQuery = query(postsRef, where("uid", "==", uid), orderBy("timestamp", "desc"), limit(20));
  const snapshot = await getDocs(profileQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function loadSeedPosts() {
  const response = await fetch("./db/seed.json");
  if (!response.ok) return [];
  const data = await response.json();
  return data.posts || [];
}

export async function seedBotContent(dbAvailable = true) {
  if (!dbAvailable) return [];
  const seed = await loadSeedPosts();
  const botRef = doc(db, "users", botUserId);
  const botDoc = await getDoc(botRef);
  if (!botDoc.exists()) {
    await setBotProfile(botRef);
  }
  const postsRef = collection(db, "posts");
  const existingQuery = query(postsRef, where("uid", "==", botUserId), limit(seed.length));
  const existingSnapshot = await getDocs(existingQuery);
  if (!existingSnapshot.empty) {
    return seed;
  }
  for (const post of seed) {
    await addDoc(postsRef, {
      uid: botUserId,
      author: {
        uid: botUserId,
        username: post.username,
        avatar: post.avatar,
      },
      content: post.content,
      image_url: post.image_url || "",
      timestamp: serverTimestamp(),
      likes: Math.floor(Math.random() * 30),
      dislikes: Math.floor(Math.random() * 4),
      comments_count: Math.floor(Math.random() * 8),
      score: Math.floor(Math.random() * 100),
      weekly_score: Math.floor(Math.random() * 80),
    });
  }
  return seed;
}

async function setBotProfile(botRef) {
  await setDoc(
    botRef,
    {
      username: "Spark Bot",
      email: "bot@socialspark.app",
      xp: 1000,
      level: 20,
      created_at: serverTimestamp(),
    },
    { merge: true }
  );
}
