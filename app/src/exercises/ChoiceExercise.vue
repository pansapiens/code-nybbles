<template>
  <div class="stack">
    <p v-if="exercise.type === 'true-false'" class="eyebrow">True or false?</p>
    <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
    <h1 class="md" v-html="exercise.prompt" />
    <CodeCard v-if="exercise.code" :code="exercise.code.rust" :line-numbers="exercise.type === 'decode-error'" />
    <pre v-if="compilerOutput" class="terminal" tabindex="0" aria-label="Compiler output">{{ compilerOutput }}</pre>
    <OptionList
      v-model="picked"
      :options="options"
      :answer="answer"
      :checked="checked"
      :plain="exercise.type === 'predict-output'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CodeCard from '@/components/CodeCard.vue'
import type { Ex } from './grade'
import OptionList from './OptionList.vue'

const props = defineProps<{
  exercise: Ex<'mcq'> | Ex<'decode-error'> | Ex<'predict-output'> | Ex<'true-false'>
  checked: boolean
}>()
const response = defineModel<string | boolean>('response')

const TF = [
  { id: 'true', text: 'True' },
  { id: 'false', text: 'False' },
]
const ex = computed(() => props.exercise)
const options = computed(() => (ex.value.type === 'true-false' ? TF : (ex.value.options ?? [])))
const answer = computed(() => String(ex.value.answer))
const compilerOutput = computed(() => (ex.value.type === 'decode-error' ? ex.value.verified?.compilerOutput : undefined))
// true-false answers are booleans; everything else is an option id.
const picked = computed({
  get: () => (response.value === undefined ? undefined : String(response.value)),
  set: (id) => (response.value = ex.value.type === 'true-false' ? id === 'true' : id),
})
</script>

<style scoped>
.eyebrow {
  margin: 0;
  color: var(--c-text-2);
  font-weight: 800;
}
.terminal {
  margin: 0;
  padding: var(--s-3);
  border-radius: var(--radius-card);
  background: var(--c-terminal);
  color: var(--c-terminal-text);
  font-size: calc(var(--code-size) * 0.85);
  overflow-x: auto;
}
</style>
