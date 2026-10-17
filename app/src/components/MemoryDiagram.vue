<template>
  <figure class="diagram">
    <svg :viewBox="`0 0 ${layout.width} ${layout.height}`" role="img" :aria-label="description">
      <defs>
        <marker id="mem-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrow-head" />
        </marker>
      </defs>
      <text :x="0" :y="12" class="col-label">Stack</text>
      <text v-if="diagram.heap.length" :x="HEAP_X" :y="12" class="col-label">Heap</text>

      <g v-for="f in layout.frames" :key="f.y">
        <rect :x="0" :y="f.y" :width="STACK_W" :height="f.h" rx="8" class="frame" />
        <text :x="8" :y="f.y + 16" class="frame-name">{{ f.name }}</text>
        <g v-for="v in f.vars" :key="v.y" :class="{ moved: v.moved }">
          <text :x="10" :y="v.y + ROW / 2 + 5" class="var-name">{{ v.name }}</text>
          <rect :x="CELL_X" :y="v.y + 4" :width="CELL_W" :height="ROW - 8" rx="4" class="cell" />
          <circle v-if="v.points && !v.moved" :cx="CELL_X + CELL_W / 2" :cy="v.y + ROW / 2" r="4" class="dot" />
          <text v-else :x="CELL_X + 8" :y="v.y + ROW / 2 + 5" class="value">{{ v.moved ? 'moved' : v.value }}</text>
          <line v-if="v.moved" :x1="8" :x2="CELL_X - 6" :y1="v.y + ROW / 2" :y2="v.y + ROW / 2" class="strike" />
        </g>
      </g>

      <g v-for="h in layout.heap" :key="h.id" :class="{ freed: h.freed }">
        <rect :x="HEAP_X" :y="h.y" :width="layout.heapW" :height="ROW" rx="6" class="heap-box" />
        <text :x="HEAP_X + 8" :y="h.y + ROW / 2 + 5" class="value">{{ h.value }}</text>
      </g>

      <path v-for="(a, i) in layout.arrows" :key="i" :d="a" class="arrow" marker-end="url(#mem-arrow)" />
    </svg>
    <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
    <figcaption v-if="diagram.caption" class="md" v-html="diagram.caption" />
  </figure>
</template>

<script setup lang="ts">
import type { Diagram } from '@code-nybbles/content-build/schema'
import { computed } from 'vue'

const props = defineProps<{ diagram: Diagram }>()

const ROW = 34
const HEAD = 24
const STACK_W = 190
const CELL_X = 84
const CELL_W = 96
const HEAP_X = 228
/** Monospace advance at 13px, for sizing heap boxes to their text. */
const CHAR_W = 7.9
const TOP = 22

/** ponytail: fixed column layout; long values overflow their cell (keep them to ~10 characters), and a reference to a variable several rows away crosses the cells between. */
const layout = computed(() => {
  const d = props.diagram
  const rowY = new Map<string, number>() // var id -> row centre y
  const pointers: { y: number; to: string }[] = []
  let y = TOP
  const frames = d.frames.map((f) => {
    const top = y
    const vars = f.vars.map((v, i) => {
      const vy = top + HEAD + i * ROW
      if (v.id) rowY.set(v.id, vy + ROW / 2)
      if (v.points && !v.moved) pointers.push({ y: vy + ROW / 2, to: v.points })
      return { ...v, y: vy }
    })
    const h = HEAD + f.vars.length * ROW + 6
    y = top + h + 10
    return { name: f.name, y: top, h, vars }
  })
  // Each heap box sits level with the first pointer to it where possible, else below the previous box.
  let next = TOP
  const heapY = new Map<string, number>()
  const heap = d.heap.map((b) => {
    const want = (pointers.find((p) => p.to === b.id)?.y ?? next + ROW / 2) - ROW / 2
    const by = Math.max(next, want)
    next = by + ROW + 10
    heapY.set(b.id, by + ROW / 2)
    return { ...b, y: by }
  })
  const sx = CELL_X + CELL_W / 2
  const arrows = pointers.map((p) => {
    const hy = heapY.get(p.to)
    if (hy !== undefined) return `M${sx} ${p.y} C${sx + 60} ${p.y} ${HEAP_X - 40} ${hy} ${HEAP_X - 2} ${hy}`
    // A reference to another variable enters that variable's cell from below (or above), clear of its own arrow.
    const ty = rowY.get(p.to) ?? p.y
    const ex = CELL_X + CELL_W - 16
    const up = ty < p.y
    const ey = up ? ty + ROW / 2 - 4 : ty - ROW / 2 + 4
    return `M${sx} ${p.y} C${ex} ${p.y} ${ex} ${up ? ey + 14 : ey - 14} ${ex} ${up ? ey + 2 : ey - 2}`
  })
  // Heap boxes widen to fit their longest value; the SVG scales down to the screen width.
  const heapW = Math.max(110, ...d.heap.map((b) => b.value.length * CHAR_W + 16))
  return { frames, heap, arrows, height: Math.max(y, next), heapW, width: HEAP_X + heapW + 2 }
})

const description = computed(() => {
  const d = props.diagram
  const label = (id: string) =>
    d.heap.find((h) => h.id === id)?.value ?? d.frames.flatMap((f) => f.vars).find((v) => v.id === id)?.name ?? id
  const vars = d.frames.map(
    (f) =>
      `${f.name}: ` +
      f.vars
        .map((v) => (v.moved ? `${v.name} (moved)` : v.points ? `${v.name} points to ${label(v.points)}` : `${v.name} = ${v.value}`))
        .join(', '),
  )
  const heap = d.heap.map((h) => `${h.value}${h.freed ? ' (freed)' : ''}`)
  return `Memory diagram. Stack: ${vars.join('; ')}.${heap.length ? ` Heap: ${heap.join(', ')}.` : ''}`
})
</script>

<style scoped>
.diagram {
  margin: 0;
}
svg {
  display: block;
  width: 100%;
  max-width: 420px;
  font-family: var(--font-code);
  font-size: 13px;
}
.col-label {
  fill: var(--c-text-2);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.frame {
  fill: var(--c-surface);
  stroke: var(--c-border);
  stroke-width: 2;
}
.frame-name {
  fill: var(--c-text-2);
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 800;
}
.var-name,
.value {
  fill: var(--c-text);
}
.cell,
.heap-box {
  fill: var(--c-canvas);
  stroke: var(--c-border);
  stroke-width: 2;
}
.heap-box {
  stroke: var(--c-primary);
}
.dot {
  fill: var(--c-primary);
}
.arrow {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 2;
}
.arrow-head {
  fill: var(--c-primary);
}
.moved .var-name,
.moved .value {
  fill: var(--c-text-2);
  font-style: italic;
}
.strike {
  stroke: var(--c-text-2);
  stroke-width: 1.5;
}
.freed .heap-box {
  stroke: var(--c-text-2);
  stroke-dasharray: 4 3;
}
.freed .value {
  fill: var(--c-text-2);
}
figcaption {
  margin-top: var(--s-1);
  color: var(--c-text-2);
  font-size: 0.85rem;
}
</style>
