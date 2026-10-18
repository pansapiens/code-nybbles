<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger
      class="node"
      :class="[state, kind, { open }]"
      :style="{ '--fill': `${fill * 360}deg`, '--unit-colour': colour, '--offset': offset }"
      :aria-label="`${title}, ${stateLabel}`"
    >
      <span class="face">
        <AppIcon :name="icon" :size="current ? 40 : 34" />
      </span>
      <span v-if="current" class="start-bubble" aria-hidden="true">Start</span>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="node-pop"
        :class="state"
        :style="{ '--unit-colour': colour }"
        side="bottom"
        :side-offset="10"
        align="center"
      >
        <strong class="pop-title">{{ title }}</strong>
        <p class="pop-sub">{{ subtitle }}</p>
        <DuoButton v-if="state !== 'locked'" block variant="secondary" @click="emit('start')">
          {{ action }}
        </DuoButton>
        <DuoButton v-else-if="kind === 'checkpoint'" block variant="secondary" @click="emit('jump')">Jump here?</DuoButton>
        <PopoverArrow class="pop-arrow" :width="16" :height="8" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<script setup lang="ts">
import { PopoverArrow, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref } from 'vue'
import type { NodeState } from '@/domain/path'
import AppIcon from './AppIcon.vue'
import DuoButton from './DuoButton.vue'

const props = defineProps<{
  kind: 'level' | 'checkpoint' | 'code-read' | 'build' | 'chest' | 'practice'
  state: NodeState
  title: string
  /** Lessons done / total, for the ring. */
  done: number
  total: number
  xp: number
  /** CSS colour value for the unit, e.g. `var(--c-section-teal)`. */
  colour: string
  /** Horizontal offset on the winding path, e.g. `40px`. */
  offset: string
}>()
const emit = defineEmits<{ start: []; jump: [] }>()
const open = ref(false)

const current = computed(() => props.state === 'current')
const fill = computed(() => ((props.kind === 'level' || props.kind === 'build') && props.total ? Math.min(1, props.done / props.total) : 0))
const icon = computed(() =>
  props.state === 'locked' ? 'lock' : props.kind === 'chest' ? 'chest' : props.kind === 'practice' ? 'dumbbell' : props.kind === 'checkpoint' ? 'trophy' : props.kind === 'code-read' ? 'book' : props.kind === 'build' ? 'build' : props.state === 'done' ? 'check' : 'star',
)
const stateLabel = computed(() => ({ done: 'complete', current: 'up next', locked: 'locked' })[props.state])
const subtitle = computed(() => {
  if (props.state === 'locked')
    return props.kind === 'checkpoint'
      ? 'Finish everything above to unlock this, or score 80% on it now to skip ahead.'
      : 'Finish everything above to unlock this.'
  if (props.kind === 'practice') return 'Review what you have learned so far.'
  if (props.kind === 'chest') return props.state === 'done' ? 'Opened.' : 'A free reward for getting this far.'
  if (props.kind === 'checkpoint') return props.state === 'done' ? 'Passed. Replay it any time.' : 'Test yourself on the whole unit.'
  if (props.kind === 'code-read') return props.state === 'done' ? 'Read. Replay it any time.' : 'Read a whole program and answer questions about it.'
  if (props.kind === 'build')
    return props.done >= props.total ? 'Built! Replay a step to review.' : `Build: step ${props.done + 1} of ${props.total}`
  if (props.done >= props.total) return 'Complete! Replay a lesson to review.'
  return `Lesson ${props.done + 1} of ${props.total}`
})
const action = computed(() => {
  if (props.kind === 'chest') return 'Open'
  if (props.kind === 'practice') return `Practise +${props.xp} XP`
  if (props.state === 'done') return 'Review'
  return `Start +${props.xp} XP`
})
</script>

<style scoped>
.node {
  --size: 72px;
  --face: var(--unit-colour);
  --ledge-c: color-mix(in oklab, var(--unit-colour), var(--c-shade) 25%);

  position: relative;
  display: grid;
  place-items: center;
  width: calc(var(--size) + 16px);
  height: calc(var(--size) + 16px);
  border: 0;
  border-radius: 50%;
  /* progress ring (plans/01 §3.1: "progress ring fills") */
  background: conic-gradient(var(--c-gold) var(--fill), var(--c-tile) 0);
  cursor: pointer;
  transform: translateX(var(--offset, 0));
}
.node.current {
  --size: 84px;
}
.node.done.level,
.node.done.build {
  background: none;
}
.node.locked {
  --face: var(--c-tile);
  --ledge-c: var(--c-tile-ledge);
  background: none;
}
.node.chest,
.node.checkpoint {
  background: none;
}
.face {
  display: grid;
  place-items: center;
  width: var(--size);
  height: calc(var(--size) - 8px);
  border-radius: 50%;
  background: var(--face);
  color: var(--c-on-primary);
  box-shadow: 0 8px 0 var(--ledge-c);
  transition: transform var(--t-fast);
}
.node.locked .face {
  color: var(--c-text-2);
}
.node.done .face {
  --face: var(--c-gold);
  --ledge-c: var(--c-gold-ledge);
}
.node:active .face {
  transform: translateY(6px);
  box-shadow: 0 2px 0 var(--ledge-c);
}
.node.current .face {
  animation: pulse 2s infinite;
}
.start-bubble {
  position: absolute;
  top: -34px;
  padding: var(--s-1) var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-tile);
  background: var(--c-canvas);
  color: var(--unit-colour);
  font-weight: 900;
  text-transform: uppercase;
  animation: bob 1.6s ease-in-out infinite;
}
@keyframes bob {
  50% {
    transform: translateY(-4px);
  }
}
</style>

<style>
/* Unscoped: Reka portals the popover to <body>. */
.node-pop {
  z-index: 20;
  display: grid;
  gap: var(--s-2);
  width: min(300px, 90vw);
  padding: var(--s-4);
  border-radius: var(--radius-card);
  background: var(--unit-colour, var(--c-primary));
  color: var(--c-on-primary);
  animation: pop var(--t-med);
}
.node-pop.locked {
  border: 2px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
}
.pop-title {
  font-size: 1.1rem;
  font-weight: 900;
}
.pop-sub {
  margin: 0;
  opacity: 0.9;
}
.pop-arrow {
  fill: var(--unit-colour, var(--c-primary));
}
.node-pop.locked .pop-arrow {
  fill: var(--c-surface);
}
</style>
