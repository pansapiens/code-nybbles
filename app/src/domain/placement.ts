/** Placement test and "Jump here" checkpoints (plans/01 §4.3, plans/02 §6). Pure: no Vue, no Dexie. */
import type { CompiledSection } from '@code-nybbles/content-build/schema'
import { shuffledIndices } from '@/exercises/shuffle'
import { unitNodes } from './path'
import { exercisePool, type PoolItem } from './practice'
import type { PlacementPayload } from './progress'

export const PER_SECTION = 3
export const PASS_MARK = 2
/** Share of a checkpoint a "Jump here" attempt must get right on the first try. */
export const JUMP_PASS = 0.8

/** Every playable node from the start of the course up to and including `checkpointLevelId`, in course order. */
export function nodesUpTo(sections: CompiledSection[], checkpointLevelId: string): Pick<PlacementPayload, 'levels' | 'chests'> {
  const out: Pick<PlacementPayload, 'levels' | 'chests'> = { levels: [], chests: [] }
  for (const n of sections.flatMap((s) => s.units.flatMap(unitNodes))) {
    if (n.kind === 'chest') out.chests.push(n.id)
    else if (n.kind !== 'practice') out.levels.push({ id: n.id, lessons: n.lessons! })
    if (n.id === checkpointLevelId) break
  }
  return out
}

/** The last checkpoint level of each section: the question pool for that section. A project unit (Unit 2.4) has none. */
export const sectionCheckpoints = (sections: CompiledSection[]): string[] =>
  sections.map((s) => s.units.flatMap(unitNodes).filter((n) => n.kind === 'checkpoint').pop()!.id)

/** The last node of each section: passing a section's placement questions completes everything up to here, Builds included. */
export const sectionEnds = (sections: CompiledSection[]): string[] => sections.map((s) => s.units.flatMap(unitNodes).pop()!.id)

/** PER_SECTION random gradable questions from each section's checkpoint, Section 1 first. */
export function placementItems(sections: CompiledSection[], random = Math.random): PoolItem[] {
  const pool = exercisePool(sections)
  return sectionCheckpoints(sections).flatMap((id) => {
    const items = pool.filter((i) => i.levelId === id)
    return shuffledIndices(items.length, random).slice(0, PER_SECTION).map((i) => items[i]!)
  })
}

/**
 * Sections passed so far (PASS_MARK of PER_SECTION right, in order) and whether the test is over:
 * at the first failed section, or after the last one.
 * ponytail: plans/02 §6 describes an adaptive up-and-down walk; this is a straight climb that stops at the
 * first failure, so a learner who fails one section by bad luck is placed lower.
 */
export function placementScore(oks: boolean[], sectionCount: number): { passed: number; over: boolean } {
  let passed = 0
  for (; oks.length >= (passed + 1) * PER_SECTION; passed++) {
    const group = oks.slice(passed * PER_SECTION, (passed + 1) * PER_SECTION)
    if (group.filter(Boolean).length < PASS_MARK) return { passed, over: true }
  }
  return { passed, over: passed >= sectionCount }
}
