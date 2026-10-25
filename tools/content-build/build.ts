/**
 * content-build: content/*.yaml -> zod validation -> cross-checks -> rust-verify -> JSON bundles
 * (plans/03 §4). Usage: node build.ts [--content DIR] [--out DIR] [--no-verify] [--strict]
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseArgs } from 'node:util'
import MarkdownIt from 'markdown-it'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import {
  Build,
  CodeRead,
  Concepts,
  Course,
  Level,
  Section,
  Unit,
  type CompiledExercise,
  type CompiledLevel,
  type CompiledPathNode,
  type CompiledSection,
  type CompiledUnit,
  type Attribution,
  type ContentManifest,
  type Exercise,
  type Option,
} from './schema.ts'
import { verifyCases, type Case, type CaseResult } from './verify.ts'

export interface Issue {
  level: 'error' | 'warning'
  where: string
  message: string
}

const MAX_COLS = 40
const MAX_LINES = 15
const BLANK = /___(\d+)___/g

export class Issues {
  list: Issue[] = []
  error(where: string, message: string) {
    this.list.push({ level: 'error', where, message })
  }
  warn(where: string, message: string) {
    this.list.push({ level: 'warning', where, message })
  }
  get errors() {
    return this.list.filter((i) => i.level === 'error')
  }
}

function load<S extends z.ZodType>(schema: S, file: string, issues: Issues, root: string): z.output<S> | undefined {
  const where = relative(root, file)
  if (!existsSync(file)) return void issues.error(where, 'file not found')
  let raw: unknown
  try {
    raw = parseYaml(readFileSync(file, 'utf8'))
  } catch (e) {
    return void issues.error(where, `YAML: ${(e as Error).message}`)
  }
  const r = schema.safeParse(raw)
  if (r.success) return r.data
  for (const i of r.error.issues) issues.error(`${where}: ${i.path.join('.') || '(root)'}`, i.message)
}

// ---- Snippet extraction ----

/** Verification source for a shown snippet: apply `wrap` and `hidden` (plans/03 §2.3). */
export function caseSource(rust: string, wrap: 'auto' | 'none', hidden?: { before?: string; after?: string }, mode?: string) {
  const wrapped =
    wrap === 'auto' && mode !== 'test' && !/\bfn\s+main\s*\(/.test(rust) ? `fn main() {\n${rust}}\n` : rust
  return (hidden?.before ?? '') + wrapped + (hidden?.after ?? '')
}

/** 1-based line of the first span in rustc's rendered diagnostic (` --> main.rs:3:5`). */
export function primaryErrorLine(compilerOutput: string): number | undefined {
  const m = /-->\s+\S+:(\d+):\d+/.exec(compilerOutput)
  return m ? Number(m[1]) : undefined
}

/** That line, in the code the learner sees (drop `hidden.before` and a generated `fn main`). */
export function shownErrorLine(
  compiledLine: number,
  rust: string,
  wrap: 'auto' | 'none',
  hidden?: { before?: string },
  mode?: string,
): number {
  const full = caseSource(rust, wrap, hidden?.before ? { before: hidden.before } : undefined, mode)
  const at = full.indexOf(rust)
  const prefix = at > 0 ? full.slice(0, at) : ''
  return compiledLine - (prefix ? prefix.split('\n').length - 1 : 0)
}

interface Snippet {
  case: Case
  /** Absent for a Code Read's program. */
  exercise?: Exercise
  apply: (r: CaseResult) => void
  /** A probe isn't held to the case's expectations; it returns a problem message, if any. */
  probe?: (r: CaseResult) => string | undefined
}

/**
 * Wrong fill-tokens responses a learner can make, as blank key -> tile: each unused bank tile in each blank,
 * and each pair of answers swapped. Those the grader accepts (answer lists, anyOrder groups) are left out.
 * ponytail: not every combination (that grows as bank^blanks); /tmp/cn45tools/alts.py does the full search.
 */
export function wrongFills(ex: Extract<Exercise, { type: 'fill-tokens' }>): Record<string, string>[] {
  const right = Object.fromEntries(Object.entries(ex.blanks).map(([k, b]) => [k, b.answer[0]!]))
  const keys = Object.keys(right)
  const inUse = new Set(Object.values(right))
  const together = (a: string, b: string) => (ex.anyOrder ?? []).some((g) => g.includes(a) && g.includes(b))
  const out: Record<string, string>[] = []
  for (const k of keys)
    for (const t of ex.bank) if (!inUse.has(t) && !ex.blanks[k]!.answer.includes(t)) out.push({ ...right, [k]: t })
  for (const [i, a] of keys.entries())
    for (const b of keys.slice(i + 1))
      if (!together(a, b) && !(ex.blanks[a]!.answer.includes(right[b]!) && ex.blanks[b]!.answer.includes(right[a]!)))
        out.push({ ...right, [a]: right[b]!, [b]: right[a]! })
  return out
}

function snippetsFor(ex: CompiledExercise, gid: string, edition: string): Snippet[] {
  const out: Snippet[] = []
  const code = 'code' in ex ? ex.code : undefined
  if (code && code.verify !== 'none') {
    let rust = code.rust
    if (ex.type === 'fill-tokens') {
      rust = rust.replace(BLANK, (_, n: string) => ex.blanks[n]?.answer[0] ?? '')
      // A wrong response that still prints the expected output would be marked wrong for a working program.
      if (code.verify === 'run' && code.expectStdout !== undefined)
        for (const [i, fill] of wrongFills(ex).entries()) {
          const changed = Object.entries(fill).filter(([k, t]) => ex.blanks[k]!.answer[0] !== t)
          out.push({
            exercise: ex,
            case: { id: `${gid}#fill${i}`, source: caseSource(code.rust.replace(BLANK, (_, n: string) => fill[n] ?? ''), code.wrap, code.hidden, 'run'), mode: 'run', edition, stdin: code.stdin },
            apply: () => {},
            probe: (r) =>
              r.outcome.compiled && r.outcome.exitCode === 0 && r.outcome.stdout === code.expectStdout
                ? `also correct with ${changed.map(([k, t]) => `"${t}" in blank ${k}`).join(' and ')}; drop the tile or change the code`
                : undefined,
          })
        }
    }
    out.push({
      exercise: ex,
      case: {
        id: gid,
        source: caseSource(rust, code.wrap, code.hidden, code.verify),
        mode: code.verify,
        edition,
        expectStdout: code.expectStdout,
        expectErrors: code.expectErrors,
        expectErrorMessage: code.expectErrorMessage,
        expectPanic: code.expectPanic,
        denyWarnings: code.denyWarnings,
        stdin: code.stdin,
      },
      apply: (r) => {
        if (code.verify === 'compile-fail' && ex.type === 'decode-error' && ex.showCompilerOutput)
          ex.verified = { compilerOutput: r.outcome.compilerOutput }
        if (code.verify === 'run') ex.verified = { ...ex.verified, stdout: r.outcome.stdout }
      },
    })
  }
  if (ex.type === 'parsons' && ex.verify && ex.verify.mode !== 'none') {
    const v = ex.verify
    const byId = new Map([...ex.lines, ...(ex.distractors ?? [])].map((l) => [l.id, l.text]))
    const text = (order: string[]) => order.map((id) => byId.get(id) ?? '').join('\n') + '\n'
    const orders = [ex.answer, ...(ex.alternatives ?? [])]
    const solutions = new Set(orders.map(text))
    const parsonsCase = (id: string, solution: string): Case => ({
      id,
      source: v.harness.replace('{{solution}}', solution),
      mode: v.mode as Case['mode'],
      edition,
      expectStdout: v.expectStdout,
      expectErrors: v.expectErrors,
      expectErrorMessage: v.expectErrorMessage,
      expectPanic: v.expectPanic,
      denyWarnings: v.denyWarnings,
      stdin: v.stdin,
    })
    for (const [i, order] of orders.entries()) {
      out.push({
        exercise: ex,
        case: parsonsCase(i ? `${gid}#alt${i}` : gid, text(order)),
        apply: () => {},
      })
    }
    // A distractor swapped in for one answer line must not also pass. Catches a line that
    // still compiles, such as a final `println!` with the semicolon left off.
    let n = 0
    for (const d of ex.distractors ?? []) {
      for (const [i, id] of ex.answer.entries()) {
        if (byId.get(id) === d.text) continue
        const solution = ex.answer.map((lineId, j) => (j === i ? d.text : (byId.get(lineId) ?? ''))).join('\n') + '\n'
        if (solutions.has(solution)) continue
        const replaced = byId.get(id) ?? id
        out.push({
          exercise: ex,
          case: parsonsCase(`${gid}#dist${n++}`, solution),
          apply: () => {},
          probe: (r) =>
            r.problems.length
              ? undefined
              : `distractor ${JSON.stringify(d.text)} also passes in place of ${JSON.stringify(replaced)}`,
        })
      }
    }
  }
  return out
}

/**
 * Guidebook ```rust blocks (plans/03 §4.3), with mdBook-style attributes: `ignore` skips, `compile_fail`
 * (optionally with an error code) must fail, `should_panic` must panic, `no_run` compiles only.
 */
export function guidebookCases(markdown: string, id: string, edition: string): Case[] {
  return md
    .parse(markdown, {})
    .filter((t) => t.type === 'fence' && /^rust\b/.test(t.info))
    .flatMap((t, i) => {
      const attrs = t.info.trim().split(/[\s,]+/).slice(1)
      if (attrs.includes('ignore')) return []
      const failing = attrs.includes('compile_fail')
      return [
        {
          id: `${id}#${i + 1}`,
          source: caseSource(t.content, 'auto'),
          mode: failing ? 'compile-fail' : attrs.includes('no_run') ? 'compile' : 'run',
          edition,
          expectErrors: failing ? attrs.filter((a) => /^E\d{4}$/.test(a)) : undefined,
          expectPanic: attrs.includes('should_panic') || undefined,
        } satisfies Case,
      ]
    })
}

/** A Code Read becomes a one-lesson level with the program and a per-exercise reveal count. */
function codeReadLevel(
  cr: CodeRead | undefined,
  where: string,
  edition: string,
  issues: Issues,
  snippets: { s: Snippet; where: string }[],
): CompiledLevel | undefined {
  if (!cr) return
  const { chunks, program, ...rest } = cr
  const total = program.rust.replace(/\n$/, '').split('\n').length
  const revealed = chunks.reduce((n, c) => n + c.lines, 0)
  if (revealed !== total) issues.error(where, `chunks reveal ${revealed} lines but the program has ${total}`)
  if (total > 25) issues.warn(where, `program has ${total} lines (Code Reads allow 25)`)
  const wide = wideLines(program.rust)
  if (wide) issues.warn(where, `${wide} program line(s) wider than ${MAX_COLS} columns`)
  const level: CompiledLevel = { ...rest, program, reveals: [], lessons: [{ id: 'read', exercises: [] }] }
  let shown = 0
  for (const c of chunks) {
    shown += c.lines
    for (const ex of c.exercises) {
      level.lessons[0]!.exercises.push(ex)
      level.reveals!.push(shown)
    }
  }
  if (program.verify !== 'none')
    snippets.push({
      where: `${where}: program`,
      s: {
        case: {
          id: `${cr.id}/program`,
          source: caseSource(program.rust, program.wrap, program.hidden, program.verify),
          mode: program.verify,
          edition,
          expectStdout: program.expectStdout,
          expectErrors: program.expectErrors,
          expectErrorMessage: program.expectErrorMessage,
          expectPanic: program.expectPanic,
          denyWarnings: program.denyWarnings,
        },
        apply: (r) => {
          if (program.verify === 'run') level.program = { ...program, verified: { stdout: r.outcome.stdout } }
        },
      },
    })
  return level
}

const norm = (s: string) => s.replace(/\s+$/, '')
const wideLines = (code: string) => code.split('\n').filter((l) => l.length > MAX_COLS).length

const fence = (lang: string, text: string) => `\`\`\`${lang}\n${text.replace(/\n?$/, '\n')}\`\`\``

/**
 * A Build becomes a level with one lesson per step, each framed by generated concept cards: the goal and the
 * previous file, then the new file and its verified output (filled in by `apply` once the file has run).
 */
function buildLevel(
  b: Build | undefined,
  where: string,
  edition: string,
  issues: Issues,
  snippets: { s: Snippet; where: string }[],
): CompiledLevel | undefined {
  if (!b) return
  const { steps, ...rest } = b
  const ids = steps.map((s) => s.id)
  if (new Set(ids).size !== ids.length) issues.error(where, 'duplicate step ids')
  const level: CompiledLevel = { ...rest, build: true, lessons: [] }
  for (const [i, step] of steps.entries()) {
    const at = `${where}: ${step.id}`
    const { file } = step
    if (file.verify !== 'run') issues.error(at, 'a step file must be `verify: run` so the end card can show its output')
    const total = file.rust.replace(/\n$/, '').split('\n').length
    if (total > 80) issues.warn(at, `file has ${total} lines (Builds allow 80)`)
    const wide = wideLines(file.rust)
    if (wide) issues.warn(at, `${wide} file line(s) wider than ${MAX_COLS} columns`)
    if (step.exercises.length < 3 || step.exercises.length > 8)
      issues.warn(at, `${step.exercises.length} exercises (expected 3-8)`)
    const prev = steps[i - 1]?.file.rust
    const intro: Exercise = {
      type: 'concept',
      id: 'step-goal',
      title: step.title,
      markdown: step.goal.trim() + (prev ? `\n\nYour program so far:\n\n${fence('rust', prev)}` : ''),
    }
    const shown = `Your program now:\n\n${fence('rust', file.rust)}`
    const outro: Extract<Exercise, { type: 'concept' }> = { type: 'concept', id: 'step-result', markdown: shown }
    level.lessons.push({ id: step.id, exercises: [intro, ...step.exercises, outro] })
    if (file.verify === 'run')
      snippets.push({
        where: `${at}: file`,
        s: {
          case: {
            id: `${b.id}/${step.id}/file`,
            source: caseSource(file.rust, file.wrap, file.hidden, file.verify),
            mode: file.verify,
            edition,
            expectStdout: file.expectStdout,
            expectErrors: file.expectErrors,
            expectErrorMessage: file.expectErrorMessage,
            expectPanic: file.expectPanic,
            denyWarnings: file.denyWarnings,
            stdin: file.stdin,
          },
          apply: (r) => {
            const out = r.outcome.stdout ?? ''
            outro.markdown =
              shown +
              (file.stdin ? `\n\nYou type:\n\n${fence('text', file.stdin)}` : '') +
              (out ? `\n\nIt prints:\n\n${fence('text', out)}` : '')
          },
        },
      })
  }
  return level
}

// ---- Cross-checks (plans/03 §4.1) ----

/** Code shown outside `code`: parsons lines and option code. Measured like `code` lines. */
function checkWidths(ex: Exercise, where: string, issues: Issues) {
  const parts: string[] = []
  if (ex.type === 'parsons') parts.push(...[...ex.lines, ...(ex.distractors ?? [])].map((l) => l.text))
  if ('options' in ex && ex.options) parts.push(...ex.options.flatMap((o) => (o.code ? [o.code] : [])))
  if (ex.type === 'compiles' && ex.followUp) parts.push(...ex.followUp.options.flatMap((o) => (o.code ? [o.code] : [])))
  const wide = parts.reduce((n, c) => n + wideLines(c), 0)
  if (wide) issues.warn(where, `${wide} line(s) in ${ex.type === 'parsons' ? 'parsons lines' : 'option code'} wider than ${MAX_COLS} columns`)
}

function checkOptions(where: string, options: Option[], answer: string, issues: Issues) {
  const ids = options.map((o) => o.id)
  if (new Set(ids).size !== ids.length) issues.error(where, 'duplicate option ids')
  const labels = options.map((o) => o.text ?? o.code)
  if (new Set(labels).size !== labels.length) issues.error(where, 'duplicate option text')
  if (!ids.includes(answer)) issues.error(where, `answer "${answer}" is not an option id`)
}

/**
 * Questions that hinge on knowing what an error code means. Codes may be shown (they're lookup keys for
 * `rustc --explain`), and "E0382: borrow of moved value" can be read, but a bare code can only be recalled: no bare
 * codes in pairs, tiles or true-false prompts, and no options that differ only by their code.
 */
export function roteCodes(ex: Exercise): string[] {
  const has = (s: string) => /\bE\d{4}\b(?!\]?: \S)/.test(s)
  const out: string[] = []
  if (ex.type === 'match-pairs' && ex.pairs.flat().some(has)) out.push('match-pairs names an error code')
  if (('bank' in ex && ex.bank?.some(has)) || ('tiles' in ex && ex.tiles?.some(has))) out.push('a tile is an error code')
  if (ex.type === 'true-false' && has(ex.prompt)) out.push('true-false prompt names an error code')
  for (const opts of ['options' in ex ? ex.options : undefined, ex.type === 'compiles' ? ex.followUp?.options : undefined]) {
    const texts = (opts ?? []).flatMap((o) => (o.text ? [o.text] : []))
    if (texts.some(has) && new Set(texts.map((t) => t.replace(/\bE\d{4}\b/g, '').trim())).size < texts.length)
      out.push('options differ only by error code')
  }
  return out
}

