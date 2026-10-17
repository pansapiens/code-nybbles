import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'system' | 'light' | 'dark'
export const THEME_KEY = 'code-nybbles:theme' // also read by public/theme-init.js

function applyTheme(t: Theme) {
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}

// ponytail: only theme is persisted (localStorage, for flash-free paint); the rest move to
// the Dexie `settings` table when the event log lands in M2.
export const useSettingsStore = defineStore('settings', () => {
  const stored = localStorage.getItem(THEME_KEY)
  const theme = ref<Theme>(stored === 'light' || stored === 'dark' ? stored : 'system')
  const heartsMode = ref(false) // off by default (plans/01 §3.8, decision 3)
  const sound = ref(true)
  const haptics = ref(true)
  const codeSize = ref(15)

  watch(theme, (t) => {
    if (t === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  })
  watch(codeSize, (px) => document.documentElement.style.setProperty('--code-size', `${px}px`), {
    immediate: true,
  })

  return { theme, heartsMode, sound, haptics, codeSize }
})
