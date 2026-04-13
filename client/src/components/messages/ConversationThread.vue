<script setup>
import LoadingState from "../ui/LoadingState.vue";
import MoneyTag from "../ui/MoneyTag.vue";
import StatusTag from "../ui/StatusTag.vue";
import { formatApplicationStatusLabel } from "../../utils/bountyStatus.js";
import { formatDateTimeCN } from "../../utils/datetime.js";
import { getInitialChar } from "../../utils/text.js";

const props = defineProps({
  conversation: { type: Object, required: true },
  messages: { type: Array, default: () => [] },
  interaction: { type: Object, default: null },
  loadingMessages: { type: Boolean, default: false },
  messageDraft: { type: String, default: "" },
  sending: { type: Boolean, default: false },
  actionPending: { type: Boolean, default: false },
  actionSuccessMessage: { type: String, default: "" },
  actionErrorMessage: { type: String, default: "" },
  currentUserId: { type: [Number, String], default: null },
  mobileMode: { type: Boolean, default: false },
});

const emit = defineEmits(["update:messageDraft", "send-message", "apply", "review"]);

function getInitial(value) {
  return getInitialChar(value, "私");
}

function updateDraft(event) {
  emit("update:messageDraft", event.target.value);
}
</script>

<template>
  <div :class="['messages-thread', { 'messages-thread--mobile': mobileMode }]">
    <header class="messages-thread__head surface-toolbar">
      <div>
        <p class="page-head__eyebrow">当前悬赏</p>
        <h3>{{ conversation.bounty.title }}</h3>
      </div>
      <div class="messages-thread__meta">
        <StatusTag :status="conversation.bounty.status" type="bounty" />
        <MoneyTag :amount="conversation.bounty.rewardAmount" size="sm" />
      </div>
    </header>

    <section v-if="interaction" class="messages-thread__interaction surface-card">
      <div class="interaction-main">
        <div class="interaction-copy">
          <p class="interaction-title">
            {{ interaction.viewerRole === "publisher" ? "接取审核" : "接取申请" }}
          </p>
          <p v-if="interaction.application" class="interaction-hint">
            当前申请状态：{{ formatApplicationStatusLabel(interaction.application.status) }}
          </p>
          <p v-else class="interaction-hint">当前会话还没有申请记录。</p>
        </div>

        <button
          v-if="interaction.viewerRole === 'applicant'"
          class="primary-button"
          type="button"
          :disabled="actionPending || !interaction.canApply"
          @click="emit('apply')"
        >
          {{ actionPending ? "提交中..." : interaction.canApply ? "申请接取" : "已提交申请" }}
        </button>

        <div v-else class="interaction-actions">
          <button
            class="btn btn-outline"
            type="button"
            :disabled="actionPending || !interaction.canAccept"
            @click="emit('review', 'rejected')"
          >
            {{ actionPending ? "处理中..." : "拒绝接取" }}
          </button>
          <button
            class="primary-button"
            type="button"
            :disabled="actionPending || !interaction.canAccept"
            @click="emit('review', 'accepted')"
          >
            {{ actionPending ? "处理中..." : interaction.canAccept ? "同意接取" : "暂无可同意申请" }}
          </button>
        </div>
      </div>

      <p v-if="actionSuccessMessage" class="feedback feedback--success">{{ actionSuccessMessage }}</p>
      <p v-if="actionErrorMessage" class="feedback feedback--error">{{ actionErrorMessage }}</p>
    </section>

    <LoadingState v-if="loadingMessages" text="正在加载消息..." />

    <div v-else class="messages-thread__body">
      <article
        v-for="message in messages"
        :key="message.id"
        :class="['message-row', { 'message-row--self': message.senderId === currentUserId }]"
      >
        <img
          v-if="message.avatarUrl"
          :src="message.avatarUrl"
          :alt="message.senderUsername"
          class="message-avatar"
        />
        <span v-else class="message-avatar-fallback">{{ getInitial(message.senderUsername) }}</span>

        <div class="message-bubble">
          <p>{{ message.content }}</p>
          <small>{{ message.senderUsername }} · {{ formatDateTimeCN(message.createdAt) }}</small>
        </div>
      </article>
    </div>

    <footer class="messages-thread__composer surface-card">
      <textarea
        :value="messageDraft"
        rows="4"
        placeholder="继续沟通需求、时间安排和交付方式"
        @input="updateDraft"
      />
      <button class="primary-button" :disabled="sending" @click="emit('send-message')">
        {{ sending ? "发送中..." : "发送消息" }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.messages-thread {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.messages-thread__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.messages-thread__head h3 {
  font-size: clamp(1.08rem, 1.8vw, 1.24rem);
  line-height: 1.35;
}

.messages-thread__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.messages-thread__interaction {
  margin-top: var(--space-3);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.interaction-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.interaction-copy {
  min-width: 0;
}

.interaction-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.interaction-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.interaction-hint {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.messages-thread__body {
  margin-top: var(--space-4);
  margin-bottom: var(--space-4);
  padding-right: var(--space-1);
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.messages-thread__composer {
  border-radius: var(--radius-md);
  padding: var(--space-3);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.messages-thread__composer textarea {
  height: 140px;
  min-height: 140px;
  max-height: 140px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  padding-right: 132px;
  padding-bottom: 58px;
  resize: none;
  color: var(--text-primary);
  background: rgba(16, 25, 40, 0.92);
}

.messages-thread__composer textarea::placeholder {
  color: #7f94b8;
}

.messages-thread__composer .primary-button {
  position: absolute;
  right: calc(var(--space-3) + 10px);
  bottom: calc(var(--space-3) + 10px);
  z-index: 2;
  min-width: 110px;
}

.messages-thread--mobile {
  padding: 56px 12px 12px;
  gap: var(--space-3);
}

.messages-thread--mobile .messages-thread__head {
  padding-right: 46px;
}

.messages-thread--mobile .messages-thread__body {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 900px) {
  .interaction-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .interaction-actions {
    width: 100%;
  }

  .interaction-actions .btn,
  .interaction-actions .primary-button {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .messages-thread__head {
    flex-direction: column;
  }

  .messages-thread__meta {
    width: 100%;
  }

  .messages-thread__composer textarea {
    height: 148px;
    min-height: 148px;
    max-height: 148px;
  }
}

@media (max-width: 560px) {
  .messages-thread--mobile {
    padding: 56px 10px 10px;
  }

  .messages-thread__interaction {
    padding: 12px;
  }

  .messages-thread__composer textarea {
    padding-right: 12px;
    padding-bottom: 58px;
  }

  .messages-thread__composer .primary-button {
    left: calc(var(--space-3) + 8px);
    right: calc(var(--space-3) + 8px);
    width: auto;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .messages-thread__composer .primary-button,
  .interaction-actions .btn,
  .interaction-actions .primary-button {
    transition: none;
  }
}
</style>
