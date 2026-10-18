/**
 * Lesson planning and the in-lesson queue (plans/03 §6, plans/01 §4.3.4). Pure: no Vue, no Dexie.
 * An exercise ref is the global ID `levelId/lessonId/exerciseId` (plans/03 §2.3).
 */
import type { AnswerResult } from './progress'

export type ExerciseRef = string

export interface LessonPlan {
  levelId: string
  lessonId: string
  items: ExerciseRef[]
}

export interface Attempt {
  ref: ExerciseRef
  correct: boolean
  mistakes: number
}

export interface LessonRun {
  plan: LessonPlan
  /** Planned items, plus wrong answers re-queued at the end. */
  queue: ExerciseRef[]
  index: number
  attempts: Attempt[]
  startedAt: number
}

// ponytail: authored order only. Pool sampling and Legendary subsets (plans/03 §1.1) plug in here;
// practice sessions build their plan in practice.ts and reuse the same run.
export function planLesson(levelId: string, lesson: { id: string; exercises: { id: string }[] }): LessonPlan {
  return {
    levelId,
    lessonId: lesson.id,
    items: lesson.exercises.map((e) => `${levelId}/${lesson.id}/${e.id}`),
  }
}

export function startRun(plan: LessonPlan, now: number): LessonRun {
  return { plan, queue: [...plan.items], index: 0, attempts: [], startedAt: now }
}

export const currentRef = (run: LessonRun): ExerciseRef | undefined => run.queue[run.index]
export const isFinished = (run: LessonRun) => run.index >= run.queue.length

/** Record the answer to the current item and move on. A wrong answer re-queues the item at the end (unless `requeue` is off, as in tests). */
export function answerCurrent(run: LessonRun, correct: boolean, mistakes = correct ? 0 : 1, requeue = true): LessonRun {
  const ref = currentRef(run)
  if (!ref) return run
  return {
    ...run,
    queue: correct || !requeue ? run.queue : [...run.queue, ref],
    index: run.index + 1,
    attempts: [...run.attempts, { ref, correct, mistakes }],
  }
}

/** One result per graded exercise (`concepts(ref)` is undefined for ungraded ones); ok = right first time. */
export function answerResults(run: LessonRun, concepts: (ref: ExerciseRef) => string[] | undefined): AnswerResult[] {
  const seen = new Set<ExerciseRef>()
  return run.attempts.flatMap((a) => {
    const cs = concepts(a.ref)
    if (!cs || seen.has(a.ref)) return []
    seen.add(a.ref)
    return [{ ref: a.ref, concepts: cs, ok: a.correct && !a.mistakes }]
  })
}

/** Fraction of planned items answered correctly (re-queues don't move the bar backwards). */
export function progress(run: LessonRun): number {
  const done = new Set(run.attempts.filter((a) => a.correct).map((a) => a.ref))
  return run.plan.items.length ? done.size / run.plan.items.length : 1
}

export interface LessonSummary {
  /** Share of graded first attempts that were correct, 0-1. Concept cards don't count (plans/03 §1). */
  accuracy: number
  mistakes: number
  durationMs: number
}

export function summarise(run: LessonRun, graded: (ref: ExerciseRef) => boolean, now: number): LessonSummary {
  const first = new Map<ExerciseRef, Attempt>()
  for (const a of run.attempts) if (!first.has(a.ref) && graded(a.ref)) first.set(a.ref, a)
  const firsts = [...first.values()]
  return {
    accuracy: firsts.length ? firsts.filter((a) => a.correct && !a.mistakes).length / firsts.length : 1,
    mistakes: run.attempts.reduce((n, a) => n + a.mistakes, 0),
    durationMs: now - run.startedAt,
  }
}
