<template>
  <div
    class="progress-bar"
    role="progressbar"
    :aria-valuenow="Math.round(pct)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <div class="fill" :key="flash ?? 0" :class="{ pulse: (flash ?? 0) > 0 }" :style="{ width: `${pct}%` }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: number; label?: string; flash?: number }>()
const pct = computed(() => Math.min(100, Math.max(0, props.value * 100)))
</script>

<style scoped>
.progress-bar {
  height: 16px;
  border-radius: var(--radius-pill);
  background: var(--c-tile);
  overflow: hidden;
}
.fill {
  position: relative;
  height: 100%;
  min-width: 16px;
  border-radius: var(--radius-pill);
  background: var(--c-primary);
  transition: width var(--t-med) ease-out;
}
.fill.pulse {
  animation: bar-flash 0.6s ease-out;
}
@keyframes bar-flash {
  50% {
    filter: brightness(1.45);
  }
}
/* Highlight stripe along the top of the fill */
.fill::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 8px;
  right: 8px;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--c-primary-hi);
  opacity: 0.7;
}
</style>
