import { expect, it } from 'vitest'
import { nextLesson, nodeStates, type PathNode, rewindChoices } from '../path'
import { initialProgress } from '../progress'

it('opens nodes in order and cycles replays', () => {
  const nodes: PathNode[] = [
    { id: 'a', kind: 'level', lessons: 2 },
    { id: 'u.chest-2', kind: 'chest' },
    { id: 'b', kind: 'checkpoint', lessons: 1 },
  ]
  const p = initialProgress()
  expect(nodeStates(nodes, p)).toEqual(['current', 'locked', 'locked'])
  p.levels.a = { lessons: 1, bestAccuracy: 1, firstCompletedAt: 0 }
  expect(nodeStates(nodes, p)).toEqual(['current', 'locked', 'locked'])
  expect(nextLesson(nodes[0]!, p)).toBe(1)
  p.levels.a.lessons = 2
  expect(nodeStates(nodes, p)).toEqual(['done', 'current', 'locked'])
  expect(nextLesson(nodes[0]!, p)).toBe(0)
  p.openedChests.push('u.chest-2')
  expect(nodeStates(nodes, p)).toEqual(['done', 'done', 'current'])
})

it('lists a rewind target for each unit, from that unit to the end of the course', () => {
  const level = (concepts: string[]) => ({ lessons: [{ exercises: [{ concepts }] }] })
  const choices = rewindChoices([
    {
      title: 'First',
      units: [
        { id: 'u1', title: 'Hello', path: [{ kind: 'level', levelId: 'u1.a' }, { kind: 'chest', id: 'c1' }, { kind: 'practice', id: 'p1' }], levels: { 'u1.a': level(['intro']) } },
        { id: 'u2', title: 'Variables', path: [{ kind: 'level', levelId: 'u2.b' }], levels: { 'u2.b': level(['intro', 'var.let']) } },
      ],
    },
  ])
  expect(choices.map((c) => c.unitTitle)).toEqual(['Hello', 'Variables'])
  expect(choices[0]).toMatchObject({ sectionNo: 1, unitNo: 1, levelIds: ['u1.a', 'u2.b'], chestIds: ['c1'], conceptIds: ['intro', 'var.let'] })
  expect(choices[1]).toMatchObject({ unitNo: 2, levelIds: ['u2.b'], chestIds: [], conceptIds: ['var.let'] })
})

it('treats a practice node as open once reached, without gating what follows', () => {
  const nodes: PathNode[] = [
    { id: 'a', kind: 'level', lessons: 1 },
    { id: 'u.practice-2', kind: 'practice' },
    { id: 'b', kind: 'level', lessons: 1 },
  ]
  const p = initialProgress()
  expect(nodeStates(nodes, p)).toEqual(['current', 'locked', 'locked'])
  p.levels.a = { lessons: 1, bestAccuracy: 1, firstCompletedAt: 0 }
  expect(nodeStates(nodes, p)).toEqual(['done', 'done', 'current'])
})
