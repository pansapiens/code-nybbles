import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { commit, getProfile, loadProgress, updateProfile } from '@/db/repo'
import type { Profile } from '@/db/schema'
import { deviceTimezone } from '@/domain/dates'
import {
  type AnswerResult,
  buy,
  completeLesson,
  completePractice,
  type Ctx,
  type DailyGoal,
  type DomainEvent,
  initialProgress,
  type LessonResult,
  openChest,
  type Progress,
  type ShopItem,
  viewAt,
  wrongAnswer,
} from '@/domain/progress'

/**
 * Game state for the UI: the folded Progress plus a "now" view (streak settled to today, hearts
 * regenerated). `now` ticks every minute and on returning to the tab, which covers local midnight
 * (plans/01 §3.7). All writes go through repo.commit().
 * ponytail: no cross-tab sync; a second open tab sees changes on its next reload.
 */
export const useProgressStore = defineStore('progress', () => {
  const state = shallowRef<Progress>(initialProgress())
  const profile = ref<Profile>()
  const ready = ref(false)
  const now = ref(Date.now())
  const view = computed(() => viewAt(state.value, now.value, deviceTimezone()))
  const dailyGoal = computed(() => profile.value?.dailyGoalXp ?? 20)

  const tick = () => (now.value = Date.now())
  setInterval(tick, 60_000)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick())

  let loading: Promise<void> | undefined
  /** Safe to call from anywhere; loads once (call again after import/reset with `reload`). */
  const load = () => (loading ??= reload())
  async function reload() {
    ;[state.value, profile.value] = await Promise.all([loadProgress(), getProfile()])
    tick()
    ready.value = true
  }

  const ctx = (): Ctx => ({ now: Date.now(), tz: deviceTimezone(), dailyGoalXp: dailyGoal.value })
  async function save(events: DomainEvent[]) {
    if (events.length) state.value = await commit(events)
    tick()
  }

  async function finishLesson(r: LessonResult) {
    const out = completeLesson(state.value, r, ctx())
    await save(out.events)
    return out
  }
  async function finishPractice(kind: Parameters<typeof completePractice>[1], results: AnswerResult[]) {
    const out = completePractice(state.value, kind, results, ctx())
    await save(out.events)
    return out
  }
  async function purchase(item: ShopItem) {
    const out = buy(state.value, item, ctx())
    if ('error' in out) return out.error
    await save(out.events)
  }
  async function claimChest(chestId: string) {
    const out = openChest(state.value, chestId, ctx())
    await save(out.events)
    return out.gems
  }
  const loseHeart = () => save(wrongAnswer(state.value, ctx()).events)

  async function setDailyGoal(g: DailyGoal) {
    await updateProfile({ dailyGoalXp: g })
    profile.value = await getProfile()
  }

  return { state, profile, ready, view, dailyGoal, load, reload, finishLesson, finishPractice, purchase, claimChest, loseHeart, setDailyGoal }
})
