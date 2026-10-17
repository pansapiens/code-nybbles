<template>
  <section class="view stack">
    <p v-if="error" role="alert">Couldn't load the course: {{ error }}</p>
    <!-- ponytail: a plain list of levels and lessons; the sine-wave learning path replaces it in M2. -->
    <template v-for="(s, si) in sections" :key="s.id">
      <div v-for="(u, ui) in s.units" :key="u.id" class="stack">
        <div class="unit-banner">
          <div class="eyebrow">Section {{ si + 1 }}, Unit {{ ui + 1 }}</div>
          <h1>{{ u.title }}</h1>
          <p>{{ u.description }}</p>
        </div>
        <div v-for="lvl in levelsOf(u)" :key="lvl.id" class="level stack">
          <h2>{{ lvl.title }}</h2>
          <div class="row">
            <DuoButton
              v-for="(lesson, i) in lvl.lessons"
              :key="lesson.id"
              :variant="i ? 'secondary' : 'primary'"
              @click="router.push({ name: 'lesson', params: { levelId: lvl.id, lessonId: lesson.id } })"
            >
              {{ lvl.lessons.length > 1 ? `Lesson ${i + 1}` : 'Start' }}
            </DuoButton>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { CompiledSection, CompiledUnit } from '@code-nybbles/content-build/schema'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DuoButton from '@/components/DuoButton.vue'
import { loadManifest, loadSection } from '@/content/loader'

const router = useRouter()
const sections = ref<CompiledSection[]>([])
const error = ref<string>()

onMounted(async () => {
  try {
    const m = await loadManifest()
    sections.value = await Promise.all(m.sections.map((s) => loadSection(m, s.id)))
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

const levelsOf = (u: CompiledUnit) =>
  u.path.flatMap((p) => (p.kind === 'level' || p.kind === 'checkpoint' ? [u.levels[p.levelId]!] : []))
</script>

<style scoped>
.unit-banner {
  padding: var(--s-4);
  border-radius: var(--radius-banner);
  background: var(--c-section-purple);
  color: var(--c-on-primary);
}
.unit-banner p {
  margin: var(--s-1) 0 0;
}
.eyebrow {
  font-weight: 800;
  opacity: 0.85;
}
.level h2 {
  margin: 0;
  font-size: 1.1rem;
}
</style>
