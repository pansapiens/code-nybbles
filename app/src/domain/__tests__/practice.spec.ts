import type { CompiledExercise, CompiledSection } from '@code-nybbles/content-build/schema'
import { describe, expect, it } from 'vitest'
import { initialProgress, type Progress } from '../progress'
import { exercisePool, type PoolItem, planPractice, reviewableMistakes } from '../practice'

const TODAY = '2026-10-10'
const item = (levelId: string, lessonIndex: number, id: string, concepts: string[], unitId = 'u1'): PoolItem => ({
  ref: `${levelId}/l${lessonIndex}/${id}`,
  ex: { type: 'mcq', id, concepts } as CompiledExercise,
  unitId,
  levelId,
  lessonIndex,
})
const pool = [
  ...['1', '2', '3'].map((n) => item('lv1', 0, `a${n}`, ['c.a'])),
  ...['1', '2'].map((n) => item('lv1', 0, `b${n}`, ['c.b'])),
  item('lv1', 1, 'unplayed', ['c.b']), // lesson 2 not done yet
  item('lv2', 0, 'c1', ['c.c'], 'u2'),
  item('lv3', 0, 'locked', ['c.d']), // level never started
]
const progress = (): Progress => {
  const p = initialProgress()
  for (const id of ['lv1', 'lv2']) p.levels[id] = { lessons: 1, bestAccuracy: 1, firstCompletedAt: 0 }
  return p
}
const first = () => 0

describe('planPractice', () => {
  it('orders overdue and weakest concepts first, at most 2 per concept, only from done lessons', () => {
    const p = progress()
    p.concepts['c.a'] = { box: 3, due: '2026-10-20', correct: 5, incorrect: 0 } // not due
    p.concepts['c.b'] = { box: 1, due: '2026-10-05', correct: 1, incorrect: 0 } // overdue
    p.concepts['c.c'] = { box: 0, due: TODAY, correct: 0, incorrect: 1 } // due, weakest
    const refs = planPractice('smart', p, pool, TODAY, undefined, first)
    expect(refs.map((r) => r.split('/')[2]![0]).sort().join('')).toBe('aabbc')
    expect(refs[0]).toContain('/c1')
    expect(refs.slice(1, 3).every((r) => r.includes('/b'))).toBe(true)
    expect(refs.some((r) => r.includes('unplayed') || r.includes('locked'))).toBe(false)
    expect(new Set(refs).size).toBe(refs.length)
  })

  it('limits unit practice to that unit and caps a session at 10', () => {
    const p = progress()
    expect(planPractice('unit', p, pool, TODAY, 'u2', first)).toEqual(['lv2/l0/c1'])
    const wide = Array.from({ length: 12 }, (_, i) => item('lv1', 0, `x${i}`, [`c.${i}`]))
    expect(planPractice('smart', p, wide, TODAY, undefined, first)).toHaveLength(10)
  })

  it('reviews unresolved mistakes newest first and drops refs that left the content', () => {
    const p = progress()
    p.mistakes = { 'lv1/l0/a1': { at: 1 }, gone: { at: 2 }, 'lv1/l0/b1': { at: 3 }, 'lv1/l0/a2': { at: 3 } }
    expect(reviewableMistakes(p, pool)).toEqual(['lv1/l0/a2', 'lv1/l0/b1', 'lv1/l0/a1'])
    expect(planPractice('mistakes', p, pool, TODAY)).toHaveLength(3)
  })

  it('has nothing to practise before any lesson is done', () => {
    expect(planPractice('smart', initialProgress(), pool, TODAY)).toEqual([])
  })

  it('keeps Code Reads out of smart practice and includes them, with their program, for mistakes', () => {
    const sections = [
      {
        units: [
          {
            id: 'u',
            levels: {
              'u.read': {
                id: 'u.read',
                program: { rust: 'fn main() {}\n' },
                reveals: [1, 1, 2],
                lessons: [
                  {
                    id: 'read',
                    exercises: [
                      { type: 'mcq', id: 'q1', concepts: ['c'] },
                      { type: 'concept', id: 'card' },
                      { type: 'true-false', id: 'q2', concepts: ['c'] },
                    ],
                  },
                ],
              },
              'u.lv': { id: 'u.lv', lessons: [{ id: 'l1', exercises: [{ type: 'mcq', id: 'q', concepts: ['c'] }] }] },
            },
          },
        ],
      },
    ] as unknown as CompiledSection[]
    expect(exercisePool(sections).map((i) => i.ref)).toEqual(['u.lv/l1/q'])
    const withReads = exercisePool(sections, true)
    expect(withReads.map((i) => i.ref)).toEqual(['u.read/read/q1', 'u.read/read/q2', 'u.lv/l1/q'])
    expect(withReads[0]).toMatchObject({ program: { rust: 'fn main() {}\n' }, reveal: 1 })
    expect(withReads[1]).toMatchObject({ reveal: 2 })
    expect(withReads[1]!.program).toBe(withReads[0]!.program)
    const p = initialProgress()
    p.mistakes = { 'u.read/read/q2': { at: 1 } }
    expect(reviewableMistakes(p, exercisePool(sections))).toEqual([])
    expect(planPractice('mistakes', p, withReads, TODAY)).toEqual(['u.read/read/q2'])
  })
})
