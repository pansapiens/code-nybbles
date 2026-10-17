/** Renderer per exercise type (plans/03 §6). Add a type here and in grade.ts; the player needs no change. */
import type { CompiledExercise, ExerciseType } from '@code-nybbles/content-build/schema'
import type { Component } from 'vue'
import ChoiceExercise from './ChoiceExercise.vue'
import CompilesExercise from './CompilesExercise.vue'
import ConceptCard from './ConceptCard.vue'
import FillTokens from './FillTokens.vue'
import MatchPairs from './MatchPairs.vue'
import OrderExercise from './OrderExercise.vue'
import SpotBug from './SpotBug.vue'

const renderers: Record<ExerciseType, Component> = {
  concept: ConceptCard,
  mcq: ChoiceExercise,
  'predict-output': ChoiceExercise,
  'fill-tokens': FillTokens,
  parsons: OrderExercise,
  compiles: CompilesExercise,
  'spot-bug': SpotBug,
  'match-pairs': MatchPairs,
  'decode-error': ChoiceExercise,
  'true-false': ChoiceExercise,
}

export const rendererFor = (ex: CompiledExercise): Component =>
  ex.type === 'predict-output' && ex.tiles ? OrderExercise : renderers[ex.type]

/** Concept cards count toward progress but not accuracy (plans/03 §1). */
export const isGraded = (ex: CompiledExercise) => ex.type !== 'concept'

/** Match-pairs grades each tap itself, so the player checks as soon as it's complete. */
export const checksItself = (ex: CompiledExercise) => ex.type === 'match-pairs'
