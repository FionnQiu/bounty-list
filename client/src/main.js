import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { authStore } from './store/auth.js';
import './styles.css';

async function bootstrap() {
  await authStore.bootstrap();
  const app = createApp(App);
  app.use(router);
  await router.isReady();
  app.mount('#app');
}

bootstrap();
