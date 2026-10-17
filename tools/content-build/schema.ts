/**
 * Content schema: the single source of truth for course content (plans/03 §2).
 * The app imports the inferred types from here, so content tools and app never disagree.
 */
import { z } from 'zod'

/** Lowercase slug, optionally dotted: `ownership.borrowing.exclusive-rule`. */
export const Slug = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'expected a lowercase slug')
/** Concept IDs keep error codes upper-case: `borrow.exclusive`, `err.E0499`. */
export const ConceptId = z
  .string()
  .regex(/^[a-z][a-z0-9-]*(?:\.[A-Za-z0-9-]+)+$/, 'expected a dotted concept id like `own.move`')
export const ErrorCode = z.string().regex(/^E\d{4}$/, 'expected an error code like E0382')

export const VerifyMode = z.enum(['run', 'compile', 'compile-fail', 'test', 'none'])

/** Expectations checked by rust-verify (plans/03 §4.2). */
const Expectations = {
  expectStdout: z.string().optional(),
  expectErrors: z.array(ErrorCode).optional(),
  /** Substring of the compiler output, for errors without a code (syntax errors). */
  expectErrorMessage: z.string().optional(),
  /** `true`, or a substring the panic message must contain. */
  expectPanic: z.union([z.boolean(), z.string()]).optional(),
  denyWarnings: z.boolean().optional(),
  /** Crate dependencies, compiled in a shared Cargo project (not yet supported). */
  deps: z.array(z.string()).optional(),
}

function checkExpectations(
  c: { verify: string; verifyReason?: string; expectErrors?: string[]; expectErrorMessage?: string; expectStdout?: string },
  ctx: z.RefinementCtx,
) {
  if (c.verify === 'none' && !c.verifyReason)
    ctx.addIssue({ code: 'custom', message: '`verify: none` needs a `verifyReason`' })
  if (c.verify === 'compile-fail' && !c.expectErrors?.length && !c.expectErrorMessage)
    ctx.addIssue({ code: 'custom', message: '`verify: compile-fail` needs `expectErrors` or `expectErrorMessage`' })
  if (c.expectStdout !== undefined && c.verify !== 'run')
    ctx.addIssue({ code: 'custom', message: '`expectStdout` needs `verify: run`' })
}

export const Code = z
  .object({
    rust: z.string().min(1),
    verify: VerifyMode,
    verifyReason: z.string().optional(),
    /** `auto`: wrap in `fn main() {}` for verification unless the snippet defines `main`. */
    wrap: z.enum(['auto', 'none']).default('auto'),
    /** Extra code used only for verification, never shown. */
    hidden: z.object({ before: z.string().optional(), after: z.string().optional() }).optional(),
    ...Expectations,
  })
  .strict()
  .superRefine(checkExpectations)

const OptionId = z.string().regex(/^[a-z0-9-]+$/)

export const Option = z
  .object({
    id: OptionId,
    text: z.string().optional(),
    code: z.string().optional(),
    /** Why this option is right or wrong (shown in feedback). */
    why: z.string().optional(),
  })
  .strict()
  .refine((o) => (o.text === undefined) !== (o.code === undefined), 'option needs exactly one of `text` or `code`')

const Options = z.array(Option).min(2).max(4)

const base = {
  id: Slug,
  concepts: z.array(ConceptId).min(1),
  difficulty: z.number().int().min(1).max(5).optional(),
  explanation: z.string().min(1),
  hint: z.string().optional(),
}

/**
 * Stack/heap memory diagram (plans/02 Section 3: a diagram on every level). Frames are drawn top to bottom
 * on the left, heap boxes on the right; `points` draws an arrow to a heap box or a variable with that `id`.
 */
export const DiagramVar = z
  .object({
    name: z.string(),
    /** Target for `points` from elsewhere (references point at variables). */
    id: Slug.optional(),
    value: z.string().optional(),
    points: Slug.optional(),
    /** Ownership moved out: drawn greyed with "moved". */
    moved: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.moved || (v.value === undefined) !== (v.points === undefined), 'a variable needs exactly one of `value` or `points` (or `moved: true`)')

export const Diagram = z
  .object({
    /** Inline Markdown (rendered to HTML at build time). */
    caption: z.string().optional(),
    frames: z.array(z.object({ name: z.string(), vars: z.array(DiagramVar).min(1) }).strict()).min(1),
    heap: z
      .array(z.object({ id: Slug, value: z.string(), freed: z.boolean().optional() }).strict())
      .default([]),
  })
  .strict()
  .superRefine((d, ctx) => {
    const ids = [...d.heap.map((h) => h.id), ...d.frames.flatMap((f) => f.vars.flatMap((v) => (v.id ? [v.id] : [])))]
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'diagram ids must be unique' })
    for (const v of d.frames.flatMap((f) => f.vars))
      if (v.points && !ids.includes(v.points)) ctx.addIssue({ code: 'custom', message: `diagram: "${v.points}" isn't a heap box or variable id` })
  })

