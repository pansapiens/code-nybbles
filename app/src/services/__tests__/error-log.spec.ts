import { expect, it } from 'vitest'
import { backupDue } from '@/db/repo'
import { logError, loggedErrors } from '../error-log'

it('keeps the 50 most recent errors', () => {
  for (let i = 0; i < 60; i++) logError(new Error(`e${i}`))
  const log = loggedErrors()
  expect(log).toHaveLength(50)
  expect(log[0]!.message).toContain('e10')
  expect(log[49]!.message).toContain('e59')
})

it('reminds about backups 30 days after the first launch or the last backup', () => {
  const day = 24 * 3600_000
  expect(backupDue(31 * day, 0)).toBe(true)
  expect(backupDue(31 * day, 0, 2 * day)).toBe(false)
  expect(backupDue(29 * day, 0)).toBe(false)
})
