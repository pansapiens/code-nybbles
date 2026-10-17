/**
 * Progress: the derived game state, folded from the append-only event log (plans/01 §3, §6).
 *
 * Commands (`completeLesson`, `buy`, ...) decide which events to write; `apply` folds one event into the
 * state. Before each event the streak is settled up to that event's local date, so freeze use and streak
 * loss are derived on replay rather than stored, and a live run and `fold(allEvents)` always agree.
 * Rewards (XP, gems) are written into events at the time, so later rule changes don't rewrite history.
 */
import { addDays, daysBetween, localHour, toLocalDate, type LocalDate } from './dates'
import {
  canRepair,
  equipFreeze,
  initialStreak,
  MAX_FREEZES,
  onSessionCompleted,
  reconcileStreak,
  repairCost,
  repairStreak,
  type StreakEvent,
  type StreakState,
} from './streak'

// ---- Rules (plans/01 §3.2, §3.8, §3.9) ----

export const XP = { lesson: 10, perfectBonus: 5, checkpoint: 30 }
export const GEMS = { perfectLesson: 5, checkpoint: 50, dailyChest: [10, 30], pathChest: [20, 50] } as const
export const PRICES = { freeze: 200, hearts: 350 } as const
export const MAX_HEARTS = 5
export const HEART_REGEN_MS = 4 * 60 * 60 * 1000
export const DAILY_GOALS = [10, 20, 30, 50] as const
export type DailyGoal = (typeof DAILY_GOALS)[number]

export function milestoneGems(streak: number): number {
  return streak < 7 ? 50 : streak < 30 ? 100 : streak < 100 ? 200 : streak < 365 ? 300 : 500
}

// ---- Events ----

export type EventBody =
  | {
      type: 'lesson_completed'
      payload: {
        levelId: string
        lessonId: string
        checkpoint: boolean
        xp: number
        accuracy: number
        mistakes: number
        durationMs: number
      }
    }
  | {
      type: 'gems_awarded'
      payload: {
        gems: number
        reason: 'perfect-lesson' | 'checkpoint' | 'daily-goal' | 'path-chest' | 'milestone' | 'achievement'
        ref?: string
      }
    }
  | { type: 'gems_spent'; payload: { gems: number; item: ShopItem } }
  | { type: 'heart_lost'; payload: Record<string, never> }
  | { type: 'achievement_unlocked'; payload: { id: string } }

export type ShopItem = 'freeze' | 'repair' | 'hearts'
export type EventType = EventBody['type']
export type DomainEvent = EventBody & { ts: number; localDate: LocalDate; tz: string }

/** Things the UI may want to celebrate or explain, produced while folding. */
export type Notice =
  | StreakEvent
  | { type: 'daily_goal_reached'; gems: number }
  | { type: 'gems'; gems: number; reason: string }
  | { type: 'achievement'; id: string }

// ---- State ----

export interface LevelStats {
  /** Completed lessons (replays count too); the ring is full at the level's lesson count. */
  lessons: number
  bestAccuracy: number
  firstCompletedAt: number
}

export interface Progress {
  streak: StreakState
  xp: number
  gems: number
  hearts: { count: number; updatedAt: number }
  daily: Record<LocalDate, { xp: number; sessions: number; chest?: boolean }>
  levels: Record<string, LevelStats>
  openedChests: string[]
  achievements: Record<string, number>
  perfectLessons: number
  checkpointsPassed: number
  /** The last event folded in; used for timezone-travel forgiveness. */
  last?: { ts: number; tz: string; localDate: LocalDate }
}

export function initialProgress(): Progress {
  return {
    streak: initialStreak('1970-01-02'),
    xp: 0,
    gems: 0,
    hearts: { count: MAX_HEARTS, updatedAt: 0 },
    daily: {},
    levels: {},
    openedChests: [],
    achievements: {},
    perfectLessons: 0,
    checkpointsPassed: 0,
  }
}

// ---- Hearts ----

