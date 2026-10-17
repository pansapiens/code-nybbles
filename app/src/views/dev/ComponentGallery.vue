<template>
  <section class="view stack">
    <h1>Component gallery</h1>
    <h2>DuoButton</h2>
    <DuoButton>Primary</DuoButton>
    <DuoButton variant="secondary">Secondary</DuoButton>
    <DuoButton variant="correct">Correct</DuoButton>
    <DuoButton variant="danger">Danger</DuoButton>
    <DuoButton variant="ghost">Ghost</DuoButton>
    <DuoButton disabled>Disabled</DuoButton>
    <h2>AnswerTile</h2>
    <div class="row wrap">
      <AnswerTile v-for="s in STATES" :key="s" :state="s" mono>{{ s }}</AnswerTile>
    </div>
    <h2>HudChip</h2>
    <div class="row">
      <HudChip kind="streak" :value="12" />
      <HudChip kind="streak" :value="12" dim />
      <HudChip kind="gems" :value="350" />
      <HudChip kind="hearts" :value="4" />
      <HudChip kind="hearts" :value="5" infinite />
    </div>
    <h2>ProgressBar</h2>
    <ProgressBar :value="0.6" />
    <h2>MemoryDiagram</h2>
    <MemoryDiagram :diagram="DIAGRAM" />
    <h2>CodeCard</h2>
    <CodeCard :code="CODE" caption="main.rs" line-numbers />
    <h2>BottomSheet</h2>
    <DuoButton variant="secondary" @click="open = true">Open sheet</DuoButton>
    <BottomSheet v-model:open="open" title="A bottom sheet">
      <p>Focus is trapped here; Escape closes it.</p>
      <DuoButton block @click="open = false">Close</DuoButton>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AnswerTile, { type TileState } from '@/components/AnswerTile.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import CodeCard from '@/components/CodeCard.vue'
import MemoryDiagram from '@/components/MemoryDiagram.vue'
import type { Diagram } from '@code-nybbles/content-build/schema'

const DIAGRAM: Diagram = {
  caption: 'After let s2 = s1; and let r = &s2;',
  frames: [
    {
      name: 'main',
      vars: [
        { name: 's1', moved: true },
        { name: 's2', id: 's2', points: 'h1' },
        { name: 'r', points: 's2' },
        { name: 'n', value: '5' },
      ],
    },
    { name: 'greet', vars: [{ name: 'name', points: 'h2' }] },
  ],
  heap: [
    { id: 'h1', value: '"hello"' },
    { id: 'h2', value: '"old"', freed: true },
  ],
}
import DuoButton from '@/components/DuoButton.vue'
import HudChip from '@/components/HudChip.vue'
import ProgressBar from '@/components/ProgressBar.vue'

const STATES: TileState[] = ['idle', 'selected', 'correct', 'wrong', 'disabled']
const CODE = `fn main() {
    let mut v: Vec<i32> = Vec::new(); // a rather long line that should scroll horizontally
    v.push(1);
    println!("{v:?}");
}`
const open = ref(false)
</script>

<style scoped>
.wrap {
  flex-wrap: wrap;
}
h2 {
  margin: var(--s-4) 0 0;
  font-size: 1.1rem;
}
</style>
