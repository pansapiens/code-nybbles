import { describe, expect, it } from 'vitest'
import {
  BEGINNER_FINAL,
  buy,
  completeLesson,
  completePlacement,
  completePractice,
  type Ctx,
  type DomainEvent,
  fold,
  HEART_REGEN_MS,
  heartsAt,
  initialProgress,
  type LessonResult,
  openChest,
  type Progress,
  rewindProgress,
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
    // Code Reads and checkpoints have flat XP, with no perfect bonus.
    expect(completeLesson(s.state, lesson({ codeRead: true }), ctx(T0)).xp).toBe(15)
    expect(completeLesson(s.state, lesson({ checkpoint: true }), ctx(T0)).xp).toBe(30)
    // Build steps are 15 XP, plus 20 when the last one completes the Build.
    expect(completeLesson(s.state, lesson({ build: 'step' }), ctx(T0)).xp).toBe(15)
    expect(completeLesson(s.state, lesson({ build: 'final' }), ctx(T0)).xp).toBe(35)
    // A hint drops the perfect bonus and the perfect gems. Combo XP is added on top.
    const hinted = completeLesson(initialProgress(), lesson({ hinted: true, comboXp: 2 }), ctx(T0))
    expect(hinted.xp).toBe(12)
    expect(hinted.state.perfectLessons).toBe(0)
    expect(hinted.events.some((e) => e.type === 'gems_awarded' && e.payload.reason === 'perfect-lesson')).toBe(false)
    expect(completePractice(initialProgress(), 'smart', [], ctx(T0), 2).xp).toBe(12)
    // Passing the last beginner checkpoint unlocks Rustacean Initiate.
    const final = completeLesson(s.state, lesson({ levelId: BEGINNER_FINAL, checkpoint: true }), ctx(T0))
    expect(final.state.achievements['rustacean-initiate']).toBeDefined()
  })

  it('rewinds lessons from a unit on, and leaves xp, gems and the streak where they were', () => {
    const s = session()
    s.run(completeLesson(s.state, lesson({ levelId: 'early', results: [{ ref: 'early/l1/q', concepts: ['intro'], ok: true }] }), ctx(T0)))
    s.run(completeLesson(s.state, lesson({ levelId: 'late', mistakes: 1, results: [{ ref: 'late/l1/q', concepts: ['var.let'], ok: false }] }), ctx(T0 + 1000)))
    s.run(openChest(s.state, 'chest-late', ctx(T0 + 1500)))
    const before = s.state
    s.run(rewindProgress(s.state, { unitId: 'u2', levelIds: ['late'], chestIds: ['chest-late'], conceptIds: ['var.let'] }, ctx(T0 + 2000)))
    expect(s.state.levels.early?.lessons).toBe(1)
    expect(s.state.levels.late).toBeUndefined()
    expect(s.state.openedChests).toEqual([])
    expect(s.state.mistakes['late/l1/q']).toBeUndefined()
    expect(s.state.concepts.intro).toBeDefined()
    expect(s.state.concepts['var.let']).toBeUndefined()
    expect(s.state.xp).toBe(before.xp)
    expect(s.state.gems).toBe(before.gems)
    expect(s.state.last).toEqual(before.last)
    expect(s.state.streak.currentStreak).toBe(before.streak.currentStreak)
    expect(fold(s.log)).toEqual(s.state)

    s.run(completeLesson(s.state, lesson({ levelId: 'late' }), ctx(T0 + 3000)))
    expect(s.state.levels.late?.lessons).toBe(1)
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

  describe('concept strength and mistakes', () => {
    const r = (ref: string, concepts: string[], ok: boolean) => ({ ref, concepts, ok })

    it('moves concepts up a Leitner box on all-correct and resets on a miss', () => {
      const s = session()
      s.run(completeLesson(s.state, lesson({ results: [r('a', ['c.x'], true), r('b', ['c.x', 'c.y'], true), r('c', ['c.y'], false)] }), ctx(T0)))
      expect(s.state.concepts['c.x']).toEqual({ box: 1, due: '2026-10-02', correct: 2, incorrect: 0 })
      expect(s.state.concepts['c.y']).toEqual({ box: 0, due: '2026-10-01', correct: 1, incorrect: 1 })
      s.run(completePractice(s.state, 'smart', [r('a', ['c.x'], true)], ctx(T0 + DAY)))
      expect(s.state.concepts['c.x']).toMatchObject({ box: 2, due: '2026-10-04' })
      expect(s.state.concepts['c.y']).toMatchObject({ box: 0 }) // untouched: not in the results
      // Right again before it's due: no promotion, due date kept.
      s.run(completePractice(s.state, 'smart', [r('a', ['c.x'], true)], ctx(T0 + 2 * DAY)))
      expect(s.state.concepts['c.x']).toMatchObject({ box: 2, due: '2026-10-04', correct: 4 })
      // Reviewed on each due date, it climbs to box 6 and stays there.
      const dayOf = (date: string) => (Date.parse(date) - Date.parse('2026-10-01')) / DAY
      for (let i = 0; i < 5; i++) s.run(completePractice(s.state, 'smart', [r('a', ['c.x'], true)], ctx(T0 + dayOf(s.state.concepts['c.x']!.due) * DAY)))
      expect(s.state.concepts['c.x']?.box).toBe(6)
      const late = dayOf(s.state.concepts['c.x']!.due)
      s.run(completePractice(s.state, 'smart', [r('a', ['c.x'], false)], ctx(T0 + (late - 3) * DAY)))
      expect(s.state.concepts['c.x']).toMatchObject({ box: 0 }) // a miss resets even before it's due
      expect(fold(s.log)).toEqual(s.state)
    })

    it('tracks unresolved mistakes, capped at the latest 50, and folds old events without results', () => {
      const s = session()
      s.run(completeLesson(s.state, lesson({ results: [r('a', ['c.x'], false), r('b', ['c.x'], false)] }), ctx(T0)))
      expect(Object.keys(s.state.mistakes)).toEqual(['a', 'b'])
      s.run(completePractice(s.state, 'mistakes', [r('a', ['c.x'], true)], ctx(T0 + 1000)))
      expect(Object.keys(s.state.mistakes)).toEqual(['b'])
      const many = Array.from({ length: 60 }, (_, i) => r(`m${i}`, ['c.x'], false))
      s.run(completePractice(s.state, 'smart', many, ctx(T0 + 2000)))
      expect(Object.keys(s.state.mistakes)).toHaveLength(50)
      expect(s.state.mistakes.m59).toBeDefined()
      expect(s.state.mistakes.m9).toBeUndefined()

      const old = completeLesson(initialProgress(), lesson(), ctx(T0)).events
      delete (old[0] as { payload: { results?: unknown } }).payload.results
      expect(fold(old).concepts).toEqual({})
    })

    it('practice earns 10 XP, counts for the streak, never costs hearts and refills one', () => {
      const s = session()
      for (let i = 0; i < 2; i++) s.run(wrongAnswer(s.state, ctx(T0)))
      s.run(completePractice(s.state, 'smart', [r('a', ['c.x'], false)], ctx(T0)))
      expect(s.state.xp).toBe(10)
      expect(s.state.streak.currentStreak).toBe(1)
      expect(heartsAt(s.state.hearts, T0)).toBe(4)
    })
  })

  it('placement marks levels and chests without XP, gems, sessions or achievements, and never lowers progress', () => {
    const s = session()
    s.run(completeLesson(s.state, lesson({ levelId: 'a', accuracy: 0.9, mistakes: 1 }), ctx(T0)))
    const before = s.state
    const payload = { source: 'placement' as const, levels: [{ id: 'a', lessons: 1 }, { id: 'b', lessons: 3 }, { id: 'c', lessons: 2 }], chests: ['u.chest-1'] }
    s.run(completePlacement(s.state, payload, ctx(T0 + 60_000)))
    expect(s.state.levels.b).toMatchObject({ lessons: 3, viaPlacement: true })
    expect(s.state.levels.a).toBe(before.levels.a) // already at least that far
    s.run(completeLesson(s.state, lesson({ levelId: 'c', lessonId: 'l2' }), ctx(T0 + 120_000)))
    expect(s.state.levels.c!.viaPlacement).toBeUndefined() // playing it for real clears the flag
    expect(s.state.openedChests).toEqual(['u.chest-1'])
    expect(s.state.xp).toBe(before.xp + 15)
    expect(s.state.perfectLessons).toBe(before.perfectLessons + 1)
    expect(s.state.streak.currentStreak).toBe(1)

    s.run(completePlacement(s.state, { ...payload, levels: [{ id: 'b', lessons: 1 }] }, ctx(T0 + 180_000)))
    expect(s.state.levels.b!.lessons).toBe(3)
    expect(fold(s.log)).toEqual(s.state)
  })

  it('placement past the beginner course does not earn Rustacean Initiate until it is played', () => {
    const s = session()
    s.run(completePlacement(s.state, { source: 'jump', levels: [{ id: BEGINNER_FINAL, lessons: 1 }], chests: [] }, ctx(T0)))
    s.run(completeLesson(s.state, lesson({ levelId: 'x' }), ctx(T0 + 1000)))
    expect(s.state.achievements['rustacean-initiate']).toBeUndefined()
    s.run(completeLesson(s.state, lesson({ levelId: BEGINNER_FINAL, checkpoint: true }), ctx(T0 + 2000)))
    expect(s.state.achievements['rustacean-initiate']).toBeDefined()
  })
})
