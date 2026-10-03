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
    // Look back 14 days so we always catch the latest out event
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events` +
      `?key=${CALENDAR_API_KEY}` +
      `&timeMin=${twoWeeksAgo}` +
      `&singleEvents=true` +
      `&orderBy=startTime` +
      `&maxResults=50`;

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Google Calendar API error: HTTP ${res.status}`);
    const data = await res.json();

    const now = new Date();

    // Filter only events tagged with #out_event or #out_evemt (case-insensitive)
    const outEvents = (data.items || []).filter(ev => {
      const summary = ev.summary || '';
      const desc = ev.description || '';
      return /#out_eve?mt?/i.test(summary) || /#out_eve?mt?/i.test(desc);
    });

    if (outEvents.length === 0) {
      lastSeenEl.textContent = 'CAMPUS DORM / LAB';
      return;
    }

    // Sort descending by event start time
    outEvents.sort((a, b) => {
      const startA = new Date(a.start?.dateTime || a.start?.date);
      const startB = new Date(b.start?.dateTime || b.start?.date);
      return startB - startA;
    });

    // Find the most recent event that started on or before now
    let currentOrPast = outEvents.find(ev => {
      const start = new Date(ev.start?.dateTime || ev.start?.date);
      return start <= now;
    });

    // If none are in the past, pick the earliest upcoming one
    if (!currentOrPast) {
      currentOrPast = outEvents[outEvents.length - 1];
    }

    // Strip #out_event or #out_evemt
    const rawTitle = currentOrPast.summary || 'Campus Activity';
    const cleanTitle = rawTitle.replace(/#out_eve?mt?/gi, '').trim();

    // Inject into HUD
    lastSeenEl.textContent = cleanTitle.toUpperCase();

    if (locationEl && currentOrPast.location) {
      locationEl.textContent = currentOrPast.location.toUpperCase();
    }
  } catch (err) {
    console.error('[Calendar Telemetry Error]:', err);
    lastSeenEl.textContent = 'PURDUE INDY CAMPUS';
  }
}

// Auto-run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchLastSeenTelemetry);
} else {
  fetchLastSeenTelemetry();
}