// =============================================================================
// TELEMETRY ENGINE: GITHUB, SPOTIFY (LANYARD), & CHESS.COM
// =============================================================================

// In-memory state for live match browsing
let chessGamesBuffer = [];
let currentChessIdx = 0;

// Helper: Human-readable relative timestamps
function formatTimeAgo(isoDate) {
  if (!isoDate) return 'RECENT';
  const diffSec = Math.floor((new Date() - new Date(isoDate)) / 1000);
  if (diffSec < 60) return 'JUST NOW';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}M AGO`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}H AGO`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}D AGO`;
  return `${Math.floor(diffSec / 2592000)}MO AGO`;
}

// =============================================================================
// 1. GITHUB TELEMETRY PIPELINE
// =============================================================================
async function syncGithubTelemetry() {
  const container = document.getElementById('gitCommitStream');
  const timeEl = document.getElementById('gitTime');
  const urlEl = document.getElementById('gitCommitUrl');
  if (!container) return;

  const username = window.APP_CONFIG?.githubUsername || 'Brook-nimuit';

  try {
    const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=15`);
    if (!res.ok) {
      throw new Error(`GITHUB_API_STATUS_${res.status}`);
    }

    const events = await res.json();
    const commits = [];

    // Filter and normalize push events
    for (const evt of events) {
      if (evt.type === 'PushEvent' && evt.payload?.commits?.length) {
        const repoClean = evt.repo.name.replace(`${username}/`, '');
        const commitBatch = [...evt.payload.commits].reverse();

        for (const c of commitBatch) {
          commits.push({
            repo: repoClean,
            message: c.message.split('\n')[0], // Title line only
            sha: (c.sha || 'HEAD').substring(0, 7),
            time: evt.created_at,
            url: `https://github.com/${evt.repo.name}/commit/${c.sha}`
          });
          if (commits.length >= 5) break;
        }
      }
      if (commits.length >= 5) break;
    }

    // Render commits if available
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
          <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="text-[9px] text-purple-400 hover:text-purple-200 shrink-0 font-mono mt-0.5">
            VIEW ↗
          </a>
        </div>
      `).join('');
    } else {
      renderGithubFallback(container, timeEl, username, 'No recent commits logged');
    }
  } catch (err) {
    console.warn('[Telemetry] GitHub sync failed, using fallback:', err.message);
    renderGithubFallback(container, timeEl, username, 'Active development // Local refactors');
  }
}

function renderGithubFallback(container, timeEl, username, message) {
  if (timeEl) timeEl.textContent = 'ACTIVE';
  container.innerHTML = `
    <div class="flex items-start justify-between border-b border-purple-900/40 pb-2 text-[11px]">
      <div class="space-y-0.5 truncate pr-2">
        <div class="flex items-center gap-1.5 font-bold text-purple-300">
          <span>Website-Folio</span>
          <span class="text-[9px] bg-purple-900/60 px-1 rounded text-purple-400 font-mono">HEAD</span>
        </div>
        <p class="text-purple-200/80 truncate italic">"${message}"</p>
      </div>
      <a href="https://github.com/${username}" target="_blank" rel="noopener noreferrer" class="text-[9px] text-purple-400 hover:text-purple-200 shrink-0 font-mono mt-0.5">
        VIEW ↗
      </a>
    </div>
  `;
}

// =============================================================================
// 2. SPOTIFY / LANYARD PIPELINE & FIFO BUFFER
// =============================================================================
function syncRecentTracksBuffer(newTrack) {
  const cacheKey = window.APP_CONFIG?.spotifyCacheKey || 'banimut_recent_tracks';
  let tracks = [];

  try {
    tracks = JSON.parse(localStorage.getItem(cacheKey) || '[]');
  } catch {
    tracks = [];
  }

  // Deduplicate against the most recent entry
  if (newTrack && (!tracks.length || tracks[0].song !== newTrack.song)) {
    tracks.unshift(newTrack);
    if (tracks.length > 5) tracks.pop(); // Keep maximum 5
    try {
      localStorage.setItem(cacheKey, JSON.stringify(tracks));
    } catch (e) {
      console.warn('[Telemetry] LocalStorage write blocked:', e);
    }
  }

  renderRecentTracksUI(tracks);
}

function renderRecentTracksUI(tracks) {
  const container = document.getElementById('recentTracksList');
  if (!container) return;

  if (!tracks || !tracks.length) {
    container.innerHTML = '<div class="text-[11px] text-purple-400/60 italic">Waiting for Spotify broadcast...</div>';
    return;
  }

  container.innerHTML = tracks.map((track, i) => `
    <div class="flex items-center justify-between bg-purple-900/20 p-2 rounded border border-purple-500/10 hover:border-purple-500/30 transition-all gap-2">
      <div class="flex items-center gap-2.5 overflow-hidden min-w-0">
        <img src="${track.albumArt}" alt="art" class="w-8 h-8 rounded object-cover shrink-0 ${i === 0 ? 'border border-emerald-500/40' : 'opacity-60'}" />
        <div class="truncate">
          <p class="text-purple-200 font-bold text-[11px] truncate">${track.song}</p>
          <p class="text-purple-400/80 text-[10px] truncate">${track.artist}</p>
        </div>
      </div>
      <span class="text-[9px] font-mono shrink-0 ${i === 0 ? 'text-emerald-400 font-bold' : 'text-purple-500/60'}">
        ${i === 0 ? '● NOW' : '#' + (i + 1)}
      </span>
    </div>
  `).join('');
}

// =============================================================================
// SPOTIFY LIVE VIA LANYARD WEBSOCKET (ZERO LATENCY)
// =============================================================================
let lanyardSocket = null;
let heartbeatInterval = null;

function connectLanyardSocket() {
  const discordId = window.APP_CONFIG?.discordId || '1035876890126336061';
  const fallbackArt = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%2316122a'/%3E%3Ccircle cx='24' cy='24' r='16' fill='%239d4edd' fill-opacity='.18'/%3E%3Cpath d='M16 30c5.5-1 10.5-.6 16 2M16 24c7-1.2 12.5-.5 18 2.7M16 18.5c8.2-1.8 14.4-.7 20 3.6' stroke='%23e0aaff' stroke-width='2.2' stroke-linecap='round' fill='none'/%3E%3C/svg%3E";

  const songEl = document.getElementById('spotifySong');
  const artistEl = document.getElementById('spotifyArtist');
  const albumEl = document.getElementById('spotifyAlbum');
  const albumArtEl = document.getElementById('spotifyAlbumArt');
  const statusTagEl = document.getElementById('spotifyStatusTag');
  const signalEl = document.getElementById('spotifySignal');

  if (!songEl || !artistEl || !albumEl || !albumArtEl || !statusTagEl) return;

  lanyardSocket = new WebSocket('wss://api.lanyard.rest/socket');

  lanyardSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const { op, d, t } = data;

    // Opcode 1: Hello -> Start heartbeat & subscribe
    if (op === 1) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        lanyardSocket.send(JSON.stringify({ op: 3 }));
      }, d.heartbeat_interval);

      // Opcode 2: Initialize subscription
      lanyardSocket.send(JSON.stringify({
        op: 2,
        d: { subscribe_to_id: discordId }
      }));
    }

    // Event updates: INIT_STATE or PRESENCE_UPDATE
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

        syncRecentTracksBuffer({
          song: spotify.song,
          artist: spotify.artist,
          albumArt: spotify.album_art_url || fallbackArt
        });
      } else {
        songEl.textContent = 'IDLE';
        artistEl.textContent = 'No active track detected';
        albumEl.textContent = 'OFFLINE_STREAM';
        albumArtEl.src = fallbackArt;

        statusTagEl.textContent = 'PAUSED';
        statusTagEl.className = 'text-[10px] text-purple-400/60 bg-purple-950/40 border border-purple-500/20 px-1.5 py-0.5 rounded';
        if (signalEl) signalEl.style.opacity = '0.2';

        syncRecentTracksBuffer(null);
      }
    }
  };

  lanyardSocket.onclose = () => {
    clearInterval(heartbeatInterval);
    // Automatic reconnect with backoff after 5 seconds if disconnected
    setTimeout(connectLanyardSocket, 5000);
  };

  lanyardSocket.onerror = () => {
    lanyardSocket.close();
  };
}
// =============================================================================
// 3. CHESS.COM RECENT MATCH TELEMETRY
// =============================================================================
async function syncChessTelemetry() {
  const chessUser = window.APP_CONFIG?.chessUsername || 'Balandor_Nacho';

  try {
    // 1. Get user game archives list
    const archRes = await fetch(`https://api.chess.com/pub/player/${chessUser}/games/archives`);
    if (!archRes.ok) throw new Error(`CHESS_ARCHIVE_STATUS_${archRes.status}`);
    const archData = await archRes.json();

    if (!archData.archives || !archData.archives.length) return;

    // 2. Fetch the latest month archive
    const latestArchiveUrl = archData.archives[archData.archives.length - 1];
    const gamesRes = await fetch(latestArchiveUrl);
    if (!gamesRes.ok) throw new Error(`CHESS_MONTH_STATUS_${gamesRes.status}`);
    const gamesData = await gamesRes.json();

    const games = gamesData.games || [];
    if (!games.length) return;

    // Keep the 5 most recent matches
    chessGamesBuffer = games.slice(-5).reverse();
    renderChessMatchCard(0);
  } catch (err) {
    console.warn('[Telemetry] Chess sync error:', err.message);
    const detailsEl = document.getElementById('chessMatchDetails');
    if (detailsEl) detailsEl.textContent = 'CHESS_TELEMETRY_STANDBY';
  }
}

