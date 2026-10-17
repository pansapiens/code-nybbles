<template>
  <div class="stack">
    <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
    <h1 class="md" v-html="exercise.prompt" />
    <CodeCard v-if="exercise.type === 'predict-output'" :code="exercise.code.rust" />
    <ol class="answer" :class="lines ? 'as-lines' : 'as-words'" aria-label="Your answer">
      <li v-for="(key, i) in placed" :key="key">
        <AnswerTile mono :state="placedState" :aria-label="`${items[key]!.text.trim()}. Tap to remove`" @click="remove(i)">
          {{ items[key]!.text }}
        </AnswerTile>
      </li>
      <li v-for="n in emptySlots" :key="`empty-${n}`" class="slot" aria-hidden="true" />
    </ol>
    <div class="pool" :class="lines ? 'as-lines' : 'as-words'" aria-label="Pieces to place">
      <AnswerTile
        v-for="i in order"
        :key="i"
        mono
        :state="placed.includes(i) || checked ? 'disabled' : 'idle'"
        @click="add(i)"
      >
        {{ items[i]!.text }}
      </AnswerTile>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AnswerTile from '@/components/AnswerTile.vue'
import CodeCard from '@/components/CodeCard.vue'
import type { Ex } from './grade'
import { shuffledIndices } from './shuffle'

/** Parsons (order whole lines) and predict-output assemble mode (order output words). */
const props = defineProps<{
  exercise: Ex<'parsons'> | Ex<'predict-output'>
  checked: boolean
  correct?: boolean
}>()
const response = defineModel<string[] | number[]>('response')

const ex = props.exercise
const lines = ex.type === 'parsons'
const items: { id?: string; text: string }[] = lines ? [...ex.lines, ...(ex.distractors ?? [])] : (ex as Ex<'predict-output'>).tiles!.map((text) => ({ text }))
const needed = ex.type === 'parsons' ? ex.lines.length : undefined
const order = shuffledIndices(items.length)
const placed = ref<number[]>([])

const emptySlots = computed(() => (needed ? Math.max(0, needed - placed.value.length) : placed.value.length ? 0 : 1))
const placedState = computed(() => (!props.checked ? 'idle' : props.correct ? 'correct' : 'wrong'))

function add(i: number) {
  if (!props.checked && placed.value.length < (needed ?? Infinity)) placed.value.push(i)
}
function remove(i: number) {
  if (!props.checked) placed.value.splice(i, 1)
}
watch(
  placed,
  (p) => {
    if (lines) response.value = p.length === needed ? p.map((i) => items[i]!.id!) : undefined
    else response.value = p.length ? [...p] : undefined
  },
  { deep: true },
)
</script>

<style scoped>
.answer {
  display: flex;
  gap: var(--s-2);
  min-height: var(--touch-min);
  margin: 0;
  padding: var(--s-2) 0;
  border-bottom: 2px solid var(--c-border);
  list-style: none;
}
.as-lines {
  flex-direction: column;
}
.as-words {
  flex-wrap: wrap;
}
.answer.as-lines > li,
.answer.as-lines :deep(.answer-tile) {
  width: 100%;
}
.slot {
  min-height: var(--touch-min);
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-tile);
}
.as-words .slot {
  width: 6ch;
}
.pool {
  display: flex;
  gap: var(--s-2);
}
.pool.as-lines :deep(.answer-tile) {
  white-space: pre;
}
</style>
