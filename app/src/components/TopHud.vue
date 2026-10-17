<template>
  <header class="top-hud">
    <span class="course-badge" title="Rust course">Rust</span>
    <div class="row chips">
      <HudChip kind="streak" :value="game.streak" :dim="!game.extendedToday" @click="router.push('/streak')" />
      <HudChip kind="gems" :value="game.gems" @click="router.push('/shop')" />
      <HudChip kind="hearts" :value="game.hearts" :infinite="!settings.heartsMode" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import HudChip from './HudChip.vue'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()
</script>

<style scoped>
.top-hud {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--hud-h);
  padding: 0 var(--s-3);
  border-bottom: 2px solid var(--c-border);
  background: var(--c-canvas);
}
.course-badge {
  padding: var(--s-1) var(--s-3);
  border-radius: var(--radius-tile);
  background: var(--c-rust);
  color: var(--c-on-primary);
  font-weight: 900;
}
</style>
