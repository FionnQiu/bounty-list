<script>
import BaseModal from "../ui/BaseModal.vue";
import EmptyState from "../ui/EmptyState.vue";
import LoadingState from "../ui/LoadingState.vue";
import ConversationThread from "./ConversationThread.vue";
import ConversationListPane from "./ConversationListPane.vue";
import { useMessagesPage } from "../../utils/composables/useMessagesPage.js";

export default {
  name: "MessagesPageView",
  components: {
    BaseModal,
    EmptyState,
    LoadingState,
    ConversationThread,
    ConversationListPane,
  },
  setup() {
    return useMessagesPage();
  },
};
</script>

<template>
  <section class="workspace workspace--messages messages-page">
    <ConversationListPane
      :loading="loading"
      :conversations="conversations"
      :selected-id="selectedId"
      :is-mobile="isMobile"
      :mobile-modal-visible="mobileModalVisible"
      @select="selectConversation"
    />

    <section v-if="!isMobile" class="panel panel--messages-detail messages-detail">
      <ConversationThread
        v-if="conversationDetail"
        :conversation="conversationDetail.conversation"
        :messages="threadMessages"
        :interaction="interaction"
        :loading-messages="loadingMessages"
        :message-draft="messageDraft"
        :sending="sending"
        :action-pending="actionPending"
        :current-user-id="authStore.state.user?.id"
        @update:message-draft="handleMessageDraftUpdate"
        @send-message="sendMessage"
        @apply="applyFromConversation"
        @review="reviewFromConversation"
      />

      <EmptyState v-else title="选择一条会话" description="接取悬赏后会自动生成对应对话。" />
    </section>

    <BaseModal
      v-if="isMobile"
      v-model="mobileModalVisible"
      aria-label="会话窗口"
      width="100vw"
      :full-screen-on-mobile="true"
    >
      <div class="messages-mobile-modal">
        <ConversationThread
          v-if="conversationDetail"
          :conversation="conversationDetail.conversation"
          :messages="threadMessages"
          :interaction="interaction"
          :loading-messages="loadingMessages"
          :message-draft="messageDraft"
          :sending="sending"
          :action-pending="actionPending"
          :current-user-id="authStore.state.user?.id"
          :mobile-mode="true"
          @update:message-draft="handleMessageDraftUpdate"
          @send-message="sendMessage"
          @apply="applyFromConversation"
          @review="reviewFromConversation"
        />

        <LoadingState v-else-if="loadingMessages" text="正在加载消息..." />
        <EmptyState v-else title="会话加载失败" description="请返回列表重试。" />
      </div>
    </BaseModal>
  </section>
</template>

<style scoped>
.messages-page {
  height: 100%;
  min-height: 0;
  align-items: stretch;
}

.messages-detail {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.messages-page :deep(.panel--messages-detail) {
  padding: 12px;
}

.messages-mobile-modal {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.messages-mobile-modal :deep(.messages-thread) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .messages-page :deep(.panel--messages-detail) {
    padding: 10px;
  }

  .messages-page {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr);
    gap: var(--space-3);
    min-height: 0;
  }
}
</style>

