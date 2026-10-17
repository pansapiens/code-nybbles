import { describe, expect, it } from 'vitest'
import { addDays, type LocalDate } from '../dates'
import {
  canRepair,
  equipFreeze,
  initialStreak,
  isMilestone,
  isStreakAtRisk,
  onSessionCompleted,
  reconcileStreak,
  repairCost,
  repairStreak,
  type StreakState,
} from '../streak'

const D0 = '2026-10-01'

/** Simulate opening the app on each listed day offset (relative to D0) and doing one session. */
function play(offsets: number[], start: StreakState = initialStreak(D0)) {
  let s = start
  const events = []
  for (const o of offsets) {
    const day = addDays(D0, o)
    const r1 = reconcileStreak(s, day)
    const r2 = onSessionCompleted(r1.state, day)
    s = r2.state
    events.push(...r1.events, ...r2.events)
  }
  return { s, events }
}

describe('streak', () => {
  it('extends once per day, never double-counts', () => {
    const { s } = play([0, 0, 1, 2, 2])
    expect(s.currentStreak).toBe(3)
    expect(s.longestStreak).toBe(3)
  })

  it('grants starter freezes once', () => {
    const { s, events } = play([0, 1])
    expect(s.freezesEquipped).toBe(2)
    expect(events.filter((e) => e.type === 'freeze_equipped')).toHaveLength(1)
  })

  it('consumes a freeze per missed day; frozen days keep but do not add', () => {
    const { s, events } = play([0, 1, 3]) // day 2 missed
    expect(s.currentStreak).toBe(3)
    expect(s.freezesEquipped).toBe(1)
    expect(s.days[addDays(D0, 2)]).toBe('frozen')
    expect(events.some((e) => e.type === 'freeze_used')).toBe(true)
  })

  it('loses the streak when freezes run out', () => {
    const { s } = play([0, 1, 2, 3, 7]) // days 4,5 frozen, 6 lost
    expect(s.currentStreak).toBe(1)
    expect(s.lostStreak).toMatchObject({ length: 4, lostOn: addDays(D0, 6) })
    expect(s.days[addDays(D0, 6)]).toBe('missed')
  })

  it('does not settle today, so an evening session still counts', () => {
    let s = play([0]).s
    s = reconcileStreak(s, addDays(D0, 1)).state
    s = reconcileStreak(s, addDays(D0, 1)).state
    expect(s.currentStreak).toBe(1)
    expect(s.freezesEquipped).toBe(2)
  })

  it('bounds long absences and handles a clock moved backwards', () => {
    const { s } = play([0, 1, 2])
    const far = reconcileStreak(s, addDays(D0, 5000))
    expect(far.state.currentStreak).toBe(0)
    expect(far.events.filter((e) => e.type === 'freeze_used')).toHaveLength(2)
    const back = reconcileStreak(s, addDays(D0, -30))
    expect(back.state).toEqual(s)
  })

  it('timezone travel backwards re-enters the same date without double-counting', () => {
    // Session at 23:30 on day 1 in Melbourne, fly west and the local date is day 1 again.
    const { s } = play([0, 1, 1])
    expect(s.currentStreak).toBe(2)
  })

  it('repairs with gems within 2 days of loss', () => {
    const lost = play([0, 1, 2, 3, 4, 8]).s // lost 5 days (frozen 5,6; lost on 7)
    const today: LocalDate = addDays(D0, 8)
    expect(canRepair(lost, today)).toBe(true)
    expect(repairCost(5)).toBe(150)
    expect(repairCost(500)).toBe(1000)
    const { state } = repairStreak(lost, today, 'gems')
    expect(state.currentStreak).toBe(6) // 5 restored + today's
    expect(state.days[addDays(D0, 7)]).toBe('repaired')
    expect(state.lostStreak).toBeUndefined()
    expect(canRepair(lost, addDays(D0, 10))).toBe(false)
  })

  it('earns back after 3 sessions on one day', () => {
    let { s } = play([0, 1, 2, 3, 4, 8])
    const today = addDays(D0, 8)
    s = onSessionCompleted(s, today).state
    expect(s.currentStreak).toBe(1)
    const r = onSessionCompleted(s, today)
    expect(r.state.currentStreak).toBe(6)
    expect(r.events.some((e) => e.type === 'streak_repaired' && e.via === 'earn-back')).toBe(true)
  })

  it('does not offer repair for short streaks', () => {
    const { s } = play([0, 1, 5])
    expect(s.lostStreak?.length).toBe(2)
    expect(canRepair(s, addDays(D0, 5))).toBe(false)
  })

  it('milestones, freeze cap and at-risk state', () => {
    expect([3, 7, 365, 400, 500].every(isMilestone)).toBe(true)
    expect([1, 4, 366, 450].some(isMilestone)).toBe(false)
    const { s } = play([0])
    expect(equipFreeze(s)).toBeNull()
    expect(isStreakAtRisk(s, addDays(D0, 1), 19)).toBe(true)
    expect(isStreakAtRisk(s, addDays(D0, 1), 17)).toBe(false)
    expect(isStreakAtRisk(s, D0, 20)).toBe(false)
  })
})
