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

function getTrackSortTime(track) {
  if (track.timestamp && typeof track.timestamp.toMillis === 'function') {
    return track.timestamp.toMillis();
  }
  const timestamp = track.timestamp ? new Date(track.timestamp).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : Number(track.playedAt) || 0;
}

async function getRecentTrackDocuments(tracksRef) {
  const snapshots = await Promise.all([
    tracksRef.orderBy('timestamp', 'desc').get(),
    tracksRef.orderBy('playedAt', 'desc').get()
  ]);
  const documents = new Map();
  snapshots.forEach(snapshot => snapshot.docs.forEach(doc => documents.set(doc.id, doc)));
  return [...documents.values()].sort((left, right) =>
    getTrackSortTime(right.data()) - getTrackSortTime(left.data())
  );
}

// 1. Write current track to Firebase (called when Lanyard detects a new song)
let isWritingTrack = false;
let lastLoggedTrackId = null;

window.persistTrackToFirebase = async function(track) {
  if (!track || !track.song || isWritingTrack) return;

  const trackSignature = `${track.song}-${track.artist || ''}`;
  if (lastLoggedTrackId === trackSignature) return;

  isWritingTrack = true;
  try {
    const db = await initFirebaseStore();
    const tracksRef = db.collection('recent_tracks');
    
    // Check if the most recent song is already this one to avoid duplicate writes
    const previousDocs = await getRecentTrackDocuments(tracksRef);
    if (previousDocs.length) {
      const latestTrack = previousDocs[0].data();
      if (latestTrack.song === track.song && latestTrack.artist === track.artist) {
        lastLoggedTrackId = trackSignature;
        return;
      }
    }

    await tracksRef.add({
      song: track.song,
      artist: track.artist,
      album: track.album || '',
      album_art_url: track.album_art_url || track.albumArt || '',
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    lastLoggedTrackId = trackSignature;

    // Keep only the latest eight records.
    const allDocs = await getRecentTrackDocuments(tracksRef);
    if (allDocs.length > 8) {
      const batch = db.batch();
      allDocs.slice(8).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    const recentTracks = await window.fetchRecentTracksFromFirebase();
    if (recentTracks && typeof renderRecentTracksUI === 'function') {
      renderRecentTracksUI(recentTracks);
    }
  } catch (err) {
    console.warn('[Spotify Firebase] Sync notice:', err.message);
  } finally {
    isWritingTrack = false;
  }
};

// 2. Fetch the last 5-6 songs for external visitors
window.fetchRecentTracksFromFirebase = async function() {
  try {
    const db = await initFirebaseStore();
    const tracksRef = db.collection('recent_tracks');
    const documents = (await getRecentTrackDocuments(tracksRef)).slice(0, 6);
    if (!documents.length) return null;

    return documents.map(doc => {
      const track = doc.data();
      const albumArt = track.album_art_url || track.albumArt || '';
      return { ...track, album_art_url: albumArt, albumArt };
    });
  } catch (err) {
    console.warn('[Spotify Firebase] Read notice:', err.message);
    return null;
  }
};