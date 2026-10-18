/** Practice planning (plans/01 §3.11): picks exercise refs for Smart, Mistakes and unit practice. Pure. */
import type { CompiledExercise, CompiledSection } from '@code-nybbles/content-build/schema'
import { shuffledIndices } from '@/exercises/shuffle'
import type { LocalDate } from './dates'
import type { ExerciseRef } from './lesson-planner'
import type { Progress } from './progress'

export type PracticeKind = 'smart' | 'mistakes' | 'unit'

export const SESSION_SIZE = 10
const PER_CONCEPT = 2

export interface PoolItem {
  ref: ExerciseRef
  ex: CompiledExercise
  unitId: string
  levelId: string
  lessonIndex: number
}

/** Every exercise that can be practised alone: no concept cards, and no Code Reads (they need their program). */
export function exercisePool(sections: CompiledSection[]): PoolItem[] {
  return sections.flatMap((s) =>
    s.units.flatMap((u) =>
      Object.values(u.levels)
        .filter((l) => !l.program)
        .flatMap((l) =>
          l.lessons.flatMap((lesson, lessonIndex) =>
            lesson.exercises
              .filter((ex) => ex.type !== 'concept')
              .map((ex) => ({ ref: `${l.id}/${lesson.id}/${ex.id}`, ex, unitId: u.id, levelId: l.id, lessonIndex })),
          ),
        ),
    ),
  )
}

/** Unresolved mistakes that still exist in the content, newest first. */
export function reviewableMistakes(p: Progress, pool: PoolItem[]): ExerciseRef[] {
  const known = new Set(pool.map((i) => i.ref))
  return Object.entries(p.mistakes)
    .reverse() // insertion order is recency; the stable sort keeps that for equal timestamps
    .sort(([, a], [, b]) => b.at - a.at)
    .map(([ref]) => ref)
    .filter((ref) => known.has(ref))
}

/** Practisable exercises per concept, from lessons the learner has done. */
function candidates(p: Progress, pool: PoolItem[], unitId?: string) {
  const byConcept = new Map<string, ExerciseRef[]>()
  for (const i of pool) {
    const done = p.levels[i.levelId]?.lessons ?? 0
    if (i.lessonIndex >= done || (unitId && i.unitId !== unitId)) continue
    for (const c of i.ex.concepts ?? []) byConcept.set(c, [...(byConcept.get(c) ?? []), i.ref])
  }
  return byConcept
}

/** Concepts due for review (in a box, due on or before `today`) among the practisable ones. */
export function dueConcepts(p: Progress, pool: PoolItem[], today: LocalDate): number {
  return [...candidates(p, pool).keys()].filter((c) => p.concepts[c] && p.concepts[c].due <= today).length
}

export function planPractice(
  kind: PracticeKind,
  p: Progress,
  pool: PoolItem[],
  today: LocalDate,
  unitId?: string,
  random = Math.random,
): ExerciseRef[] {
  if (kind === 'mistakes') return reviewableMistakes(p, pool).slice(0, SESSION_SIZE)
  const byConcept = candidates(p, pool, kind === 'unit' ? unitId : undefined)
  // Overdue first, then weakest box, then longest overdue. Concepts never graded count as box 0, due today.
  const strength = (c: string) => p.concepts[c] ?? { box: 0, due: today }
  const order = [...byConcept.keys()].sort((a, b) => {
    const [x, y] = [strength(a), strength(b)]
    return Number(x.due > today) - Number(y.due > today) || x.box - y.box || (x.due < y.due ? -1 : x.due > y.due ? 1 : 0)
  })
  const picked = new Set<ExerciseRef>()
  for (const c of order) {
    const refs = byConcept.get(c)!
    let n = 0
    for (const i of shuffledIndices(refs.length, random)) {
      if (n === PER_CONCEPT || picked.size === SESSION_SIZE) break
      if (picked.has(refs[i]!)) continue
      picked.add(refs[i]!)
      n++
    }
  }
  return [...picked]
}
