import { createRouter, createWebHistory } from 'vue-router'
import { useProgressStore } from '@/stores/progress'
import LearnView from '@/views/LearnView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Hide HUD and navigation (lesson player, onboarding). */
    fullscreen?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'learn', component: LearnView },
    { path: '/practice', name: 'practice', component: () => import('@/views/PracticeView.vue') },
    {
      path: '/practice/:kind(smart|mistakes|unit)/:unitId?',
      name: 'practice-session',
      component: () => import('@/views/LessonView.vue'),
      props: true,
      meta: { fullscreen: true },
    },
    { path: '/shop', name: 'shop', component: () => import('@/views/ShopView.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/streak', name: 'streak', component: () => import('@/views/StreakView.vue') },
    { path: '/guidebook/:unitId', component: () => import('@/views/GuidebookView.vue'), props: true },
    {
      path: '/lesson/:levelId/:lessonId',
      name: 'lesson',
      component: () => import('@/views/LessonView.vue'),
      props: true,
      meta: { fullscreen: true },
    },
    {
      path: '/welcome',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { fullscreen: true },
    },
    { path: '/placement', name: 'placement', component: () => import('@/views/LessonView.vue'), props: { mode: 'placement' }, meta: { fullscreen: true } },
    {
      path: '/jump/:levelId/:lessonId',
      name: 'jump',
      component: () => import('@/views/LessonView.vue'),
      props: (r) => ({ ...r.params, mode: 'jump' }),
      meta: { fullscreen: true },
    },
    ...(import.meta.env.DEV
      ? [
          { path: '/dev/components', component: () => import('@/views/dev/ComponentGallery.vue') },
          { path: '/dev/content/:levelId?', component: () => import('@/views/dev/ContentPreview.vue') },
        ]
      : []),
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

// First launch only. Anyone who already has activity (e.g. from before onboarding existed, or an imported backup) is skipped.
router.beforeEach(async (to) => {
  if (to.name === 'onboarding') return
  const game = useProgressStore()
  await game.load()
  if (!game.profile?.onboardedAt && !game.state.last) return { name: 'onboarding' }
})

export default router
