import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'system' | 'light' | 'dark'
export const THEME_KEY = 'code-nybbles:theme' // also read by public/theme-init.js

function applyTheme(t: Theme) {
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}

export const SETTINGS_KEY = 'code-nybbles:settings'

function readSaved(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}
const pick = <T>(v: unknown, fallback: T): T => (typeof v === typeof fallback ? (v as T) : fallback)

// Device preferences live in localStorage (synchronous, so no flash on load), and are included in backups.
// Theme has its own key because public/theme-init.js reads it before the app loads.
export const useSettingsStore = defineStore('settings', () => {
  const stored = localStorage.getItem(THEME_KEY)
  const saved = readSaved()
  const theme = ref<Theme>(stored === 'light' || stored === 'dark' ? stored : 'system')
  const heartsMode = ref(pick(saved.heartsMode, false)) // off by default (plans/01 §3.8, decision 3)
  const sound = ref(pick(saved.sound, true))
  const haptics = ref(pick(saved.haptics, true))
  const codeSize = ref(pick(saved.codeSize, 15))
  /** On top of the OS `prefers-reduced-motion` setting, which always applies (plans/01 §4.5). */
  const reduceMotion = ref(pick(saved.reduceMotion, false))

  watch([heartsMode, sound, haptics, codeSize, reduceMotion], ([h, s, v, c, r]) =>
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ heartsMode: h, sound: s, haptics: v, codeSize: c, reduceMotion: r }),
    ),
  )

  watch(theme, (t) => {
    if (t === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  })
  // In rem, so code also follows the browser's font size (16px = 1rem by default).
  watch(codeSize, (px) => document.documentElement.style.setProperty('--code-size', `${px / 16}rem`), {
    immediate: true,
  })

  watch(
    reduceMotion,
    (on) => {
      if (on) document.documentElement.dataset.motion = 'reduced'
      else delete document.documentElement.dataset.motion
    },
    { immediate: true },
  )

  return { theme, heartsMode, sound, haptics, codeSize, reduceMotion }
})
