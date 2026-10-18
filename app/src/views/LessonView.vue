<template>
  <div class="lesson">
    <header v-if="!screens" class="lesson-top">
      <button class="icon-btn" type="button" aria-label="Quit lesson" @click="confirmExit = true">
        <AppIcon name="close" />
      </button>
      <ProgressBar :value="run ? (mode ? run.index / run.queue.length : progress(run)) : 0" label="Lesson progress" />
      <HudChip v-if="!mode" kind="hearts" :value="game.view.hearts" :infinite="!heartsApply" />
    </header>

    <main v-if="error" class="prompt stack">
      <h1>Couldn't open this session</h1>
      <p>{{ error }}</p>
      <DuoButton @click="router.push('/')">Back to the path</DuoButton>
    </main>

    <main v-else-if="screens" class="prompt">
      <CelebrationScreen :key="screenIndex" :screen="screens[screenIndex]!" />
    </main>

    <main v-else-if="exercise" ref="promptEl" class="prompt" tabindex="-1">
      <CodeCard v-if="program" class="program" :code="visibleProgram" line-numbers caption="Program" />
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
        v-if="screens || (exercise && (result || !checksItself(exercise)))"
        block
        :variant="!result ? 'primary' : result.correct ? 'correct' : 'danger'"
        :disabled="!canPress || saving"
        @click="press"
      >
        {{ buttonLabel }}
      </DuoButton>
    </footer>

    <BottomSheet v-model:open="outOfHearts" title="You're out of hearts">
      <p>Hearts refill one every 4 hours. You can refill them all now with gems, or come back later.</p>
      <div class="stack">
        <DuoButton block :disabled="game.state.gems < PRICES.hearts" @click="refillHearts">
          Refill for {{ PRICES.hearts }} gems
        </DuoButton>
        <DuoButton block variant="ghost" @click="router.push('/')">End session</DuoButton>
      </div>
    </BottomSheet>

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
import type { CompiledExercise, CompiledLevel } from '@code-nybbles/content-build/schema'
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import DuoButton from '@/components/DuoButton.vue'
import HudChip from '@/components/HudChip.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { loadCourse, loadLevel } from '@/content/loader'
import {
  answerCurrent,
  answerResults,
  currentRef,
  isFinished,
  type LessonRun,
  type LessonSummary,
  planLesson,
  progress,
  startRun,
  summarise,
} from '@/domain/lesson-planner'
import { JUMP_PASS, nodesUpTo, placementItems, placementScore, sectionEnds } from '@/domain/placement'
import { type PracticeKind, exercisePool, planPractice } from '@/domain/practice'
import { type Grade, grade, solution } from '@/exercises/grade'
import { checksItself, isGraded, rendererFor } from '@/exercises/registry'
import CelebrationScreen, { type Screen } from '@/components/CelebrationScreen.vue'
import CodeCard from '@/components/CodeCard.vue'
import { addDays } from '@/domain/dates'
import { ACHIEVEMENTS, PRICES } from '@/domain/progress'
import { type Cue, feedback } from '@/services/feedback'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'

// Lesson route: levelId and lessonId. Practice route: kind (and unitId for unit practice).
// `mode` makes it a test: 'jump' plays one checkpoint, 'placement' climbs the sections' checkpoint questions.
// Tests never re-queue wrong answers, cost hearts or give XP.
const props = defineProps<{ levelId?: string; lessonId?: string; kind?: PracticeKind; unitId?: string; mode?: 'jump' | 'placement' }>()
const router = useRouter()
const game = useProgressStore()
const settings = useSettingsStore()
const checkpoint = ref(false)
/** Builds: `final` when this lesson completes the Build for the first time. */
const build = ref<'step' | 'final'>()
/** Hearts only apply in new lessons: levels not yet complete (plans/01 §3.8). */
const newLesson = ref(false)
const heartsApply = computed(() => settings.heartsMode && newLesson.value && !program.value && !props.mode)
const outOfHearts = ref(false)
const screens = ref<Screen[]>()
const screenIndex = ref(0)
const saving = ref(false)

const exercises = new Map<string, CompiledExercise>()
/** Code Reads: the program, and how many of its lines each exercise reveals. Lines stay shown once revealed. */
const program = shallowRef<CompiledLevel['program']>()
const reveals = new Map<string, number>()
const revealed = ref(0)
const run = shallowRef<LessonRun>()
const error = ref<string>()
const response = ref<unknown>()
const result = ref<Grade>()
const confirmExit = ref(false)

