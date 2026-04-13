<script setup>
import BaseModal from "../ui/BaseModal.vue";
import EmptyState from "../ui/EmptyState.vue";
import LoadingState from "../ui/LoadingState.vue";
import StatusTag from "../ui/StatusTag.vue";
import { formatDateTimeCN } from "../../utils/datetime.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bounty: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  applications: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue", "open-chat"]);

function closeModal() {
  emit("update:modelValue", false);
}

</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="申请审核"
    aria-label="申请审核弹窗"
    width="min(860px, 100%)"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <template v-if="bounty">
      <p class="apps-modal__intro">当前悬赏：{{ bounty.title }}</p>

      <LoadingState v-if="loading" text="正在加载申请列表..." />

      <EmptyState
        v-else-if="!applications.length"
        title="暂无申请"
        description="当前还没有人提交接取申请。"
      />

      <div v-else class="apps-modal__list">
        <article v-for="item in applications" :key="item.id" class="apps-item surface-card">
          <header class="apps-item__head">
            <div class="apps-item__identity">
              <img
                v-if="item.applicantAvatarUrl"
                :src="item.applicantAvatarUrl"
                :alt="item.applicantUsername"
                class="apps-item__avatar"
              />
              <span v-else class="apps-item__avatar-fallback">{{ item.applicantUsername?.slice(0, 1) || "用" }}</span>
              <div>
                <strong>{{ item.applicantUsername }}</strong>
                <small>{{ formatDateTimeCN(item.createdAt) }}</small>
              </div>
            </div>
            <StatusTag :status="item.status" type="application" />
          </header>

          <p class="apps-item__message">{{ item.message }}</p>

          <footer class="apps-item__actions">
            <button
              v-if="item.conversationId"
              class="btn btn-secondary"
              type="button"
              @click="emit('open-chat', item.conversationId)"
            >
              进入对话
            </button>
          </footer>
        </article>
      </div>

      <div class="apps-modal__footer">
        <button class="btn btn-outline" type="button" @click="closeModal">关闭</button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.apps-modal__intro {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.apps-modal__list {
  display: grid;
  gap: var(--space-3);
  max-height: min(56dvh, 520px);
  overflow: auto;
  padding-right: var(--space-1);
}

.apps-item {
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.apps-item__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  align-items: center;
}

.apps-item__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.apps-item__avatar,
.apps-item__avatar-fallback {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.apps-item__avatar {
  object-fit: cover;
  border: 1px solid var(--line-soft);
}

.apps-item__avatar-fallback {
  border: 1px solid var(--line-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 40, 63, 0.94);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.apps-item__identity strong,
.apps-item__identity small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.apps-item__identity small {
  color: var(--text-muted);
  margin-top: 2px;
  font-size: 12px;
}

.apps-item__message {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.apps-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.apps-modal__footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 560px) {
  .apps-modal__list {
    max-height: min(50dvh, 420px);
  }

  .apps-item__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .apps-item__actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .apps-item__actions .btn,
  .apps-item__actions .primary-button {
    width: 100%;
  }

  .apps-modal__footer {
    justify-content: stretch;
  }

  .apps-modal__footer .btn {
    width: 100%;
  }
}
</style>
