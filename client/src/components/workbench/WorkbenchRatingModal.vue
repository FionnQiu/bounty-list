<script setup>
import { reactive, watch } from "vue";
import AppSelect from "../ui/AppSelect.vue";
import BaseModal from "../ui/BaseModal.vue";
import MoneyTag from "../ui/MoneyTag.vue";
import StatusTag from "../ui/StatusTag.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  target: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "submit"]);

const form = reactive({
  score: "5",
  comment: "",
});

const scoreOptions = [
  { value: "5", label: "5 分（非常满意）" },
  { value: "4", label: "4 分（满意）" },
  { value: "3", label: "3 分（一般）" },
  { value: "2", label: "2 分（不太满意）" },
  { value: "1", label: "1 分（较差）" },
];

watch(
  () => [props.modelValue, props.target?.bounty?.id, props.target?.role],
  ([visible]) => {
    if (visible) {
      form.score = "5";
      form.comment = "";
    }
  },
  { immediate: true },
);

function closeModal() {
  emit("update:modelValue", false);
}

function submitRating() {
  if (!props.target?.bounty?.id || !props.target?.targetUser?.id) {
    return;
  }

  emit("submit", {
    bountyId: props.target.bounty.id,
    targetUserId: props.target.targetUser.id,
    score: Number(form.score),
    comment: form.comment,
  });
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="提交互评"
    aria-label="互评弹窗"
    width="min(640px, 100%)"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <template v-if="target">
      <header class="rating-modal__head">
        <div>
          <h4>{{ target.bounty.title }}</h4>
          <p>评价对象：{{ target.targetUser.username }}</p>
        </div>
        <div class="rating-modal__meta">
          <StatusTag :status="target.bounty.status" type="bounty" />
          <MoneyTag :amount="target.bounty.rewardAmount" size="sm" />
        </div>
      </header>

      <form class="rating-modal__form" @submit.prevent="submitRating">
        <label>
          <span>评分</span>
          <AppSelect
            v-model="form.score"
            class="rating-modal__score-select"
            :options="scoreOptions"
            placeholder="请选择评分"
          />
        </label>

        <label>
          <span>评语（可选）</span>
          <textarea
            v-model="form.comment"
            class="form-input"
            rows="4"
            maxlength="200"
            placeholder="描述协作体验与交付质量（最多 200 字）"
          />
        </label>

        <p class="rating-modal__hint">{{ form.comment.length }}/200</p>

        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>

        <footer class="rating-modal__actions">
          <button class="btn btn-outline" type="button" @click="closeModal">取消</button>
          <button class="primary-button" type="submit" :disabled="submitting">
            {{ submitting ? "提交中..." : "提交评价" }}
          </button>
        </footer>
      </form>
    </template>
  </BaseModal>
</template>

<style scoped>
.rating-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.rating-modal__head h4 {
  margin: 0;
  font-size: 1.12rem;
}

.rating-modal__head p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.rating-modal__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.rating-modal__form {
  display: grid;
  gap: var(--space-3);
}

.rating-modal__form label {
  display: grid;
  gap: var(--space-2);
}

.rating-modal__form label > span {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.rating-modal__score-select {
  width: 100%;
}

.rating-modal__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  text-align: right;
}

.rating-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 768px) {
  .rating-modal__head {
    flex-direction: column;
  }

  .rating-modal__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .rating-modal__actions .btn,
  .rating-modal__actions .primary-button {
    width: 100%;
  }
}
</style>
