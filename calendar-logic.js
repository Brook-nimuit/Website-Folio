(function (global) {
  const DEFAULT_FALLBACK_EVENTS = [
    { summary: 'Gym', location: 'NIFS, INDIANAPOLIS', startHour: 12, endHour: 13 },
    { summary: 'Work Session', location: 'Remote', startHour: 14, endHour: 15 },
    { summary: 'Deep Work', location: 'Library', startHour: 16, endHour: 18 }
  ];

  function toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function chooseCalendarEvent(events, now = new Date()) {
    const currentTime = toDate(now);
    if (!Array.isArray(events) || !currentTime) return null;

    const upcoming = events
      .map((event) => ({ ...event, start: toDate(event.start) }))
      .filter((event) => event.start && event.start >= currentTime)
      .sort((a, b) => a.start - b.start);

    if (currentTime.getUTCHours() < 12) {
      const noonPriority = upcoming.filter((event) => event.start.getUTCHours() >= 12);
      return noonPriority[0] || upcoming[0] || null;
    }

    return upcoming[0] || null;
  }

  function getFallbackCalendarEvent(now = new Date()) {
    const currentTime = toDate(now);
    if (!currentTime) return null;

    const startOfDay = new Date(currentTime);
    startOfDay.setHours(0, 0, 0, 0);

    const events = DEFAULT_FALLBACK_EVENTS.map((event) => ({
      summary: event.summary,
      location: event.location,
      start: new Date(startOfDay.getTime() + event.startHour * 60 * 60 * 1000),
      end: new Date(startOfDay.getTime() + event.endHour * 60 * 60 * 1000)
    }));

    const upcoming = events
      .filter((event) => event.start >= currentTime)
      .sort((a, b) => a.start - b.start);

    return upcoming[0] || events[0] || null;
  }

  const api = { chooseCalendarEvent, getFallbackCalendarEvent };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.calendarLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
