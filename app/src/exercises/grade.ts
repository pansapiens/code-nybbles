/**
 * Graders per exercise type (plans/03 §3). Pure, so they're unit-tested without Vue.
 * Each type defines the response shape its renderer produces.
 */
import type { CompiledExercise, ExerciseType, Option } from '@code-nybbles/content-build/schema'

export interface Responses {
  concept: true
  mcq: string
  /** Option id (choose mode) or tile indices in order (assemble mode). */
  'predict-output': string | number[]
  'fill-tokens': Record<string, string>
  parsons: string[]
  compiles: { compiles: boolean; followUp?: string }
  'spot-bug': number
  /** Match-pairs grades itself while the learner plays; this is the tally. */
  'match-pairs': { mistakes: number }
  'decode-error': string
  'true-false': boolean
}

export type Ex<T extends ExerciseType> = Extract<CompiledExercise, { type: T }>
export interface Grade {
  correct: boolean
  mistakes: number
}
/** Shown under "Correct solution:". `html` is build-rendered Markdown; `code` is plain text shown as code. */
export interface Solution {
  html?: string
  code?: string
}

interface Grader<T extends ExerciseType> {
  grade(ex: Ex<T>, r: Responses[T]): Grade
  solution(ex: Ex<T>): Solution
}

export const BLANK = /___(\d+)___/g

const verdict = (correct: boolean): Grade => ({ correct, mistakes: correct ? 0 : 1 })
const optionSolution = (options: Option[], id: string): Solution => {
  const o = options.find((x) => x.id === id)
  return o?.code ? { code: o.code } : { html: o?.text ?? '' }
}
/** Assemble mode tests the words of the output, not its line breaks. */
const words = (s: string) => s.trim().split(/\s+/).join(' ')

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs]
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]))
}

export function fillSolution(ex: Ex<'fill-tokens'>): string {
  return ex.code.rust.replace(BLANK, (_, n: string) => ex.blanks[n]?.answer[0] ?? '')
}

const graders: { [T in ExerciseType]: Grader<T> } = {
  concept: { grade: () => verdict(true), solution: () => ({}) },
  mcq: {
    grade: (ex, r) => verdict(r === ex.answer),
    solution: (ex) => optionSolution(ex.options, ex.answer),
  },
  'decode-error': {
    grade: (ex, r) => verdict(r === ex.answer),
    solution: (ex) => optionSolution(ex.options, ex.answer),
  },
  'predict-output': {
    grade: (ex, r) =>
      verdict(
        typeof r === 'string'
          ? r === ex.answer
          : words(r.map((i) => ex.tiles?.[i] ?? '').join(' ')) === words(ex.answer),
      ),
    // Option text here is literal program output, not Markdown.
    solution: (ex) => ({ code: ex.options ? (ex.options.find((o) => o.id === ex.answer)?.text ?? '') : ex.answer }),
  },
  'true-false': {
    grade: (ex, r) => verdict(r === ex.answer),
    solution: (ex) => ({ html: ex.answer ? 'True' : 'False' }),
  },
  compiles: {
    grade: (ex, r) =>
      verdict(r.compiles === ex.answer && (ex.answer || !ex.followUp || r.followUp === ex.followUp.answer)),
    solution: (ex) => ({
      html: ex.answer
        ? 'Yes, it compiles.'
        : `No. ${ex.followUp ? (optionSolution(ex.followUp.options, ex.followUp.answer).html ?? '') : ''}`.trim(),
    }),
  },
  'spot-bug': {
    grade: (ex, r) => verdict(r === ex.answer),
    solution: (ex) => ({ code: `${ex.answer}: ${ex.code.rust.split('\n')[ex.answer - 1]?.trim()}` }),
  },
  'fill-tokens': {
    grade(ex, r) {
      const accepts = (key: string, token: string | undefined) => !!token && !!ex.blanks[key]?.answer.includes(token)
      const grouped = new Set((ex.anyOrder ?? []).flat())
      const fixedOk = Object.keys(ex.blanks)
        .filter((k) => !grouped.has(k))
        .every((k) => accepts(k, r[k]))
      // Each anyOrder group passes if some assignment of the filled tokens to its blanks fits.
      const groupsOk = (ex.anyOrder ?? []).every((g) => permutations(g).some((p) => g.every((k, i) => accepts(p[i]!, r[k]))))
      return verdict(fixedOk && groupsOk)
    },
    solution: (ex) => ({ code: fillSolution(ex) }),
  },
  parsons: {
    grade: (ex, r) => verdict([ex.answer, ...(ex.alternatives ?? [])].some((o) => o.join() === r.join())),
    solution: (ex) => ({ code: ex.answer.map((id) => ex.lines.find((l) => l.id === id)?.text ?? '').join('\n') }),
  },
  'match-pairs': {
    // Matching completes only when every pair is found, so it is never "wrong"; mistakes still count.
    grade: (_ex, r) => ({ correct: true, mistakes: r.mistakes }),
    solution: () => ({}),
  },
}

export function grade<T extends ExerciseType>(ex: Ex<T>, r: Responses[T]): Grade {
  return (graders[ex.type] as Grader<T>).grade(ex, r)
}
export function solution<T extends ExerciseType>(ex: Ex<T>): Solution {
  return (graders[ex.type] as Grader<T>).solution(ex)
}
