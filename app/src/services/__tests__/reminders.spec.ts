import { expect, it } from 'vitest'
import { dailyReminderIcs } from '../calendar'
import { planReminders, type ReminderState } from '../reminders'

const local = (d: string, hh: number, mm = 0) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y!, m! - 1, day!, hh, mm).getTime()
}
const base: ReminderState = { now: local('2026-03-10', 9), today: '2026-03-10', reminderTime: '19:30', streak: 4, doneToday: false }
const times = (s: ReminderState) => planReminders(s).map((r) => r.at)

it('plans a daily and a streak reminder for each of three days, at most two a day', () => {
  expect(times(base)).toEqual([
    local('2026-03-10', 19, 30), local('2026-03-10', 22),
    local('2026-03-11', 19, 30),
    local('2026-03-12', 19, 30),
  ])
})

it('drops today once a lesson is done and gives tomorrow both reminders', () => {
  expect(times({ ...base, doneToday: true })).toEqual([
    local('2026-03-11', 19, 30), local('2026-03-11', 22),
    local('2026-03-12', 19, 30), local('2026-03-12', 22),
  ])
})

it('builds a daily calendar event at the reminder time, in local time', () => {
  const now = new Date(2026, 2, 10, 8, 15, 0)
  const ics = dailyReminderIcs('19:30', now)
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
  expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  expect(ics).toContain(`DTSTART:${day}T193000\r\n`)
  expect(ics).toContain('RRULE:FREQ=DAILY')
  expect(ics).toContain('SUMMARY:Time for a Rust nybble')
  expect(ics).not.toMatch(/DTSTART:[^\r\n]*Z/)
  expect(() => dailyReminderIcs('7:30 pm')).toThrow(/HH:mm/)
})

it('skips times already past, streak reminders without a streak, and everything when off', () => {
  expect(times({ ...base, now: local('2026-03-10', 20), streak: 0 })).toEqual([local('2026-03-11', 19, 30), local('2026-03-12', 19, 30)])
  expect(planReminders({ ...base, reminderTime: '' })).toEqual([])
  expect(new Set(planReminders({ ...base, doneToday: true }).map((r) => r.id)).size).toBe(4)
})
