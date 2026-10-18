<template>
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :role="label ? 'img' : undefined"
    fill="currentColor"
  >
    <path :d="PATHS[name]" />
  </svg>
</template>

<script setup lang="ts">
// Minimal 24x24 icon set (filled paths). Add icons here as screens need them.
const PATHS = {
  flame:
    'M12 2c1 3.5 4.5 5.5 4.5 10 0 1-.2 1.8-.6 2.6.9-.6 1.6-1.6 1.9-2.8C19.5 13.4 20 15 20 16.5 20 20.1 16.4 23 12 23s-8-2.9-8-6.5c0-4 3-6 4-9 .4 1.6 1.3 2.8 2.4 3.6C10.4 8 11 5 12 2Z',
  gem: 'M7 3h10l4 6-9 12L3 9l4-6Zm1.2 2L6 8.3h3.4L10.7 5H8.2Zm4.6 0 1.3 3.3h3.9L15.8 5h-3Zm-2.2 5.3L12 17l1.4-6.7h-2.8Z',
  heart:
    'M12 21s-7.5-4.6-9.6-9.3C1 8.4 3 4.5 6.7 4.5c2.2 0 3.7 1.3 4.6 2.6l.7 1 .7-1c.9-1.3 2.4-2.6 4.6-2.6 3.7 0 5.7 3.9 4.3 7.2C19.5 16.4 12 21 12 21Z',
  infinity:
    'M7 7.5c2.4 0 3.9 1.9 5 3.3 1.1-1.4 2.6-3.3 5-3.3a4.5 4.5 0 0 1 0 9c-2.4 0-3.9-1.9-5-3.3-1.1 1.4-2.6 3.3-5 3.3a4.5 4.5 0 0 1 0-9Zm0 2.5a2 2 0 0 0 0 4c1.2 0 2.1-1 3.4-2-1.3-1-2.2-2-3.4-2Zm10 0c-1.2 0-2.1 1-3.4 2 1.3 1 2.2 2 3.4 2a2 2 0 0 0 0-4Z',
  path: 'M12 2 3 9v12h6v-7h6v7h6V9l-9-7Z',
  dumbbell:
    'M2 10h2V7h3v10H4v-3H2v-4Zm20 0h-2V7h-3v10h3v-3h2v-4ZM8 11h8v2H8v-2Z',
  shop: 'M4 4h16l1 5a3 3 0 0 1-5 2.2A3 3 0 0 1 12 12a3 3 0 0 1-4-.8A3 3 0 0 1 3 9l1-5Zm1 9.6c.8.3 1.6.4 2.4.2A5 5 0 0 0 12 14a5 5 0 0 0 4.6-.2c.8.2 1.6.1 2.4-.2V21H5v-7.4Z',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z',
  gear: 'm19.4 13 .1-1-.1-1 2.1-1.6-2-3.5-2.5 1a7 7 0 0 0-1.7-1L15 3h-4l-.4 2.7a7 7 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11l-.1 1 .1 1-2.1 1.6 2 3.5 2.5-1a7 7 0 0 0 1.7 1L11 21h4l.4-2.7a7 7 0 0 0 1.7-1l2.5 1 2-3.5-2.2-1.8ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  close:
    'M6.4 4.9 12 10.6l5.6-5.7 1.5 1.5-5.7 5.6 5.7 5.6-1.5 1.5-5.6-5.7-5.6 5.7-1.5-1.5 5.7-5.6-5.7-5.6 1.5-1.5Z',
  check: 'm9 16.2-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z',
  star: 'm12 2 3 6.6 7 .7-5.3 4.7 1.6 7L12 17.3 5.7 21l1.6-7L2 9.3l7-.7L12 2Z',
  trophy: 'M6 2h12v2h3v3a5 5 0 0 1-4.6 5A6 6 0 0 1 13 15.9V18h4v4H7v-4h4v-2.1A6 6 0 0 1 7.6 12 5 5 0 0 1 3 7V4h3V2Zm0 4H5v1a3 3 0 0 0 1.4 2.5A6 6 0 0 1 6 8V6Zm12 0v2c0 .5 0 1-.2 1.5A3 3 0 0 0 19 7V6h-1Z',
  chest: 'M4 4h16a2 2 0 0 1 2 2v4H2V6a2 2 0 0 1 2-2Zm-2 8h8v2h4v-2h8v8H2v-8Z',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3h2v12H5V10h2Zm2 0h6V7a3 3 0 0 0-6 0v3Z',
  book: 'M4 3h7a3 3 0 0 1 1 .2A3 3 0 0 1 13 3h7v16h-7a2 2 0 0 0-1 .3 2 2 0 0 0-1-.3H4V3Zm2 2v12h5l.9.2V6a1 1 0 0 0-1-1H6Zm12 0h-4.9a1 1 0 0 0-1 1v11.2l.9-.2h5V5Z',
  build: 'M3 13h8v8H3v-8Zm10 0h8v8h-8v-8ZM8 3h8v8H8V3Z',
  'arrow-down': 'M11 4h2v12l5-5 1.4 1.4L12 19.8l-7.4-7.4L6 11l5 5V4Z',
} as const

export type IconName = keyof typeof PATHS

withDefaults(defineProps<{ name: IconName; size?: number; label?: string }>(), { size: 24 })
</script>

<style scoped>
.app-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
