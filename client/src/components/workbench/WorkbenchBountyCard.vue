<script setup>
import { computed } from "vue";
import MoneyTag from "../ui/MoneyTag.vue";
import StatusTag from "../ui/StatusTag.vue";
import { formatDateCN } from "../../utils/datetime.js";

const props = defineProps({
  item: { type: Object, required: true },
  type: { type: String, default: "published" },
  deleting: { type: Boolean, default: false },
  completing: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
});

const emit = defineEmits([
  "view-applications",
  "edit",
  "delete",
  "open-chat",
  "complete-acceptance",
  "submit-delivery",
  "rate",
]);

const L = {
  uncategorized: "\u672a\u5206\u7c7b",
  publishedAt: "\u53d1\u5e03\u4e8e",
  pendingApplicationsPrefix: "\u5f85\u5904\u7406\u7533\u8bf7\uff1a",
  publisherPrefix: "\u53d1\u5e03\u8005\uff1a",
  unknownUser: "\u672a\u77e5\u7528\u6237",
  viewApplications: "\u67e5\u770b\u7533\u8bf7",
  editRecruit: "\u7f16\u8f91\u62db\u52df",
  completeAcceptance: "\u5b8c\u6210\u9a8c\u6536",
  processing: "\u5904\u7406\u4e2d...",
  deleteRecruit: "\u5220\u9664\u62db\u52df",
  deleting: "\u5220\u9664\u4e2d...",
  enterChat: "\u8fdb\u5165\u5bf9\u8bdd",
  chatUnavailable: "\u5bf9\u8bdd\u4e0d\u53ef\u7528",
  submitAcceptance: "\u63d0\u4ea4\u9a8c\u6536",
  submitting: "\u63d0\u4ea4\u4e2d...",
  submittedAcceptance: "\u5df2\u63d0\u4ea4\u9a8c\u6536",
  waitingAcceptance: "\u7b49\u5f85\u9a8c\u6536",
  noAction: "\u6682\u65e0\u64cd\u4f5c",
};

function openConversation(conversationId) {
  if (!conversationId) {
    return;
  }
  emit("open-chat", conversationId);
}

function createAction({ label, className, disabled, onClick }) {
  return {
    label,
    className,
    disabled: Boolean(disabled),
    onClick,
  };
}

const publishedConversationId = computed(() => Number(props.item?.acceptedApplicant?.conversationId || 0));
const acceptedConversationId = computed(() => Number(props.item?.conversationId || 0));

const publishedActions = computed(() => {
  const status = String(props.item?.status || "");
  if (status === "recruiting") {
    return [
      createAction({
        label: L.viewApplications,
        className: "btn btn-outline",
        disabled: false,
        onClick: () => emit("view-applications", props.item),
      }),
      createAction({
        label: L.editRecruit,
        className: "btn btn-outline",
        disabled: false,
        onClick: () => emit("edit", props.item),
      }),
    ];
  }

  if (status === "in_progress") {
    return [
      createAction({
        label: publishedConversationId.value > 0 ? L.enterChat : L.chatUnavailable,
        className: "btn btn-secondary",
        disabled: publishedConversationId.value <= 0,
        onClick: () => openConversation(publishedConversationId.value),
      }),
      createAction({
        label: L.completeAcceptance,
        className: "btn btn-primary",
        disabled: true,
        onClick: () => {},
      }),
    ];
  }

  if (status === "pending_confirm") {
    return [
      createAction({
        label:
          publishedConversationId.value > 0
            ? L.enterChat
            : L.chatUnavailable,
        className: "btn btn-secondary",
        disabled: publishedConversationId.value <= 0,
        onClick: () => openConversation(publishedConversationId.value),
      }),
      createAction({
        label: props.completing ? L.processing : L.completeAcceptance,
        className: "btn btn-primary",
        disabled: props.completing,
        onClick: () => emit("complete-acceptance", props.item),
      }),
    ];
  }

  if (status === "closed") {
    return [
      createAction({
        label: props.deleting ? L.deleting : L.deleteRecruit,
        className: "btn btn-secondary",
        disabled: props.deleting,
        onClick: () => emit("delete", props.item),
      }),
    ];
  }

  if (status === "completed") {
    return [
      createAction({
        label: props.item?.canRateAccepted ? "去评价" : "已评价",
        className: props.item?.canRateAccepted ? "primary-button" : "btn btn-secondary",
        disabled: !props.item?.canRateAccepted,
        onClick: () => emit("rate", props.item),
      }),
    ];
  }

  return [
    createAction({
      label: L.viewApplications,
      className: "btn btn-outline",
      disabled: false,
      onClick: () => emit("view-applications", props.item),
    }),
  ];
});

