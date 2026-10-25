import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { commit, getProfile, loadProgress, updateProfile } from '@/db/repo'
import type { Profile } from '@/db/schema'
import { deviceTimezone } from '@/domain/dates'
import {
  type AnswerResult,
  buy,
  completeLesson,
  completePlacement,
  completePractice,
  type Ctx,
  type DailyGoal,
  type DomainEvent,
  initialProgress,
  type LessonResult,
  openChest,
  type PlacementPayload,
  type Progress,
  type ShopItem,
  viewAt,
  wrongAnswer,
} from '@/domain/progress'

/**
 * Game state for the UI: the folded Progress plus a "now" view (streak settled to today, hearts
 * regenerated). `now` ticks every minute and on returning to the tab, which covers local midnight
 * (plans/01 §3.7). All writes go through repo.commit().
 * ponytail: a second tab reloads from IndexedDB when it becomes visible, not live.
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
  // Bumped around a write so a reload that started earlier cannot overwrite the commit.
  let epoch = 0

  let loading: Promise<void> | undefined
  /** Safe to call from anywhere; loads once (call again after import/reset with `reload`). */
  const load = () => (loading ??= reload())
  async function reload() {
    const seen = epoch
    const [next, prof] = await Promise.all([loadProgress(), getProfile()])
    if (epoch !== seen) return
    state.value = next
    profile.value = prof
    tick()
    ready.value = true
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    tick()
    if (ready.value) void reload()
  })

  const ctx = (): Ctx => ({ now: Date.now(), tz: deviceTimezone(), dailyGoalXp: dailyGoal.value })
  async function save(events: DomainEvent[]) {
    epoch++
    try {
      if (events.length) state.value = await commit(events)
      tick()
    } finally {
      epoch++
    }
  }

  async function finishLesson(r: LessonResult) {
    const out = completeLesson(state.value, r, ctx())
    await save(out.events)
    return out
  }
  async function finishPractice(kind: Parameters<typeof completePractice>[1], results: AnswerResult[], comboXp = 0) {
    const out = completePractice(state.value, kind, results, ctx(), comboXp)
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
  const finishPlacement = async (payload: PlacementPayload) => save(completePlacement(state.value, payload, ctx()).events)
  const loseHeart = () => save(wrongAnswer(state.value, ctx()).events)

  async function saveProfile(changes: Partial<Omit<Profile, 'id'>>) {
    await updateProfile(changes)
    profile.value = await getProfile()
  }
  const setDailyGoal = (g: DailyGoal) => saveProfile({ dailyGoalXp: g })

  return { state, profile, ready, view, dailyGoal, load, reload, finishLesson, finishPractice, purchase, claimChest, loseHeart, finishPlacement, saveProfile, setDailyGoal }
})
