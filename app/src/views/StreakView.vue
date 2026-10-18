<template>
  <section class="view stack">
    <div class="hero" :class="{ off: !v.extendedToday }">
      <AppIcon name="flame" :size="88" />
      <div>
        <strong class="count">{{ v.streak.currentStreak }}</strong>
        <span>day streak</span>
      </div>
    </div>
    <p v-if="atRisk" class="banner risk" role="status">Do a lesson before midnight to keep your streak.</p>

    <div v-if="v.canRepair && lost" class="banner repair stack">
      <strong>Your {{ lost.length }}-day streak ended.</strong>
      <p>
        Earn it back for free by finishing {{ EARN_BACK_SESSIONS }} lessons today ({{ earnBack }}/{{ EARN_BACK_SESSIONS }}),
        or repair it now.
      </p>
      <DuoButton :disabled="game.state.gems < v.repairCost" @click="repair">
        Repair for {{ v.repairCost }} gems
      </DuoButton>
      <p v-if="message" role="alert">{{ message }}</p>
    </div>

    <div class="cards">
      <div class="card">
        <span class="label">Longest</span>
        <strong>{{ v.streak.longestStreak }}</strong>
      </div>
      <div class="card">
        <span class="label">Freezes</span>
        <span class="freezes" :aria-label="`${v.streak.freezesEquipped} of ${MAX_FREEZES} freezes equipped`">
          <AppIcon v-for="i in MAX_FREEZES" :key="i" name="star" :class="{ on: i <= v.streak.freezesEquipped }" />
        </span>
        <RouterLink to="/shop" class="small">Get more</RouterLink>
      </div>
    </div>

    <div class="card">
      <span class="label">Next milestone: {{ nextMilestone }} days</span>
      <ProgressBar :value="v.streak.currentStreak / nextMilestone" label="Progress to next milestone" />
    </div>

    <div class="calendar card">
      <div class="month-bar">
        <button type="button" class="nav" aria-label="Previous month" @click="month = addMonths(month, -1)">&lsaquo;</button>
        <strong>{{ monthLabel }}</strong>
        <button type="button" class="nav" aria-label="Next month" @click="month = addMonths(month, 1)">&rsaquo;</button>
      </div>
      <div class="grid" role="grid" :aria-label="monthLabel">
        <span v-for="d in WEEKDAYS" :key="d" class="dow" aria-hidden="true">{{ d }}</span>
        <span v-for="n in leadingBlanks" :key="`b${n}`" aria-hidden="true" />
        <span
          v-for="d in days"
          :key="d.date"
          role="gridcell"
          class="day"
          :class="[d.status, { today: d.date === v.today }]"
          :aria-label="`${d.date}: ${d.status ?? (d.date === v.today ? 'today' : 'no lesson')}`"
        >
          {{ d.n }}
        </span>
      </div>
      <p class="legend">
        <span class="key active" /> Active <span class="key frozen" /> Frozen <span class="key repaired" /> Repaired
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import DuoButton from '@/components/DuoButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { addDays, localHour } from '@/domain/dates'
import { EARN_BACK_SESSIONS, isMilestone, isStreakAtRisk, MAX_FREEZES } from '@/domain/streak'
import { useProgressStore } from '@/stores/progress'

const game = useProgressStore()
void game.load()
const v = computed(() => game.view)
const lost = computed(() => v.value.streak.lostStreak)
const earnBack = computed(() => (lost.value?.earnBackDate === v.value.today ? lost.value.earnBackProgress : 0))
const atRisk = computed(() => isStreakAtRisk(v.value.streak, v.value.today, localHour(Date.now())))
const nextMilestone = computed(() => {
  let n = v.value.streak.currentStreak + 1
  while (!isMilestone(n)) n++
  return n
})
const message = ref<string>()
async function repair() {
  const err = await game.purchase('repair')
  message.value = err ? "Couldn't repair the streak." : undefined
}

// ---- Month calendar (Monday first) ----
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const month = ref(v.value.today.slice(0, 7)) // 'YYYY-MM'
function addMonths(m: string, n: number) {
  const [y, mo] = m.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, mo - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}
const days = computed(() => {
  const out: { date: string; n: number; status?: string }[] = []
  for (let d = `${month.value}-01`; d.startsWith(month.value); d = addDays(d, 1))
    out.push({ date: d, n: Number(d.slice(8)), status: v.value.streak.days[d] })
  return out
})
const leadingBlanks = computed(() => (new Date(`${month.value}-01T00:00:00Z`).getUTCDay() + 6) % 7)
const monthLabel = computed(() =>
  new Date(`${month.value}-15T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
)
</script>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  color: var(--c-streak);
}
.hero.off {
  color: var(--c-streak-off);
}
.hero .count {
  display: block;
  color: var(--c-text);
  font-size: 3rem;
  font-weight: 900;
  line-height: 1;
}
.hero span {
  color: var(--c-text-2);
  font-weight: 800;
}
.banner {
  margin: 0;
  padding: var(--s-3) var(--s-4);
  border-radius: var(--radius-card);
}
.banner p {
  margin: 0;
}
.risk {
  background: var(--c-wrong-tint);
  color: var(--c-wrong-text);
  font-weight: 800;
}
.repair {
  border: 2px solid var(--c-streak);
}
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-3);
}
.card {
  display: grid;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
.card strong {
  font-size: 1.5rem;
}
.label {
  color: var(--c-text-2);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
}
.small {
  color: var(--c-primary-text);
  font-size: 0.85rem;
  font-weight: 800;
}
.freezes {
  display: flex;
  gap: var(--s-1);
  color: var(--c-streak-off);
}
.freezes .on {
  color: var(--c-frozen);
}
.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav {
  width: var(--touch-min);
  height: var(--touch-min);
  border: 0;
  background: none;
  font-size: 1.6rem;
  cursor: pointer;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--s-1);
  text-align: center;
}
.dow {
  color: var(--c-text-2);
  font-size: 0.8rem;
  font-weight: 800;
}
.day {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: 50%;
  font-weight: 700;
}
.day.active,
.key.active {
  background: var(--c-streak);
  color: var(--c-on-primary);
}
.day.frozen,
.key.frozen {
  background: var(--c-frozen);
  color: var(--c-on-primary);
}
.day.repaired,
.key.repaired {
  background: repeating-linear-gradient(45deg, var(--c-streak) 0 4px, var(--c-canvas) 4px 8px);
}
.day.today {
  border-color: var(--c-streak);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.85rem;
}
.key {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
</style>
