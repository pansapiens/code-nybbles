/**
 * The only code that writes game state (plans/01 §6): `commit()` appends events and updates the derived
 * snapshot in one transaction; `rebuildDerived()` replays everything.
 */
import { z } from 'zod'
import { uuidv7 } from '@/domain/ids'
import { apply, DAILY_GOALS, type DomainEvent, fold, type Progress } from '@/domain/progress'
import { type ActivityEvent, type CodeNybblesDB, db as defaultDb, type Profile } from './schema'

export const DERIVED_VERSION = 3

export async function getProfile(db: CodeNybblesDB = defaultDb): Promise<Profile> {
  const existing = await db.profile.get('me')
  if (existing) return existing
  const profile: Profile = {
    id: 'me',
    createdAt: Date.now(),
    deviceId: uuidv7(), // not crypto.randomUUID: that only exists in secure contexts (HTTPS/localhost), so LAN http dev fails
    experience: 'new',
    dailyGoalXp: 20,
  }
  await db.profile.put(profile)
  return profile
}

export const updateProfile = (changes: Partial<Omit<Profile, 'id'>>, db: CodeNybblesDB = defaultDb) =>
  db.profile.update('me', changes)

/** Ids strictly increase, so events sharing a `ts` (one batch, or two in the same ms) keep their order. */
let lastIdMs = 0
function nextId(ts: number) {
  lastIdMs = Math.max(lastIdMs + 1, ts)
  return uuidv7(lastIdMs)
}

const sortEvents = (es: ActivityEvent[]) => es.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1))

export async function rebuildDerived(db: CodeNybblesDB = defaultDb): Promise<Progress> {
  return db.transaction('rw', db.events, db.derived, async () => {
    const state = fold(sortEvents(await db.events.toArray()))
    await db.derived.put({ id: 'progress', version: DERIVED_VERSION, state })
    return state
  })
}

export async function loadProgress(db: CodeNybblesDB = defaultDb): Promise<Progress> {
  const row = await db.derived.get('progress')
  return row?.version === DERIVED_VERSION ? row.state : rebuildDerived(db)
}

/** Append events and fold them into the snapshot atomically. Events get ids here. */
export async function commit(events: DomainEvent[], db: CodeNybblesDB = defaultDb): Promise<Progress> {
  const { deviceId } = await getProfile(db)
  return db.transaction('rw', db.events, db.derived, async () => {
    const row = await db.derived.get('progress')
    let state = row?.version === DERIVED_VERSION ? row.state : fold(sortEvents(await db.events.toArray()))
    const stored = events.map((e) => ({ ...e, id: nextId(e.ts), deviceId }) as ActivityEvent)
    await db.events.bulkAdd(stored)
    for (const e of stored) state = apply(state, e).state
    await db.derived.put({ id: 'progress', version: DERIVED_VERSION, state })
    return state
  })
}

// ---- Backup (plans/01 §6) ----

const SETTINGS_KEYS = ['code-nybbles:theme', 'code-nybbles:settings']

const BackupSchema = z.object({
  app: z.literal('code-nybbles'),
  schemaVersion: z.literal(1),
  exportedAt: z.number(),
  profile: z
    .object({
      createdAt: z.number(),
      deviceId: z.string(),
      displayName: z.string().optional(),
      experience: z.enum(['new', 'other-lang', 'some-rust']),
      dailyGoalXp: z.union(DAILY_GOALS.map((g) => z.literal(g))),
      reminderTime: z.string().optional(),
      onboardedAt: z.number().optional(),
      mascotOutfit: z.string().optional(),
    })
    .optional(),
  settings: z.record(z.string(), z.string()).default({}),
  events: z.array(
    z.object({
      id: z.uuid(),
      deviceId: z.string(),
      type: z.enum(['lesson_completed', 'practice_completed', 'placement_completed', 'gems_awarded', 'gems_spent', 'heart_lost', 'achievement_unlocked']),
      ts: z.number(),
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      tz: z.string(),
      payload: z.record(z.string(), z.unknown()),
      syncedAt: z.number().optional(),
    }),
  ),
})
export type Backup = z.output<typeof BackupSchema>

export async function exportBackup(db: CodeNybblesDB = defaultDb): Promise<Backup> {
  const { id: _id, ...profile } = await getProfile(db)
  const settings: Record<string, string> = {}
  for (const k of SETTINGS_KEYS) {
    const v = localStorage.getItem(k)
    if (v !== null) settings[k] = v
  }
  return {
    app: 'code-nybbles',
    schemaVersion: 1,
    exportedAt: Date.now(),
    profile,
    settings,
    events: sortEvents(await db.events.toArray()),
  }
}

/** Validate, merge events by id (importing twice is harmless), rebuild. Returns the number of new events. */
export async function importBackup(json: unknown, db: CodeNybblesDB = defaultDb): Promise<number> {
  const backup = BackupSchema.parse(json)
  const known = new Set(await db.events.toCollection().primaryKeys())
  const fresh = backup.events.filter((e) => !known.has(e.id)) as ActivityEvent[]
  await db.events.bulkAdd(fresh)
  if (backup.profile) await db.profile.put({ ...backup.profile, id: 'me' })
  for (const [k, v] of Object.entries(backup.settings)) if (SETTINGS_KEYS.includes(k)) localStorage.setItem(k, v)
  await rebuildDerived(db)
  return fresh.length
}

export async function resetProgress(db: CodeNybblesDB = defaultDb) {
  await db.transaction('rw', db.events, db.derived, db.concepts, db.mistakes, async () => {
    await Promise.all([db.events.clear(), db.derived.clear(), db.concepts.clear(), db.mistakes.clear()])
  })
}
