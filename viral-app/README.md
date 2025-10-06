# Social Spark

Social Spark is a modern, viral-ready social web app template built with vanilla JavaScript, Firebase, and GitHub Pages. It ships with a full feature set — authentication, real-time feed, XP + leveling system, bot seeded content, and a leaderboard — so you can focus on growing your next community experiment.

![Social Spark hero](./assets/logo.svg)

## Features

- 🔐 Firebase Authentication with email/password and Google sign-in
- 📝 Rich post composer with optional image uploads (Firebase Storage)
- ⚡ Engagement-driven home feed that blends fresh and high-signal posts
- 💬 Comments, reactions, and XP rewards for activity
- 🏆 Leaderboard and profile view to celebrate top creators
- 🤖 Seed content loader powered by `db/seed.json`
- 📈 Trending keyword rail and Discover tab
- 🌗 Light/Dark toggle and PWA manifest for installable experience
- 🚀 One-click GitHub Actions deploy to GitHub Pages

## Project structure

```
viral-app/
├── index.html
├── manifest.webmanifest
├── /assets
│   └── logo.svg
├── /config
│   └── firebaseConfig.js
├── /db
│   └── seed.json
├── /src
│   ├── app.js
│   ├── api.js
│   ├── auth.js
│   ├── feed.js
│   ├── styles.css
│   └── /components
│       ├── leaderboard.js
│       ├── navbar.js
│       ├── post.js
│       └── profile.js
├── local-preview.sh
├── package.json
├── deploy.yml
└── README.md
```

## Getting started

1. **Create a Firebase project** and enable **Authentication (Email/Password + Google)**, **Firestore**, and **Storage**.
2. Update [`config/firebaseConfig.js`](./config/firebaseConfig.js) with your Firebase project credentials.
3. Configure [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started) to protect reads/writes (see sample below).
4. Serve locally without npm by using the built-in Python web server (ships with macOS, most Linux distros, and Windows 11):
   ```bash
   cd viral-app
   python3 -m http.server 4173
   ```
   Then visit [http://localhost:4173](http://localhost:4173). The app is pure HTML/CSS/JS, so any static server works.

   Prefer a one-liner? Run the provided helper:
   ```bash
   bash local-preview.sh
   ```
   Pass a custom port like `bash local-preview.sh 9000` if 4173 is taken.
1. **Install dependencies** (optional for static hosting, required for Firebase CLI helpers):
   ```bash
   cd viral-app
   npm install
   ```
2. **Create a Firebase project** and enable **Authentication (Email/Password + Google)**, **Firestore**, and **Storage**.
3. Update [`config/firebaseConfig.js`](./config/firebaseConfig.js) with your Firebase project credentials.
4. Configure [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started) to protect reads/writes (see sample below).
5. Serve locally:
   ```bash
   npm start
   ```
   This runs `npx serve .` so you can test the GitHub Pages build locally.

### Suggested Firestore rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    match /users/{userId} {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
    match /posts/{postId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update: if isSignedIn() && request.auth.uid == resource.data.uid;
      allow delete: if false;
      match /comments/{commentId} {
        allow read: if true;
        allow create: if isSignedIn();
      }
      match /reactions/{userId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Firebase Cloud Functions (optional but recommended)

To keep engagement scores consistent, you can add a serverless function that recalculates the `score` and `weekly_score` fields whenever a post changes.

```javascript
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

export const recomputePostScore = onDocumentWritten('posts/{postId}', async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;
  const likes = after.likes || 0;
  const dislikes = after.dislikes || 0;
  const comments = after.comments_count || 0;
  const updatedScore = likes * 5 + comments * 4 - dislikes * 2;
  await db.doc(event.document).update({
    score: updatedScore,
    weekly_score: Math.max(updatedScore, after.weekly_score || 0),
  });
});
```

Deploy with `firebase deploy --only functions` from the [Firebase Cloud Shell](https://console.firebase.google.com/project/_/settings/general/cloudShell) (the CLI is pre-installed there) or from any environment where you can install the Firebase CLI.
Deploy with `firebase deploy --only functions` once your Firebase CLI is configured.

## Deployment

- **GitHub Pages:** The included [`deploy.yml`](./deploy.yml) action publishes the `viral-app` folder to `gh-pages` on every push to `main`.
- **Firebase Hosting (optional):** From Firebase Hosting in the console, use **Upload** to publish the `viral-app` directory, or open Cloud Shell and run `firebase deploy --only hosting`.
- **Firebase Hosting (optional):** Run `firebase init` inside `viral-app`, choose Hosting + Functions, and deploy via `npm run deploy`.

## Seeding bot content

`db/seed.json` ships with 20 example posts. You can import them manually into Firestore or adapt the provided helper in [`src/api.js`](./src/api.js) to run once in a Firebase Function or admin script. They make fresh accounts feel lively immediately.

## Roadmap ideas

- Push notifications for replies and reactions
- Daily streak bonuses with calendar view
- Collaborative rooms or challenges
- AI-assisted prompt generator for Spark Bot

---

Happy building! Tag your experiments with **#SocialSpark** so we can cheer them on.
