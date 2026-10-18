<template>
  <main class="view stack onboarding">
    <template v-if="step === 'welcome'">
      <h1>Welcome to Code Nybbles</h1>
      <p>Learn Rust in small, friendly steps. A few quick questions first, then you will be writing code within a minute.</p>
      <DuoButton block @click="step = 'experience'">Get started</DuoButton>
    </template>

    <template v-else-if="step === 'experience'">
      <h1>How much Rust do you know?</h1>
      <DuoButton v-for="o in EXPERIENCE" :key="o.value" block variant="secondary" @click="chooseExperience(o.value)">
        {{ o.label }}
      </DuoButton>
    </template>

    <template v-else-if="step === 'goal'">
      <h1>Pick a daily goal</h1>
      <p>A little every day beats a lot once a week. You can change this in Settings.</p>
      <div class="row">
        <AnswerTile v-for="g in DAILY_GOALS" :key="g" :state="game.dailyGoal === g ? 'selected' : 'idle'" @click="game.setDailyGoal(g)">
          {{ g }} XP
        </AnswerTile>
      </div>
      <DuoButton block @click="step = 'reminder'">Continue</DuoButton>
    </template>

    <template v-else-if="step === 'reminder'">
      <h1>When should we remind you?</h1>
      <p>Pick a time you could do a lesson each day. It is optional.</p>
      <label class="stack">
        Reminder time
        <input v-model="reminder" type="time" class="time" />
      </label>
      <DuoButton block :disabled="!reminder" @click="setReminder(reminder)">Continue</DuoButton>
      <DuoButton block variant="ghost" @click="setReminder('')">Skip</DuoButton>
    </template>

    <template v-else>
      <h1>Want to skip the basics?</h1>
      <p>A short test can unlock the sections you already know. You can take it later from Settings.</p>
      <DuoButton block @click="finish('/placement')">Take a short test</DuoButton>
      <DuoButton block variant="ghost" @click="finish()">Start from the beginning</DuoButton>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AnswerTile from '@/components/AnswerTile.vue'
import DuoButton from '@/components/DuoButton.vue'
import { loadCourse } from '@/content/loader'
import { unitNodes } from '@/domain/path'
import { DAILY_GOALS } from '@/domain/progress'
import { useProgressStore } from '@/stores/progress'

const EXPERIENCE = [
  { value: 'new', label: 'I am new to programming' },
  { value: 'other-lang', label: 'I know another language' },
  { value: 'some-rust', label: 'I know some Rust' },
] as const

const router = useRouter()
const game = useProgressStore()
void game.load()
const step = ref<'welcome' | 'experience' | 'goal' | 'reminder' | 'placement'>('welcome')
const reminder = ref('')

async function chooseExperience(experience: (typeof EXPERIENCE)[number]['value']) {
  await game.saveProfile({ experience })
  step.value = 'goal'
}

async function setReminder(time: string) {
  if (time) await game.saveProfile({ reminderTime: time })
  if (game.profile?.experience === 'new') await finish()
  else step.value = 'placement'
}

/** Marks onboarding done, then goes to `to`, or straight into the first lesson. */
async function finish(to?: string) {
  await game.saveProfile({ onboardedAt: Date.now() })
  if (to) return void router.push(to)
  const first = (await loadCourse()).sections[0]!.units[0]!
  const level = unitNodes(first)[0]!.id
  void router.push({ name: 'lesson', params: { levelId: level, lessonId: first.levels[level]!.lessons[0]!.id } })
}
</script>

<style scoped>
.onboarding {
  max-width: var(--path-max);
  margin: 0 auto;
  justify-content: center;
  min-height: 100dvh;
}
.time {
  min-height: var(--touch-min);
  padding: var(--s-2) var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-tile);
  background: var(--c-canvas);
  color: var(--c-text);
  font: inherit;
}
</style>
