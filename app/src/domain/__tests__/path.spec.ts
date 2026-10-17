import { expect, it } from 'vitest'
import { nextLesson, nodeStates, type PathNode } from '../path'
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
