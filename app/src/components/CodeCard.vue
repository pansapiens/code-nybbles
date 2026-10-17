<template>
  <figure class="code-card">
    <figcaption v-if="caption" class="caption">{{ caption }}</figcaption>
    <pre
      class="code"
      tabindex="0"
    ><code><template v-for="(line, i) in lines" :key="i"><span v-if="lineNumbers" class="ln" aria-hidden="true">{{ i + 1 }}</span>{{ line }}
</template></code></pre>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Plain text for now; build-time highlighted tokens replace this in M1 (plans/03 §4.1).
const props = defineProps<{ code: string; caption?: string; lineNumbers?: boolean }>()
const lines = computed(() => props.code.replace(/\n$/, '').split('\n'))
</script>

<style scoped>
.code-card {
  margin: 0;
  border: 2px solid var(--c-border);
  border-radius: var(--radius-card);
  background: var(--c-surface);
  overflow: hidden;
}
.caption {
  padding: var(--s-2) var(--s-3) 0;
  color: var(--c-text-2);
  font-size: 0.85rem;
  font-weight: 700;
}
.code {
  margin: 0;
  padding: var(--s-3);
  overflow-x: auto; /* scroll, never wrap mid-token (plans/01 §4.4) */
  font-size: var(--code-size);
  line-height: 1.5;
  white-space: pre;
}
.ln {
  display: inline-block;
  width: 2ch;
  margin-right: 1.5ch;
  color: var(--c-text-2);
  text-align: right;
  user-select: none;
}
</style>
