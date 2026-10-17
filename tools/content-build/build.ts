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

interface Snippet {
  case: Case
  exercise: Exercise
  apply: (r: CaseResult) => void
}

function snippetsFor(ex: CompiledExercise, gid: string, edition: string): Snippet[] {
  const out: Snippet[] = []
  const code = 'code' in ex ? ex.code : undefined
  if (code && code.verify !== 'none') {
    let rust = code.rust
    if (ex.type === 'fill-tokens') rust = rust.replace(BLANK, (_, n: string) => ex.blanks[n]?.answer[0] ?? '')
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
    for (const [i, order] of [ex.answer, ...(ex.alternatives ?? [])].entries()) {
      const solution = order.map((id) => byId.get(id) ?? '').join('\n') + '\n'
      out.push({
        exercise: ex,
        case: {
          id: i ? `${gid}#alt${i}` : gid,
          source: v.harness.replace('{{solution}}', solution),
          mode: v.mode as Case['mode'],
          edition,
          expectStdout: v.expectStdout,
          expectErrors: v.expectErrors,
          expectErrorMessage: v.expectErrorMessage,
          expectPanic: v.expectPanic,
          denyWarnings: v.denyWarnings,
        },
        apply: () => {},
      })
    }
  }
  return out
}

// ---- Cross-checks (plans/03 §4.1) ----

const norm = (s: string) => s.replace(/\s+$/, '')

function checkOptions(where: string, options: Option[], answer: string, issues: Issues) {
  const ids = options.map((o) => o.id)
  if (new Set(ids).size !== ids.length) issues.error(where, 'duplicate option ids')
  const labels = options.map((o) => o.text ?? o.code)
  if (new Set(labels).size !== labels.length) issues.error(where, 'duplicate option text')
  if (!ids.includes(answer)) issues.error(where, `answer "${answer}" is not an option id`)
}

function checkExercise(ex: Exercise, where: string, concepts: Set<string>, issues: Issues) {
  for (const c of ('concepts' in ex ? ex.concepts : undefined) ?? [])
    if (!concepts.has(c)) issues.error(where, `unknown concept "${c}" (add it to concepts.yaml)`)

  const code = 'code' in ex ? ex.code : undefined
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
      if (ex.tiles && !ex.tiles.some((t) => ex.answer.includes(t)))
        issues.error(where, 'no tile appears in the answer')
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
      if (ex.bank.filter((t) => !answers.has(t)).length < 2) issues.error(where, 'bank needs at least 2 distractors')
      if (new Set(ex.bank).size !== ex.bank.length) issues.error(where, 'duplicate tokens in bank')
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

/** After verification: answers that depend on real program output. */
function checkAgainstOutcome(ex: Exercise, r: CaseResult, where: string, issues: Issues) {
  if (ex.type !== 'predict-output' || r.outcome.stdout === undefined) return
  const actual = norm(r.outcome.stdout)
  const expected = ex.options ? (ex.options.find((o) => o.id === ex.answer)?.text ?? '') : ex.answer
  if (norm(expected) !== actual)
    issues.error(where, `answer ${JSON.stringify(expected)} differs from the real output ${JSON.stringify(actual)}`)
}

// ---- Markdown (rendered at build time; the app inserts the HTML as-is) ----

const md = new MarkdownIt({ html: false })
const inline = (s: string) => md.renderInline(s)
const block = (s: string) => md.render(s)

/** Markdown fields become HTML in place. Code, predict-output option text and match tiles stay plain. */
export function renderMarkdown(ex: CompiledExercise) {
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
        if (kind === 'code-read' || kind === 'build') {
          issues.warn(uwhere, `${kind} nodes are not supported yet (${file})`)
          path.push({ kind, id: `${unit.id}.${file}` })
          continue
        }
        const lfile = join(udir, `${file}.yaml`)
        const level = load(Level, lfile, issues, root) as CompiledLevel | undefined
        if (!level) continue
        const lwhere = relative(root, lfile)
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
          if (lesson.exercises.length < 8 || lesson.exercises.length > 15)
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
      if (!path.some((p) => p.kind === 'checkpoint')) issues.warn(uwhere, 'unit has no checkpoint')
      let guidebook: string | undefined
      if (unit.guidebook) {
        const g = join(udir, unit.guidebook)
        if (existsSync(g)) guidebook = block(readFileSync(g, 'utf8'))
        else issues.error(uwhere, `guidebook ${unit.guidebook} not found`)
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
      const w = r.id.includes('#') ? `${where} (${r.id.split('#')[1]})` : where
      for (const p of r.problems) issues.error(w, `rust-verify: ${p}`)
      if (!r.problems.length) {
        s.apply(r)
        checkAgainstOutcome(s.exercise, r, w, issues)
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
    outDir: values.out,
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
  // Only the real course owns the repo's ATTRIBUTIONS.md; test builds of other dirs must not overwrite it.
  const ownCourse = values.content === join(repo, 'content')
  if (ownCourse) writeFileSync(join(repo, 'ATTRIBUTIONS.md'), attributionsMarkdown(r.manifest!.attributions))
  console.log(`wrote ${values.out}${ownCourse ? ' and ATTRIBUTIONS.md' : ''} (content ${r.manifest!.contentVersion})`)
}
