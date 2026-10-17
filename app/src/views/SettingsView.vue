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
    <details class="about">
      <summary>Licences &amp; attributions</summary>
      <p>
        Code Nybbles is free software under the MIT or Apache-2.0 licence. Course text is CC BY-SA 4.0 and course
        code is MIT or Apache-2.0.
        <a href="https://github.com/pansapiens/code-nybbles">Source and full licence texts</a>.
      </p>
      <p v-if="manifest?.attributions.length">The course draws on:</p>
      <ul>
        <li v-for="a in manifest?.attributions" :key="a.url">
          <a :href="a.url">{{ a.name }}</a>, {{ a.licence }}{{ a.adapted ? ', adapted' : '' }}. Used in:
          {{ a.units.join(', ') }}.
        </li>
      </ul>
      <p v-if="manifest" class="version">Content version {{ manifest.contentVersion }}</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import type { ContentManifest } from '@code-nybbles/content-build/schema'
import { onMounted, ref } from 'vue'
import AnswerTile from '@/components/AnswerTile.vue'
import { loadManifest } from '@/content/loader'
import { useSettingsStore, type Theme } from '@/stores/settings'

const THEMES: Theme[] = ['system', 'light', 'dark']
const settings = useSettingsStore()
const manifest = ref<ContentManifest>()
onMounted(async () => (manifest.value = await loadManifest().catch(() => undefined)))
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
.about summary {
  font-weight: 800;
  cursor: pointer;
}
.version {
  color: var(--c-text-2);
  font-size: 0.85rem;
}
label {
  font-weight: 700;
  min-height: var(--touch-min);
}
</style>
