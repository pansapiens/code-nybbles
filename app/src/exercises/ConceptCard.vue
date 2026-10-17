<template>
  <article class="stack">
    <p class="eyebrow">New concept</p>
    <h1 v-if="exercise.title">{{ exercise.title }}</h1>
    <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
    <div class="md" v-html="exercise.markdown" />
    <CodeCard v-if="exercise.code" :code="exercise.code.rust" />
  </article>
</template>

<script setup lang="ts">
import CodeCard from '@/components/CodeCard.vue'
import type { Ex } from './grade'

defineProps<{ exercise: Ex<'concept'>; checked: boolean }>()
</script>

<style scoped>
.eyebrow {
  margin: 0;
  color: var(--c-primary);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
