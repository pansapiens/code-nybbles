import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { CodeNybblesDB } from '../schema'
import { uuidv7 } from '@/domain/ids'

describe('CodeNybblesDB', () => {
  it('opens and round-trips an event by indexed localDate', async () => {
    const db = new CodeNybblesDB('test-schema')
    await db.events.add({
      id: uuidv7(),
      deviceId: 'dev',
      type: 'lesson_completed',
      ts: Date.now(),
      localDate: '2026-10-17',
      tz: 'Australia/Melbourne',
      payload: { lessonId: 'x' },
    })
    expect(await db.events.where('localDate').equals('2026-10-17').count()).toBe(1)
    db.close()
  })
})
