<template>
  <section class="view stack">
    <div class="head">
      <h1>Profile</h1>
      <RouterLink to="/settings" class="settings" aria-label="Settings"><AppIcon name="gear" /></RouterLink>
    </div>
    <p v-if="game.profile" class="joined">Joined {{ joined }}</p>

    <div class="stats">
      <div class="stat"><AppIcon name="flame" class="flame" /><strong>{{ game.view.streak.currentStreak }}</strong><span>Day streak</span></div>
      <div class="stat"><AppIcon name="star" class="gold" /><strong>{{ game.state.xp }}</strong><span>Total XP</span></div>
      <div class="stat"><AppIcon name="check" class="green" /><strong>{{ lessons }}</strong><span>Lessons</span></div>
      <div class="stat"><AppIcon name="flame" class="flame" /><strong>{{ game.view.streak.longestStreak }}</strong><span>Longest streak</span></div>
    </div>

    <h2>Last 7 days</h2>
    <ol class="chart" aria-label="XP per day, last 7 days">
      <li v-for="d in week" :key="d.date" :aria-label="`${d.label}: ${d.xp} XP`">
        <span class="bar" :style="{ height: `${(d.xp / maxXp) * 100}%` }" />
        <span class="dow" aria-hidden="true">{{ d.label }}</span>
      </li>
    </ol>

    <h2>Achievements</h2>
    <ul class="achievements">
      <li v-for="a in ACHIEVEMENTS" :key="a.id" :class="{ earned: !!game.state.achievements[a.id] }">
        <AppIcon :name="game.state.achievements[a.id] ? 'star' : 'lock'" :size="28" />
        <div>
          <strong>{{ a.title }}</strong>
          <span>{{ a.description }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { addDays } from '@/domain/dates'
import { ACHIEVEMENTS } from '@/domain/progress'
import { useProgressStore } from '@/stores/progress'

const game = useProgressStore()
void game.load()

const joined = computed(() =>
  new Date(game.profile!.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
)
const lessons = computed(() => Object.values(game.state.levels).reduce((n, l) => n + l.lessons, 0))
const week = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const date = addDays(game.view.today, i - 6)
    const label = new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })
    return { date, label, xp: game.state.daily[date]?.xp ?? 0 }
  }),
)
const maxXp = computed(() => Math.max(game.dailyGoal, ...week.value.map((d) => d.xp)))
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.settings {
  display: grid;
  place-items: center;
  width: var(--touch-min);
  height: var(--touch-min);
  color: var(--c-text-2);
}
.joined {
  margin: 0;
  color: var(--c-text-2);
}
h2 {
  margin: var(--s-3) 0 0;
  font-size: 1.2rem;
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-3);
}
.stat {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: var(--s-2);
  padding: var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
.stat :deep(svg) {
  grid-row: span 2;
}
.stat strong {
  font-size: 1.3rem;
}
.stat span {
  color: var(--c-text-2);
  font-size: 0.85rem;
}
.flame {
  color: var(--c-streak);
}
.gold {
  color: var(--c-gold);
}
.green {
  color: var(--c-correct);
}
.chart {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: end;
  gap: var(--s-2);
  height: 140px;
  margin: 0;
  padding: var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
  list-style: none;
}
.chart li {
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: end;
  height: 100%;
  text-align: center;
}
.bar {
  min-height: 4px;
  border-radius: 6px 6px 0 0;
  background: var(--c-primary);
}
.dow {
  color: var(--c-text-2);
  font-size: 0.75rem;
  font-weight: 800;
}
.achievements {
  display: grid;
  gap: var(--s-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.achievements li {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
  color: var(--c-text-2);
}
.achievements li.earned {
  border-color: var(--c-gold);
  color: var(--c-text);
}
.achievements li.earned :deep(svg) {
  color: var(--c-gold);
}
.achievements div {
  display: grid;
}
.achievements span {
  font-size: 0.85rem;
}
</style>
