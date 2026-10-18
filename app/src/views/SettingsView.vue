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
    <fieldset class="stack">
      <legend>Daily goal</legend>
      <div class="row">
        <AnswerTile
          v-for="g in DAILY_GOALS"
          :key="g"
          :state="game.dailyGoal === g ? 'selected' : 'idle'"
          @click="game.setDailyGoal(g)"
        >
          {{ g }} XP
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
    <fieldset class="stack">
      <legend>Placement test</legend>
      <p class="hint">Already know some Rust? Answer a few questions to skip ahead. It never removes progress you have made.</p>
      <div><DuoButton variant="secondary" @click="router.push('/placement')">Take the placement test</DuoButton></div>
    </fieldset>
    <fieldset class="stack">
      <legend>Your data</legend>
      <p class="hint">Progress is stored only on this device. Export a backup to move it or keep it safe.</p>
      <div class="row">
        <DuoButton variant="secondary" @click="exportFile">Export backup</DuoButton>
        <DuoButton variant="secondary" @click="fileInput?.click()">Import backup</DuoButton>
        <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="importFile" />
      </div>
      <div class="row">
        <DuoButton variant="ghost" @click="repair">Repair data</DuoButton>
        <DuoButton variant="ghost" @click="confirmReset = true">Reset progress</DuoButton>
      </div>
      <p v-if="message" role="status">{{ message }}</p>
    </fieldset>
    <BottomSheet v-model:open="confirmReset" title="Reset all progress?">
      <p>This deletes your XP, streak, gems and lesson history on this device. It can't be undone unless you have a backup.</p>
      <div class="stack">
        <DuoButton block @click="confirmReset = false">Keep my progress</DuoButton>
        <DuoButton block variant="danger" @click="reset">Reset</DuoButton>
      </div>
    </BottomSheet>
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
import { useRouter } from 'vue-router'
import AnswerTile from '@/components/AnswerTile.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import DuoButton from '@/components/DuoButton.vue'
import { loadManifest } from '@/content/loader'
import { exportBackup, importBackup, rebuildDerived, resetProgress } from '@/db/repo'
import { DAILY_GOALS } from '@/domain/progress'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore, type Theme } from '@/stores/settings'

const router = useRouter()
const THEMES: Theme[] = ['system', 'light', 'dark']
const settings = useSettingsStore()
const manifest = ref<ContentManifest>()
onMounted(async () => (manifest.value = await loadManifest().catch(() => undefined)))

const game = useProgressStore()
void game.load()
const message = ref<string>()
const confirmReset = ref(false)
const fileInput = ref<HTMLInputElement>()

async function exportFile() {
  const blob = new Blob([JSON.stringify(await exportBackup(), null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `code-nybbles-backup-${game.view.today}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
async function importFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const n = await importBackup(JSON.parse(await file.text()))
    // Settings live in localStorage and are read at start-up, so reload the page to pick everything up.
    message.value = `Imported ${n} new activity records. Reloading...`
    setTimeout(() => location.reload(), 800)
  } catch {
    message.value = "That file isn't a Code Nybbles backup."
  }
}
async function repair() {
  await rebuildDerived()
  await game.reload()
  message.value = 'Progress rebuilt from your activity history.'
}
async function reset() {
  await resetProgress()
  await game.reload()
  confirmReset.value = false
  message.value = 'Progress reset.'
}
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
.hint {
  margin: 0;
  color: var(--c-text-2);
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
