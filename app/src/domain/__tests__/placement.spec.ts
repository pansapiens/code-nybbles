import type { CompiledSection } from '@code-nybbles/content-build/schema'
import { expect, it } from 'vitest'
import { nodesUpTo, placementItems, placementScore, sectionCheckpoints } from '../placement'

const level = (id: string, n = 1) => ({ id, lessons: Array.from({ length: n }, (_, i) => ({ id: `l${i}`, exercises: [{ type: 'mcq', id: 'q1' }, { type: 'mcq', id: 'q2' }, { type: 'mcq', id: 'q3' }, { type: 'mcq', id: 'q4' }, { type: 'concept', id: 'c' }] })) })
const unit = (id: string, extra: string[] = []) => {
  const ids = [`${id}.a`, `${id}.cp`, ...extra]
  return {
    id,
    levels: Object.fromEntries(ids.map((i) => [i, level(i, 2)])),
    path: [
      { kind: 'level', levelId: `${id}.a` },
      { kind: 'chest', id: `${id}.chest-1` },
      { kind: 'build', levelId: `${id}.build` }, // not playable yet: skipped
      { kind: 'practice', id: `${id}.practice-2` },
      { kind: 'checkpoint', levelId: `${id}.cp` },
    ],
  }
}
const sections = [{ units: [unit('s1.u1'), unit('s1.u2')] }, { units: [unit('s2.u1')] }] as unknown as CompiledSection[]

it('lists levels and chests up to and including a checkpoint, skipping practice and build nodes', () => {
  expect(nodesUpTo(sections, 's1.u1.cp')).toEqual({
    levels: [{ id: 's1.u1.a', lessons: 2 }, { id: 's1.u1.cp', lessons: 2 }],
    chests: ['s1.u1.chest-1'],
  })
  const all = nodesUpTo(sections, 's2.u1.cp')
  expect(all.levels).toHaveLength(6)
  expect(all.chests).toHaveLength(3)
  expect(sectionCheckpoints(sections)).toEqual(['s1.u2.cp', 's2.u1.cp'])
})

it('draws 3 gradable questions from each section checkpoint, in section order', () => {
  const items = placementItems(sections, () => 0.5)
  expect(items.map((i) => i.levelId)).toEqual(['s1.u2.cp', 's1.u2.cp', 's1.u2.cp', 's2.u1.cp', 's2.u1.cp', 's2.u1.cp'])
  expect(items.every((i) => i.ex.type !== 'concept')).toBe(true)
  expect(new Set(items.map((i) => i.ref)).size).toBe(6)
})

it('passes a section with 2 of 3, and stops at the first failed section or after the last', () => {
  const [T, F] = [true, false]
  expect(placementScore([T, T], 2)).toEqual({ passed: 0, over: false })
  expect(placementScore([T, F, T], 2)).toEqual({ passed: 1, over: false })
  expect(placementScore([T, F, T, F, T, F], 2)).toEqual({ passed: 1, over: true })
  expect(placementScore([F, F], 2)).toEqual({ passed: 0, over: false })
  expect(placementScore([F, F, T], 2)).toEqual({ passed: 0, over: true })
  expect(placementScore([T, T, T, T, T, F], 2)).toEqual({ passed: 2, over: true })
})
