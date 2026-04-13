<script>
import BaseModal from "../../../components/ui/BaseModal.vue";
import EmptyState from "../../../components/ui/EmptyState.vue";
import LoadingState from "../../../components/ui/LoadingState.vue";
import ConversationThread from "../../../components/messages/ConversationThread.vue";
import ConversationListPane from "./ConversationListPane.vue";
import { useMessagesPage } from "../composables/useMessagesPage.js";

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
      :error-message="errorMessage"
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
        :action-success-message="actionSuccessMessage"
        :action-error-message="actionErrorMessage"
        :current-user-id="authStore.state.user?.id"
        @update:message-draft="handleMessageDraftUpdate"
        @send-message="sendMessage"
        @apply="applyFromConversation"
        @review="reviewFromConversation"
      />

      <EmptyState v-else title="选择一条会话" description="接取悬赏后会自动生成对应对话。" />

      <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
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
          :action-success-message="actionSuccessMessage"
          :action-error-message="actionErrorMessage"
          :current-user-id="authStore.state.user?.id"
          :mobile-mode="true"
          @update:message-draft="handleMessageDraftUpdate"
          @send-message="sendMessage"
          @apply="applyFromConversation"
          @review="reviewFromConversation"
        />

        <LoadingState v-else-if="loadingMessages" text="正在加载消息..." />
        <EmptyState v-else title="会话加载失败" description="请返回列表重试。" />

        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      </div>
    </BaseModal>
  </section>
</template>

<style scoped>
.messages-page {
  align-items: stretch;
}

.messages-detail {
  display: flex;
  flex-direction: column;
  min-height: 0;
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

.messages-mobile-modal .feedback {
  margin: 0 12px 10px;
}

@media (max-width: 768px) {
  .messages-page {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr);
    gap: var(--space-3);
    min-height: 0;
  }
}
</style>

