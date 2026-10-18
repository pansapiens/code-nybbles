<template>
  <button
    class="duo-button"
    :class="[`v-${variant}`, { block }]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'correct' | 'ghost'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', type: 'button' },
)
</script>

<style scoped>
/* Ledge depth, not blur shadows: pressing moves the face down onto its ledge (plans/01 §4.1). */
.duo-button {
  --face: var(--c-primary);
  --ledge-c: var(--c-primary-ledge);
  --fg: var(--c-on-primary);
  --border: transparent;

  min-height: var(--button-h);
  padding: 0 var(--s-5);
  border: 2px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--face);
  color: var(--fg);
  box-shadow: 0 var(--ledge) 0 var(--ledge-c);
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    transform var(--t-fast),
    box-shadow var(--t-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
}
.duo-button.block {
  width: 100%;
}
.duo-button:active:not(:disabled) {
  transform: translateY(var(--ledge));
  box-shadow: none;
}
.duo-button:disabled {
  --face: var(--c-tile);
  --ledge-c: var(--c-tile-ledge);
  --fg: var(--c-text-2);
  cursor: default;
}

.v-secondary {
  --face: var(--c-canvas);
  --ledge-c: var(--c-border);
  --fg: var(--c-primary-text);
  --border: var(--c-border);
}
.v-danger {
  --face: var(--c-wrong-button);
  --ledge-c: var(--c-wrong-button-ledge);
}
.v-correct {
  --face: var(--c-correct-button);
  --ledge-c: var(--c-correct-button-ledge);
}
.v-ghost {
  --face: transparent;
  --ledge-c: transparent;
  --fg: var(--c-primary-text);
}
</style>
