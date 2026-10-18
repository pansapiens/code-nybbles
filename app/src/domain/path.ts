/** Learning path locking (plans/01 §4.3.2): everything before the first unfinished node is open. */
import type { CompiledUnit } from '@code-nybbles/content-build/schema'
import type { Progress } from './progress'

export interface PathNode {
  id: string
  kind: 'level' | 'checkpoint' | 'code-read' | 'build' | 'chest' | 'practice'
  /** Lessons in the level (level, checkpoint, code-read and build nodes; a build's lessons are its steps). */
  lessons?: number
}
export type NodeState = 'done' | 'current' | 'locked'

/** A unit's playable nodes. */
export function unitNodes(u: CompiledUnit): PathNode[] {
  return u.path.flatMap((p): PathNode[] =>
    'levelId' in p ? [{ id: p.levelId, kind: p.kind, lessons: u.levels[p.levelId]!.lessons.length }] : [{ id: p.id, kind: p.kind }],
  )
}

export function isDone(n: PathNode, p: Progress): boolean {
  if (n.kind === 'practice') return true // never gates the path: open once reached, like a chest that can be reopened
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
