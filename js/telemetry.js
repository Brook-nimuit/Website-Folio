// =============================================================================
// UPGRADED TELEMETRY ENGINE: GITHUB, CHESS STATS/MATCHES, & SPOTIFY PERSISTENCE
// =============================================================================

let chessGamesBuffer = [];
let currentChessIdx = 0;
let currentChessTab = 'matches'; // 'ratings' or 'matches'
let currentSpotifyTab = 'queue'; // 'queue' or 'aux'

// Helper: Relative time
function formatTimeAgo(isoDate) {
  if (!isoDate) return 'RECENT';
  const diffSec = Math.floor((new Date() - new Date(isoDate)) / 1000);
  if (diffSec < 60) return 'JUST NOW';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}M AGO`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}H AGO`;
  return `${Math.floor(diffSec / 86400)}D AGO`;
}

// =============================================================================
// 1. GITHUB TELEMETRY: EVENTS STREAM & HEATMAP GRAPH
// =============================================================================
// =============================================================================
// 1. GITHUB TELEMETRY: 30-DAY COMPACT HEATMAP & COMMIT COUNTER
// =============================================================================
async function syncGithubTelemetry() {
  const container = document.getElementById('gitCommitStream');
  const timeEl = document.getElementById('gitTime');
  const urlEl = document.getElementById('gitCommitUrl');
  const username = window.APP_CONFIG?.githubUsername || 'Brook-nimuit';

  if (!container) return;

  try {
    const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=15`);
    if (!res.ok) throw new Error(`GITHUB_${res.status}`);
    const events = await res.json();
    const commits = [];

    for (const evt of events) {
      if (evt.type === 'PushEvent' && evt.payload?.commits?.length) {
        const repoClean = evt.repo.name.replace(`${username}/`, '');
        for (const c of [...evt.payload.commits].reverse()) {
          commits.push({
            repo: repoClean,
            message: c.message.split('\n')[0],
            sha: (c.sha || 'HEAD').substring(0, 7),
            time: evt.created_at,
            url: `https://github.com/${evt.repo.name}/commit/${c.sha}`
          });
          if (commits.length >= 5) break;
        }
      }
      if (commits.length >= 5) break;
    }

    if (commits.length > 0) {
      if (timeEl) timeEl.textContent = formatTimeAgo(commits[0].time);
      if (urlEl) urlEl.href = commits[0].url;

      container.innerHTML = commits.map(c => `
        <div class="flex items-start justify-between border-b border-purple-900/40 pb-2 text-[11px] gap-2">
          <div class="space-y-0.5 min-w-0 flex-1">
            <div class="flex items-center gap-1.5 font-bold text-purple-300">
              <span class="truncate">${c.repo}</span>
              <span class="text-[9px] bg-purple-900/60 px-1 py-0.5 rounded text-purple-400 font-mono shrink-0">${c.sha}</span>
            </div>
            <p class="text-purple-200/80 truncate italic">"${c.message}"</p>
          </div>
          <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="text-[9px] text-purple-400 hover:text-purple-200 shrink-0 font-mono mt-0.5">VIEW ↗</a>
        </div>
      `).join('');
    }
  } catch (err) {
    if (timeEl) timeEl.textContent = 'ACTIVE';
  }
}

// =============================================================================
// 2. CHESS DUAL-VIEW: RATINGS & RECENT MATCHES
// =============================================================================
let chessStatsData = null;

async function syncChessTelemetry() {
  const chessUser = window.APP_CONFIG?.chessUsername || 'Balandor_Nacho';

  try {
    // 1. Fetch Player Stats (Ratings, W/L/D, Peak ELO)
    const statsRes = await fetch(`https://api.chess.com/pub/player/${chessUser}/stats`);
    if (statsRes.ok) {
      chessStatsData = await statsRes.json();
      renderChessRatingView();
    }

    // 2. Fetch Games Archive
    const archRes = await fetch(`https://api.chess.com/pub/player/${chessUser}/games/archives`);
    if (!archRes.ok) return;
    const archData = await archRes.json();
    if (!archData.archives?.length) return;

    const latestUrl = archData.archives[archData.archives.length - 1];
    const gamesRes = await fetch(latestUrl);
    if (!gamesRes.ok) return;
    const gamesData = await gamesRes.json();

    chessGamesBuffer = (gamesData.games || []).slice(-5).reverse();
    renderChessMatchCard(0);
  } catch (err) {
    console.warn('[Chess] Sync warning:', err.message);
  }
}

