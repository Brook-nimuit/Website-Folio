const assert = require('node:assert/strict');
const { chooseCalendarEvent, getFallbackCalendarEvent } = require('./calendar-logic.js');

const now = new Date('2026-09-19T10:48:00');

const upcomingEvents = [
  { summary: 'Design Review', start: new Date('2026-09-19T11:30:00Z'), end: new Date('2026-09-19T12:00:00Z'), location: 'Zoom' },
  { summary: 'Gym Session', start: new Date('2026-09-19T12:00:00Z'), end: new Date('2026-09-19T13:00:00Z'), location: 'West Lafayette Athletic Club' },
  { summary: 'Late Meeting', start: new Date('2026-09-19T18:00:00Z'), end: new Date('2026-09-19T19:00:00Z'), location: 'Office' },
];

assert.equal(chooseCalendarEvent(upcomingEvents, now)?.summary, 'Gym Session');
assert.equal(getFallbackCalendarEvent(now)?.summary, 'Gym Session');

console.log('calendar logic tests passed');
