/** A daily calendar event at the learner's reminder time (plans/01 §8.1). Floating local time, so the phone keeps the clock time. */

const pad = (n: number) => String(n).padStart(2, '0')

export function dailyReminderIcs(time: string, now = new Date()): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) throw new Error(`reminder time must be HH:mm, got ${JSON.stringify(time)}`)
  const start = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${match[1]}${match[2]}00`
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Code Nybbles//Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:daily-reminder@code-nybbles',
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:Time for a Rust nybble',
    'DESCRIPTION:One short lesson keeps you moving.',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
