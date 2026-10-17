<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="sheet-overlay" />
      <DialogContent class="sheet" :aria-describedby="undefined">
        <DialogTitle class="sheet-title">{{ title }}</DialogTitle>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { default: false })
</script>

<style>
/* Unscoped: Reka UI portals the content to <body>. */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: var(--c-scrim);
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: var(--path-max);
  margin: 0 auto;
  max-height: 85dvh;
  overflow-y: auto;
  padding: var(--s-5) var(--s-4) calc(var(--s-5) + env(safe-area-inset-bottom));
  border-radius: var(--radius-banner) var(--radius-banner) 0 0;
  background: var(--c-canvas);
  animation: sheet-up var(--t-med) ease-out;
}
.sheet-title {
  margin: 0 0 var(--s-3);
  font-size: 1.25rem;
  font-weight: 800;
}
@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
}
</style>