function renderChessRatingView() {
  const container = document.getElementById('chessRatingView');
  if (!container || !chessStatsData) return;

  const rapid = chessStatsData.chess_rapid || {};
  const blitz = chessStatsData.chess_blitz || {};
  const bullet = chessStatsData.chess_bullet || {};

  const makeStatCol = (title, data) => {
    const cur = data.last?.rating || '---';
    const best = data.best?.rating || cur;
    const record = data.record || { win: 0, loss: 0, draw: 0 };
    const total = record.win + record.loss + record.draw;
    const winRate = total > 0 ? Math.round((record.win / total) * 100) : 0;

    return `
      <div class="bg-purple-950/40 border border-purple-500/20 p-3 rounded space-y-2">
        <div class="flex justify-between items-center border-b border-purple-900/60 pb-1">
          <span class="text-white font-bold">${title}</span>
          <span class="text-synth-cyan font-bold text-xs">${cur}</span>
        </div>
        <div class="flex justify-between text-[10px] text-purple-300">
          <span>PEAK ELO</span>
          <span class="text-emerald-400 font-bold">${best}</span>
        </div>
        <div class="flex justify-between text-[10px] text-purple-300">
          <span>RECORD</span>
          <span>${record.win}W / ${record.loss}L / ${record.draw}D</span>
        </div>
        <div class="w-full bg-purple-900/30 h-1 rounded overflow-hidden mt-1">
          <div class="bg-emerald-400 h-full" style="width: ${winRate}%"></div>
        </div>
        <div class="text-[9px] text-right text-emerald-400/80">${winRate}% WIN RATE</div>
      </div>
    `;
  };

  container.innerHTML = `
    <div class="grid grid-cols-3 gap-2">
      ${makeStatCol('RAPID', rapid)}
      ${makeStatCol('BLITZ', blitz)}
      ${makeStatCol('BULLET', bullet)}
    </div>
  `;
}

