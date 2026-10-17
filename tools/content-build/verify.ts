/**
 * rust-verify: compile/run every snippet with the pinned rustc (plans/03 §4.2).
 * Raw outcomes are cached by (rustc version, edition, mode, source), so editing an
 * expectation never recompiles, and unchanged snippets are free.
 */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

/** Holds rust-toolchain.toml; rustc run below it uses the pinned toolchain. */
export const VERIFY_DIR = new URL('../rust-verify/', import.meta.url).pathname
const CASES_DIR = join(VERIFY_DIR, 'cases')
const CACHE_DIR = join(VERIFY_DIR, '.cache')
const RUN_TIMEOUT_MS = 10_000
/** Override the linker when the `cc` on PATH can't link Rust std (e.g. a conda gcc with an old sysroot). */
const LINKER = process.env.RUST_VERIFY_LINKER

export type CaseMode = 'run' | 'compile' | 'compile-fail' | 'test'

export interface Case {
  id: string // global snippet id, for messages
  source: string
  mode: CaseMode
  edition: string
  expectStdout?: string
  expectErrors?: string[]
  expectErrorMessage?: string
  expectPanic?: boolean | string
  denyWarnings?: boolean
}

interface Outcome {
  compiled: boolean
  errorCodes: string[]
  /** Rendered error diagnostics, as a learner would see them in a terminal. */
  compilerOutput: string
  stdout?: string
  stderr?: string
  exitCode?: number
  timedOut?: boolean
  /** rustc produced no diagnostics at all (not installed, toolchain download failed). Never cached. */
  toolFailure?: boolean
}

export interface CaseResult {
  id: string
  problems: string[]
  outcome: Outcome
}

let rustcVersion: string | undefined
export async function getRustcVersion(): Promise<string> {
  rustcVersion ??= (await exec('rustc', ['--version'], { cwd: VERIFY_DIR })).stdout.trim()
  return rustcVersion
}

interface Diagnostic {
  $message_type?: string
  level: string
  code?: { code: string } | null
  rendered?: string
}

async function compileAndRun(c: Case, dir: string): Promise<Outcome> {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'main.rs'), c.source)
  const checkOnly = c.mode === 'compile' || c.mode === 'compile-fail'
  const args = [
    '--edition', c.edition,
    '--crate-name', 'main',
    '--error-format=json',
    '--color', 'never',
    ...(c.denyWarnings ? ['-D', 'warnings'] : []),
    ...(LINKER ? ['-C', `linker=${LINKER}`] : []),
    ...(c.mode === 'test' ? ['--test'] : ['--crate-type', 'bin']),
    // MIR, not metadata: deny-by-default lints like unconditional_panic and arithmetic_overflow run on MIR.
    ...(checkOnly ? ['--emit=mir', '-o', 'main.mir'] : ['-o', 'main']),
    'main.rs',
  ]
  let stderr: string
  let compiled = true
  try {
    stderr = (await exec('rustc', args, { cwd: dir })).stderr
  } catch (e) {
    const err = e as { stderr?: string }
    stderr = err.stderr ?? String(e)
    compiled = false
  }
  const diags: Diagnostic[] = stderr
    .split('\n')
    .filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l) as Diagnostic)
    .filter((d) => d.$message_type === 'diagnostic')
  const errors = diags.filter((d) => d.level === 'error')
  const outcome: Outcome = {
    compiled,
    errorCodes: [...new Set(errors.flatMap((d) => (d.code ? [d.code.code] : [])))],
    // Drop the toolchain's build-path prefix: `/rustc/<commit>/library/std/...` -> `library/std/...`
    compilerOutput: errors.map((d) => d.rendered ?? '').join('').replace(/\/rustc\/[0-9a-f]+\//g, ''),
  }
  if ((!compiled && !errors.length) || outcome.compilerOutput.includes('error: linking with'))
    Object.assign(outcome, { compilerOutput: stderr, toolFailure: true })
  if (!compiled || checkOnly) return outcome

  try {
    const r = await exec('./main', [], { cwd: dir, timeout: RUN_TIMEOUT_MS })
    return { ...outcome, stdout: r.stdout, stderr: r.stderr, exitCode: 0 }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; code?: number; killed?: boolean }
    return { ...outcome, stdout: err.stdout, stderr: err.stderr, exitCode: err.code ?? 1, timedOut: !!err.killed }
  }
}

function check(c: Case, o: Outcome): string[] {
  const p: string[] = []
  const firstError = () => o.compilerOutput.split('\n').slice(0, 12).join('\n')
  if (c.mode === 'compile-fail') {
    if (o.compiled) return ['expected a compile error, but it compiled']
    const missing = (c.expectErrors ?? []).filter((code) => !o.errorCodes.includes(code))
    if (missing.length)
      p.push(`expected errors ${missing.join(', ')}; got [${o.errorCodes.join(', ')}]\n${firstError()}`)
    if (c.expectErrorMessage && !o.compilerOutput.includes(c.expectErrorMessage))
      p.push(`compiler output lacks "${c.expectErrorMessage}":\n${firstError()}`)
    return p
  }
  if (o.toolFailure && o.compilerOutput.includes('linking with'))
    return ['rustc could not link. If the `cc` on PATH is unusual (conda/micromamba), set RUST_VERIFY_LINKER=/usr/bin/gcc']
  if (!o.compiled) return [`expected it to compile, but it failed:\n${firstError()}`]
  if (c.mode === 'compile') return p
  if (o.timedOut) return [`timed out after ${RUN_TIMEOUT_MS} ms`]
  const panicked = /panicked at/.test(o.stderr ?? '')
  if (c.expectPanic) {
    if (!panicked) p.push('expected a panic, but it did not panic')
    else if (typeof c.expectPanic === 'string' && !o.stderr!.includes(c.expectPanic))
      p.push(`panic message lacks "${c.expectPanic}":\n${o.stderr}`)
  } else if (o.exitCode !== 0) {
    p.push(`exited with code ${o.exitCode}:\n${o.stderr}`)
  }
  if (c.expectStdout !== undefined && o.stdout !== c.expectStdout)
    p.push(`stdout mismatch\n  expected: ${JSON.stringify(c.expectStdout)}\n  actual:   ${JSON.stringify(o.stdout)}`)
  return p
}

export async function verifyCases(cases: Case[]): Promise<{ results: CaseResult[]; compiled: number }> {
  const version = await getRustcVersion()
  mkdirSync(CACHE_DIR, { recursive: true })
  let compiled = 0
  const results: CaseResult[] = new Array(cases.length)
  let next = 0
  async function worker() {
    while (next < cases.length) {
      const i = next++
      const c = cases[i]!
      const key = createHash('sha256').update(JSON.stringify([version, 'mir', c.edition, c.mode, c.denyWarnings ?? false, c.source])).digest('hex').slice(0, 20)
      const cacheFile = join(CACHE_DIR, `${key}.json`)
      let outcome: Outcome
      if (existsSync(cacheFile)) {
        outcome = JSON.parse(readFileSync(cacheFile, 'utf8')) as Outcome
      } else {
        outcome = await compileAndRun(c, join(CASES_DIR, key))
        if (!outcome.toolFailure) writeFileSync(cacheFile, JSON.stringify(outcome))
        compiled++
      }
      results[i] = { id: c.id, problems: check(c, outcome), outcome }
    }
  }
  await Promise.all(Array.from({ length: Math.min(availableParallelism(), cases.length) }, worker))
  return { results, compiled }
}
