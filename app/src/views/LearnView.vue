<template>
  <section class="view stack">
    <div class="unit-banner">
      <div>
        <div class="eyebrow">Section 1, Unit 1</div>
        <h1>Hello, Rust</h1>
      </div>
    </div>
    <p>The learning path arrives in M2. For now, try the lesson player preview.</p>
    <DuoButton block @click="router.push('/lesson/preview')">Start</DuoButton>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import DuoButton from '@/components/DuoButton.vue'

const router = useRouter()
</script>

<style scoped>
.unit-banner {
  padding: var(--s-4);
  border-radius: var(--radius-banner);
  background: var(--c-section-purple);
  color: var(--c-on-primary);
}
.eyebrow {
  font-weight: 800;
  opacity: 0.85;
}
</style>
