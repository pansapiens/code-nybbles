import Dexie, { type Table } from 'dexie'
import type { LocalDate } from '@/domain/dates'
import type { StreakState as DomainStreakState } from '@/domain/streak'

export type EventType =
  | 'lesson_completed'
  | 'practice_completed'
  | 'checkpoint_passed'
  | 'code_read_completed'
  | 'xp_awarded'
  | 'gems_awarded'
  | 'gems_spent'
  | 'freeze_equipped'
  | 'freeze_used'
  | 'streak_lost'
  | 'streak_repaired'
  | 'heart_lost'
  | 'hearts_refilled'
  | 'achievement_unlocked'
  | 'settings_changed'

/** Append-only source of truth, designed for v2 sync (plans/01 §6, §9.4). Never mutated. */
export interface ActivityEvent {
  id: string // uuidv7
  deviceId: string
  type: EventType
  ts: number // epoch ms UTC
  localDate: LocalDate // computed at write time
  tz: string // IANA timezone at write time
  payload: Record<string, unknown>
  syncedAt?: number
}

export interface Profile {
  id: 'me'
  createdAt: number
  deviceId: string
  displayName?: string
  experience: 'new' | 'other-lang' | 'some-rust'
  dailyGoalXp: 10 | 20 | 30 | 50
  reminderTime?: string // 'HH:mm'
  mascotOutfit?: string
}

export interface LevelProgress {
  levelId: string
  lessonsCompleted: number
  completedAt?: number
  legendaryAt?: number
  bestAccuracy?: number
}

/** Derived. Per-day streak status lives in StreakState.days only. */
export interface DailyStat {
  localDate: LocalDate
  xp: number
  sessions: number
}

/** Derived singleton cache of the domain streak state. */
export interface StreakState extends DomainStreakState {
  id: 'me'
}

export interface Wallet {
  id: 'me'
  gems: number
  hearts: number
  heartsUpdatedAt: number
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

export interface Setting {
  key: string
  value: unknown
}

export const DB_NAME = 'code-nybbles'

export class CodeNybblesDB extends Dexie {
  events!: Table<ActivityEvent, string>
  profile!: Table<Profile, string>
  levelProgress!: Table<LevelProgress, string>
  dailyStats!: Table<DailyStat, string>
  streak!: Table<StreakState, string>
  wallet!: Table<Wallet, string>
  concepts!: Table<ConceptStrength, string>
  mistakes!: Table<MistakeRecord, string>
  settings!: Table<Setting, string>

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
  }
}

export const db = new CodeNybblesDB()
