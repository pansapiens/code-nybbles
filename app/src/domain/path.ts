/** Learning path locking (plans/01 §4.3.2): everything before the first unfinished node is open. */
import type { Progress } from './progress'

export interface PathNode {
  id: string
  kind: 'level' | 'checkpoint' | 'chest'
  /** Lessons in the level (level and checkpoint nodes). */
  lessons?: number
}
export type NodeState = 'done' | 'current' | 'locked'

export function isDone(n: PathNode, p: Progress): boolean {
  if (n.kind === 'chest') return p.openedChests.includes(n.id)
  return (p.levels[n.id]?.lessons ?? 0) >= (n.lessons ?? 1)
}

/** Nodes in course order -> state per node. Done nodes stay replayable; only the first unfinished is current. */
export function nodeStates(nodes: PathNode[], p: Progress): NodeState[] {
  let seenCurrent = false
  return nodes.map((n) => {
    if (!seenCurrent && isDone(n, p)) return 'done'
    if (seenCurrent) return 'locked'
    seenCurrent = true
    return 'current'
  })
}

/** Index of the lesson to play next in a level (replays cycle through the lessons once complete). */
export const nextLesson = (n: PathNode, p: Progress) => (p.levels[n.id]?.lessons ?? 0) % (n.lessons ?? 1)
