<template>
  <button
    class="answer-tile"
    :class="[`s-${state}`, { mono }]"
    type="button"
    :disabled="state === 'disabled'"
    :aria-pressed="$attrs.role ? undefined : state === 'selected'"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
export type TileState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled'

withDefaults(defineProps<{ state?: TileState; mono?: boolean }>(), { state: 'idle' })
</script>

<style scoped>
.answer-tile {
  --bg: var(--c-canvas);
  --bd: var(--c-border);
  --ledge-c: var(--c-border);
  --fg: var(--c-text);

  min-height: var(--touch-min);
  padding: var(--s-2) var(--s-4);
  border: 2px solid var(--bd);
  border-radius: var(--radius-tile);
  background: var(--bg);
  color: var(--fg);
  box-shadow: 0 var(--ledge) 0 var(--ledge-c);
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: transform var(--t-fast);
}
.answer-tile.mono {
  font-family: var(--font-code);
  font-variant-ligatures: none;
  font-weight: 500;
  white-space: pre-wrap; /* program output keeps its line breaks */
}
.answer-tile:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--ledge-c);
}
.s-selected {
  --bg: var(--c-selected-tint);
  --bd: var(--c-selected-border);
  --ledge-c: var(--c-selected-ledge);
}
.s-correct {
  --bg: var(--c-correct-tint);
  --bd: var(--c-correct);
  --ledge-c: var(--c-correct-ledge);
  --fg: var(--c-correct-text);
  animation: pop var(--t-med);
}
.s-wrong {
  --bg: var(--c-wrong-tint);
  --bd: var(--c-wrong);
  --ledge-c: var(--c-wrong-ledge);
  --fg: var(--c-wrong-text);
  animation: shake 400ms;
}
.s-disabled {
  --bg: var(--c-tile);
  --bd: var(--c-tile);
  --ledge-c: var(--c-tile);
  --fg: var(--c-text-2);
  cursor: default;
}
</style>
