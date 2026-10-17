<template>
  <div class="stack">
    <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
    <h1 class="md" v-html="exercise.prompt" />
    <pre
      class="code"
      tabindex="0"
    ><code><template v-for="(p, i) in parts" :key="i"><template v-if="p.blank === undefined">{{ p.text }}</template><button
      v-else
      type="button"
      class="blank"
      :class="blankState(p.blank)"
      :aria-label="filled[p.blank] === undefined ? `Blank ${p.blank}, empty` : `Blank ${p.blank}: ${tokenAt(p.blank)}. Tap to remove`"
      :disabled="checked"
      @click="tapBlank(p.blank)"
    >{{ tokenAt(p.blank) ?? '    ' }}</button></template></code></pre>
    <div class="bank" aria-label="Word bank">
      <AnswerTile
        v-for="i in order"
        :key="i"
        mono
        :state="used.has(i) || checked ? 'disabled' : 'idle'"
        @click="place(i)"
      >
        {{ exercise.bank[i] }}
      </AnswerTile>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AnswerTile from '@/components/AnswerTile.vue'
import { BLANK, type Ex, type Responses } from './grade'
import { shuffledIndices } from './shuffle'

const props = defineProps<{ exercise: Ex<'fill-tokens'>; checked: boolean; correct?: boolean }>()
const response = defineModel<Responses['fill-tokens']>('response')

const parts = computed(() =>
  props.exercise.code.rust
    .replace(/\n$/, '')
    .split(BLANK)
    // split() with a capture group alternates text, blank key, text, ...
    .map((s, i) => (i % 2 ? { blank: s } : { text: s })),
)
const keys = computed(() => parts.value.flatMap((p) => (p.blank === undefined ? [] : [p.blank])))
const order = shuffledIndices(props.exercise.bank.length)
/** blank key -> bank index */
const filled = reactive<Record<string, number>>({})
const active = ref<string>()
const used = computed(() => new Set(Object.values(filled)))
const tokenAt = (k: string) => (filled[k] === undefined ? undefined : props.exercise.bank[filled[k]])

function place(i: number) {
  const target =
    active.value !== undefined && filled[active.value] === undefined
      ? active.value
      : keys.value.find((k) => filled[k] === undefined)
  if (target === undefined) return
  filled[target] = i
  active.value = undefined
}
function tapBlank(k: string) {
  if (filled[k] === undefined) active.value = k
  else delete filled[k]
}
function blankState(k: string) {
  if (!props.checked) return { active: active.value === k, empty: filled[k] === undefined }
  const ok = props.correct || !!props.exercise.blanks[k]?.answer.includes(tokenAt(k) ?? '')
  return { correct: ok, wrong: !ok }
}

watch(filled, () => {
  const all = keys.value.every((k) => filled[k] !== undefined)
  response.value = all ? Object.fromEntries(keys.value.map((k) => [k, tokenAt(k)!])) : undefined
})
</script>

<style scoped>
.code {
  margin: 0;
  padding: var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  overflow-x: auto;
  font-size: var(--code-size);
  line-height: 2.4;
}
.blank {
  min-width: 4ch;
  padding: 0.15em 0.4em;
  border: 2px solid var(--c-border);
  border-radius: var(--radius-tile);
  background: var(--c-canvas);
  font-family: var(--font-code);
  font-size: inherit;
  cursor: pointer;
}
.blank.empty {
  border-style: dashed;
}
.blank.active {
  border-color: var(--c-selected-border);
  background: var(--c-selected-tint);
}
.blank.correct {
  border-color: var(--c-correct);
  background: var(--c-correct-tint);
  color: var(--c-correct-text);
}
.blank.wrong {
  border-color: var(--c-wrong);
  background: var(--c-wrong-tint);
  color: var(--c-wrong-text);
}
.bank {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}
</style>
