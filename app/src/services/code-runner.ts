/**
 * Runs Rust on the public Rust Playground (plans/01 §7, Tier 1). Never throws: failures resolve as results.
 * ponytail: just the remote tier. The planned SelfCheckRunner / WasmCompilerRunner interface waits for the
 * in-browser compiler (the spike said "not yet", plans/spikes/in-browser-compiler.md); add it when a second runner exists.
 */
export interface RunResult {
  ok: boolean
  stdout: string
  stderr: string
  errorCodes: string[]
  /** The Playground couldn't be reached, so the caller should fall back to a self-check. */
  offline?: boolean
}

const URL = 'https://play.rust-lang.org/execute'
const MAX_RUNS = 10
const WINDOW_MS = 60_000
const TIMEOUT_MS = 15_000

let inFlight = false
let stamps: number[] = []

/** Seconds until another run is allowed (0 when free). */
export function retryIn(): number {
  const now = Date.now()
  stamps = stamps.filter((t) => now - t < WINDOW_MS)
  if (inFlight) return 1
  return stamps.length < MAX_RUNS ? 0 : Math.ceil((stamps[0]! + WINDOW_MS - now) / 1000)
}

export const parseErrorCodes = (stderr: string): string[] => [...new Set(stderr.match(/(?<=error\[)E\d{4}(?=\])/g))]

const fail = (stderr: string, offline = false): RunResult => ({ ok: false, stdout: '', stderr, errorCodes: [], offline })

export async function run(code: string, opts: { mode: 'run' | 'test' }): Promise<RunResult> {
  if (!navigator.onLine) return fail("You're offline.", true)
  if (retryIn()) return fail('Too many runs. Wait a moment and try again.')
  inFlight = true
  stamps.push(Date.now())
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'stable', mode: 'debug', edition: '2024', crateType: 'bin', tests: opts.mode === 'test', code, backtrace: false }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return fail(`The Playground answered with an error (${res.status}).`)
    const body = (await res.json()) as { success: boolean; stdout: string; stderr: string }
    // Cargo's own progress lines ("Compiling playground ...", "Finished", "Running") aren't program or compiler output.
    const stderr = body.stderr.replace(/^ {2,}(Compiling|Finished|Running) .*\n?/gm, '')
    return { ok: body.success, stdout: body.stdout, stderr, errorCodes: parseErrorCodes(stderr) }
  } catch {
    return fail("Couldn't reach play.rust-lang.org.", true)
  } finally {
    inFlight = false
  }
}
