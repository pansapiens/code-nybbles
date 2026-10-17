import { defineStore } from 'pinia'
import { ref } from 'vue'

// ponytail: in-memory placeholder for the HUD; replaced by Dexie-backed streak/wallet stores in M2.
export const useGameStore = defineStore('game', () => {
  const streak = ref(0)
  const extendedToday = ref(false)
  const gems = ref(0)
  const hearts = ref(5)
  return { streak, extendedToday, gems, hearts }
})
