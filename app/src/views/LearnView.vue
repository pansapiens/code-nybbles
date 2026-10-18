<template>
  <section class="view path">
    <p v-if="error" role="alert">Couldn't load the course: {{ error }}</p>
    <template v-for="u in units" :key="u.id">
      <header class="unit-banner" :style="{ background: u.colour }">
        <div>
          <div class="eyebrow">Section {{ u.sectionNo }}, Unit {{ u.unitNo }}</div>
          <h2>{{ u.title }}</h2>
          <p>{{ u.description }}</p>
        </div>
        <RouterLink v-if="u.hasGuidebook" class="guidebook" :to="`/guidebook/${u.id}`">
          <AppIcon name="book" />
          <span>Guidebook</span>
        </RouterLink>
      </header>
      <ol class="nodes" :aria-label="`${u.title} path`">
        <li
          v-for="n in u.nodes"
          :key="n.id"
          :ref="(el) => states[n.index] === 'current' && (currentEl = el as HTMLElement)"
        >
          <PathNode
            :kind="n.kind"
            :state="states[n.index]!"
            :title="n.title"
            :done="Math.min(game.state.levels[n.id]?.lessons ?? 0, n.lessons ?? 0)"
            :total="n.lessons ?? 0"
            :xp="n.kind === 'checkpoint' ? XP.checkpoint : n.kind === 'code-read' ? XP.codeRead : n.kind === 'practice' ? XP.practice : XP.lesson"
            :colour="u.colour"
            :offset="n.offset"
            @start="start(n)"
            @jump="jump(n)"
          />
        </li>
      </ol>
    </template>

    <button v-if="currentEl && !currentVisible" class="jump" type="button" aria-label="Jump to your next lesson" @click="scrollToCurrent">
      <AppIcon name="arrow-down" :class="{ up: currentAbove }" />
    </button>
    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </section>
</template>

<script setup lang="ts">
import type { CompiledSection } from '@code-nybbles/content-build/schema'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PathNode from '@/components/PathNode.vue'
import { loadCourse } from '@/content/loader'
import { nextLesson, nodeStates, type PathNode as Node, unitNodes } from '@/domain/path'
import { XP } from '@/domain/progress'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const game = useProgressStore()
const sections = shallowRef<CompiledSection[]>([])
const error = ref<string>()
const toast = ref<string>()

type ViewNode = Node & { unitId: string; index: number; title: string; offset: string; lessonIds: string[] }

const units = computed(() => {
  let index = 0
  return sections.value.flatMap((s, si) =>
    s.units.map((u, ui) => {
      const nodes: ViewNode[] = unitNodes(u).map((n, i) => {
        // Winding path: +-1 x --wave (plans/01 §4.3.2).
        const offset = `calc(var(--wave) * ${Math.sin((i * Math.PI) / 4).toFixed(3)})`
        const level = u.levels[n.id]
        const title = level?.title ?? (n.kind === 'chest' ? 'Treasure chest' : 'Practice')
        return { ...n, unitId: u.id, index: index++, title, offset, lessonIds: level?.lessons.map((l) => l.id) ?? [] }
      })
      return {
        id: u.id,
        title: u.title,
        description: u.description,
        hasGuidebook: !!u.guidebook,
        colour: `var(--c-section-${u.colour ?? s.colour})`,
        sectionNo: si + 1,
        unitNo: ui + 1,
        nodes,
      }
    }),
  )
})
const states = computed(() => nodeStates(units.value.flatMap((u) => u.nodes), game.state))

async function start(n: ViewNode) {
  if (n.kind === 'chest') {
    const gems = await game.claimChest(n.id)
    if (gems) showToast(`+${gems} gems`)
    return
  }
  if (n.kind === 'practice') return void router.push({ name: 'practice-session', params: { kind: 'unit', unitId: n.unitId } })
  void router.push({ name: 'lesson', params: { levelId: n.id, lessonId: n.lessonIds[nextLesson(n, game.state)] } })
}

const jump = (n: ViewNode) => void router.push({ name: 'jump', params: { levelId: n.id, lessonId: n.lessonIds[0] } })

function showToast(text: string) {
  toast.value = text
  setTimeout(() => (toast.value = undefined), 2500)
}

// ---- Jump to current ----
const currentEl = ref<HTMLElement>()
const currentVisible = ref(true)
const currentAbove = ref(false)
const observer = new IntersectionObserver(([e]) => {
  currentVisible.value = !!e?.isIntersecting
  currentAbove.value = !!e && e.boundingClientRect.top < 0
})
watch(currentEl, (el, old) => {
  if (old) observer.unobserve(old)
  if (el) observer.observe(el)
})
const scrollToCurrent = () => currentEl.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
onBeforeUnmount(() => observer.disconnect())

onMounted(async () => {
  try {
    const [course] = await Promise.all([loadCourse(), game.load()])
    sections.value = course.sections
    await nextTick()
    currentEl.value?.scrollIntoView({ block: 'center' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<style scoped>
.path {
  --wave: 60px;
  padding-bottom: 120px;
}
@media (width <= 375px) {
  .path {
    --wave: 40px;
  }
}
.unit-banner {
  position: sticky;
  top: calc(var(--hud-h) + var(--s-2));
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  margin: var(--s-4) 0;
  padding: var(--s-4);
  border-radius: var(--radius-banner);
  color: var(--c-on-primary);
}
@media (width >= 1024px) {
  .unit-banner {
    top: var(--s-2);
  }
}
.unit-banner h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 900;
}
.unit-banner p {
  margin: var(--s-1) 0 0;
  opacity: 0.9;
}
.eyebrow {
  font-weight: 800;
  opacity: 0.85;
}
.guidebook {
  display: grid;
  justify-items: center;
  flex-shrink: 0;
  min-width: var(--touch-min);
  padding: var(--s-2);
  border: 2px solid currentcolor;
  border-radius: var(--radius-tile);
  color: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  text-decoration: none;
  text-transform: uppercase;
}
.nodes {
  display: grid;
  justify-items: center;
  gap: var(--s-5);
  margin: calc(var(--s-6) + 32px) 0 var(--s-6); /* room for the START bubble */
  padding: 0;
  list-style: none;
}
.jump {
  position: fixed;
  right: var(--s-4);
  bottom: calc(var(--tabbar-h) + var(--s-4) + env(safe-area-inset-bottom));
  z-index: 6;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: 2px solid var(--c-border);
  border-radius: 50%;
  background: var(--c-canvas);
  color: var(--c-primary);
  box-shadow: 0 var(--ledge) 0 var(--c-border);
  cursor: pointer;
}
.jump .up {
  transform: rotate(180deg);
}
@media (width >= 1024px) {
  .jump {
    bottom: var(--s-5);
    right: calc(340px + var(--s-5));
  }
}
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--tabbar-h) + var(--s-5));
  z-index: 10;
  padding: var(--s-3) var(--s-5);
  border-radius: var(--radius-pill);
  background: var(--c-gems);
  color: var(--c-on-primary);
  font-weight: 900;
  transform: translateX(-50%);
  animation: pop var(--t-med);
}
</style>
