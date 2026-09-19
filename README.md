# pf-website
Website about me :)

## Calendar configuration

The homepage now defaults to a stable local schedule so it does not keep failing with a 403 from Google Calendar.

To re-enable live Google Calendar syncing, edit the `calendarConfig` object in `index.html`:

```js
const calendarConfig = {
  enableRemoteCalendar: true,
  apiKey: 'YOUR_GOOGLE_API_KEY',
  calendarId: 'your-calendar-id@group.calendar.google.com',
  fallbackEvents: [
    { summary: 'GYM SESSION', location: 'WEST LAFAYETTE ATHLETIC CLUB', startHour: 12, endHour: 13 },
    { summary: 'WORK SESSION', location: 'REMOTE', startHour: 14, endHour: 15 }
  ]
};
```

Steps:

1. Go to Google Cloud Console.
2. Enable the Google Calendar API.
3. Create an API key and keep it restricted only to the Calendar API if needed.
4. Make the calendar public in Google Calendar and enable event details.
5. Set `enableRemoteCalendar` to `true` and add the valid key.

If the request still returns 403, the Google API key or calendar permissions are not valid for the browser request. In that case, keep `enableRemoteCalendar: false` and use the scheduled fallback until the API access is fixed.
