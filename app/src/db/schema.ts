import Dexie, { type Table } from 'dexie'
import type { LocalDate } from '@/domain/dates'
import type { DailyGoal, DomainEvent, Progress } from '@/domain/progress'

/** Append-only source of truth, designed for v2 sync (plans/01 §6, §9.4). Never mutated. */
export type ActivityEvent = DomainEvent & {
  id: string // uuidv7
  deviceId: string
  syncedAt?: number
}

export interface Profile {
  id: 'me'
  createdAt: number
  deviceId: string
  displayName?: string
  experience: 'new' | 'other-lang' | 'some-rust'
  dailyGoalXp: DailyGoal
  reminderTime?: string // 'HH:mm'
  /** Set when the first-launch onboarding finishes (or is abandoned for the placement test). */
  onboardedAt?: number
  mascotOutfit?: string
}

/**
 * Derived state: `fold(events)` cached as one row (plans/01 §6 "derived tables").
 * ponytail: a single snapshot row instead of a table per entity; fine while Progress is a few hundred KB
 * (it grows by one `days` entry per day). Split it into tables if it ever gets large.
 */
export interface Derived {
  id: 'progress'
  /** Bump `DERIVED_VERSION` when the reducer changes; stale snapshots are rebuilt from events. */
  version: number
  state: Progress
}

export interface ConceptStrength {
  conceptId: string
  box: number // Leitner box 0..6
  dueDate: LocalDate
  correct: number
  incorrect: number
  lastSeenAt: number
}

export interface MistakeRecord {
  id: string
  exerciseId: string
  lessonId: string
  answeredAt: number
  given: unknown
  resolved: boolean
}

export const DB_NAME = 'code-nybbles'

export class CodeNybblesDB extends Dexie {
  events!: Table<ActivityEvent, string>
  profile!: Table<Profile, string>
  derived!: Table<Derived, string>
  concepts!: Table<ConceptStrength, string>
  mistakes!: Table<MistakeRecord, string>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      events: 'id, type, localDate, ts, syncedAt',
      profile: 'id',
      levelProgress: 'levelId',
      dailyStats: 'localDate',
      streak: 'id',
      wallet: 'id',
      concepts: 'conceptId, dueDate',
      mistakes: 'id, exerciseId, resolved, answeredAt',
      settings: 'key',
    })
    // v2: per-entity derived tables replaced by one snapshot row; settings live in localStorage.
    this.version(2).stores({
      levelProgress: null,
      dailyStats: null,
      streak: null,
      wallet: null,
      settings: null,
      derived: 'id',
    })
  }
}

export const db = new CodeNybblesDB()
