/** Calendar date in the user's local timezone, 'YYYY-MM-DD'. */
export type LocalDate = string

const DAY_MS = 86_400_000

function parse(d: LocalDate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y!, m! - 1, day!)
}

function format(utcMs: number): LocalDate {
  return new Date(utcMs).toISOString().slice(0, 10)
}

/**
 * Date-only arithmetic. Dates are treated as UTC midnights, which have no DST,
 * so adding days never drifts by an hour.
 */
export function addDays(d: LocalDate, n: number): LocalDate {
  return format(parse(d) + n * DAY_MS)
}

/** Whole days from `a` to `b` (negative if `b` is before `a`). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((parse(b) - parse(a)) / DAY_MS)
}

/** The local calendar date of instant `ts` in IANA timezone `tz` (default: device timezone). */
export function toLocalDate(ts: number, tz?: string): LocalDate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ts)
}

/** Local hour (0-23) of instant `ts` in timezone `tz`. */
export function localHour(ts: number, tz?: string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(ts),
  )
}

export function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