function renderChessMatchCard(index) {
  if (!chessGamesBuffer[index]) return;
  currentChessIdx = index;
  const game = chessGamesBuffer[index];
  const chessUser = (window.APP_CONFIG?.chessUsername || 'Balandor_Nacho').toLowerCase();

  // Extract Chess game ID from URL
  const gameId = game.url ? game.url.split('/').pop().split('?')[0] : '';
  const frame = document.getElementById('chessLiveFrame');

  if (frame && gameId) {
    frame.src = `https://www.chess.com/emboard?id=${gameId}`;
  }

  // Determine perspective and opponent
  const isWhite = (game.white?.username || '').toLowerCase() === chessUser;
  const player = isWhite ? game.white : game.black;
  const opponent = isWhite ? game.black : game.white;

  const detailsEl = document.getElementById('chessMatchDetails');
  if (detailsEl) {
    const oppName = opponent?.username || 'Opponent';
    const oppRating = opponent?.rating || '???';
    detailsEl.textContent = `${isWhite ? '♔ White' : '♚ Black'} vs ${oppName} (${oppRating})`;
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
  if (counterEl) {
    counterEl.textContent = `${index + 1} / ${chessGamesBuffer.length}`;
  }

  const prevBtn = document.getElementById('prevChess');
  const nextBtn = document.getElementById('nextChess');
  if (prevBtn) prevBtn.disabled = (index === 0);
  if (nextBtn) nextBtn.disabled = (index === chessGamesBuffer.length - 1);
}

// Global button handler for Prev / Next arrows
window.changeChessGame = function(direction) {
  const targetIdx = currentChessIdx + direction;
  if (targetIdx >= 0 && targetIdx < chessGamesBuffer.length) {
    renderChessMatchCard(targetIdx);
  }
};

// =============================================================================
// LIFECYCLE BOOTSTRAP
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  syncGithubTelemetry();
  syncSpotifyTelemetry();
  syncChessTelemetry();

  // Poll Spotify/Lanyard every 10 seconds
  setInterval(syncSpotifyTelemetry, 10000);
});