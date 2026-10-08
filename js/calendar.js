// =============================================================================
// GOOGLE CALENDAR TELEMETRY: #out_event PARSER
// =============================================================================

const CALENDAR_API_KEY = 'AIzaSyDReXA4LBLtDAakYX7z3V50koNNPCk_gog'; // <-- Insert your key
const CALENDAR_ID = encodeURIComponent('brook2022nets@gmail.com'); // <-- Encodes @ safely

async function fetchLastSeenTelemetry() {
  const lastSeenEl = document.getElementById('hud-last-seen');
  const locationEl = document.getElementById('hud-last-location');
  if (!lastSeenEl) return;

  try {
    // 1. Look back 7 days so completed events today are included
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events` +
      `?key=${CALENDAR_API_KEY}` +
      `&timeMin=${oneWeekAgo}` +
      `&singleEvents=true` +
      `&orderBy=startTime` +
      `&maxResults=100`;

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Google Calendar API error: HTTP ${res.status}`);
    const data = await res.json();

    const now = new Date();

    // 2. Filter events with #out_event in title or description
    const outEvents = (data.items || []).filter(ev => {
      const summary = ev.summary || '';
      const desc = ev.description || '';
      return /#out_eve?mt?/i.test(summary) || /#out_eve?mt?/i.test(desc);
    });

    if (outEvents.length === 0) {
      lastSeenEl.textContent = 'CAMPUS DORM / LAB';
      return;
    }

    // 3. Sort strictly by start time descending (newest first)
    outEvents.sort((a, b) => {
      const startA = new Date(a.start?.dateTime || a.start?.date);
      const startB = new Date(b.start?.dateTime || b.start?.date);
      return startB - startA;
    });

    // 4. Find the most recent event that has ALREADY started (either active or finished)
    const recentOrCurrent = outEvents.find(ev => {
      const start = new Date(ev.start?.dateTime || ev.start?.date);
      return start <= now;
    });

    const targetEvent = recentOrCurrent || outEvents[0];

    // 5. Clean event title: strip #out_event / #out_evemt and excess whitespace
    const cleanTitle = (targetEvent.summary || 'Club Meeting')
      .replace(/#out_eve?mt?/gi, '')
      .trim();

    // 6. Check if it is happening right now vs completed
    const start = new Date(targetEvent.start?.dateTime || targetEvent.start?.date);
    const end = new Date(targetEvent.end?.dateTime || targetEvent.end?.date);
    const isLive = start <= now && now <= end;

    lastSeenEl.textContent = isLive ? `● LIVE: ${cleanTitle.toUpperCase()}` : cleanTitle.toUpperCase();

    // 7. Update location if set on Google Calendar (e.g., "Teas Me")
    if (locationEl && targetEvent.location) {
      locationEl.textContent = targetEvent.location.toUpperCase();
    }
  } catch (err) {
    console.warn('[Calendar Telemetry]:', err.message);
    lastSeenEl.textContent = 'PURDUE INDY CAMPUS';
  }
}

// Auto-run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchLastSeenTelemetry);
} else {
  fetchLastSeenTelemetry();
}