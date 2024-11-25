import '@/assets/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { backButton, init } from '@telegram-apps/sdk-vue';

init();

const app = createApp(App)

app.use(router)

backButton.mount()

app.mount('#app')
