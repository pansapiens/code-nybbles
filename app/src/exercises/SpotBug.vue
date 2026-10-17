<template>
  <div class="stack">
    <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
    <h1 class="md" v-html="exercise.prompt" />
    <div class="code-lines" role="radiogroup" aria-label="Code lines">
      <button
        v-for="(line, i) in lines"
        :key="i"
        type="button"
        role="radio"
        class="line"
        :class="state(i + 1)"
        :aria-checked="response === i + 1"
        :aria-label="`Line ${i + 1}: ${line.trim() || 'blank'}`"
        :disabled="checked"
        @click="response = i + 1"
      >
        <span class="ln" aria-hidden="true">{{ i + 1 }}</span><HighlightedLine :line="line" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HighlightedLine from '@/components/HighlightedLine.vue'
import type { Ex } from './grade'

const props = defineProps<{ exercise: Ex<'spot-bug'>; checked: boolean }>()
const response = defineModel<number>('response')
const lines = computed(() => props.exercise.code.rust.replace(/\n$/, '').split('\n'))

function state(n: number) {
  if (!props.checked) return { selected: response.value === n }
  return { correct: n === props.exercise.answer, wrong: n === response.value && n !== props.exercise.answer }
}
</script>

<style scoped>
.code-lines {
  display: grid;
  padding: var(--s-2) 0;
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  overflow-x: auto;
}
.line {
  min-height: var(--touch-min);
  padding: 0 var(--s-3);
  border: 2px solid transparent;
  background: none;
  font-family: var(--font-code);
  font-size: var(--code-size);
  text-align: left;
  white-space: pre;
  cursor: pointer;
}
.line:disabled {
  cursor: default;
}
.ln {
  display: inline-block;
  width: 2ch;
  margin-right: 1.5ch;
  color: var(--c-text-2);
  text-align: right;
}
.selected {
  border-color: var(--c-selected-border);
  background: var(--c-selected-tint);
}
.correct {
  border-color: var(--c-correct);
  background: var(--c-correct-tint);
  color: var(--c-correct-text);
}
.wrong {
  border-color: var(--c-wrong);
  background: var(--c-wrong-tint);
  color: var(--c-wrong-text);
  animation: shake 400ms;
}
</style>