const acceptedActions = computed(() => {
  const status = String(props.item?.status || "");

  if (status === "in_progress") {
    return [
      createAction({
        label: acceptedConversationId.value > 0 ? L.enterChat : L.chatUnavailable,
        className: "btn btn-secondary",
        disabled: acceptedConversationId.value <= 0,
        onClick: () => openConversation(acceptedConversationId.value),
      }),
      createAction({
        label: props.submitting ? L.submitting : L.submitAcceptance,
        className: "primary-button",
        disabled: !props.item?.canSubmitForReview || props.submitting,
        onClick: () => emit("submit-delivery", props.item),
      }),
    ];
  }

  if (status === "pending_confirm") {
    return [
      createAction({
        label:
          acceptedConversationId.value > 0
            ? L.enterChat
            : L.chatUnavailable,
        className: "btn btn-secondary",
        disabled: acceptedConversationId.value <= 0,
        onClick: () => openConversation(acceptedConversationId.value),
      }),
      createAction({
        label: L.submittedAcceptance,
        className: "primary-button",
        disabled: true,
        onClick: () => {},
      }),
    ];
  }

  if (status === "completed") {
    return [
      createAction({
        label: props.item?.canRatePublisher ? "去评价" : "已评价",
        className: props.item?.canRatePublisher ? "primary-button" : "btn btn-secondary",
        disabled: !props.item?.canRatePublisher,
        onClick: () => emit("rate", props.item),
      }),
    ];
  }

  return [
    createAction({
      label: L.noAction,
      className: "btn btn-secondary",
      disabled: true,
      onClick: () => {},
    }),
  ];
});

const actions = computed(() => (props.type === "published" ? publishedActions.value : acceptedActions.value));
</script>

<template>
  <article class="workbench-card surface-card">
    <header class="workbench-card__head">
      <StatusTag :status="item.status" type="bounty" />
      <span class="glass-tag glass-tag--category workbench-card__category" :title="item.category?.name || L.uncategorized">
        {{ item.category?.name || L.uncategorized }}
      </span>
      <MoneyTag :amount="item.rewardAmount" size="sm" />
    </header>

    <h4 class="workbench-card__title" :title="item.title">{{ item.title }}</h4>
    <p class="workbench-card__meta">
      <span>{{ L.publishedAt }} {{ formatDateCN(item.createdAt) }}</span>
    </p>

    <p v-if="type === 'published'" class="workbench-card__summary">
      {{ L.pendingApplicationsPrefix }}{{ item.pendingApplications || 0 }}
    </p>
    <p v-else class="workbench-card__summary">
      {{ L.publisherPrefix }}{{ item.publisher?.username || L.unknownUser }}
    </p>

    <footer class="workbench-card__actions">
      <button
        v-for="(action, index) in actions"
        :key="`${item.id}-${type}-${index}`"
        :class="action.className"
        type="button"
        :disabled="action.disabled"
        @click="action.onClick"
      >
        {{ action.label }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.workbench-card {
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-2);
}

.workbench-card__head {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: var(--space-2);
}

.workbench-card__head :deep(.status-tag),
.workbench-card__head :deep(.money-tag),
.workbench-card__category {
  width: 100%;
  min-width: 0;
  justify-content: center;
}

.workbench-card__category {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-card__title {
  margin: 0;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workbench-card__meta {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
  font-size: 12px;
}

.workbench-card__meta span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workbench-card__summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.workbench-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

@media (max-width: 768px) {
  .workbench-card__meta {
    flex-wrap: wrap;
  }

  .workbench-card__actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .workbench-card__meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .workbench-card__actions button {
    width: 100%;
  }
}
</style>
