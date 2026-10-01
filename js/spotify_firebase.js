// =============================================================================
// SPOTIFY FIREBASE FIRESTORE SYNC & PERSISTENCE
// =============================================================================

// Replace with your Firebase project config from your Titis Cafe / personal Firebase console
const FIREBASE_CONFIG = window.APP_CONFIG?.firebaseConfig || {
  apiKey: "AIzaSyCzAi7U8V5rOgOXaX0LUTKXJoGwElL7mCU",
  authDomain: "portfolio-telemetry.firebaseapp.com",
  projectId: "portfolio-telemetry",
  storageBucket: "portfolio-telemetry.firebasestorage.app",
  messagingSenderId: "784832183274",
  appId: "1:784832183274:web:639177394bedf08530d093",
  measurementId: "G-KGMXW550BP"
};

// Initialize Firebase dynamically via CDN if not already loaded
let dbInstance = null;

async function initFirebaseStore() {
  if (dbInstance) return dbInstance;
  if (!window.firebase) {
    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
  }
  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }
  dbInstance = window.firebase.firestore();
  return dbInstance;
}

// 1. Write current track to Firebase (called when Lanyard detects a new song)
window.persistTrackToFirebase = async function(track) {
  if (!track || !track.song) return;
  try {
    const db = await initFirebaseStore();
    const col = db.collection('recent_tracks');
    
    // Check if the most recent song is already this one to avoid duplicate writes
    const snapshot = await col.orderBy('playedAt', 'desc').limit(1).get();
    if (!snapshot.empty) {
      const last = snapshot.docs[0].data();
      if (last.song === track.song && last.artist === track.artist) {
        return; // Already logged
      }
    }

    await col.add({
      song: track.song,
      artist: track.artist,
      album: track.album || '',
      albumArt: track.albumArt,
      playedAt: Date.now()
    });

    // Keep database capped at 6 documents to avoid storage build-up
    const allDocs = await col.orderBy('playedAt', 'desc').get();
    if (allDocs.size > 6) {
      const toDelete = allDocs.docs.slice(6);
      toDelete.forEach(docSnap => docSnap.ref.delete());
    }
  } catch (err) {
    console.warn('[Firebase] Write bypassed or offline:', err.message);
  }
};

// 2. Fetch the last 5-6 songs for external visitors
window.fetchRecentTracksFromFirebase = async function() {
  try {
    const db = await initFirebaseStore();
    const snapshot = await db.collection('recent_tracks').orderBy('playedAt', 'desc').limit(6).get();
    if (snapshot.empty) return null;
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.warn('[Firebase] Read failed, falling back to local memory:', err.message);
    return null;
  }
};