export function heartsAt(h: Progress['hearts'], now: number): number {
  if (h.count >= MAX_HEARTS) return MAX_HEARTS
  return Math.min(MAX_HEARTS, h.count + Math.floor(Math.max(0, now - h.updatedAt) / HEART_REGEN_MS))
}

function loseHeart(h: Progress['hearts'], now: number): Progress['hearts'] {
  const current = heartsAt(h, now)
  if (current >= MAX_HEARTS) return { count: MAX_HEARTS - 1, updatedAt: now } // regen timer starts now
  const regenerated = current - h.count
  return { count: Math.max(0, current - 1), updatedAt: h.updatedAt + regenerated * HEART_REGEN_MS }
}

// ---- Streak settling ----

/**
 * Flying east across the date line can skip a local date entirely. If the previous and next moments map
 * to a date in between under the other timezone, that date is forgiven (kept alive, not counted)
 * (plans/01 §3.7: "accept the day if any event exists on either local date").
 */
export function forgiveTravel(
  s: StreakState,
  prev: { ts: number; tz: string; localDate: LocalDate } | undefined,
  next: { ts: number; tz: string; localDate: LocalDate },
): StreakState {
  if (!prev || prev.tz === next.tz || daysBetween(prev.localDate, next.localDate) < 2) return s
  const days = { ...s.days }
  for (const d of [toLocalDate(next.ts, prev.tz), toLocalDate(prev.ts, next.tz)])
    if (d > prev.localDate && d < next.localDate && !days[d]) days[d] = 'repaired'
  return { ...s, days }
}

function settle(p: Progress, at: { ts: number; tz: string; localDate: LocalDate }) {
  // The first event starts the streak calendar; nothing before it can be missed.
  const start = p.last ? p.streak : { ...p.streak, lastSettledDate: addDays(at.localDate, -1) }
  return reconcileStreak(forgiveTravel(start, p.last, at), at.localDate)
}

// ---- Fold ----

export function apply(p: Progress, ev: DomainEvent): { state: Progress; notices: Notice[] } {
  const r = settle(p, ev)
  const notices: Notice[] = [...r.events]
  const s: Progress = { ...p, streak: r.state, last: { ts: ev.ts, tz: ev.tz, localDate: ev.localDate } }
  const day = { ...(s.daily[ev.localDate] ?? { xp: 0, sessions: 0 }) }

  switch (ev.type) {
    case 'lesson_completed': {
      const { levelId, xp, accuracy, mistakes, checkpoint } = ev.payload
      const prev = s.levels[levelId]
      s.levels = {
        ...s.levels,
        [levelId]: {
          lessons: (prev?.lessons ?? 0) + 1,
          bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
          firstCompletedAt: prev?.firstCompletedAt ?? ev.ts,
        },
      }
      s.xp += xp
      day.xp += xp
      day.sessions += 1
      if (!mistakes) s.perfectLessons += 1
      if (checkpoint && !prev) s.checkpointsPassed += 1
      const st = onSessionCompleted(s.streak, ev.localDate)
      s.streak = st.state
      notices.push(...st.events)
      break
    }
    case 'gems_awarded':
      s.gems += ev.payload.gems
      if (ev.payload.reason === 'daily-goal') day.chest = true
      if (ev.payload.reason === 'path-chest' && ev.payload.ref) s.openedChests = [...s.openedChests, ev.payload.ref]
      notices.push({ type: 'gems', gems: ev.payload.gems, reason: ev.payload.reason })
      break
    case 'gems_spent':
      s.gems -= ev.payload.gems
      if (ev.payload.item === 'freeze') s.streak = equipFreeze(s.streak) ?? s.streak
      if (ev.payload.item === 'hearts') s.hearts = { count: MAX_HEARTS, updatedAt: ev.ts }
      if (ev.payload.item === 'repair') {
        const rep = repairStreak(s.streak, ev.localDate, 'gems')
        s.streak = rep.state
        notices.push(...rep.events)
      }
      break
    case 'heart_lost':
      s.hearts = loseHeart(s.hearts, ev.ts)
      break
    case 'achievement_unlocked':
      s.achievements = { ...s.achievements, [ev.payload.id]: ev.ts }
      notices.push({ type: 'achievement', id: ev.payload.id })
      break
  }
  s.daily = { ...s.daily, [ev.localDate]: day }
  return { state: s, notices }
}

