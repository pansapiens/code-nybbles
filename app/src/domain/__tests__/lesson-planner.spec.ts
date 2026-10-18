import { describe, expect, it } from 'vitest'
import { answerCurrent, currentRef, isFinished, planLesson, progress, startRun, summarise } from '../lesson-planner'

const plan = planLesson('s.u.lvl', { id: 'l1', exercises: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] })

describe('lesson planner', () => {
  it('builds global refs in authored order', () => {
    expect(plan.items).toEqual(['s.u.lvl/l1/a', 's.u.lvl/l1/b', 's.u.lvl/l1/c'])
  })

  it('re-queues wrong answers until they are right', () => {
    let run = startRun(plan, 0)
    run = answerCurrent(run, true) // a
    run = answerCurrent(run, false) // b wrong -> re-queued
    expect(progress(run)).toBeCloseTo(1 / 3)
    run = answerCurrent(run, true) // c
    expect(isFinished(run)).toBe(false)
    expect(currentRef(run)).toBe('s.u.lvl/l1/b')
    run = answerCurrent(run, true) // b again
    expect(isFinished(run)).toBe(true)
    expect(progress(run)).toBe(1)

    const s = summarise(run, (ref) => !ref.endsWith('/a'), 5000) // `a` is a concept card
    expect(s.accuracy).toBe(0.5) // first tries: b wrong, c right
    expect(s.mistakes).toBe(1)
    expect(s.durationMs).toBe(5000)
  })

  it('does not re-queue a wrong answer when requeue is off', () => {
    const run = answerCurrent(startRun({ levelId: 'l', lessonId: 'x', items: ['a', 'b'] }, 0), false, 1, false)
    expect(run.queue).toEqual(['a', 'b'])
  })
})
