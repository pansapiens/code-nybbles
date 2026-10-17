import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, localHour, toLocalDate } from '../dates'
import { uuidv7 } from '../ids'

describe('dates', () => {
  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('is unaffected by DST transitions', () => {
    // Sydney DST starts 2026-10-04, Melbourne/Sydney DST ends 2026-04-05; US 2026-03-08
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04')
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
    expect(daysBetween('2026-10-01', '2026-10-10')).toBe(9)
    expect(daysBetween('2026-10-10', '2026-10-01')).toBe(-9)
  })

  it('computes local dates in a given timezone', () => {
    const ts = Date.UTC(2026, 9, 17, 14, 30) // 14:30 UTC
    expect(toLocalDate(ts, 'UTC')).toBe('2026-10-17')
    expect(toLocalDate(ts, 'Australia/Melbourne')).toBe('2026-10-18') // UTC+11
    expect(toLocalDate(ts, 'America/Los_Angeles')).toBe('2026-10-17')
    expect(localHour(ts, 'Australia/Melbourne')).toBe(1)
    expect(localHour(ts, 'UTC')).toBe(14)
  })
})

describe('uuidv7', () => {
  it('has version 7, RFC variant, and sorts by time', () => {
    const a = uuidv7(1_700_000_000_000)
    const b = uuidv7(1_700_000_000_001)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a < b).toBe(true)
  })
})