export function fold(events: DomainEvent[]): Progress {
  return events.reduce((p, ev) => apply(p, ev).state, initialProgress())
}

// ---- Read model for "now" ----

/** The state as of `now`: streak settled to today (without writing anything), hearts regenerated. */
export function viewAt(p: Progress, now: number, tz: string) {
  const today = toLocalDate(now, tz)
  const streak = p.last ? settle(p, { ts: now, tz, localDate: today }).state : initialStreak(today)
  return {
    today,
    streak,
    hearts: heartsAt(p.hearts, now),
    todayXp: p.daily[today]?.xp ?? 0,
    extendedToday: streak.days[today] === 'active',
    canRepair: canRepair(streak, today),
    repairCost: streak.lostStreak ? repairCost(streak.lostStreak.length) : 0,
  }
}
export type ProgressView = ReturnType<typeof viewAt>

// ---- Achievements (plans/01 §3.10) ----

export interface Achievement {
  id: string
  title: string
  description: string
  gems: number
  earned: (p: Progress, ev: DomainEvent) => boolean
}

const lessonAt = (ev: DomainEvent, test: (hour: number) => boolean) =>
  ev.type === 'lesson_completed' && test(localHour(ev.ts, ev.tz))

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'hello-world', title: 'Hello, World!', description: 'Finish your first lesson', gems: 25, earned: (p) => Object.keys(p.levels).length > 0 },
  { id: 'perfectionist', title: 'Perfectionist', description: 'Finish 10 lessons without a mistake', gems: 50, earned: (p) => p.perfectLessons >= 10 },
  { id: 'checkpoint', title: 'Checked', description: 'Pass a unit checkpoint', gems: 25, earned: (p) => p.checkpointsPassed >= 1 },
  { id: 'streak-7', title: 'Week one', description: 'Reach a 7-day streak', gems: 50, earned: (p) => p.streak.longestStreak >= 7 },
  { id: 'streak-30', title: 'Habit', description: 'Reach a 30-day streak', gems: 100, earned: (p) => p.streak.longestStreak >= 30 },
  { id: 'streak-100', title: 'Centurion', description: 'Reach a 100-day streak', gems: 100, earned: (p) => p.streak.longestStreak >= 100 },
  { id: 'streak-365', title: 'Year of Rust', description: 'Reach a 365-day streak', gems: 100, earned: (p) => p.streak.longestStreak >= 365 },
  { id: 'night-owl', title: 'Night Owl', description: 'Finish a lesson after 10pm', gems: 25, earned: (_p, ev) => lessonAt(ev, (h) => h >= 22) },
  { id: 'early-crab', title: 'Early Crab', description: 'Finish a lesson before 7am', gems: 25, earned: (_p, ev) => lessonAt(ev, (h) => h < 7) },
  { id: 'xp-500', title: 'Five hundred', description: 'Earn 500 XP', gems: 50, earned: (p) => p.xp >= 500 },
]

// ---- Commands ----

export interface Ctx {
  now: number
  tz: string
  dailyGoalXp: number
  /** Injected for tests; returns [0, 1). */
  random?: () => number
}

/** Builds a batch of events, folding each so later decisions see earlier effects. */
function batch(p: Progress, ctx: Ctx) {
  let state = p
  const events: DomainEvent[] = []
  const notices: Notice[] = []
  const localDate = toLocalDate(ctx.now, ctx.tz)
  const push = (body: EventBody) => {
    const ev = { ...body, ts: ctx.now, localDate, tz: ctx.tz } as DomainEvent
    const r = apply(state, ev)
    state = r.state
    events.push(ev)
    notices.push(...r.notices)
    return { ev, notices: r.notices }
  }
  return { push, get state() { return state }, events, notices, localDate }
}

