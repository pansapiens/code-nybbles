/** "Install app" (plans/01 §4.3): the browser's prompt is held back until the learner has finished a lesson. */
import { ref } from 'vue'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
}

export const installEvent = ref<InstallPromptEvent>()

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installEvent.value = e as InstallPromptEvent
})
addEventListener('appinstalled', () => (installEvent.value = undefined))

export async function install() {
  await installEvent.value?.prompt()
  installEvent.value = undefined
}
