import { describe, expect, it } from 'vitest'
import {
  buy,
  completeLesson,
  type Ctx,
  type DomainEvent,
  fold,
  HEART_REGEN_MS,
  heartsAt,
  initialProgress,
  type LessonResult,
  openChest,
  type Progress,
  viewAt,
  wrongAnswer,
} from '../progress'

const TZ = 'Australia/Melbourne'
const DAY = 24 * 60 * 60 * 1000
/** Noon on 2026-10-01 in Melbourne (UTC+10, before DST starts on 10-04). */
const T0 = Date.UTC(2026, 9, 1, 2)
const lesson = (over: Partial<LessonResult> = {}): LessonResult => ({
  levelId: 's.u.a',
  lessonId: 'l1',
  checkpoint: false,
  accuracy: 1,
  mistakes: 0,
  durationMs: 60_000,
  ...over,
})
const ctx = (now: number, over: Partial<Ctx> = {}): Ctx => ({ now, tz: TZ, dailyGoalXp: 20, random: () => 0, ...over })

/** Runs commands like the app does, keeping the log; returns both the live state and the log. */
function session() {
  let state: Progress = initialProgress()
  const log: DomainEvent[] = []
  const run = (r: { events: DomainEvent[]; state: Progress } | { error: string }) => {
    if ('error' in r) throw new Error(r.error)
    state = r.state
    log.push(...r.events)
    return r
  }
  return { run, get state() { return state }, log }
}

describe('progress', () => {
  it('awards XP, perfect gems, first achievement, starter freezes and the daily chest', () => {
    const s = session()
    const r = s.run(completeLesson(s.state, lesson(), ctx(T0))) as ReturnType<typeof completeLesson>
    expect(r.xp).toBe(15)
    expect(s.state.xp).toBe(15)
    expect(s.state.gems).toBe(5 + 25) // perfect lesson + "Hello, World!"
    expect(s.state.streak.currentStreak).toBe(1)
    expect(s.state.streak.freezesEquipped).toBe(2)
    expect(r.notices.some((n) => n.type === 'daily_goal_reached')).toBe(false) // 15 < 20

    const r2 = completeLesson(s.state, lesson({ mistakes: 2, accuracy: 0.8 }), ctx(T0 + 60_000))
    s.run(r2)
    expect(r2.notices).toContainEqual({ type: 'daily_goal_reached', gems: 10 })
    expect(s.state.daily['2026-10-01']).toEqual({ xp: 25, sessions: 2, chest: true })
    expect(s.state.levels['s.u.a']).toMatchObject({ lessons: 2, bestAccuracy: 1 })
  })

  it('live state equals a replay of the log, across gaps, freezes, loss and repair', () => {
    const s = session()
    for (let d = 0; d < 5; d++) s.run(completeLesson(s.state, lesson(), ctx(T0 + d * DAY)))
    expect(s.state.streak.currentStreak).toBe(5)
    // Away 10-06 to 10-09: two freezes cover 10-06 and 10-07, the streak is lost on 10-08.
    const v = viewAt(s.state, T0 + 9 * DAY, TZ)
    expect(v.streak.currentStreak).toBe(0)
    expect(v.streak.days['2026-10-07']).toBe('frozen')
    expect(v.streak.days['2026-10-08']).toBe('missed')
    expect(v.canRepair).toBe(true) // 2 days after the loss
    expect(viewAt(s.state, T0 + 10 * DAY, TZ).canRepair).toBe(false)
    // Coming back on 10-11 and doing a lesson starts a new streak; replay agrees.
    s.run(completeLesson(s.state, lesson(), ctx(T0 + 10 * DAY)))
    expect(s.state.streak.currentStreak).toBe(1)
    expect(fold(s.log)).toEqual(s.state)
  })

  it('repairs with gems, then replays to the same state', () => {
    const s = session()
    // 10 XP goal: a daily chest each day, so there are enough gems (25 + 5x5 + 50 milestone + 5x10).
    for (let d = 0; d < 5; d++) s.run(completeLesson(s.state, lesson(), ctx(T0 + d * DAY, { dailyGoalXp: 10 })))
    expect(s.state.gems).toBe(150)
    const day9 = T0 + 9 * DAY
    const v = viewAt(s.state, day9, TZ)
    expect(v.canRepair).toBe(true)
    expect(v.repairCost).toBe(150)
    s.run(buy(s.state, 'repair', ctx(day9)))
    expect(viewAt(s.state, day9, TZ).streak.currentStreak).toBe(5)
    expect(fold(s.log)).toEqual(s.state)
  })

  it('shop: freeze cap and gem checks', () => {
    const s = session()
    s.run(completeLesson(s.state, lesson(), ctx(T0)))
    expect(buy(s.state, 'freeze', ctx(T0))).toEqual({ error: 'freezes-full' })
    expect(buy(s.state, 'hearts', ctx(T0))).toEqual({ error: 'hearts-full' })
    s.run(wrongAnswer(s.state, ctx(T0)))
    expect(buy(s.state, 'hearts', ctx(T0))).toEqual({ error: 'not-enough-gems' })
  })

  it('hearts regenerate one per 4 hours', () => {
    const s = session()
    for (let i = 0; i < 3; i++) s.run(wrongAnswer(s.state, ctx(T0)))
    expect(heartsAt(s.state.hearts, T0)).toBe(2)
    expect(heartsAt(s.state.hearts, T0 + HEART_REGEN_MS)).toBe(3)
    // Losing one after a partial regen keeps the remaining regen progress.
    s.run(wrongAnswer(s.state, ctx(T0 + HEART_REGEN_MS + 1000)))
    expect(heartsAt(s.state.hearts, T0 + HEART_REGEN_MS + 1000)).toBe(2)
    expect(heartsAt(s.state.hearts, T0 + 2 * HEART_REGEN_MS)).toBe(3)
    expect(heartsAt(s.state.hearts, T0 + 100 * HEART_REGEN_MS)).toBe(5)
  })

  it('path chests open once', () => {
    const s = session()
    s.run(openChest(s.state, 'u.chest-3', ctx(T0, { random: () => 0.999 })))
    expect(s.state.gems).toBe(50)
    expect(openChest(s.state, 'u.chest-3', ctx(T0)).events).toEqual([])
  })

  it('forgives a date skipped by flying east across the date line', () => {
    const s = session()
    // Lessons on 10-04 and 10-05 at 22:00 in Honolulu (UTC-10); the second is 10-06 08:00 UTC.
    const honolulu = Date.UTC(2026, 9, 6, 8)
    s.run(completeLesson(s.state, lesson(), { ...ctx(honolulu - DAY), tz: 'Pacific/Honolulu' }))
    s.run(completeLesson(s.state, lesson(), { ...ctx(honolulu), tz: 'Pacific/Honolulu' }))
    // Next lesson 13 hours later in Auckland (UTC+13): 10-07 10:00 local. 10-06 never happened locally.
    const auckland = honolulu + 13 * 60 * 60 * 1000
    s.run(completeLesson(s.state, lesson(), { ...ctx(auckland), tz: 'Pacific/Auckland' }))
    expect(s.state.streak.days['2026-10-06']).toBe('repaired')
    expect(s.state.streak.freezesEquipped).toBe(2) // no freeze spent on the skipped date
    expect(fold(s.log)).toEqual(s.state)
  })
})
