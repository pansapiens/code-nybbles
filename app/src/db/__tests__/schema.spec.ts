import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { completeLesson, initialProgress } from '@/domain/progress'
import { commit, exportBackup, importBackup, loadProgress, rebuildDerived, resetProgress } from '../repo'
import { CodeNybblesDB } from '../schema'

const ctx = { now: Date.UTC(2026, 9, 1, 2), tz: 'Australia/Melbourne', dailyGoalXp: 20, random: () => 0 }
const lesson = { levelId: 's.u.a', lessonId: 'l1', checkpoint: false, accuracy: 1, mistakes: 0, durationMs: 1 }

describe('repo', () => {
  it('commits, rebuilds to the same state, and round-trips a backup idempotently', async () => {
    const db = new CodeNybblesDB('test-repo')
    const { events } = completeLesson(initialProgress(), lesson, ctx)
    const live = await commit(events, db)
    expect(live.xp).toBe(15)
    expect(await loadProgress(db)).toEqual(live)
    expect(await rebuildDerived(db)).toEqual(live)

    const backup = JSON.parse(JSON.stringify(await exportBackup(db)))
    expect(await importBackup(backup, db)).toBe(0) // already have every event
    await resetProgress(db)
    expect((await loadProgress(db)).xp).toBe(0)
    expect(await importBackup(backup, db)).toBe(events.length)
    expect(await loadProgress(db)).toEqual(live)
    await expect(importBackup({ app: 'something-else' }, db)).rejects.toThrow(/app/)
    db.close()
  })
})
