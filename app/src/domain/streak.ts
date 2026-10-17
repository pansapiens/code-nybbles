import { addDays, daysBetween, type LocalDate } from './dates'

export type DayStatus = 'active' | 'frozen' | 'repaired' | 'missed'

export interface LostStreak {
  length: number
  lostOn: LocalDate
  earnBackProgress: number
  earnBackDate?: LocalDate
}

export interface StreakState {
  currentStreak: number
  longestStreak: number
  /** Last day whose status is final. Today is never settled. */
  lastSettledDate: LocalDate
  freezesEquipped: number
  starterFreezesGranted: boolean
  lostStreak?: LostStreak
  days: Record<LocalDate, DayStatus>
}

export type StreakEvent =
  | { type: 'freeze_used'; date: LocalDate }
  | { type: 'freeze_equipped'; count: number; reason: 'starter' | 'shop' | 'reward' }
  | { type: 'streak_lost'; length: number; date: LocalDate }
  | { type: 'streak_extended'; length: number; date: LocalDate }
  | { type: 'streak_milestone'; length: number }
  | { type: 'streak_repaired'; length: number; via: 'gems' | 'earn-back' }

export const MAX_FREEZES = 2
export const STARTER_FREEZES = 2
export const EARN_BACK_SESSIONS = 3
/** Bound on the reconciliation loop, so a wildly wrong clock can't hang the app. */
export const RECONCILE_CAP_DAYS = 400

export function initialStreak(today: LocalDate): StreakState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastSettledDate: addDays(today, -1),
    freezesEquipped: 0,
    starterFreezesGranted: false,
    days: {},
  }
}

export function isMilestone(n: number): boolean {
  return [3, 7, 14, 30, 50, 100, 150, 200, 365].includes(n) || (n > 365 && n % 100 === 0)
}

function clone(s: StreakState): StreakState {
  return { ...s, days: { ...s.days }, lostStreak: s.lostStreak && { ...s.lostStreak } }
}

/**
 * Settle every unsettled day before `today`: consume a freeze per missed day,
 * or lose the streak when none are left. Run on app start, on visibility change
 * and at local midnight.
 */
export function reconcileStreak(
  state: StreakState,
  today: LocalDate,
): { state: StreakState; events: StreakEvent[] } {
  const s = clone(state)
  const events: StreakEvent[] = []
  const yesterday = addDays(today, -1)
  // Clock moved backwards: nothing to settle, and never un-settle days.
  if (daysBetween(s.lastSettledDate, yesterday) <= 0) return { state: s, events }

  let d = addDays(s.lastSettledDate, 1)
  if (daysBetween(d, today) > RECONCILE_CAP_DAYS) d = addDays(today, -RECONCILE_CAP_DAYS)

  for (; d < today; d = addDays(d, 1)) {
    if (s.days[d] === 'active') continue
    if (s.currentStreak === 0) continue
    if (s.freezesEquipped > 0) {
      s.freezesEquipped -= 1
      s.days[d] = 'frozen'
      events.push({ type: 'freeze_used', date: d })
    } else {
      events.push({ type: 'streak_lost', length: s.currentStreak, date: d })
      s.lostStreak = { length: s.currentStreak, lostOn: d, earnBackProgress: 0 }
      s.currentStreak = 0
      s.days[d] = 'missed'
    }
  }
  s.lastSettledDate = yesterday
  return { state: s, events }
}

/** Record an XP-earning session (lesson, practice, Code Read, checkpoint) on `today`. */
export function onSessionCompleted(
  state: StreakState,
  today: LocalDate,
): { state: StreakState; events: StreakEvent[] } {
  let s = clone(state)
  const events: StreakEvent[] = []

  if (s.days[today] !== 'active') {
    s.days[today] = 'active'
    s.currentStreak += 1
    s.longestStreak = Math.max(s.longestStreak, s.currentStreak)
    events.push({ type: 'streak_extended', length: s.currentStreak, date: today })
    if (isMilestone(s.currentStreak)) events.push({ type: 'streak_milestone', length: s.currentStreak })
    if (!s.starterFreezesGranted) {
      s.starterFreezesGranted = true
      s.freezesEquipped = Math.max(s.freezesEquipped, STARTER_FREEZES)
      events.push({ type: 'freeze_equipped', count: STARTER_FREEZES, reason: 'starter' })
    }
  }

  if (s.lostStreak && canRepair(s, today)) {
    const lost = s.lostStreak
    if (lost.earnBackDate !== today) {
      lost.earnBackDate = today
      lost.earnBackProgress = 0
    }
    lost.earnBackProgress += 1
    if (lost.earnBackProgress >= EARN_BACK_SESSIONS) {
      const r = repairStreak(s, today, 'earn-back')
      s = r.state
      events.push(...r.events)
    }
  }
  return { state: s, events }
}

/** Repair or earn-back is offered for lost streaks of >= 3 days, within 2 days of the loss. */
export function canRepair(state: StreakState, today: LocalDate): boolean {
  const lost = state.lostStreak
  return !!lost && lost.length >= 3 && daysBetween(lost.lostOn, today) <= 2
}

export function repairCost(lostLength: number): number {
  return Math.min(1000, 100 + 10 * lostLength)
}

/**
 * Restore a lost streak: gap days become 'repaired' (they keep the streak alive
 * but don't add to it), and any streak started since the loss is added on top.
 * Charging gems is the caller's job (economy).
 */
export function repairStreak(
  state: StreakState,
  today: LocalDate,
  via: 'gems' | 'earn-back',
): { state: StreakState; events: StreakEvent[] } {
  if (!canRepair(state, today)) return { state, events: [] }
  const s = clone(state)
  const lost = s.lostStreak!
  for (let d = lost.lostOn; d < today; d = addDays(d, 1)) {
    if (s.days[d] !== 'active' && s.days[d] !== 'frozen') s.days[d] = 'repaired'
  }
  s.currentStreak += lost.length
  s.longestStreak = Math.max(s.longestStreak, s.currentStreak)
  delete s.lostStreak
  return { state: s, events: [{ type: 'streak_repaired', length: s.currentStreak, via }] }
}

/** Buy or award a freeze. Returns null when already at the cap. */
export function equipFreeze(state: StreakState): StreakState | null {
  if (state.freezesEquipped >= MAX_FREEZES) return null
  return { ...clone(state), freezesEquipped: state.freezesEquipped + 1 }
}

/** After 6pm local time with a live streak and nothing done today. */
export function isStreakAtRisk(state: StreakState, today: LocalDate, localHour: number): boolean {
  return state.currentStreak > 0 && state.days[today] !== 'active' && localHour >= 18
}