const words = (s: string) => s.trim().split(/\s+/).join(' ')

/** Can distinct tiles, joined by spaces, spell the answer? Mirrors the app's predict-output tiles grader. */
export function assemblable(tiles: string[], answer: string): boolean {
  const go = (rest: string, used: Set<number>): boolean =>
    rest === '' ||
    tiles.some((t, i) => {
      const w = words(t)
      if (used.has(i) || !w || !(rest === w || rest.startsWith(`${w} `))) return false
      return go(rest.slice(w.length).trimStart(), new Set(used).add(i))
    })
  return go(words(answer), new Set())
}

function checkExercise(ex: Exercise, where: string, concepts: Set<string>, issues: Issues) {
  for (const c of ('concepts' in ex ? ex.concepts : undefined) ?? [])
    if (!concepts.has(c)) issues.error(where, `unknown concept "${c}" (add it to concepts.yaml)`)

  if (ex.type === 'concept') {
    // Prose only: tables and fenced code don't count (plans/03 §5: no wall of text, <= 60 words).
    const prose = ex.markdown.replace(/```[\s\S]*?```/g, '').replace(/^\|.*$/gm, '')
    const words = prose.split(/\s+/).filter(Boolean).length
    if (words > 60) issues.warn(where, `concept card has ${words} words (aim for at most 60)`)
  }

  for (const r of roteCodes(ex)) issues.warn(where, `${r}; test the message or the problem, not the code`)

  const code = 'code' in ex ? ex.code : undefined
  // Registered error codes are concepts, so review can track them.
  for (const e of code?.expectErrors ?? [])
    if (concepts.has(`err.${e}`) && !('concepts' in ex && ex.concepts?.includes(`err.${e}`)))
      issues.warn(where, `expects ${e}; add err.${e} to concepts`)
  if (code) {
    // Fill-tokens lines are measured with the answers in place of the `___N___` markers.
    const shown = ex.type === 'fill-tokens' ? code.rust.replace(BLANK, (_, n: string) => ex.blanks[n]?.answer[0] ?? '') : code.rust
    const lines = shown.replace(/\n$/, '').split('\n')
    if (lines.length > MAX_LINES) issues.warn(where, `${lines.length} code lines (> ${MAX_LINES})`)
    // A top-level `fn` without `main` (say `fn Main`) gets wrapped in a second main, which changes the result.
    if (code.wrap === 'auto' && /^fn\s/m.test(shown) && !/\bfn\s+main\s*\(/.test(shown))
      issues.warn(where, 'top-level `fn` without `main` under `wrap: auto`; set `wrap: none` if this is a whole program')
    const wide = lines.filter((l) => l.length > MAX_COLS).length
    if (wide) issues.warn(where, `${wide} code line(s) wider than ${MAX_COLS} columns`)
  }
  checkWidths(ex, where, issues)

  switch (ex.type) {
    case 'mcq':
    case 'decode-error':
      checkOptions(where, ex.options, ex.answer, issues)
      if (ex.type === 'decode-error' && ex.code.verify !== 'compile-fail')
        issues.error(where, 'decode-error code must be `verify: compile-fail`')
      // The compiler output quotes line numbers of the verified source; they must match the shown code.
      if (ex.type === 'decode-error' && (ex.code.hidden?.before || caseSource(ex.code.rust, ex.code.wrap) !== ex.code.rust))
        issues.warn(where, 'decode-error code is wrapped or has hidden.before, so error line numbers won\'t match')
      break
    case 'predict-output':
      if (ex.code.verify !== 'run') issues.error(where, 'predict-output code must be `verify: run`')
      if (ex.options) checkOptions(where, ex.options, ex.answer, issues)
      if (ex.tiles && !assemblable(ex.tiles, ex.answer))
        issues.error(where, 'the answer can\'t be built from the tiles (each used once, joined by spaces)')
      break
    case 'compiles': {
      const fails = ex.code.verify === 'compile-fail'
      if (ex.code.verify === 'none') issues.error(where, 'compiles exercises must be verified')
      else if (ex.answer === fails) issues.error(where, `answer: ${ex.answer} contradicts verify: ${ex.code.verify}`)
      if (ex.followUp) checkOptions(`${where}.followUp`, ex.followUp.options, ex.followUp.answer, issues)
      break
    }
    case 'fill-tokens': {
      const markers = [...ex.code.rust.matchAll(BLANK)].map((m) => m[1]!)
      const keys = Object.keys(ex.blanks)
      for (const m of markers) if (!keys.includes(m)) issues.error(where, `blank ___${m}___ has no entry in blanks`)
      for (const k of keys) if (!markers.includes(k)) issues.error(where, `blanks.${k} has no ___${k}___ marker`)
      const answers = new Set(Object.values(ex.blanks).flatMap((b) => b.answer))
      for (const [k, b] of Object.entries(ex.blanks))
        if (!ex.bank.includes(b.answer[0]!)) issues.error(where, `blanks.${k} answer "${b.answer[0]}" is not in the bank`)
      if (new Set(ex.bank.filter((t) => !answers.has(t))).size < 2) issues.error(where, 'bank needs at least 2 distractors')
      // Each bank tile can be placed once, so a tile two blanks need must be in the bank twice.
      const need = Map.groupBy(Object.values(ex.blanks), (b) => b.answer[0]!)
      for (const [t, bs] of need) {
        const have = ex.bank.filter((b) => b === t).length
        if (have && have < bs.length) issues.error(where, `${bs.length} blanks need "${t}" but the bank has it ${have} time(s)`)
      }
      if (ex.bank.some((t, i) => ex.bank.indexOf(t) !== i && !need.has(t))) issues.error(where, 'duplicate distractor tiles in bank')
      break
    }
    case 'parsons': {
      const ids = ex.lines.map((l) => l.id)
      const all = [...ids, ...(ex.distractors ?? []).map((l) => l.id)]
      if (new Set(all).size !== all.length) issues.error(where, 'duplicate line ids')
      for (const order of [ex.answer, ...(ex.alternatives ?? [])]) {
        if (order.length !== ids.length || !ids.every((id) => order.includes(id)))
          issues.error(where, `order [${order.join(', ')}] must use every line exactly once (no distractors)`)
      }
      break
    }
    case 'spot-bug': {
      const n = ex.code.rust.replace(/\n$/, '').split('\n').length
      if (ex.answer > n) issues.error(where, `answer line ${ex.answer} > ${n} lines`)
      if (ex.compilerLine !== undefined && ex.compilerLine > n)
        issues.error(where, `compilerLine ${ex.compilerLine} > ${n} lines`)
      break
    }
    case 'match-pairs': {
      const left = ex.pairs.map((p) => p[0])
      const right = ex.pairs.map((p) => p[1])
      if (new Set(left).size !== left.length || new Set(right).size !== right.length)
        issues.error(where, 'duplicate tiles in pairs')
      break
    }
  }
}

/** After verification: answers that depend on real program output or the compiler's caret. */
function checkAgainstOutcome(ex: Exercise, r: CaseResult, where: string, issues: Issues) {
  if (ex.type === 'predict-output' && r.outcome.stdout !== undefined) {
    const actual = norm(r.outcome.stdout)
    const expected = ex.options ? (ex.options.find((o) => o.id === ex.answer)?.text ?? '') : ex.answer
    if (norm(expected) !== actual)
      issues.error(where, `answer ${JSON.stringify(expected)} differs from the real output ${JSON.stringify(actual)}`)
  }
  if (ex.type !== 'spot-bug' || ex.code.verify !== 'compile-fail') return
  const compiled = primaryErrorLine(r.outcome.compilerOutput)
  if (compiled === undefined) return
  const shown = shownErrorLine(compiled, ex.code.rust, ex.code.wrap, ex.code.hidden, ex.code.verify)
  const claimed = ex.compilerLine ?? ex.answer
  if (shown === claimed) return
  issues.error(
    where,
    ex.compilerLine === undefined
      ? `answer line ${ex.answer} but the compiler points at line ${shown}; set compilerLine: ${shown} if the bug is on another line`
      : `compilerLine ${ex.compilerLine} but the compiler points at line ${shown}`,
  )
}

// ---- Markdown (rendered at build time; the app inserts the HTML as-is) ----

const md = new MarkdownIt({ html: false })
const inline = (s: string) => md.renderInline(s)
const block = (s: string) => md.render(s)

/** Markdown fields become HTML in place. Code, predict-output option text and match tiles stay plain. */
export function renderMarkdown(ex: CompiledExercise) {
  if ('diagram' in ex && ex.diagram?.caption) ex.diagram.caption = inline(ex.diagram.caption)
  if (ex.type === 'concept') {
    ex.markdown = block(ex.markdown)
    return
  }
  ex.prompt = inline(ex.prompt)
  if (ex.explanation) ex.explanation = block(ex.explanation)
  if (ex.hint) ex.hint = inline(ex.hint)
  const opts = (options: Option[], textIsMarkdown: boolean) => {
    for (const o of options) {
      if (o.why) o.why = inline(o.why)
      if (o.text !== undefined && textIsMarkdown) o.text = inline(o.text)
    }
  }
  if ('options' in ex && ex.options) opts(ex.options, ex.type !== 'predict-output')
  if (ex.type === 'compiles' && ex.followUp) {
    ex.followUp.prompt = inline(ex.followUp.prompt)
    opts(ex.followUp.options, true)
  }
}

// ---- Attributions (plans/01 §13.3) ----

export function attributionsOf(sections: CompiledSection[]): Attribution[] {
  const byUrl = new Map<string, Attribution>()
  for (const s of sections)
    for (const u of s.units)
      for (const src of u.sources) {
        const a = byUrl.get(src.url) ?? { ...src, units: [] }
        a.units.push(u.title)
        byUrl.set(src.url, a)
      }
  return [...byUrl.values()]
}

export function attributionsMarkdown(list: Attribution[]): string {
  const rows = list.map(
    (a) =>
      `- [${a.name}](${a.url}), ${a.licence}${a.adapted ? `, adapted${a.changes ? ` (${a.changes})` : ''}` : ''}. ` +
      `Used in: ${a.units.join(', ')}.`,
  )
  return [
    '# Attributions',
    '',
    'Generated by `pnpm content:build` from the `sources:` in each `unit.yaml`. Do not edit by hand.',
    '',
    'Course text is CC BY-SA 4.0 and code is MIT OR Apache-2.0 (see `content/LICENSE`). The units below',
    'draw on these sources, under the licences shown:',
    '',
    ...rows,
    '',
  ].join('\n')
}

// ---- Build ----

export interface BuildOptions {
  contentDir: string
  outDir?: string
  verify?: boolean
  strict?: boolean
}

export interface BuildResult {
  issues: Issues
  manifest?: ContentManifest
  sections: CompiledSection[]
  stats: { exercises: number; snippets: number; compiled: number }
}

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 12)

