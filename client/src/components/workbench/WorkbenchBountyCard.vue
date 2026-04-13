<script setup>
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

const emit = defineEmits(["view-applications", "edit", "delete", "open-chat", "complete-acceptance", "submit-delivery"]);

function openConversation(conversationId) {
  if (!conversationId) {
    return;
  }
  emit("open-chat", conversationId);
}
</script>

<template>
  <article class="workbench-card surface-card">
    <header class="workbench-card__head">
      <StatusTag :status="item.status" type="bounty" />
      <MoneyTag :amount="item.rewardAmount" size="sm" />
    </header>

    <h4 class="workbench-card__title" :title="item.title">{{ item.title }}</h4>
    <p class="workbench-card__meta">
      <span>{{ item.category?.name || "未分类" }}</span>
      <span>发布于 {{ formatDateCN(item.createdAt) }}</span>
    </p>

    <p v-if="type === 'published'" class="workbench-card__summary">
      待处理申请：{{ item.pendingApplications || 0 }}
    </p>
    <p v-else class="workbench-card__summary">
      发布者：{{ item.publisher?.username || "未知用户" }}
    </p>

    <footer class="workbench-card__actions">
      <template v-if="type === 'published'">
        <button class="btn btn-outline" type="button" @click="emit('view-applications', item)">
          查看申请
        </button>

        <button
          v-if="item.status === 'pending_confirm'"
          class="btn btn-primary"
          type="button"
          :disabled="completing"
          @click="emit('complete-acceptance', item)"
        >
          {{ completing ? "处理中..." : "完成验收" }}
        </button>

        <button
          v-if="item.status === 'completed' || item.status === 'closed'"
          class="btn btn-secondary"
          type="button"
          :disabled="deleting"
          @click="emit('delete', item)"
        >
          {{ deleting ? "删除中..." : "删除招募" }}
        </button>

        <button
          v-if="item.status === 'recruiting'"
          class="btn btn-outline"
          type="button"
          @click="emit('edit', item)"
        >
          编辑招募
        </button>

        <button
          v-if="
            item.acceptedApplicant?.conversationId &&
            item.status !== 'completed' &&
            item.status !== 'closed'
          "
          class="btn btn-secondary"
          type="button"
          @click="openConversation(item.acceptedApplicant.conversationId)"
        >
          进入私信
        </button>
      </template>

      <template v-else>
        <button
          v-if="item.conversationId"
          class="btn btn-secondary"
          type="button"
          @click="openConversation(item.conversationId)"
        >
          进入私信
        </button>

        <button
          class="primary-button"
          type="button"
          :disabled="!item.canSubmitForReview || submitting"
          @click="emit('submit-delivery', item)"
        >
          {{ submitting ? "提交中..." : "提交悬赏" }}
        </button>
      </template>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
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
  .workbench-card__actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
