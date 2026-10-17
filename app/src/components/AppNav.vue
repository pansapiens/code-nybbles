<template>
  <nav class="app-nav" aria-label="Main">
    <div class="brand">Code Nybbles</div>
    <RouterLink v-for="item in ITEMS" :key="item.to" :to="item.to" class="nav-item">
      <AppIcon :name="item.icon" :size="28" />
      <span class="label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon, { type IconName } from './AppIcon.vue'

const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Learn', icon: 'path' },
  { to: '/practice', label: 'Practice', icon: 'dumbbell' },
  { to: '/shop', label: 'Shop', icon: 'shop' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]
</script>

<style scoped>
/* Mobile: icon-only bottom tab bar with an active pill (plans/01 §4.2). */
.app-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: space-around;
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 2px solid var(--c-border);
  background: var(--c-canvas);
}
.brand {
  display: none;
}
/* Icon-only on mobile, but the label stays as the link's accessible name. */
.label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-3);
  min-width: 64px;
  margin: var(--s-2) 0;
  border: 2px solid transparent;
  border-radius: var(--radius-tile);
  color: var(--c-text-2);
  text-decoration: none;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.nav-item.router-link-exact-active {
  border-color: var(--c-selected-border);
  background: var(--c-selected-tint);
  color: var(--c-primary);
}

/* Desktop: labelled left sidebar. */
@media (min-width: 1024px) {
  .app-nav {
    position: sticky;
    top: 0;
    flex-direction: column;
    justify-content: flex-start;
    gap: var(--s-1);
    height: 100dvh;
    padding: var(--s-5) var(--s-3);
    border-top: 0;
    border-right: 2px solid var(--c-border);
  }
  .brand {
    display: block;
    padding: 0 var(--s-3) var(--s-5);
    color: var(--c-primary);
    font-size: 1.6rem;
    font-weight: 900;
  }
  .label {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }
  .nav-item {
    justify-content: flex-start;
    margin: 0;
    padding: var(--s-2) var(--s-3);
  }
}
</style>
