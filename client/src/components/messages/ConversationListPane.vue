<script setup>
import LoadingState from "../ui/LoadingState.vue";
import EmptyState from "../ui/EmptyState.vue";
import MoneyTag from "../ui/MoneyTag.vue";
import { getInitialChar } from "../../utils/text.js";

const props = defineProps({
  loading: { type: Boolean, default: false },
  conversations: { type: Array, default: () => [] },
  selectedId: { type: Number, default: 0 },
  isMobile: { type: Boolean, default: false },
  mobileModalVisible: { type: Boolean, default: false },
});

const emit = defineEmits(["select"]);

function getInitial(value) {
  return getInitialChar(value, "匿");
}

function handleSelect(id) {
  emit("select", id);
}
</script>

<template>
  <aside class="panel panel--conversations messages-conversations">
    <header class="surface-toolbar messages-toolbar">
      <h3>对话</h3>
      <span>{{ conversations.length }} 条</span>
    </header>

    <LoadingState v-if="loading" text="正在拉取会话..." />
    <EmptyState
      v-else-if="!conversations.length"
      title="暂无会话"
      description="先去悬赏广场接取一条悬赏，会自动创建对话。"
    />

    <div v-else class="conversation-list">
      <button
        v-for="item in conversations"
        :key="item.id"
        :class="['conversation-item', 'surface-card', 'surface-card--interactive', { 'is-active': item.id === selectedId }]"
        @click="handleSelect(item.id)"
      >
        <div class="conversation-item__top">
          <strong :title="item.bounty.title">{{ item.bounty.title }}</strong>
          <MoneyTag :amount="item.bounty.rewardAmount" size="sm" />
        </div>

        <div class="conversation-item__line">
          <img
            v-if="item.partner.avatarUrl"
            :src="item.partner.avatarUrl"
            :alt="item.partner.username"
            class="conversation-avatar"
          />
          <span v-else class="conversation-avatar-fallback">{{ getInitial(item.partner.username) }}</span>

          <div class="conversation-item__text">
            <span class="conversation-name">{{ item.partner.username }}</span>
            <small class="conversation-preview">{{ item.lastMessage || "刚创建，等待第一条消息。" }}</small>
          </div>
        </div>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.messages-conversations {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
}

.messages-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.messages-toolbar h3 {
  font-size: 1.06rem;
}

.messages-toolbar span {
  color: var(--text-muted);
  font-size: 12px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: var(--space-1);
  scrollbar-width: thin;
}

.conversation-item {
  padding: var(--space-4);
  min-height: 102px;
  text-align: left;
}

.conversation-item.is-active {
  border-color: rgba(120, 154, 255, 0.52);
  background: rgba(106, 141, 255, 0.2);
  box-shadow: 0 10px 22px rgba(4, 10, 20, 0.36);
}

.conversation-item__line {
  grid-template-columns: 32px minmax(0, 1fr);
}

.conversation-item__text {
  min-width: 0;
}

@media (max-width: 768px) {
  .messages-conversations {
    max-height: none;
    gap: 10px;
    min-height: 0;
  }

  .messages-toolbar {
    position: sticky;
    top: 0;
    z-index: 3;
    margin: -2px -2px 0;
    padding: 10px 12px;
    border-radius: calc(var(--radius-sm) + 2px);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .conversation-list {
    gap: 10px;
    max-height: none;
    overflow-y: auto;
    padding-right: 2px;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .conversation-item {
    min-height: 88px;
    padding: 12px;
    border-radius: calc(var(--radius-sm) + 2px);
  }
}
</style>

