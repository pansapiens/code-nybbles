<template>
  <section class="view stack">
    <h1>Playground</h1>
    <label for="editor" class="note">Rust code</label>
    <textarea
      id="editor"
      v-model="code"
      class="editor"
      rows="14"
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
      @keydown.tab.prevent="indent"
    />
    <DuoButton block :disabled="!!blocked" @click="runCode">{{ running ? 'Running...' : 'RUN' }}</DuoButton>
    <p v-if="blocked" class="note" role="status">{{ blocked }}</p>
    <pre v-if="result" class="output" aria-label="Output" aria-live="polite"><template v-if="result.stdout">{{ result.stdout }}</template><span v-if="result.stderr" class="err">{{ result.stderr }}</span></pre>
    <p class="note">Runs on play.rust-lang.org</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import DuoButton from '@/components/DuoButton.vue'
import { retryIn, run, type RunResult } from '@/services/code-runner'

const KEY = 'playground-code'
const DEFAULT = 'fn main() {\n    println!("Hello, Nybbles!");\n}\n'

const code = ref(localStorage.getItem(KEY) ?? DEFAULT)
watch(code, (c) => localStorage.setItem(KEY, c))

const running = ref(false)
const result = ref<RunResult>()
const wait = ref(0)
const online = ref(navigator.onLine)
const setOnline = () => (online.value = navigator.onLine)
addEventListener('online', setOnline)
addEventListener('offline', setOnline)

const blocked = computed(() => {
  if (!online.value) return "You're offline. The Playground needs a connection."
  if (wait.value) return `Too many runs. Try again in ${wait.value} s.`
  return ''
})

let timer: ReturnType<typeof setInterval> | undefined
async function runCode() {
  running.value = true
  result.value = await run(code.value, { mode: 'run' })
  running.value = false
  wait.value = retryIn()
  clearInterval(timer)
  if (wait.value) timer = setInterval(() => ((wait.value = retryIn()) || clearInterval(timer)), 1000)
}
onBeforeUnmount(() => {
  clearInterval(timer)
  removeEventListener('online', setOnline)
  removeEventListener('offline', setOnline)
})

function indent(e: KeyboardEvent) {
  const t = e.target as HTMLTextAreaElement
  t.setRangeText('    ', t.selectionStart, t.selectionEnd, 'end')
  code.value = t.value
}
</script>

<style scoped>
.editor,
.output {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: var(--s-3);
  border-radius: var(--radius-card);
  font: var(--code-size) / 1.5 var(--font-code);
  tab-size: 4;
}
.editor {
  border: 2px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  resize: vertical;
}
.output {
  overflow-x: auto;
  background: var(--c-terminal);
  color: var(--c-terminal-text);
}
.err {
  color: var(--c-wrong);
}
.note {
  margin: 0;
  color: var(--c-text-2);
  font-size: 0.9rem;
}
</style>