function renderChessMatchCard(index) {
  if (!chessGamesBuffer[index]) return;
  currentChessIdx = index;
  const game = chessGamesBuffer[index];
  const chessUser = (window.APP_CONFIG?.chessUsername || 'Balandor_Nacho').toLowerCase();

  const isWhite = (game.white?.username || '').toLowerCase() === chessUser;
  const player = isWhite ? game.white : game.black;
  const opponent = isWhite ? game.black : game.white;

  const detailsEl = document.getElementById('chessMatchDetails');
  if (detailsEl) {
    detailsEl.textContent = `${isWhite ? '♔ White' : '♚ Black'} vs ${opponent?.username || 'Opponent'} (${opponent?.rating || '???'})`;
  }

  const outcomeEl = document.getElementById('chessOutcome');
  if (outcomeEl) {
    const result = (player?.result || 'DRAW').toUpperCase();
    outcomeEl.textContent = result;
    outcomeEl.className = result === 'WIN'
      ? 'px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]'
      : 'px-1.5 py-0.5 rounded bg-purple-900/50 border border-purple-500/20 text-purple-300 text-[10px]';
  }

  const counterEl = document.getElementById('chessCounter');
  if (counterEl) counterEl.textContent = `${index + 1} / ${chessGamesBuffer.length}`;

  const prevBtn = document.getElementById('prevChess');
  const nextBtn = document.getElementById('nextChess');
  if (prevBtn) prevBtn.disabled = (index === 0);
  if (nextBtn) nextBtn.disabled = (index === chessGamesBuffer.length - 1);

  // Parse final move from PGN
  let finalFen = '';
  let lastMoveDesc = '';
  if (game.pgn && window.Chess) {
    try {
      const chess = new window.Chess();
      chess.loadPgn(game.pgn);
      const history = chess.history({ verbose: true });
      if (history.length > 0) {
        const lastMove = history[history.length - 1];
        lastMoveDesc = `${lastMove.color === 'w' ? 'White' : 'Black'}: ${lastMove.san}`;
      }
      finalFen = chess.fen();
    } catch (e) {
      console.warn('[Chess] FEN fallback');
    }
  }

  if (!finalFen) finalFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const orientation = isWhite ? 'white' : 'black';
  const boardImgUrl = `https://lichess1.org/export/fen.gif?fen=${encodeURIComponent(finalFen)}&theme=green&piece=neo&color=${orientation}`;

  const frame = document.getElementById('chessLiveFrame');
  if (frame) {
    frame.srcdoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { position: relative; background: #0d0716; height: 100vh; width: 100vw; overflow: hidden; display: flex; align-items: center; justify-content: center; font-family: monospace; }
          .board-wrapper { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
          .board-img { width: 100%; height: 100%; object-fit: contain; display: block; border-radius: 4px; }
          .overlay { position: absolute; inset: 0; background: rgba(13, 7, 22, 0.65); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; opacity: 0; transition: opacity 0.25s ease-in-out; border-radius: 4px; backdrop-filter: blur(2px); }
          .board-wrapper:hover .overlay { opacity: 1; }
          .move-tag { color: #00F0FF; font-size: 11px; font-weight: bold; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); padding: 4px 8px; border-radius: 4px; }
          .analysis-btn { background: #9D4EDD; color: #fff; border: 1px solid #FF007F; padding: 8px 14px; font-size: 11px; font-weight: bold; text-decoration: none; border-radius: 4px; transition: all 0.2s; }
          .analysis-btn:hover { background: #FF007F; }
        </style>
      </head>
      <body>
        <div class="board-wrapper">
          <img class="board-img" src="${boardImgUrl}" alt="Final Position" />
          <div class="overlay">
            ${lastMoveDesc ? `<div class="move-tag">FINAL MOVE: ${lastMoveDesc}</div>` : ''}
            <a class="analysis-btn" href="${game.url}" target="_blank" rel="noopener noreferrer">ANALYZE ON CHESS.COM ↗</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

window.changeChessGame = function(dir) {
  const target = currentChessIdx + dir;
  if (target >= 0 && target < chessGamesBuffer.length) renderChessMatchCard(target);
};

window.switchChessTab = function(tab) {
  currentChessTab = tab;
  const ratingView = document.getElementById('chessRatingView');
  const matchView = document.getElementById('chessMatchView');
  const tabRatingBtn = document.getElementById('tab-chess-rating');
  const tabMatchBtn = document.getElementById('tab-chess-match');
  const navControls = document.getElementById('chessNavControls'); // <-- Select the controls

  if (tab === 'ratings') {
    ratingView?.classList.remove('hidden');
    matchView?.classList.add('hidden');
    navControls?.classList.add('opacity-0', 'pointer-events-none'); // <-- Hide pagination on Ratings
    tabRatingBtn?.classList.add('text-white', 'border-b-2', 'border-synth-neonMagenta');
    tabMatchBtn?.classList.remove('text-white', 'border-b-2', 'border-synth-neonMagenta');
  } else {
    ratingView?.classList.add('hidden');
    matchView?.classList.remove('hidden');
    navControls?.classList.remove('opacity-0', 'pointer-events-none'); // <-- Show pagination on Matches
    tabMatchBtn?.classList.add('text-white', 'border-b-2', 'border-synth-neonMagenta');
    tabRatingBtn?.classList.remove('text-white', 'border-b-2', 'border-synth-neonMagenta');
  }
};

// =============================================================================
// 3. SPOTIFY DUAL-TAB: QUEUE (LIVE) VS AUX (PERSISTENT RECENT TRACKS)
// =============================================================================
window.switchSpotifyTab = function(tab) {
  currentSpotifyTab = tab;
  const queueView = document.getElementById('spotifyQueueView');
  const auxView = document.getElementById('spotifyAuxView');
  const tabQueueBtn = document.getElementById('tab-spotify-queue');
  const tabAuxBtn = document.getElementById('tab-spotify-aux');

  if (tab === 'queue') {
    queueView?.classList.remove('hidden');
    auxView?.classList.add('hidden');
    tabQueueBtn?.classList.add('text-white', 'border-b-2', 'border-synth-neonMagenta');
    tabAuxBtn?.classList.remove('text-white', 'border-b-2', 'border-synth-neonMagenta');
  } else {
    queueView?.classList.add('hidden');
    auxView?.classList.remove('hidden');
    tabAuxBtn?.classList.add('text-white', 'border-b-2', 'border-synth-neonMagenta');
    tabQueueBtn?.classList.remove('text-white', 'border-b-2', 'border-synth-neonMagenta');
  }
};

function renderRecentTracksUI(tracks) {
  const container = document.getElementById('recentTracksList');
  if (!container) return;

  if (!tracks || !tracks.length) {
    container.innerHTML = '<div class="text-[11px] text-purple-400/60 italic p-3">No recent tracks logged yet.</div>';
    return;
  }

  container.innerHTML = tracks.slice(0, 6).map((track, i) => `
    <div class="flex items-center justify-between bg-purple-900/20 p-2 rounded border border-purple-500/10 hover:border-purple-500/30 transition-all gap-2">
      <div class="flex items-center gap-2.5 overflow-hidden min-w-0">
        <img src="${track.albumArt}" alt="art" class="w-8 h-8 rounded object-cover shrink-0 ${i === 0 ? 'border border-emerald-500/40' : 'opacity-60'}" />
        <div class="truncate">
          <p class="text-purple-200 font-bold text-[11px] truncate">${track.song}</p>
          <p class="text-purple-400/80 text-[10px] truncate">${track.artist}</p>
        </div>
      </div>
      <span class="text-[9px] font-mono shrink-0 ${i === 0 ? 'text-emerald-400 font-bold' : 'text-purple-500/60'}">
        ${i === 0 ? '● RECENT' : '#' + (i + 1)}
      </span>
    </div>
  `).join('');
}

// Initial load for AUX tracks (From Firebase if available, otherwise localStorage)
async function initAuxTracks() {
  if (window.fetchRecentTracksFromFirebase) {
    const remoteTracks = await window.fetchRecentTracksFromFirebase();
    if (remoteTracks && remoteTracks.length) {
      renderRecentTracksUI(remoteTracks);
      return;
    }
  }
  const cached = localStorage.getItem('banimut_recent_tracks');
  if (cached) {
    try { renderRecentTracksUI(JSON.parse(cached)); } catch (e) {}
  }
}

// WebSocket live listener
let lanyardSocket = null;
let heartbeatInterval = null;

function connectLanyardSocket() {
  const discordId = window.APP_CONFIG?.discordId || '1035876890126336061';
  const fallbackArt = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%2316122a'/%3E%3C/svg%3E";

  const songEl = document.getElementById('spotifySong');
  const artistEl = document.getElementById('spotifyArtist');
  const albumEl = document.getElementById('spotifyAlbum');
  const albumArtEl = document.getElementById('spotifyAlbumArt');
  const statusTagEl = document.getElementById('spotifyStatusTag');
  const signalEl = document.getElementById('spotifySignal');

  if (!songEl) return;

  try {
    lanyardSocket = new WebSocket('wss://api.lanyard.rest/socket');
  } catch (err) {
    return;
  }

  lanyardSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { op, d, t } = data;

      if (op === 1) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (lanyardSocket.readyState === WebSocket.OPEN) lanyardSocket.send(JSON.stringify({ op: 3 }));
        }, d.heartbeat_interval);

        lanyardSocket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: discordId } }));
      }

      if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
        const spotify = d.spotify;

        if (d.listening_to_spotify && spotify) {
          songEl.textContent = spotify.song || 'UNKNOWN_TRACK';
          artistEl.textContent = `by ${spotify.artist || 'Unknown Artist'}`;
          albumEl.textContent = spotify.album || 'Unknown Album';
          albumArtEl.src = spotify.album_art_url || fallbackArt;

          statusTagEl.textContent = 'PLAYING';
          statusTagEl.className = 'text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded';
          if (signalEl) signalEl.style.opacity = '1';

          const trackObj = {
            song: spotify.song,
            artist: spotify.artist,
            album: spotify.album,
            albumArt: spotify.album_art_url || fallbackArt
          };

          // Save locally
          let tracks = [];
          try { tracks = JSON.parse(localStorage.getItem('banimut_recent_tracks') || '[]'); } catch {}
          if (!tracks.length || tracks[0].song !== trackObj.song) {
            tracks.unshift(trackObj);
            if (tracks.length > 6) tracks.pop();
            localStorage.setItem('banimut_recent_tracks', JSON.stringify(tracks));
            renderRecentTracksUI(tracks);

            // Persist to Firebase if connected!
            if (window.persistTrackToFirebase) {
              window.persistTrackToFirebase(trackObj);
            }
          }
        } else {
          songEl.textContent = 'IDLE';
          artistEl.textContent = 'No active track detected';
          albumEl.textContent = 'OFFLINE_STREAM';
          albumArtEl.src = fallbackArt;

          statusTagEl.textContent = 'PAUSED';
          statusTagEl.className = 'text-[10px] text-purple-400/60 bg-purple-950/40 border border-purple-500/20 px-1.5 py-0.5 rounded';
          if (signalEl) signalEl.style.opacity = '0.2';
        }
      }
    } catch (e) {}
  };

  lanyardSocket.onclose = () => {
    clearInterval(heartbeatInterval);
    setTimeout(connectLanyardSocket, 5000);
  };
}
function adaptCommitGraph(weeksData) {
  // weeksData is an array of week objects from the GitHub GraphQL/REST response
  // Each week has 7 days of commit counts: [{ contributionDays: [{ date, contributionCount }, ...] }]

  const allDays = weeksData.flatMap(w => w.contributionDays);
  const now = new Date();

  // Helper to count commits within past N days
  const getCommitCountInRange = (days) => {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return allDays
      .filter(d => new Date(d.date) >= cutoff)
      .reduce((sum, d) => sum + d.contributionCount, 0);
  };

  const count30 = getCommitCountInRange(30);
  const count60 = getCommitCountInRange(60);
  const count90 = getCommitCountInRange(90);

  let targetWeeks = 12; // Default to ~3 months
  let signalLabel = 'LAST 90 DAYS';

  if (count30 >= 25) {
    targetWeeks = 5; // Focus on the intense last 4-5 weeks
    signalLabel = 'LAST 30 DAYS';
  } else if (count60 >= 40) {
    targetWeeks = 9; // ~2 months
    signalLabel = 'LAST 60 DAYS';
  } else if (count90 >= 60) {
    targetWeeks = 13;
    signalLabel = 'LAST QUARTER';
  } else {
    targetWeeks = 26; // 6 months maximum to maintain visual density
    signalLabel = 'LAST 6 MONTHS';
  }

  // Update header label in the HUD
  const labelEl = document.getElementById('git-signal-label');
  if (labelEl) labelEl.textContent = signalLabel;

  // Slice only the most recent N weeks to render
  const visibleWeeks = weeksData.slice(-targetWeeks);
  renderWeeksGrid(visibleWeeks);
}

// =============================================================================
// BOOTSTRAP
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  syncGithubTelemetry();
  connectLanyardSocket();
  syncChessTelemetry();
  initAuxTracks();
});