const between = ([lo, hi]: readonly [number, number], random: () => number) => lo + Math.floor(random() * (hi - lo + 1))

function unlockAchievements(b: ReturnType<typeof batch>, trigger: DomainEvent) {
  for (const a of ACHIEVEMENTS) {
    if (b.state.achievements[a.id] || !a.earned(b.state, trigger)) continue
    b.push({ type: 'achievement_unlocked', payload: { id: a.id } })
    b.push({ type: 'gems_awarded', payload: { gems: a.gems, reason: 'achievement', ref: a.id } })
  }
}

export interface LessonResult {
  levelId: string
  lessonId: string
  checkpoint: boolean
  accuracy: number
  mistakes: number
  durationMs: number
}

export function completeLesson(p: Progress, r: LessonResult, ctx: Ctx) {
  const random = ctx.random ?? Math.random
  const b = batch(p, ctx)
  const goalBefore = (p.daily[b.localDate]?.xp ?? 0) >= ctx.dailyGoalXp
  const firstPass = !p.levels[r.levelId]
  const xp = r.checkpoint ? XP.checkpoint : XP.lesson + (r.mistakes ? 0 : XP.perfectBonus)
  const { ev, notices } = b.push({ type: 'lesson_completed', payload: { ...r, xp } })

  if (!r.mistakes) b.push({ type: 'gems_awarded', payload: { gems: GEMS.perfectLesson, reason: 'perfect-lesson' } })
  if (r.checkpoint && firstPass)
    b.push({ type: 'gems_awarded', payload: { gems: GEMS.checkpoint, reason: 'checkpoint', ref: r.levelId } })
  for (const n of notices)
    if (n.type === 'streak_milestone')
      b.push({ type: 'gems_awarded', payload: { gems: milestoneGems(n.length), reason: 'milestone', ref: String(n.length) } })
  const day = b.state.daily[b.localDate]
  if (!goalBefore && (day?.xp ?? 0) >= ctx.dailyGoalXp && !day?.chest) {
    const gems = between(GEMS.dailyChest, random)
    b.push({ type: 'gems_awarded', payload: { gems, reason: 'daily-goal', ref: b.localDate } })
    b.notices.push({ type: 'daily_goal_reached', gems })
  }
  unlockAchievements(b, ev)
  return { events: b.events, notices: b.notices, state: b.state, xp }
}

export type BuyError = 'not-enough-gems' | 'freezes-full' | 'nothing-to-repair' | 'hearts-full'

export function buy(p: Progress, item: ShopItem, ctx: Ctx): { events: DomainEvent[]; state: Progress } | { error: BuyError } {
  const v = viewAt(p, ctx.now, ctx.tz)
  const price = item === 'repair' ? v.repairCost : PRICES[item]
  if (item === 'freeze' && v.streak.freezesEquipped >= MAX_FREEZES) return { error: 'freezes-full' }
  if (item === 'repair' && !v.canRepair) return { error: 'nothing-to-repair' }
  if (item === 'hearts' && v.hearts >= MAX_HEARTS) return { error: 'hearts-full' }
  if (p.gems < price) return { error: 'not-enough-gems' }
  const b = batch(p, ctx)
  b.push({ type: 'gems_spent', payload: { gems: price, item } })
  return { events: b.events, state: b.state }
}

export function openChest(p: Progress, chestId: string, ctx: Ctx) {
  if (p.openedChests.includes(chestId)) return { events: [], state: p, gems: 0 }
  const b = batch(p, ctx)
  const gems = between(GEMS.pathChest, ctx.random ?? Math.random)
  b.push({ type: 'gems_awarded', payload: { gems, reason: 'path-chest', ref: chestId } })
  return { events: b.events, state: b.state, gems }
}

/** Hearts mode only, new lessons only (plans/01 §3.8). */
export function wrongAnswer(p: Progress, ctx: Ctx) {
  const b = batch(p, ctx)
  b.push({ type: 'heart_lost', payload: {} })
  return { events: b.events, state: b.state }
}
