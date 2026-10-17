<template>
  <div class="options stack" role="radiogroup" :aria-label="label">
    <div v-for="o in options" :key="o.id" class="option">
      <AnswerTile
        role="radio"
        :aria-checked="model === o.id"
        :aria-label="plain && o.text ? spokenOutput(o.text) : undefined"
        :mono="plain || !!o.code"
        :state="state(o.id)"
        @click="!checked && (model = o.id)"
      >
        <template v-if="o.code || plain">{{ o.code ?? o.text }}</template>
        <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
        <span v-else class="md" v-html="o.text" />
      </AnswerTile>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-if="checked && o.why && o.id === model" class="why md" v-html="o.why" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Option } from '@code-nybbles/content-build/schema'
import AnswerTile, { type TileState } from '@/components/AnswerTile.vue'

const props = withDefaults(
  defineProps<{
    options: Option[]
    answer: string
    checked: boolean
    /** Option text is literal output, not Markdown HTML. */
    plain?: boolean
    label?: string
  }>(),
  { label: 'Answers' },
)
const model = defineModel<string>()

/** Screen readers drop line breaks, so `Ready\nGo!` and `Ready Go!` would sound the same. */
const spokenOutput = (s: string) => s.replace(/\n/g, ', new line, ')

function state(id: string): TileState {
  if (!props.checked) return model.value === id ? 'selected' : 'idle'
  if (id === model.value) return id === props.answer ? 'correct' : 'wrong'
  return id === props.answer ? 'correct' : 'disabled'
}
</script>

<style scoped>
.option {
  display: grid;
}
.why {
  margin: var(--s-2) var(--s-2) 0;
  color: var(--c-text-2);
  font-size: 0.92rem;
}
</style>
