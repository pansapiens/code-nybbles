<template>
  <section class="view stack">
    <h1>Practice</h1>
    <p v-if="error" role="alert">Couldn't load the course: {{ error }}</p>

    <article class="item">
      <AppIcon name="dumbbell" :size="40" class="smart" />
      <div class="stack">
        <h2>Smart practice</h2>
        <p>Exercises from the concepts you are most likely to forget.</p>
        <p class="note">{{ smartNote }}</p>
      </div>
      <DuoButton :disabled="!smartCount" @click="start('smart')">Start</DuoButton>
    </article>

    <article class="item">
      <AppIcon name="close" :size="40" class="mistakes" />
      <div class="stack">
        <h2>
          Mistakes review <span v-if="mistakeCount" class="badge">{{ mistakeCount }}</span>
        </h2>
        <p>Have another go at exercises you got wrong.</p>
      </div>
      <DuoButton :disabled="!mistakeCount" @click="start('mistakes')">Start</DuoButton>
    </article>

    <RouterLink class="link" :to="{ name: 'playground' }"><AppIcon name="book" /> Playground</RouterLink>

    <section class="stack" aria-labelledby="code-reads">
      <h2 id="code-reads">Code Reads</h2>
      <p v-if="!codeReads.length" class="note">Code Reads you reach on the path will appear here.</p>
      <RouterLink v-for="c in codeReads" :key="c.levelId" class="link" :to="{ name: 'lesson', params: { levelId: c.levelId, lessonId: c.lessonId } }">
        <AppIcon name="book" /> {{ c.title }}
      </RouterLink>
    </section>

    <section class="stack" aria-labelledby="guidebooks">
      <h2 id="guidebooks">Guidebook</h2>
      <RouterLink v-for="u in guidebooks" :key="u.id" class="link" :to="`/guidebook/${u.id}`">
        <AppIcon name="book" /> {{ u.title }}
      </RouterLink>
    </section>
  </section>
</template>

<script setup lang="ts">
import type { CompiledSection } from '@code-nybbles/content-build/schema'
import { computed, ref, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import DuoButton from '@/components/DuoButton.vue'
import { loadCourse } from '@/content/loader'
import { nodeStates, unitNodes } from '@/domain/path'
import { dueConcepts, exercisePool, planPractice, type PracticeKind, reviewableMistakes } from '@/domain/practice'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const game = useProgressStore()
const sections = shallowRef<CompiledSection[]>([])
const error = ref<string>()

Promise.all([loadCourse(), game.load()])
  .then(([course]) => (sections.value = course.sections))
  .catch((e) => (error.value = e instanceof Error ? e.message : String(e)))

const pool = computed(() => exercisePool(sections.value))
const smartCount = computed(() => planPractice('smart', game.state, pool.value, game.view.today).length)
const due = computed(() => dueConcepts(game.state, pool.value, game.view.today))
const mistakeCount = computed(() => reviewableMistakes(game.state, pool.value).length)
const smartNote = computed(() => {
  if (!smartCount.value) return 'Finish a lesson to unlock this.'
  return due.value ? `${due.value} ${due.value === 1 ? 'concept is' : 'concepts are'} due for review.` : 'Nothing is due, but you can still practise.'
})

const units = computed(() => sections.value.flatMap((s) => s.units))
/** Code Reads on the path that are reached (current or done), in path order. */
const codeReads = computed(() => {
  const nodes = units.value.flatMap((u) => unitNodes(u).map((n) => ({ ...n, level: u.levels[n.id] })))
  const states = nodeStates(nodes, game.state)
  return nodes.flatMap((n, i) =>
    n.kind === 'code-read' && states[i] !== 'locked' ? [{ levelId: n.id, lessonId: n.level!.lessons[0]!.id, title: n.level!.title }] : [],
  )
})
const guidebooks = computed(() => units.value.filter((u) => u.guidebook))

const start = (kind: PracticeKind) => router.push({ name: 'practice-session', params: { kind } })
</script>

<style scoped>
.item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
.item p {
  margin: 0;
}
.note {
  color: var(--c-text-2);
  font-size: 0.9rem;
}
.smart {
  color: var(--c-primary);
}
.mistakes {
  color: var(--c-wrong);
}
.badge {
  display: inline-block;
  min-width: 1.5em;
  padding: 0 var(--s-2);
  border-radius: var(--radius-pill);
  background: var(--c-wrong);
  color: var(--c-on-primary);
  font-size: 0.85rem;
  text-align: center;
}
.link {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
  color: inherit;
  font-weight: 800;
  text-decoration: none;
}
</style>
