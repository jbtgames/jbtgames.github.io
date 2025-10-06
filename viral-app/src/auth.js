import { firebaseConfig } from "../config/firebaseConfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export const watchAuth = (callback) => onAuthStateChanged(auth, callback);

export async function registerWithEmail(email, password, username) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (username) {
    await updateProfile(credential.user, { displayName: username });
  }
  await ensureUserDocument(credential.user, username);
  return credential.user;
}

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(credential.user);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, provider);
  await ensureUserDocument(credential.user);
  return credential.user;
}

export async function logout() {
  return signOut(auth);
}

export async function ensureUserDocument(user, usernameOverride) {
  if (!user) return;
  const profileRef = doc(db, "users", user.uid);
  const existing = await getDoc(profileRef);
  if (!existing.exists()) {
    await setDoc(profileRef, {
      uid: user.uid,
      username: usernameOverride || user.displayName || user.email?.split("@")[0] || "spark-user",
      email: user.email,
      xp: 0,
      level: 1,
      created_at: serverTimestamp(),
    });
  } else if (usernameOverride && !existing.data().username) {
    await updateDoc(profileRef, { username: usernameOverride });
  }
}

export async function awardExperience(uid, amount) {
  const profileRef = doc(db, "users", uid);
  await updateDoc(profileRef, {
    xp: increment(amount),
    level: increment(calculateLevelIncrement(amount)),
  });
}

function calculateLevelIncrement(amount) {
  // approximate xp-to-level curve: 120 xp per level
  const XP_PER_LEVEL = 120;
  return Math.max(0, Math.floor(amount / XP_PER_LEVEL));
}
