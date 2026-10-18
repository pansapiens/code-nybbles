import './styles/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { logError } from './services/error-log'
import './services/install'

const app = createApp(App)
app.config.errorHandler = (e) => {
  console.error(e)
  logError(e)
}
app.use(createPinia()).use(router).mount('#app')