export const ConceptCard = z
  .object({
    type: z.literal('concept'),
    id: Slug,
    title: z.string().optional(),
    markdown: z.string().min(1),
    code: Code.optional(),
    diagram: Diagram.optional(),
    concepts: z.array(ConceptId).optional(),
  })
  .strict()

export const Mcq = z
  .object({
    type: z.literal('mcq'),
    ...base,
    prompt: z.string(),
    code: Code.optional(),
    diagram: Diagram.optional(),
    options: Options,
    answer: OptionId,
  })
  .strict()

export const PredictOutput = z
  .object({
    type: z.literal('predict-output'),
    ...base,
    prompt: z.string().default('What does this print?'),
    code: Code,
    /** Choose mode. */
    options: Options.optional(),
    /** Assemble mode: tiles the learner taps to build the output. */
    tiles: z.array(z.string()).optional(),
    /** Option id (choose mode) or the expected output (assemble mode). */
    answer: z.string(),
  })
  .strict()
  .refine((e) => !!e.options !== !!e.tiles, 'predict-output needs exactly one of `options` or `tiles`')

export const Blank = z.object({ answer: z.array(z.string()).min(1) }).strict()

export const FillTokens = z
  .object({
    type: z.literal('fill-tokens'),
    ...base,
    prompt: z.string(),
    /** `code.rust` contains `___1___`, `___2___`, ... markers. */
    code: Code,
    blanks: z.record(z.string().regex(/^\d+$/), Blank),
    bank: z.array(z.string()).min(2),
    /** Groups of blank keys whose answers may be swapped (`a + b`). */
    anyOrder: z.array(z.array(z.string())).optional(),
  })
  .strict()

const Line = z.object({ id: OptionId, text: z.string() }).strict()

export const Parsons = z
  .object({
    type: z.literal('parsons'),
    ...base,
    prompt: z.string(),
    lines: z.array(Line).min(2),
    distractors: z.array(Line).optional(),
    answer: z.array(OptionId).min(2),
    alternatives: z.array(z.array(OptionId)).optional(),
    /** `harness` contains `{{solution}}`, replaced by the ordered lines. */
    verify: z
      .object({ harness: z.string().default('{{solution}}'), mode: VerifyMode, ...Expectations })
      .strict()
      .optional(),
  })
  .strict()

export const Compiles = z
  .object({
    type: z.literal('compiles'),
    ...base,
    prompt: z.string().default('Does this compile?'),
    code: Code,
    answer: z.boolean(),
    followUp: z.object({ prompt: z.string(), options: Options, answer: OptionId }).strict().optional(),
  })
  .strict()

export const SpotBug = z
  .object({
    type: z.literal('spot-bug'),
    ...base,
    prompt: z.string(),
    code: Code,
    /** 1-based line number of the bug in `code.rust`. */
    answer: z.number().int().min(1),
  })
  .strict()

export const MatchPairs = z
  .object({
    type: z.literal('match-pairs'),
    ...base,
    explanation: z.string().optional(),
    prompt: z.string().default('Match the pairs'),
    pairs: z.array(z.tuple([z.string(), z.string()])).min(3).max(5),
  })
  .strict()

export const DecodeError = z
  .object({
    type: z.literal('decode-error'),
    ...base,
    prompt: z.string(),
    code: Code,
    /** Show the real compiler output, captured at build time. */
    showCompilerOutput: z.boolean().default(true),
    options: Options,
    answer: OptionId,
  })
  .strict()

export const TrueFalse = z
  .object({
    type: z.literal('true-false'),
    ...base,
    prompt: z.string(),
    code: Code.optional(),
    diagram: Diagram.optional(),
    answer: z.boolean(),
  })
  .strict()

export const Exercise = z.discriminatedUnion('type', [
  ConceptCard,
  Mcq,
  PredictOutput,
  FillTokens,
  Parsons,
  Compiles,
  SpotBug,
  MatchPairs,
  DecodeError,
  TrueFalse,
])

export const Lesson = z.object({ id: Slug, exercises: z.array(Exercise).min(1) }).strict()

export const Level = z
  .object({
    id: Slug,
    title: z.string(),
    icon: z.string().optional(),
    concepts: z.array(ConceptId).default([]),
    reviewConcepts: z.array(ConceptId).default([]),
    lessons: z.array(Lesson).min(1),
  })
  .strict()

/**
 * Code Read (plans/03 type 14): one program revealed chunk by chunk, with questions after each chunk.
 * `lines` is how many more program lines each chunk reveals; they must add up to the whole program.
 */
