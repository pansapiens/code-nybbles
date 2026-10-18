import { expect, it } from 'vitest'
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

it('skips times already past, streak reminders without a streak, and everything when off', () => {
  expect(times({ ...base, now: local('2026-03-10', 20), streak: 0 })).toEqual([local('2026-03-11', 19, 30), local('2026-03-12', 19, 30)])
  expect(planReminders({ ...base, reminderTime: '' })).toEqual([])
  expect(new Set(planReminders({ ...base, doneToday: true }).map((r) => r.id)).size).toBe(4)
})