onMounted(async () => {
  try {
    if (props.kind) {
      const [{ sections }] = await Promise.all([loadCourse(), game.load()])
      const pool = exercisePool(sections)
      const items = planPractice(props.kind, game.state, pool, game.view.today, props.unitId)
      if (!items.length) throw new Error("There's nothing to practise yet. Finish a lesson first.")
      for (const i of pool) exercises.set(i.ref, i.ex)
      run.value = startRun({ levelId: 'practice', lessonId: props.kind, items }, Date.now())
      return
    }
    if (props.mode === 'placement') {
      const [{ sections }] = await Promise.all([loadCourse(), game.load()])
      sectionCount.value = sections.length
      const items = placementItems(sections)
      for (const i of items) exercises.set(i.ref, i.ex)
      run.value = startRun({ levelId: 'placement', lessonId: 'placement', items: items.map((i) => i.ref) }, Date.now())
      return
    }
    const [found] = await Promise.all([loadLevel(props.levelId!), game.load()])
    const level = found?.level
    const lesson = level?.lessons.find((l) => l.id === props.lessonId)
    if (!level || !lesson) throw new Error(`There's no lesson ${props.levelId}/${props.lessonId}.`)
    checkpoint.value = found!.checkpoint
    newLesson.value = (game.state.levels[level.id]?.lessons ?? 0) < level.lessons.length
    if (level.build)
      build.value = newLesson.value && (game.state.levels[level.id]?.lessons ?? 0) + 1 >= level.lessons.length ? 'final' : 'step'
    if (heartsApply.value && game.view.hearts === 0) outOfHearts.value = true
    lesson.exercises.forEach((ex, i) => {
      exercises.set(`${level.id}/${lesson.id}/${ex.id}`, ex)
      if (level.reveals) reveals.set(`${level.id}/${lesson.id}/${ex.id}`, level.reveals[i]!)
    })
    program.value = level.program
    run.value = startRun(planLesson(level.id, lesson), Date.now())
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

const exercise = computed(() => (run.value ? exercises.get(currentRef(run.value) ?? '') : undefined))
// Each new exercise takes focus, so a screen reader reads the question and Tab reaches its answers first.
const promptEl = ref<HTMLElement>()
watch(
  () => run.value?.index,
  () => nextTick(() => promptEl.value?.focus({ preventScroll: true })),
)
watch(run, (r) => (revealed.value = Math.max(revealed.value, reveals.get((r && currentRef(r)) ?? '') ?? 0)))
const visibleProgram = computed(() => program.value?.rust.split('\n').slice(0, revealed.value).join('\n') ?? '')
const explanation = computed(() => (exercise.value && 'explanation' in exercise.value ? exercise.value.explanation : undefined))
const shownSolution = computed(() => (exercise.value ? solution(exercise.value as never) : {}))
const feedbackClass = computed(() => (result.value ? (result.value.correct ? 'ok' : 'bad') : ''))
const canPress = computed(
  () => !!screens.value || !!result.value || response.value !== undefined || (!!exercise.value && !isGraded(exercise.value)),
)
const buttonLabel = computed(() => {
  if (screens.value || result.value) return 'Continue'
  return exercise.value && !isGraded(exercise.value) ? 'Got it' : 'Check'
})

const cue = (c: Cue) => feedback(c, settings)

function check() {
  const ex = exercise.value!
  result.value = grade(ex as never, response.value as never)
  cue(result.value.correct ? 'correct' : 'wrong')
  if (!result.value.correct && heartsApply.value) {
    void game.loseHeart().then(() => (outOfHearts.value = game.view.hearts === 0))
  }
}

async function refillHearts() {
  if (!(await game.purchase('hearts'))) outOfHearts.value = false
}

function next(correct: boolean, mistakes: number) {
  const r = answerCurrent(run.value!, correct, mistakes, !props.mode)
  run.value = r
  response.value = undefined
  result.value = undefined
  if (isFinished(r) || (props.mode === 'placement' && placementScore(firstTries(r), sectionCount.value).over)) void finish(r)
}

const firstTries = (r: LessonRun) => r.attempts.map((a) => a.correct && !a.mistakes)
const sectionCount = ref(0)

/** Commits what a jump or placement unlocked and says how it went. */
async function finishTest(r: LessonRun, accuracy: number): Promise<Screen[]> {
  const { sections } = await loadCourse()
  if (props.mode === 'jump') {
    if (accuracy < JUMP_PASS)
      return [{ kind: 'message', title: 'Not quite yet', text: `You got ${Math.round(accuracy * 100)}% right and need ${JUMP_PASS * 100}% to jump ahead. Keep going along the path and try again whenever you like.` }]
    await game.finishPlacement({ source: 'jump', ...nodesUpTo(sections, props.levelId!) })
    return [{ kind: 'message', title: 'Jumped ahead!', text: 'Everything up to here is unlocked.' }]
  }
  const { passed } = placementScore(firstTries(r), sections.length)
  if (!passed) return [{ kind: 'message', title: 'Start from the beginning', text: 'Section 1 is the best place to start. You can retake the test from Settings.' }]
  await game.finishPlacement({ source: 'placement', ...nodesUpTo(sections, sectionEnds(sections)[passed - 1]!) })
  return passed < sections.length
    ? [{ kind: 'message', title: `You've placed into Section ${passed + 1}`, text: `${sections[passed]!.title}. Everything before it is unlocked.` }]
    : [{ kind: 'message', title: 'You know your stuff!', text: 'You passed every section, so the whole course is unlocked.' }]
}

async function finish(r: LessonRun) {
  saving.value = true
  const sum = summarise(r, (ref) => isGraded(exercises.get(ref)!), Date.now())
  const results = answerResults(r, (ref) => {
    const ex = exercises.get(ref)!
    return isGraded(ex) ? (ex.concepts ?? []) : undefined
  })
  if (props.mode) {
    screens.value = await finishTest(r, sum.accuracy)
    saving.value = false
    return cue('complete')
  }
  const out = props.kind
    ? await game.finishPractice(props.kind, results)
    : await game.finishLesson({
        levelId: props.levelId!,
        lessonId: props.lessonId!,
        checkpoint: checkpoint.value,
        codeRead: !!program.value,
        build: build.value,
        results,
        ...sum,
      })
  saving.value = false
  screens.value = celebrations(out, sum)
  cue('complete')
}

type Finished = Awaited<ReturnType<typeof game.finishLesson>>
function celebrations(out: Finished, sum: LessonSummary): Screen[] {
  const list: Screen[] = [{ kind: 'summary', xp: out.xp, checkpoint: checkpoint.value, ...sum }]
  const gems = (reason: string, ref?: string) =>
    out.events.find((e) => e.type === 'gems_awarded' && e.payload.reason === reason && (!ref || e.payload.ref === ref))
  for (const n of out.notices) {
    if (n.type === 'streak_extended') {
      const today = n.date
      const week = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i - 6)
        const label = new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' })
        return { date, label, status: out.state.streak.days[date] }
      })
      list.push({ kind: 'streak', length: n.length, week })
    }
    if (n.type === 'streak_milestone') {
      const e = gems('milestone', String(n.length))
      list.push({ kind: 'milestone', length: n.length, gems: e?.type === 'gems_awarded' ? e.payload.gems : 0 })
    }
    if (n.type === 'daily_goal_reached') list.push({ kind: 'goal', gems: n.gems })
    if (n.type === 'achievement') {
      const a = ACHIEVEMENTS.find((x) => x.id === n.id)
      if (a) list.push({ kind: 'achievement', title: a.title, description: a.description, gems: a.gems })
    }
  }
  return list
}

function press() {
  if (screens.value) {
    if (screenIndex.value < screens.value.length - 1) screenIndex.value++
    else void router.push(props.kind ? '/practice' : '/')
    return
  }
  const ex = exercise.value!
  if (!isGraded(ex)) return next(true, 0)
  if (!result.value) return check()
  next(result.value.correct, result.value.mistakes)
}

watch(response, (r) => {
  if (r !== undefined && exercise.value && checksItself(exercise.value) && !result.value) check()
})

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
.program {
  margin-bottom: var(--s-4);
}
.prompt {
  flex: 1;
  padding: var(--s-4);
}
.prompt:focus {
  outline: none; /* focused by script for screen readers, not a control */
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
