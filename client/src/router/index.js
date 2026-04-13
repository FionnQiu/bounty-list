import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import BountiesPage from '../pages/BountiesPage.vue';
import BountyDetailPage from '../pages/BountyDetailPage.vue';
import MessagesPage from '../pages/MessagesPage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import WorkbenchPage from '../pages/WorkbenchPage.vue';
import { authStore } from '../store/auth.js';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/bounties' },
    {
      path: '/login',
      component: LoginPage,
      meta: { public: true, layout: 'public', transition: 'route-fade', transitionKey: '/login' }
    },
    { path: '/bounties', component: BountiesPage, meta: { layout: 'app', transition: 'route-fade' } },
    { path: '/bounties/:id', component: BountyDetailPage, meta: { layout: 'app', transition: 'route-fade' } },
    { path: '/workbench', component: WorkbenchPage, meta: { layout: 'app', transition: 'route-fade' } },
    {
      path: '/messages/:id?',
      component: MessagesPage,
      meta: { layout: 'app', transition: 'route-fade', transitionKey: '/messages' }
    },
    { path: '/profile', component: ProfilePage, meta: { layout: 'app', transition: 'route-fade' } }
  ]
});

router.beforeEach((to) => {
  if (!authStore.state.ready) {
    return true;
  }

  if (!to.meta.public && !authStore.state.token) {
    return '/login';
  }

  if (to.path === '/login' && authStore.state.token) {
    return '/bounties';
  }

  return true;
});

export default router;
