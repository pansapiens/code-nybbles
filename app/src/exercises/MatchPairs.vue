<template>
  <div class="stack">
    <h1>{{ exercise.prompt }}</h1>
    <div class="columns">
      <div v-for="side in SIDES" :key="side" class="stack" :aria-label="side === 0 ? 'Left column' : 'Right column'">
        <AnswerTile
          v-for="i in orders[side]"
          :key="i"
          :mono="side === 0"
          :state="state(side, i)"
          @click="tap(side, i)"
        >
          {{ exercise.pairs[i]![side] }}
        </AnswerTile>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import AnswerTile, { type TileState } from '@/components/AnswerTile.vue'
import type { Ex, Responses } from './grade'
import { shuffledIndices } from './shuffle'

const props = defineProps<{ exercise: Ex<'match-pairs'>; checked: boolean }>()
const response = defineModel<Responses['match-pairs']>('response')
const emit = defineEmits<{ mistake: [] }>()

const SIDES = [0, 1] as const
const n = props.exercise.pairs.length
const orders = [shuffledIndices(n), shuffledIndices(n)]
const matched = reactive(new Set<number>())
const selected = ref<{ side: 0 | 1; i: number }>()
const wrong = ref<{ side: 0 | 1; i: number }[]>([])
let mistakes = 0

function tap(side: 0 | 1, i: number) {
  const s = selected.value
  if (!s || s.side === side) {
    selected.value = s?.side === side && s.i === i ? undefined : { side, i }
    return
  }
  selected.value = undefined
  if (s.i === i) {
    matched.add(i)
    if (matched.size === n) response.value = { mistakes }
  } else {
    mistakes++
    emit('mistake')
    wrong.value = [s, { side, i }]
    setTimeout(() => (wrong.value = []), 500)
  }
}
function state(side: 0 | 1, i: number): TileState {
  if (matched.has(i)) return 'disabled'
  if (wrong.value.some((w) => w.side === side && w.i === i)) return 'wrong'
  return selected.value?.side === side && selected.value.i === i ? 'selected' : 'idle'
}
</script>

<style scoped>
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-3);
}
.columns :deep(.answer-tile) {
  text-align: center;
}
</style>
