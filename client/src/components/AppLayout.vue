<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authStore } from "../store/auth.js";
import { getInitialChar } from "../utils/text.js";

const route = useRoute();
const router = useRouter();

const user = computed(() => authStore.state.user);

const dockLinks = [
  { to: "/bounties", label: "悬赏广场" },
  { to: "/workbench", label: "工作台" },
  { to: "/messages", label: "对话" },
  { to: "/profile", label: "个人中心" },
];

const currentLabel = computed(() => {
  if (route.path.startsWith("/bounties/")) return "悬赏详情";
  if (route.path.startsWith("/workbench")) return "工作台";
  if (route.path.startsWith("/messages")) return "对话";
  if (route.path.startsWith("/profile")) return "个人中心";
  return "悬赏广场";
});

function isDockLinkActive(path) {
  if (path === "/bounties") {
    return route.path === "/bounties" || route.path.startsWith("/bounties/");
  }

  if (path === "/messages") {
    return route.path === "/messages" || route.path.startsWith("/messages/");
  }

  if (path === "/workbench") {
    return route.path === "/workbench" || route.path.startsWith("/workbench/");
  }

  if (path === "/profile") {
    return route.path === "/profile" || route.path.startsWith("/profile/");
  }

  return route.path === path;
}

function logout() {
  authStore.clearSession();
  router.push("/login");
}

const userInitial = computed(() => getInitialChar(user.value?.username, "我"));
</script>

<template>
  <div class="app-shell">
    <header class="top-dock-wrap">
      <div class="top-dock">
        <RouterLink to="/bounties" class="top-dock__brand">
          <span class="top-dock__brand-mark">悬赏榜</span>
          <small>{{ currentLabel }}</small>
        </RouterLink>

        <nav class="top-dock__nav" aria-label="主导航">
          <RouterLink
            v-for="link in dockLinks"
            :key="link.to"
            :to="link.to"
            :class="['dock-link', { 'is-active': isDockLinkActive(link.to) }]"
            :aria-current="isDockLinkActive(link.to) ? 'page' : undefined"
          >
            <strong>{{ link.label }}</strong>
          </RouterLink>
        </nav>

        <div class="top-dock__user">
          <img v-if="user?.avatarUrl" :src="user.avatarUrl" :alt="user?.username" class="avatar avatar--small" />
          <span v-else class="avatar-fallback avatar-fallback--small">{{ userInitial }}</span>
          <div class="top-dock__user-meta">
            <strong>{{ user?.username || '未登录用户' }}</strong>
            <span>{{ user?.email || user?.phone || '暂无联系方式' }}</span>
          </div>
          <button class="ghost-button ghost-button--tight" @click="logout">退出</button>
        </div>
      </div>
    </header>

    <main class="app-stage">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.avatar-fallback {
  border: 1px solid var(--line-soft);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-weight: 700;
}

.avatar-fallback--small {
  width: 34px;
  height: 34px;
  font-size: 12px;
}
</style>
