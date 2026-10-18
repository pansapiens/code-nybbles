/** Local-only error log (plans/01 M5): the last few errors, kept for exported backups. No telemetry. */
const KEY = 'code-nybbles:errors'
const MAX = 50

export type LoggedError = { ts: number; message: string }

export const loggedErrors = (): LoggedError[] => JSON.parse(localStorage.getItem(KEY) ?? '[]')

export function logError(e: unknown) {
  const message = (e instanceof Error ? e.stack ?? e.message : String(e)).slice(0, 2000)
  try {
    localStorage.setItem(KEY, JSON.stringify([...loggedErrors(), { ts: Date.now(), message }].slice(-MAX)))
  } catch {
    // Storage full or blocked: losing the log is better than failing again.
  }
}

addEventListener('error', (e) => logError(e.error ?? e.message))
addEventListener('unhandledrejection', (e) => logError(e.reason))
