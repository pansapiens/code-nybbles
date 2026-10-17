<template>
  <div class="stack">
    <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
    <h1 class="md" v-html="exercise.prompt" />
    <CodeCard :code="exercise.code.rust" />
    <div class="yes-no" role="radiogroup" aria-label="Does it compile?">
      <AnswerTile
        v-for="c in [true, false]"
        :key="String(c)"
        role="radio"
        :aria-checked="compiles === c"
        :state="state(c)"
        @click="pick(c)"
      >
        {{ c ? 'Yes' : 'No' }}
      </AnswerTile>
    </div>
    <template v-if="compiles === false && exercise.followUp">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <h2 class="md" v-html="exercise.followUp.prompt" />
      <OptionList
        v-model="followUp"
        :options="exercise.followUp.options"
        :answer="exercise.followUp.answer"
        :checked="checked"
        :label="exercise.followUp.prompt"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AnswerTile, { type TileState } from '@/components/AnswerTile.vue'
import CodeCard from '@/components/CodeCard.vue'
import type { Ex, Responses } from './grade'
import OptionList from './OptionList.vue'

const props = defineProps<{ exercise: Ex<'compiles'>; checked: boolean }>()
const response = defineModel<Responses['compiles']>('response')
const compiles = ref<boolean>()
const followUp = ref<string>()

function pick(c: boolean) {
  if (props.checked) return
  compiles.value = c
  followUp.value = undefined
}
function state(c: boolean): TileState {
  if (!props.checked) return compiles.value === c ? 'selected' : 'idle'
  if (c === compiles.value) return c === props.exercise.answer ? 'correct' : 'wrong'
  return c === props.exercise.answer ? 'correct' : 'disabled'
}
// Answerable once YES is picked, or NO plus the follow-up (when there is one).
watch([compiles, followUp], ([c, f]) => {
  const needsFollowUp = c === false && !!props.exercise.followUp
  response.value = c === undefined || (needsFollowUp && !f) ? undefined : { compiles: c, followUp: f }
})
</script>

<style scoped>
.yes-no {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-3);
}
.yes-no > * {
  text-align: center;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
</style>
