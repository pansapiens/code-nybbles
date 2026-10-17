<template>
  <RouterView v-if="route.meta.fullscreen" />
  <div v-else class="shell">
    <AppNav />
    <div class="main">
      <TopHud class="hud-mobile" />
      <RouterView />
    </div>
    <aside class="rail stack" aria-label="Your progress">
      <TopHud />
      <div class="rail-card">
        <h2>Daily goal</h2>
        <ProgressBar :value="0" label="Daily XP goal" />
      </div>
      <RouterLink to="/settings" class="rail-link">Settings</RouterLink>
    </aside>
  </div>

  <div v-if="needRefresh && !route.meta.fullscreen" class="toast row" role="status">
    <span>New lessons available.</span>
    <DuoButton @click="updateServiceWorker()">Refresh</DuoButton>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import AppNav from '@/components/AppNav.vue'
import DuoButton from '@/components/DuoButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import TopHud from '@/components/TopHud.vue'

const route = useRoute()
// registerType: 'prompt' -> never auto-reload; the user chooses when (plans/01 §5.3).
const { needRefresh, updateServiceWorker } = useRegisterSW()
</script>

<style scoped>
.shell {
  min-height: 100dvh;
  padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
}
.rail {
  display: none;
}
.rail-card {
  padding: var(--s-4);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
.rail-card h2 {
  margin: 0 0 var(--s-3);
  font-size: 1.1rem;
}
.rail-link {
  color: var(--c-text-2);
  font-weight: 800;
}

@media (min-width: 1024px) {
  .shell {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 340px;
    padding-bottom: 0;
  }
  .hud-mobile {
    display: none;
  }
  .rail {
    display: flex;
    position: sticky;
    top: 0;
    align-self: start;
    padding: var(--s-4);
  }
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--tabbar-h) + var(--s-3) + env(safe-area-inset-bottom));
  z-index: 20;
  transform: translateX(-50%);
  padding: var(--s-2) var(--s-2) var(--s-2) var(--s-4);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  border: 2px solid var(--c-border);
  font-weight: 700;
  white-space: nowrap;
}
</style>
