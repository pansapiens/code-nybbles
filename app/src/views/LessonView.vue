<template>
  <div class="lesson">
    <header v-if="!summary" class="lesson-top">
      <button class="icon-btn" type="button" aria-label="Quit lesson" @click="confirmExit = true">
        <AppIcon name="close" />
      </button>
      <ProgressBar :value="run ? progress(run) : 0" label="Lesson progress" />
      <HudChip kind="hearts" :value="game.hearts" :infinite="!settings.heartsMode" />
    </header>

    <main v-if="error" class="prompt stack">
      <h1>Couldn't open this lesson</h1>
      <p>{{ error }}</p>
      <DuoButton @click="router.push('/')">Back to the path</DuoButton>
    </main>

    <main v-else-if="summary" class="prompt stack done">
      <h1>Lesson complete!</h1>
      <div class="stats">
        <div class="stat">
          <span class="stat-label">Accuracy</span>
          <strong>{{ Math.round(summary.accuracy * 100) }}%</strong>
        </div>
        <div class="stat">
          <span class="stat-label">Time</span>
          <strong>{{ formatDuration(summary.durationMs) }}</strong>
        </div>
      </div>
    </main>

    <main v-else-if="exercise" class="prompt">
      <component
        :is="rendererFor(exercise)"
        :key="run!.index"
        v-model:response="response"
        :exercise="exercise"
        :checked="!!result"
        :correct="result?.correct"
        @mistake="cue('wrong')"
      />
    </main>

    <footer v-if="!error" class="lesson-foot" :class="feedbackClass" aria-live="polite">
      <div v-if="result && exercise" class="feedback-text">
        <strong class="verdict">
          <AppIcon :name="result.correct ? 'check' : 'close'" />
          {{ result.correct ? (result.mistakes ? 'Done!' : 'Nicely done!') : 'Correct solution:' }}
        </strong>
        <template v-if="!result.correct">
          <pre v-if="shownSolution.code" class="solution">{{ shownSolution.code }}</pre>
          <!-- eslint-disable-next-line vue/no-v-html -- build-rendered, html:false Markdown -->
          <p v-else-if="shownSolution.html" class="md" v-html="shownSolution.html" />
        </template>
        <details v-if="explanation" :open="!result.correct">
          <summary>{{ result.correct ? 'Explanation' : 'Why?' }}</summary>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="md" v-html="explanation" />
        </details>
      </div>
      <DuoButton
        v-if="summary || (exercise && (result || !checksItself(exercise)))"
        block
        :variant="!result ? 'primary' : result.correct ? 'correct' : 'danger'"
        :disabled="!canPress"
        @click="press"
      >
        {{ buttonLabel }}
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
import type { CompiledExercise } from '@code-nybbles/content-build/schema'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import DuoButton from '@/components/DuoButton.vue'
import HudChip from '@/components/HudChip.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { loadLevel } from '@/content/loader'
import {
  answerCurrent,
  currentRef,
  isFinished,
  type LessonRun,
  type LessonSummary,
  planLesson,
  progress,
  startRun,
  summarise,
} from '@/domain/lesson-planner'
import { type Grade, grade, solution } from '@/exercises/grade'
import { checksItself, isGraded, rendererFor } from '@/exercises/registry'
import { type Cue, feedback } from '@/services/feedback'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{ levelId: string; lessonId: string }>()
const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()

const exercises = new Map<string, CompiledExercise>()
const run = shallowRef<LessonRun>()
const error = ref<string>()
const summary = ref<LessonSummary>()
const response = ref<unknown>()
const result = ref<Grade>()
const confirmExit = ref(false)

onMounted(async () => {
  try {
    const level = await loadLevel(props.levelId)
    const lesson = level?.lessons.find((l) => l.id === props.lessonId)
    if (!level || !lesson) throw new Error(`There's no lesson ${props.levelId}/${props.lessonId}.`)
    for (const ex of lesson.exercises) exercises.set(`${level.id}/${lesson.id}/${ex.id}`, ex)
    run.value = startRun(planLesson(level.id, lesson), Date.now())
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

const exercise = computed(() => (run.value ? exercises.get(currentRef(run.value) ?? '') : undefined))
const explanation = computed(() => (exercise.value && 'explanation' in exercise.value ? exercise.value.explanation : undefined))
const shownSolution = computed(() => (exercise.value ? solution(exercise.value as never) : {}))
const feedbackClass = computed(() => (result.value ? (result.value.correct ? 'ok' : 'bad') : ''))
const canPress = computed(
  () => !!summary.value || !!result.value || response.value !== undefined || (!!exercise.value && !isGraded(exercise.value)),
)
const buttonLabel = computed(() => {
  if (summary.value || result.value) return 'Continue'
  return exercise.value && !isGraded(exercise.value) ? 'Got it' : 'Check'
})

const cue = (c: Cue) => feedback(c, settings)

function check() {
  const ex = exercise.value!
  result.value = grade(ex as never, response.value as never)
  cue(result.value.correct ? 'correct' : 'wrong')
}

function next(correct: boolean, mistakes: number) {
  const r = answerCurrent(run.value!, correct, mistakes)
  run.value = r
  response.value = undefined
  result.value = undefined
  if (isFinished(r)) {
    summary.value = summarise(r, (ref) => isGraded(exercises.get(ref)!), Date.now())
    cue('complete')
  }
}

function press() {
  if (summary.value) return void router.push('/')
  const ex = exercise.value!
  if (!isGraded(ex)) return next(true, 0)
  if (!result.value) return check()
  next(result.value.correct, result.value.mistakes)
}

watch(response, (r) => {
  if (r !== undefined && exercise.value && checksItself(exercise.value) && !result.value) check()
})

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
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
.done {
  justify-content: center;
  text-align: center;
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-3);
}
.stat {
  display: grid;
  gap: var(--s-1);
  padding: var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
.stat-label {
  color: var(--c-text-2);
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.8rem;
}
.stat strong {
  font-size: 1.5rem;
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
  display: grid;
  gap: var(--s-2);
  margin-bottom: var(--s-3);
}
.verdict {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-size: 1.25rem;
  font-weight: 900;
}
.solution {
  margin: 0;
  font-size: var(--code-size);
  white-space: pre-wrap;
}
details summary {
  font-weight: 800;
  cursor: pointer;
}
</style>
