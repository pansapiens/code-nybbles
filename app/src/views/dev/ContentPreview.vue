<template>
  <section class="view stack">
    <h1>Content preview</h1>
    <p v-if="error" role="alert">{{ error }}</p>
    <label>
      Level
      <select v-model="levelId">
        <option v-for="id in levelIds" :key="id" :value="id">{{ id }}</option>
      </select>
    </label>
    <template v-if="level">
      <section v-for="lesson in level.lessons" :key="lesson.id" class="stack">
        <h2>{{ lesson.id }} ({{ lesson.exercises.length }} exercises)</h2>
        <article v-for="ex in lesson.exercises" :key="ex.id" class="card stack">
          <p class="meta">
            <code>{{ ex.type }}</code> · <code>{{ ex.id }}</code>
            <span v-if="'concepts' in ex && ex.concepts"> · {{ ex.concepts.join(', ') }}</span>
          </p>
          <component :is="rendererFor(ex)" :exercise="ex" :checked="false" />
          <div v-if="isGraded(ex)" class="answer">
            <strong>Answer:</strong>
            <pre v-if="solution(ex as never).code">{{ solution(ex as never).code }}</pre>
            <!-- eslint-disable-next-line vue/no-v-html -- build-rendered Markdown -->
            <span v-else class="md" v-html="solution(ex as never).html || '(all pairs)'" />
          </div>
        </article>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { CompiledLevel } from '@code-nybbles/content-build/schema'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadManifest, loadSection } from '@/content/loader'
import { solution } from '@/exercises/grade'
import { isGraded, rendererFor } from '@/exercises/registry'

/** Dev only: every exercise in a level with its answer, for authors (plans/03 §5). */
const route = useRoute()
const router = useRouter()
const levels = ref<Record<string, CompiledLevel>>({})
const levelIds = computed(() => Object.keys(levels.value))
const levelId = ref(String(route.params.levelId ?? ''))
const level = computed(() => levels.value[levelId.value])
const error = ref<string>()

onMounted(async () => {
  try {
    const m = await loadManifest()
    for (const s of await Promise.all(m.sections.map((x) => loadSection(m, x.id))))
      for (const u of s.units) Object.assign(levels.value, u.levels)
    levelId.value ||= levelIds.value[0] ?? ''
  } catch (e) {
    error.value = String(e)
  }
})
watch(levelId, (id) => router.replace(`/dev/content/${id}`))
</script>

<style scoped>
.card {
  padding: var(--s-4);
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-card);
}
.meta {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.85rem;
}
.answer pre {
  margin: var(--s-1) 0 0;
}
h2 {
  margin: var(--s-4) 0 0;
}
</style>
