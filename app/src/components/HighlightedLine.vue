<!-- One line, no whitespace between tags: this renders inside <pre>. -->
<template><template v-for="(t, i) in tokens" :key="i"><span v-if="t.c" :class="`syn-${t.c}`">{{ t.text }}</span><template v-else>{{ t.text }}</template></template></template>

<script setup lang="ts">
import { computed } from 'vue'
import { highlight } from './highlight'

const props = defineProps<{ line: string }>()
const tokens = computed(() => highlight(props.line))
</script>