export async function buildContent(opts: BuildOptions): Promise<BuildResult> {
  const root = opts.contentDir
  const issues = new Issues()
  const stats = { exercises: 0, snippets: 0, compiled: 0 }
  const course = load(Course, join(root, 'course.yaml'), issues, root)
  const conceptList = load(Concepts, join(root, 'concepts.yaml'), issues, root) ?? []
  const concepts = new Set(conceptList.map((c) => c.id))
  if (concepts.size !== conceptList.length) issues.error('concepts.yaml', 'duplicate concept ids')
  if (!course) return { issues, sections: [], stats }

  const sections: CompiledSection[] = []
  const levelIds = new Set<string>()
  /** Concepts introduced by a level's `concepts:` so far, in course order (taught-before-tested). */
  const taught = new Set<string>()
  const snippets: { s: Snippet; where: string }[] = []

  for (const sectionDir of course.sections) {
    const sdir = join(root, 'sections', sectionDir)
    const section = load(Section, join(sdir, 'section.yaml'), issues, root)
    if (!section) continue
    const units: CompiledUnit[] = []
    for (const unitDir of section.units) {
      const udir = join(sdir, unitDir)
      const unit = load(Unit, join(udir, 'unit.yaml'), issues, root)
      if (!unit) continue
      const uwhere = relative(root, join(udir, 'unit.yaml'))
      if (!unit.id.startsWith(`${section.id}.`)) issues.error(uwhere, `unit id must start with "${section.id}."`)
      const levels: Record<string, CompiledLevel> = {}
      const path: CompiledPathNode[] = []
      let n = 0
      for (const entry of unit.path) {
        n++
        if (typeof entry === 'string') {
          path.push({ kind: entry, id: `${unit.id}.${entry}-${n}` })
          continue
        }
        const [kind, file] = Object.entries(entry)[0] as [keyof typeof entry, string]
        const lfile = join(udir, `${file}.yaml`)
        const lwhere = relative(root, lfile)
        const level =
          kind === 'code-read'
            ? codeReadLevel(load(CodeRead, lfile, issues, root), lwhere, course.edition, issues, snippets)
            : kind === 'build'
              ? buildLevel(load(Build, lfile, issues, root), lwhere, course.edition, issues, snippets)
              : (load(Level, lfile, issues, root) as CompiledLevel | undefined)
        if (!level) continue
        if (levelIds.has(level.id)) issues.error(lwhere, `duplicate level id "${level.id}"`)
        // The app finds a level's section bundle from the first segment of its id.
        if (!level.id.startsWith(`${unit.id}.`)) issues.error(lwhere, `level id must start with "${unit.id}."`)
        levelIds.add(level.id)
        levels[level.id] = level
        path.push({ kind, levelId: level.id })

        for (const c of [...level.concepts, ...level.reviewConcepts])
          if (!concepts.has(c)) issues.error(lwhere, `unknown concept "${c}"`)
        for (const c of level.reviewConcepts)
          if (!taught.has(c)) issues.warn(lwhere, `reviewConcepts: "${c}" isn't introduced by an earlier level`)
        for (const c of level.concepts) taught.add(c)
        if (kind === 'level' && (level.lessons.length < 3 || level.lessons.length > 5))
          issues.warn(lwhere, `${level.lessons.length} lessons (expected 3-5)`)
        const lessonIds = new Set<string>()
        for (const lesson of level.lessons) {
          if (lessonIds.has(lesson.id)) issues.error(lwhere, `duplicate lesson id "${lesson.id}"`)
          lessonIds.add(lesson.id)
          if (kind !== 'code-read' && kind !== 'build' && (lesson.exercises.length < 8 || lesson.exercises.length > 15))
            issues.warn(`${lwhere}: ${lesson.id}`, `${lesson.exercises.length} exercises (expected 8-15)`)
          const exIds = new Set<string>()
          for (const ex of lesson.exercises) {
            stats.exercises++
            const gid = `${level.id}/${lesson.id}/${ex.id}`
            const where = `${lwhere}: ${lesson.id}/${ex.id}`
            if (exIds.has(ex.id)) issues.error(where, 'duplicate exercise id in lesson')
            exIds.add(ex.id)
            checkExercise(ex, where, concepts, issues)
            for (const c of ('concepts' in ex ? ex.concepts : undefined) ?? [])
              if (concepts.has(c) && !taught.has(c))
                issues.warn(where, `tests "${c}" before any level introduces it (add it to a level's concepts:)`)
            for (const s of snippetsFor(ex, gid, course.edition)) snippets.push({ s, where })
          }
        }
      }
      // A project unit (only a Build, e.g. Unit 2.4) has no checkpoint of its own.
      if (!path.some((p) => p.kind === 'checkpoint' || p.kind === 'build')) issues.warn(uwhere, 'unit has no checkpoint')
      let guidebook: string | undefined
      if (unit.guidebook) {
        const g = join(udir, unit.guidebook)
        if (existsSync(g)) {
          const text = readFileSync(g, 'utf8')
          guidebook = block(text)
          const gwhere = relative(root, g)
          for (const [i, c] of guidebookCases(text, `${unit.id}/guidebook`, course.edition).entries())
            snippets.push({ where: `${gwhere}: rust block ${i + 1}`, s: { case: c, apply: () => {} } })
        } else issues.error(uwhere, `guidebook ${unit.guidebook} not found`)
      }
      const { path: _path, guidebook: _g, ...rest } = unit
      units.push({ ...rest, guidebook, path, levels })
    }
    const { units: _units, ...srest } = section
    sections.push({ ...srest, units })
  }

  stats.snippets = snippets.length
  if (opts.verify !== false && snippets.length) {
    const { results, compiled } = await verifyCases(snippets.map((x) => x.s.case))
    stats.compiled = compiled
    results.forEach((r, i) => {
      const { s, where } = snippets[i]!
      if (s.probe) {
        const p = s.probe(r)
        if (p) issues.error(where, p)
        return
      }
      const w = r.id.includes('#') ? `${where} (${r.id.split('#')[1]})` : where
      for (const p of r.problems) issues.error(w, `rust-verify: ${p}`)
      if (!r.problems.length) {
        s.apply(r)
        if (s.exercise) checkAgainstOutcome(s.exercise, r, w, issues)
      }
    })
  }

  if (opts.strict) for (const i of issues.list) i.level = 'error'
  if (issues.errors.length) return { issues, sections, stats }

  for (const s of sections)
    for (const u of s.units)
      for (const l of Object.values(u.levels)) for (const lesson of l.lessons) lesson.exercises.forEach(renderMarkdown)
  const bundles = sections.map((s) => ({ s, json: JSON.stringify(s) }))
  const manifest: ContentManifest = {
    contentVersion: hash(bundles.map((b) => b.json).join('') + JSON.stringify(conceptList)),
    course,
    concepts: conceptList,
    attributions: attributionsOf(sections),
    sections: bundles.map(({ s, json }) => ({ id: s.id, title: s.title, hash: hash(json), url: `section-${s.id}.json` })),
  }
  if (opts.outDir) {
    mkdirSync(opts.outDir, { recursive: true })
    for (const { s, json } of bundles) writeFileSync(join(opts.outDir, `section-${s.id}.json`), json)
    writeFileSync(join(opts.outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  }
  return { issues, manifest, sections, stats }
}

// ---- CLI ----

if (import.meta.main) {
  const repo = new URL('../../', import.meta.url).pathname
  const { values } = parseArgs({
    options: {
      content: { type: 'string', default: join(repo, 'content') },
      out: { type: 'string', default: join(repo, 'app/public/content') },
      'no-verify': { type: 'boolean', default: false },
      strict: { type: 'boolean', default: false },
    },
  })
  const t0 = performance.now()
  const r = await buildContent({
    contentDir: values.content,
    // Unverified bundles lack compiler output and stdout, so a --no-verify check never writes them.
    outDir: values['no-verify'] ? undefined : values.out,
    verify: !values['no-verify'],
    strict: values.strict,
  })
  for (const i of r.issues.list) console.log(`${i.level === 'error' ? 'ERROR' : 'warn '} ${i.where}: ${i.message}`)
  const { exercises, snippets, compiled } = r.stats
  console.log(
    `${exercises} exercises, ${snippets} snippets (${compiled} compiled, ${snippets - compiled} cached) ` +
      `in ${((performance.now() - t0) / 1000).toFixed(1)}s; ` +
      `${r.issues.errors.length} errors, ${r.issues.list.length - r.issues.errors.length} warnings`,
  )
  if (r.issues.errors.length) process.exit(1)
  if (values['no-verify']) process.exit(0)
  // Only the real course owns the repo's ATTRIBUTIONS.md; test builds of other dirs must not overwrite it.
  const ownCourse = values.content === join(repo, 'content')
  if (ownCourse) writeFileSync(join(repo, 'ATTRIBUTIONS.md'), attributionsMarkdown(r.manifest!.attributions))
  console.log(`wrote ${values.out}${ownCourse ? ' and ATTRIBUTIONS.md' : ''} (content ${r.manifest!.contentVersion})`)
}
