<template>
  <div class="lesson">
    <header class="lesson-top">
      <button class="icon-btn" type="button" aria-label="Quit lesson" @click="confirmExit = true">
        <AppIcon name="close" />
      </button>
      <ProgressBar :value="checked ? 1 : 0" label="Lesson progress" />
      <HudChip kind="hearts" :value="game.hearts" :infinite="!settings.heartsMode" />
    </header>

    <!-- ponytail: one hard-coded preview exercise; M1 replaces it with the registry-driven player. -->
    <main class="prompt stack">
      <h1>What does this print?</h1>
      <CodeCard :code="CODE" />
      <div class="stack" role="radiogroup" aria-label="Answers">
        <AnswerTile
          v-for="opt in OPTIONS"
          :key="opt.id"
          mono
          role="radio"
          :aria-checked="picked === opt.id"
          :state="tileState(opt.id)"
          @click="!checked && (picked = opt.id)"
        >
          {{ opt.text }}
        </AnswerTile>
      </div>
    </main>

    <footer class="lesson-foot" :class="feedback" aria-live="polite">
      <div v-if="checked" class="feedback-text">
        <strong>{{ correct ? 'Nicely done!' : 'Correct solution:' }}</strong>
        <span v-if="!correct" class="mono">Hello, Ferris!</span>
        <p>The <code>{name}</code> placeholder prints the value of <code>name</code>.</p>
      </div>
      <DuoButton
        block
        :variant="!checked ? 'primary' : correct ? 'correct' : 'danger'"
        :disabled="!picked"
        @click="checked ? router.push('/') : (checked = true)"
      >
        {{ checked ? 'Continue' : 'Check' }}
      </DuoButton>
    </footer>

    <BottomSheet v-model:open="confirmExit" title="Wait, don't go!">
      <p>You'll lose your progress in this lesson.</p>
      <div class="stack">
        <DuoButton block @click="confirmExit = false">Keep learning</DuoButton>
        <DuoButton block variant="ghost" @click="router.push('/')">End session</DuoButton>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AnswerTile, { type TileState } from '@/components/AnswerTile.vue'
import AppIcon from '@/components/AppIcon.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import CodeCard from '@/components/CodeCard.vue'
import DuoButton from '@/components/DuoButton.vue'
import HudChip from '@/components/HudChip.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'

const CODE = `fn main() {
    let name = "Ferris";
    println!("Hello, {name}!");
}`
const OPTIONS = [
  { id: 'a', text: 'Hello, Ferris!' },
  { id: 'b', text: 'Hello, {name}!' },
  { id: 'c', text: 'Hello, name!' },
]
const ANSWER = 'a'

const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()
const picked = ref<string>()
const checked = ref(false)
const confirmExit = ref(false)
const correct = computed(() => picked.value === ANSWER)
const feedback = computed(() => (checked.value ? (correct.value ? 'ok' : 'bad') : ''))

function tileState(id: string): TileState {
  if (!checked.value) return picked.value === id ? 'selected' : 'idle'
  if (id === picked.value) return correct.value ? 'correct' : 'wrong'
  return 'disabled'
}
</script>

<style scoped>
.lesson {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: var(--path-max);
  margin: 0 auto;
}
.lesson-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
}
.icon-btn {
  display: grid;
  place-items: center;
  width: var(--touch-min);
  height: var(--touch-min);
  border: 0;
  background: none;
  color: var(--c-text-2);
  cursor: pointer;
}
.prompt {
  flex: 1;
  padding: var(--s-4);
}
.lesson-foot {
  position: sticky;
  bottom: 0;
  padding: var(--s-4) var(--s-4) calc(var(--s-4) + env(safe-area-inset-bottom));
  border-top: 2px solid var(--c-border);
  background: var(--c-canvas);
}
.lesson-foot.ok {
  background: var(--c-correct-tint);
  color: var(--c-correct-text);
  border-color: transparent;
}
.lesson-foot.bad {
  background: var(--c-wrong-tint);
  color: var(--c-wrong-text);
  border-color: transparent;
}
.feedback-text {
  margin-bottom: var(--s-3);
}
.feedback-text strong {
  display: block;
  font-size: 1.25rem;
  font-weight: 900;
}
.feedback-text p {
  margin: var(--s-1) 0 0;
}
.mono {
  font-family: var(--font-code);
}
</style>