export const CodeRead = z
  .object({
    id: Slug,
    title: z.string(),
    icon: z.string().optional(),
    concepts: z.array(ConceptId).default([]),
    reviewConcepts: z.array(ConceptId).default([]),
    program: Code,
    chunks: z
      .array(z.object({ lines: z.number().int().positive(), exercises: z.array(Exercise).min(1) }).strict())
      .min(1),
  })
  .strict()

/** Licences we can adapt from (plans/01 §13.2). Anything else fails the build. */
export const SourceLicence = z.enum(['MIT', 'Apache-2.0', 'MIT OR Apache-2.0', 'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0'])

export const Source = z
  .object({
    name: z.string(),
    url: z.url(),
    licence: SourceLicence,
    adapted: z.boolean(),
    changes: z.string().optional(),
  })
  .strict()

export const Colour = z.enum(['purple', 'teal', 'blue', 'rust', 'pink', 'orange'])

/** A path entry: `chest`, `practice`, or `{ level: file }` / `{ checkpoint: file }` / ... */
export const PathEntry = z.union([
  z.enum(['chest', 'practice']),
  z.object({ level: z.string() }).strict(),
  z.object({ checkpoint: z.string() }).strict(),
  z.object({ 'code-read': z.string() }).strict(),
  z.object({ build: z.string() }).strict(),
])

export const Unit = z
  .object({
    id: Slug,
    title: z.string(),
    description: z.string(),
    colour: Colour.optional(),
    guidebook: z.string().optional(),
    bookRef: z.url().optional(),
    sources: z.array(Source).default([]),
    path: z.array(PathEntry).min(1),
  })
  .strict()

export const Section = z
  .object({
    id: Slug,
    title: z.string(),
    description: z.string(),
    colour: Colour,
    /** Unit directory names, in order. */
    units: z.array(z.string()).min(1),
  })
  .strict()

export const Course = z
  .object({
    id: Slug,
    title: z.string(),
    mascot: Slug,
    edition: z.enum(['2021', '2024']),
    /** Section directory names, in order. */
    sections: z.array(z.string()).min(1),
  })
  .strict()

export const Concept = z
  .object({ id: ConceptId, title: z.string(), prerequisites: z.array(ConceptId).default([]) })
  .strict()
export const Concepts = z.array(Concept)

export type Code = z.output<typeof Code>
export type Diagram = z.output<typeof Diagram>
export type Option = z.output<typeof Option>
export type Exercise = z.output<typeof Exercise>
export type ExerciseType = Exercise['type']
export type Lesson = z.output<typeof Lesson>
export type Level = z.output<typeof Level>
export type CodeRead = z.output<typeof CodeRead>
export type Unit = z.output<typeof Unit>
export type Section = z.output<typeof Section>
export type Course = z.output<typeof Course>
export type Concept = z.output<typeof Concept>
export type PathEntry = z.output<typeof PathEntry>

// ---- Compiled output (what the app loads) ----

/** Facts captured by rust-verify, baked into exercises. Keyed by snippet. */
export interface VerifiedCode {
  /** Rendered compiler diagnostics (`--color never`) for compile-fail snippets. */
  compilerOutput?: string
  stdout?: string
}

/**
 * In compiled bundles the Markdown fields (prompt, explanation, hint, why, concept markdown, and option
 * text except predict-output's) hold rendered HTML. Code and output text stay plain.
 */
export type CompiledExercise = Exercise & { verified?: VerifiedCode }
export type CompiledLesson = Omit<Lesson, 'exercises'> & { exercises: CompiledExercise[] }
export type CompiledLevel = Omit<Level, 'lessons'> & {
  lessons: CompiledLesson[]
  /** Code Reads only: the program, and how many of its lines are visible at each exercise of the one lesson. */
  program?: Code & { verified?: VerifiedCode }
  reveals?: number[]
}

export type CompiledPathNode =
  | { kind: 'level'; levelId: string }
  | { kind: 'checkpoint'; levelId: string }
  | { kind: 'code-read'; levelId: string }
  | { kind: 'chest' | 'practice'; id: string }
  | { kind: 'build'; id: string }

export interface CompiledUnit extends Omit<Unit, 'path' | 'guidebook'> {
  guidebook?: string // rendered HTML
  path: CompiledPathNode[]
  levels: Record<string, CompiledLevel>
}

export interface CompiledSection extends Omit<Section, 'units'> {
  units: CompiledUnit[]
}

export type Attribution = z.output<typeof Source> & { units: string[] }

export interface ContentManifest {
  contentVersion: string
  course: Course
  concepts: Concept[]
  /** Unit `sources:`, merged by url (plans/01 §13.3). */
  attributions: Attribution[]
  sections: { id: string; title: string; hash: string; url: string }[]
}
