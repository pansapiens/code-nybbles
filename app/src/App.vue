<template>
  <RouterView v-if="route.meta.fullscreen" />
  <div v-else class="shell">
    <AppNav />
    <div class="main">
      <TopHud class="hud-mobile" />
      <RouterView />
    </div>
    <aside class="rail stack" aria-label="Your progress">
      <TopHud />
      <div class="rail-card">
        <h2>Daily goal</h2>
        <ProgressBar :value="Math.min(1, progress.view.todayXp / progress.dailyGoal)" label="Daily XP goal" />
        <p class="goal-text">{{ progress.view.todayXp }} / {{ progress.dailyGoal }} XP</p>
      </div>
      <RouterLink to="/settings" class="rail-link">Settings</RouterLink>
    </aside>
  </div>

  <template v-if="!route.meta.fullscreen">
    <div v-if="needRefresh" class="toast row" role="status">
      <span>New lessons available.</span>
      <DuoButton @click="updateServiceWorker()">Refresh</DuoButton>
    </div>
    <div v-else-if="offerInstall" class="toast row" role="status">
      <span>Install Code Nybbles?</span>
      <DuoButton @click="install()">Install</DuoButton>
      <DuoButton variant="ghost" @click="dismissInstall">Not now</DuoButton>
    </div>
    <div v-else-if="remindBackup" class="toast row" role="status">
      <span>Back up your progress?</span>
      <DuoButton @click="router.push('/settings').then(snoozeBackup)">Settings</DuoButton>
      <DuoButton variant="ghost" @click="snoozeBackup">Later</DuoButton>
    </div>
  </template>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import AppNav from '@/components/AppNav.vue'
import DuoButton from '@/components/DuoButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import TopHud from '@/components/TopHud.vue'
import { BACKUP_NUDGE_KEY, backupDue } from '@/db/repo'
import { install, installEvent } from '@/services/install'
import { syncReminders } from '@/services/reminders'
import { useProgressStore } from '@/stores/progress'

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()
void progress.load()
// registerType: 'prompt' -> never auto-reload; the user chooses when (plans/01 §5.3).
// Native builds bundle the app, so there is no service worker or browser install prompt.
const native = Capacitor.isNativePlatform()
const { needRefresh, updateServiceWorker } = native
  ? { needRefresh: ref(false), updateServiceWorker: () => undefined }
  : useRegisterSW()

// Ask to install only after the first finished lesson (plans/01 §4.3), and not again once dismissed.
const INSTALL_KEY = 'code-nybbles:install-dismissed'
const installDismissed = ref(!!localStorage.getItem(INSTALL_KEY))
const offerInstall = computed(() => !native && !!installEvent.value && progress.state.xp > 0 && !installDismissed.value)
function dismissInstall() {
  localStorage.setItem(INSTALL_KEY, '1')
  installDismissed.value = true
}

// Reschedules on start, when a lesson finishes, when the time changes, and at midnight (the store's `now` ticks).
if (native) {
  watch(
    () => [progress.ready, progress.profile?.reminderTime, progress.view.today, progress.view.extendedToday, progress.view.streak.currentStreak, progress.state.xp > 0] as const,
    ([ready, reminderTime, today, doneToday, streak, hasProgress]) =>
      ready && void syncReminders({ now: Date.now(), today, reminderTime, streak, doneToday }, hasProgress).catch(console.error),
    { immediate: true },
  )
}

const nudgedAt = ref(Number(localStorage.getItem(BACKUP_NUDGE_KEY) ?? 0))
const remindBackup = computed(
  () => progress.state.xp > 0 && !!progress.profile && backupDue(Date.now(), progress.profile.createdAt, nudgedAt.value),
)
function snoozeBackup() {
  nudgedAt.value = Date.now()
  localStorage.setItem(BACKUP_NUDGE_KEY, String(nudgedAt.value))
}
</script>

<style scoped>
.shell {
  min-height: 100dvh;
  padding-bottom: calc(var(--tabbar-h) + var(--safe-bottom));
}
.rail {
  display: none;
}
.rail-card {
  padding: var(--s-4);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
.rail-card h2 {
  margin: 0 0 var(--s-3);
  font-size: 1.1rem;
}
.goal-text {
  margin: var(--s-2) 0 0;
  color: var(--c-text-2);
  font-weight: 700;
}
.rail-link {
  color: var(--c-text-2);
  font-weight: 800;
}

@media (min-width: 1024px) {
  .shell {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 340px;
    padding-bottom: 0;
  }
  .hud-mobile {
    display: none;
  }
  .main {
    padding-top: var(--safe-top);
  }
  .rail {
    display: flex;
    position: sticky;
    top: 0;
    align-self: start;
    padding: var(--s-4);
  }
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--tabbar-h) + var(--s-3) + var(--safe-bottom));
  z-index: 20;
  transform: translateX(-50%);
  padding: var(--s-2) var(--s-2) var(--s-2) var(--s-4);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  border: 2px solid var(--c-border);
  font-weight: 700;
  flex-wrap: wrap;
  justify-content: center;
  width: max-content;
  max-width: calc(100vw - 2 * var(--s-3));
}
</style>
