<template>
  <article class="view stack">
    <RouterLink to="/" class="back">Back to the path</RouterLink>
    <p v-if="!unit && loaded">There's no guidebook for this unit.</p>
    <template v-if="unit">
      <p class="eyebrow">Guidebook</p>
      <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
      <div class="md guide" v-html="unit.guidebook" />
      <a v-if="unit.bookRef" :href="unit.bookRef" rel="noopener">Read the Rust Book section</a>
    </template>
  </article>
</template>

<script setup lang="ts">
import type { CompiledUnit } from '@code-nybbles/content-build/schema'
import { onMounted, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { loadCourse } from '@/content/loader'

const props = defineProps<{ unitId: string }>()
const unit = shallowRef<CompiledUnit>()
const loaded = ref(false)

onMounted(async () => {
  const { sections } = await loadCourse()
  unit.value = sections.flatMap((s) => s.units).find((u) => u.id === props.unitId && u.guidebook)
  loaded.value = true
})
</script>

<style scoped>
.back,
.eyebrow {
  color: var(--c-text-2);
  font-weight: 800;
}
.eyebrow {
  margin: 0;
  text-transform: uppercase;
}
.guide :deep(h1) {
  margin: 0 0 var(--s-3);
  font-size: 1.6rem;
}
.guide :deep(h2) {
  margin: var(--s-5) 0 var(--s-2);
  font-size: 1.2rem;
}
</style>
