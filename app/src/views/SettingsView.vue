<template>
  <section class="view stack">
    <h1>Settings</h1>
    <fieldset class="stack">
      <legend>Theme</legend>
      <div class="row">
        <AnswerTile
          v-for="t in THEMES"
          :key="t"
          :state="settings.theme === t ? 'selected' : 'idle'"
          @click="settings.theme = t"
        >
          {{ t[0]!.toUpperCase() + t.slice(1) }}
        </AnswerTile>
      </div>
    </fieldset>
    <label class="row">
      <input v-model="settings.heartsMode" type="checkbox" />
      Hearts mode
    </label>
    <label class="row">
      <input v-model="settings.sound" type="checkbox" />
      Sound effects
    </label>
    <label class="row">
      <input v-model="settings.haptics" type="checkbox" />
      Vibration
    </label>
    <label class="row">
      <input v-model="settings.reduceMotion" type="checkbox" />
      Reduce animations
    </label>
    <label class="row">
      Code font size
      <input v-model.number="settings.codeSize" type="range" min="13" max="18" />
      {{ settings.codeSize }}px
    </label>
  </section>
</template>

<script setup lang="ts">
import AnswerTile from '@/components/AnswerTile.vue'
import { useSettingsStore, type Theme } from '@/stores/settings'

const THEMES: Theme[] = ['system', 'light', 'dark']
const settings = useSettingsStore()
</script>

<style scoped>
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
}
legend {
  font-weight: 800;
  margin-bottom: var(--s-2);
}
label {
  font-weight: 700;
  min-height: var(--touch-min);
}
</style>
