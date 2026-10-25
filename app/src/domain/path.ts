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

export interface RewindChoice {
  unitId: string
  sectionNo: number
  sectionTitle: string
  unitNo: number
  unitTitle: string
  /** Levels and chests from this unit through the end of the course. */
  levelIds: string[]
  chestIds: string[]
  /** Concepts first taught in that range. Earlier concepts keep their review history. */
  conceptIds: string[]
}

type RewindUnit = {
  id: string
  title: string
  path: { kind: string; levelId?: string; id?: string }[]
  levels: Record<string, { lessons: { exercises: { concepts?: string[] }[] }[] }>
}

/** One entry per unit, in course order. Choosing one rewinds to the start of that unit. */
export function rewindChoices(sections: { title: string; units: RewindUnit[] }[]): RewindChoice[] {
  const units = sections.flatMap((s, si) => s.units.map((u, ui) => ({ sectionNo: si + 1, sectionTitle: s.title, unitNo: ui + 1, u })))
  const seen = new Set<string>()
  return units.map(({ sectionNo, sectionTitle, unitNo, u }, i) => {
    const levelIds: string[] = []
    const chestIds: string[] = []
    const later = new Set<string>()
    for (const { u: v } of units.slice(i)) {
      for (const n of v.path) {
        if (n.kind === 'chest' && n.id) chestIds.push(n.id)
        else if (n.kind !== 'practice' && n.levelId) levelIds.push(n.levelId)
      }
      for (const c of conceptsIn(v)) later.add(c)
    }
    const conceptIds = [...later].filter((c) => !seen.has(c))
    for (const c of conceptsIn(u)) seen.add(c)
    return { unitId: u.id, sectionNo, sectionTitle, unitNo, unitTitle: u.title, levelIds, chestIds, conceptIds }
  })
}

function conceptsIn(u: RewindUnit): string[] {
  return Object.values(u.levels).flatMap((level) => level.lessons.flatMap((lesson) => lesson.exercises.flatMap((e) => e.concepts ?? [])))
}
