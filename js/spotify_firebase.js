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

// Time-ago formatting helper
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'RECENT';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return 'JUST NOW';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}M AGO`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}H AGO`;
  return `${Math.floor(diffSec / 86400)}D AGO`;
}

// In your fetchRecentTracksFromFirebase mapping logic:
container.innerHTML = tracks.map((t, idx) => {
  const timeAgo = formatTimeAgo(t.timestamp);
  const exactTime = t.timestamp?.toDate 
    ? t.timestamp.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    : 'Live telemetry';

  const badgeColor = idx === 0 
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' 
    : 'text-purple-400/70 border-purple-900/40 bg-purple-950/20';

  return `
    <div 
      class="group relative flex items-center gap-3 p-2 rounded bg-synth-bg/50 border border-purple-900/30 hover:border-purple-500/40 transition cursor-default"
      title="Played: ${exactTime}"
    >
      <div class="relative w-10 h-10 rounded bg-purple-950/60 overflow-hidden shrink-0 border border-purple-900/50">
        <img 
          src="${t.album_art_url || 'assets/img/Headshot.webp'}" 
          alt="${escapeHTML(t.song)}" 
          class="w-full h-full object-cover" 
          onerror="this.src='assets/img/Headshot.webp';"
        />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-1">
          <p class="text-white text-xs font-bold truncate">${escapeHTML(t.song)}</p>
          
          <!-- Subtle Timestamp Badge -->
          <span class="font-mono text-[9px] px-1.5 py-0.2 rounded border ${badgeColor} shrink-0 group-hover:border-synth-cyan group-hover:text-synth-cyan transition-colors">
            ${timeAgo}
          </span>
        </div>
        <p class="text-purple-300/80 text-[10px] truncate">${escapeHTML(t.artist)}</p>
      </div>
    </div>
  `;
}).join('');