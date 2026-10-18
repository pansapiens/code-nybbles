<template>
  <div class="celebration stack" :class="`k-${screen.kind}`">
    <template v-if="screen.kind === 'summary'">
      <h1>{{ screen.checkpoint ? 'Checkpoint passed!' : 'Lesson complete!' }}</h1>
      <div class="stats">
        <div class="stat xp">
          <span class="stat-label">Total XP</span>
          <strong>{{ screen.xp }}</strong>
        </div>
        <div class="stat">
          <span class="stat-label">Accuracy</span>
          <strong>{{ Math.round(screen.accuracy * 100) }}%</strong>
        </div>
        <div class="stat">
          <span class="stat-label">Time</span>
          <strong>{{ formatDuration(screen.durationMs) }}</strong>
        </div>
      </div>
    </template>

    <template v-else-if="screen.kind === 'streak'">
      <AppIcon name="flame" :size="96" class="big-flame" />
      <h1>{{ screen.length }} day streak!</h1>
      <ol class="week" aria-label="This week">
        <li v-for="d in screen.week" :key="d.date" :class="d.status ?? 'none'">
          <span class="dow">{{ d.label }}</span>
          <AppIcon v-if="d.status === 'active'" name="check" :size="18" />
          <AppIcon v-else-if="d.status === 'frozen'" name="star" :size="18" />
          <span v-else class="dot" aria-hidden="true" />
          <span class="visually-hidden">{{ d.status ?? 'no lesson' }}</span>
        </li>
      </ol>
      <p>Do a lesson every day to keep it going.</p>
    </template>

    <template v-else-if="screen.kind === 'milestone'">
      <AppIcon name="flame" :size="96" class="big-flame" />
      <h1>{{ screen.length }}-day milestone!</h1>
      <p class="reward"><AppIcon name="gem" /> +{{ screen.gems }} gems</p>
    </template>

    <template v-else-if="screen.kind === 'goal'">
      <AppIcon name="star" :size="96" class="big-star" />
      <h1>Daily goal reached!</h1>
      <p class="reward"><AppIcon name="gem" /> +{{ screen.gems }} gems from your daily chest</p>
    </template>

    <template v-else-if="screen.kind === 'message'">
      <AppIcon name="star" :size="96" class="big-star" />
      <h1>{{ screen.title }}</h1>
      <p>{{ screen.text }}</p>
    </template>

    <template v-else>
      <AppIcon name="star" :size="96" class="big-star" />
      <p class="eyebrow">Achievement unlocked</p>
      <h1>{{ screen.title }}</h1>
      <p>{{ screen.description }}</p>
      <p class="reward"><AppIcon name="gem" /> +{{ screen.gems }} gems</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DayStatus } from '@/domain/streak'
import AppIcon from './AppIcon.vue'

export type Screen =
  | { kind: 'summary'; xp: number; accuracy: number; durationMs: number; checkpoint: boolean }
  | { kind: 'streak'; length: number; week: { date: string; label: string; status?: DayStatus }[] }
  | { kind: 'milestone'; length: number; gems: number }
  | { kind: 'goal'; gems: number }
  | { kind: 'message'; title: string; text: string }
  | { kind: 'achievement'; title: string; description: string; gems: number }

defineProps<{ screen: Screen }>()

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<style scoped>
.celebration {
  align-items: center;
  justify-content: center;
  min-height: 60dvh;
  text-align: center;
  animation: pop var(--t-med);
}
.celebration h1 {
  font-size: 1.75rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s-3);
  width: 100%;
}
.stat {
  display: grid;
  gap: var(--s-1);
  padding: var(--s-3);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
.stat.xp {
  border-color: var(--c-gold);
}
.stat-label {
  color: var(--c-text-2);
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.75rem;
}
.stat strong {
  font-size: 1.4rem;
}
.big-flame {
  color: var(--c-streak);
}
.big-star {
  color: var(--c-gold);
}
.eyebrow {
  margin: 0;
  color: var(--c-text-2);
  font-weight: 800;
  text-transform: uppercase;
}
.reward {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  --icon: var(--c-gems);
  color: var(--c-gems-text);
  font-weight: 800;
}
.week {
  display: flex;
  gap: var(--s-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.week li {
  display: grid;
  justify-items: center;
  gap: var(--s-1);
  color: var(--c-streak-off);
}
.week li.active {
  --icon: var(--c-streak);
  color: var(--c-streak-text);
}
.week li.frozen {
  color: var(--c-frozen);
}
.dot {
  width: 10px;
  height: 10px;
  margin: 4px;
  border-radius: 50%;
  background: currentcolor;
}
.dow {
  color: var(--c-text-2);
  font-size: 0.8rem;
  font-weight: 800;
}
</style>
