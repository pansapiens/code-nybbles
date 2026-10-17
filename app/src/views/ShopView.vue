<template>
  <section class="view stack">
    <h1>Shop</h1>
    <p class="balance"><AppIcon name="gem" /> {{ game.state.gems }} gems</p>

    <article class="item">
      <AppIcon name="star" :size="40" class="freeze" />
      <div class="stack">
        <h2>Streak freeze</h2>
        <p>Keeps your streak alive for one day you miss. You can hold {{ MAX_FREEZES }}.</p>
        <p class="owned">Equipped: {{ v.streak.freezesEquipped }} / {{ MAX_FREEZES }}</p>
      </div>
      <DuoButton :disabled="v.streak.freezesEquipped >= MAX_FREEZES || game.state.gems < PRICES.freeze" @click="buy('freeze')">
        <AppIcon name="gem" :size="18" /> {{ PRICES.freeze }}
      </DuoButton>
    </article>

    <article v-if="v.canRepair" class="item">
      <AppIcon name="flame" :size="40" class="flame" />
      <div class="stack">
        <h2>Streak repair</h2>
        <p>Bring back your {{ v.streak.lostStreak?.length }}-day streak.</p>
      </div>
      <DuoButton :disabled="game.state.gems < v.repairCost" @click="buy('repair')">
        <AppIcon name="gem" :size="18" /> {{ v.repairCost }}
      </DuoButton>
    </article>

    <article v-if="settings.heartsMode" class="item">
      <AppIcon name="heart" :size="40" class="heart" />
      <div class="stack">
        <h2>Refill hearts</h2>
        <p>Get all {{ MAX_HEARTS }} hearts back now. They also refill one every 4 hours.</p>
        <p class="owned">Hearts: {{ v.hearts }} / {{ MAX_HEARTS }}</p>
      </div>
      <DuoButton :disabled="v.hearts >= MAX_HEARTS || game.state.gems < PRICES.hearts" @click="buy('hearts')">
        <AppIcon name="gem" :size="18" /> {{ PRICES.hearts }}
      </DuoButton>
    </article>

    <p class="hint">Earn gems by finishing lessons without mistakes, reaching your daily goal, opening chests and reaching streak milestones.</p>
    <p v-if="message" role="status" class="message">{{ message }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import DuoButton from '@/components/DuoButton.vue'
import { MAX_HEARTS, PRICES, type ShopItem } from '@/domain/progress'
import { MAX_FREEZES } from '@/domain/streak'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'

const game = useProgressStore()
void game.load()
const settings = useSettingsStore()
const v = computed(() => game.view)
const message = ref<string>()

const DONE: Record<ShopItem, string> = {
  freeze: 'Streak freeze equipped.',
  repair: 'Streak repaired!',
  hearts: 'Hearts refilled.',
}
async function buy(item: ShopItem) {
  const err = await game.purchase(item)
  message.value = err ? "You can't buy that right now." : DONE[item]
}
</script>

<style scoped>
.balance {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
  color: var(--c-gems);
  font-size: 1.2rem;
  font-weight: 900;
}
.item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4);
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
}
.item h2 {
  margin: 0;
  font-size: 1.1rem;
}
.item p {
  margin: 0;
}
.owned,
.hint {
  color: var(--c-text-2);
  font-size: 0.9rem;
}
.freeze {
  color: var(--c-frozen);
}
.flame {
  color: var(--c-streak);
}
.heart {
  color: var(--c-wrong);
}
.message {
  font-weight: 800;
}
</style>
