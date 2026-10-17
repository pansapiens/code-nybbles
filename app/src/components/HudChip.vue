<template>
  <button class="hud-chip" :class="[`k-${kind}`, { dim }]" type="button" :aria-label="ariaLabel">
    <AppIcon :name="icon" :size="22" />
    <span class="value">{{ infinite ? '' : value }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  kind: 'streak' | 'gems' | 'hearts'
  value: number
  /** Streak not yet extended today (grey flame), or hearts empty. */
  dim?: boolean
  /** Hearts mode off. */
  infinite?: boolean
}>()

const icon = computed(() =>
  props.kind === 'streak' ? 'flame' : props.kind === 'gems' ? 'gem' : props.infinite ? 'infinity' : 'heart',
)
const ariaLabel = computed(() => {
  if (props.kind === 'streak') return `${props.value} day streak`
  if (props.kind === 'gems') return `${props.value} gems`
  return props.infinite ? 'Unlimited hearts' : `${props.value} hearts`
})
</script>

<style scoped>
.hud-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  min-height: var(--touch-min);
  padding: 0 var(--s-2);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
}
.hud-chip:hover {
  background: var(--c-surface);
}
.k-streak {
  color: var(--c-streak);
}
.k-gems {
  color: var(--c-gems);
}
.k-hearts {
  color: var(--c-wrong);
}
.dim {
  color: var(--c-streak-off);
}
</style>
