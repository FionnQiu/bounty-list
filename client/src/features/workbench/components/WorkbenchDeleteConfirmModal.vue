<script setup>
import BaseModal from "../../../components/ui/BaseModal.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  target: { type: Object, default: null },
  deleting: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "confirm"]);

function closeModal() {
  if (props.deleting) {
    return;
  }
  emit("update:modelValue", false);
}

function handleConfirm() {
  emit("confirm");
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="确认删除招募"
    aria-label="删除招募确认弹窗"
    width="min(560px, 100%)"
    :close-on-mask="!deleting"
    :close-on-esc="!deleting"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @close="closeModal"
  >
    <div v-if="target" class="delete-confirm">
      <p class="delete-confirm__text">
        删除后将清理该招募的申请记录、对话会话与消息、互评信息，且不可恢复。
      </p>
      <p class="delete-confirm__target" :title="target.title">
        目标招募：{{ target.title }}
      </p>

      <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>

      <footer class="delete-confirm__actions">
        <button
          class="btn btn-outline"
          type="button"
          :disabled="deleting"
          @click="closeModal"
        >
          取消
        </button>
        <button
          class="primary-button delete-confirm__danger"
          type="button"
          :disabled="deleting"
          @click="handleConfirm"
        >
          {{ deleting ? "删除中..." : "确认删除" }}
        </button>
      </footer>
    </div>
  </BaseModal>
</template>

<style scoped>
.delete-confirm {
  display: grid;
  gap: var(--space-3);
}

.delete-confirm__text {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
}

.delete-confirm__target {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: rgba(20, 32, 51, 0.74);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.delete-confirm__danger {
  border-color: rgba(223, 94, 94, 0.46);
}

@media (max-width: 560px) {
  .delete-confirm__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .delete-confirm__actions .btn,
  .delete-confirm__actions .primary-button {
    width: 100%;
  }
}
</style>
