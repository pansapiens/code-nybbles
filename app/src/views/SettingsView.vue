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
      Daily reminder
      <input type="time" :value="game.profile?.reminderTime ?? ''" @change="setReminder" />
      <DuoButton v-if="game.profile?.reminderTime" variant="ghost" @click="game.saveProfile({ reminderTime: undefined })">Clear</DuoButton>
    </label>
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
        <DuoButton variant="ghost" @click="openReset">Reset progress</DuoButton>
      </div>
      <p v-if="message" role="status">{{ message }}</p>
    </fieldset>
    <BottomSheet v-model:open="confirmReset" title="Reset progress">
      <p>Go back to the start of a unit. Lessons in that unit and every unit after it are marked not done. XP, gems and your streak stay.</p>
      <p v-if="resetError" role="alert">{{ resetError }}</p>
      <p v-if="!resetChoices">Loading the course...</p>
      <ul v-else class="reset-list">
        <li v-for="group in resetGroups" :key="group.sectionNo">
          <p class="reset-section">Section {{ group.sectionNo }}. {{ group.sectionTitle }}</p>
          <div class="stack">
            <AnswerTile
              v-for="u in group.units"
              :key="u.unitId"
              :state="picked === u.unitId ? 'selected' : 'idle'"
              @click="picked = u.unitId"
            >
              Unit {{ u.unitNo }}. {{ u.unitTitle }}
            </AnswerTile>
          </div>
        </li>
      </ul>
      <div class="stack">
        <DuoButton block variant="danger" :disabled="!pickedChoice" @click="rewind">
          {{ pickedChoice ? `Reset to the start of ${pickedChoice.unitTitle}` : 'Choose a unit' }}
        </DuoButton>
        <DuoButton v-if="!confirmAll" block variant="ghost" @click="confirmAll = true">Reset everything</DuoButton>
        <template v-else>
          <p>This deletes your XP, streak, gems and lesson history on this device. It can't be undone unless you have a backup.</p>
          <DuoButton block variant="danger" @click="resetAll">Reset everything</DuoButton>
        </template>
        <DuoButton block variant="ghost" @click="closeReset">Cancel</DuoButton>
      </div>
    </BottomSheet>
    <details class="about">
      <summary>Licences &amp; attributions</summary>
      <p>
        Code Nybbles is free software under the MIT or Apache-2.0 licence. Course text is
        <a href="https://creativecommons.org/licenses/by-sa/4.0/legalcode">CC BY-SA 4.0</a>
        and course code is MIT or Apache-2.0.
        <a href="https://github.com/pansapiens/code-nybbles">Source</a>.
      </p>
      <p>
        Material drawn from The Rust Programming Language and the Rust standard library is copyright The Rust Project
        Developers and used under the MIT licence, the MIT side of their MIT OR Apache-2.0 dual licence. Adapted units
        are marked in the list below.
      </p>
      <details>
        <summary>MIT notice (The Rust Project)</summary>
        <pre class="licence">{{ rustMit }}</pre>
      </details>
      <details>
        <summary>MIT licence (Code Nybbles)</summary>
        <pre class="licence">{{ mit }}</pre>
      </details>
      <details>
        <summary>Apache-2.0 licence (Code Nybbles)</summary>
        <pre class="licence">{{ apache }}</pre>
      </details>
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
import { computed, onMounted, ref } from 'vue'
import apache from '../../../LICENSE-APACHE?raw'
import mit from '../../../LICENSE-MIT?raw'
import { useRouter } from 'vue-router'
import AnswerTile from '@/components/AnswerTile.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import DuoButton from '@/components/DuoButton.vue'
import { loadCourse, loadManifest } from '@/content/loader'
import { rewindChoices, type RewindChoice } from '@/domain/path'
import { BACKUP_NUDGE_KEY, exportBackup, importBackup, rebuildDerived, resetProgress } from '@/db/repo'
import { DAILY_GOALS } from '@/domain/progress'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore, type Theme } from '@/stores/settings'

const rustMit = `Copyright (c) 2010 The Rust Project Developers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

const router = useRouter()
const THEMES: Theme[] = ['system', 'light', 'dark']
const settings = useSettingsStore()
const manifest = ref<ContentManifest>()
onMounted(async () => (manifest.value = await loadManifest().catch(() => undefined)))

const game = useProgressStore()
void game.load()
const message = ref<string>()
const confirmReset = ref(false)
const confirmAll = ref(false)
const picked = ref<string>()
const resetChoices = ref<RewindChoice[]>()
const resetError = ref<string>()
const fileInput = ref<HTMLInputElement>()
const resetGroups = computed(() => {
  const groups: { sectionNo: number; sectionTitle: string; units: RewindChoice[] }[] = []
  for (const choice of resetChoices.value ?? []) {
    const last = groups.at(-1)
    if (!last || last.sectionNo !== choice.sectionNo) groups.push({ sectionNo: choice.sectionNo, sectionTitle: choice.sectionTitle, units: [choice] })
    else last.units.push(choice)
  }
  return groups
})
const pickedChoice = computed(() => resetChoices.value?.find((u) => u.unitId === picked.value))

async function openReset() {
  confirmAll.value = false
  picked.value = undefined
  resetError.value = undefined
  confirmReset.value = true
  if (resetChoices.value) return
  try {
    resetChoices.value = rewindChoices((await loadCourse()).sections)
  } catch (e) {
    resetError.value = e instanceof Error ? e.message : String(e)
  }
}
function closeReset() {
  confirmReset.value = false
  confirmAll.value = false
}

const setReminder = (e: Event) => game.saveProfile({ reminderTime: (e.target as HTMLInputElement).value || undefined })

async function exportFile() {
  const blob = new Blob([JSON.stringify(await exportBackup(), null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `code-nybbles-backup-${game.view.today}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  localStorage.setItem(BACKUP_NUDGE_KEY, String(Date.now()))
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
async function rewind() {
  const choice = pickedChoice.value
  if (!choice) return
  try {
    await game.rewindTo({ unitId: choice.unitId, levelIds: choice.levelIds, chestIds: choice.chestIds, conceptIds: choice.conceptIds })
    closeReset()
    message.value = `Lessons from ${choice.unitTitle} onward are marked not done.`
  } catch (e) {
    resetError.value = e instanceof Error ? e.message : String(e)
  }
}
async function resetAll() {
  await resetProgress()
  await game.reload()
  closeReset()
  message.value = 'All progress reset.'
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
.licence {
  max-height: 16rem;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.8rem;
}
.reset-list {
  margin: 0 0 var(--s-4);
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--s-4);
}
.reset-section {
  margin: 0 0 var(--s-2);
  color: var(--c-text-2);
  font-weight: 800;
}
label {
  font-weight: 700;
  min-height: var(--touch-min);
}
</style>
