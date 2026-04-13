<script setup>
import { reactive, watch } from "vue";
import AppSelect from "../ui/AppSelect.vue";
import BaseModal from "../ui/BaseModal.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  item: { type: Object, default: null },
  categoryOptions: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
  closing: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "submit", "close-recruit"]);

const form = reactive({
  title: "",
  description: "",
  rewardAmount: "",
  categoryId: "",
});

watch(
  () => [props.modelValue, props.item?.id],
  ([visible]) => {
    if (!visible || !props.item) {
      return;
    }

    form.title = props.item.title || "";
    form.description = props.item.description || "";
    form.rewardAmount = props.item.rewardAmount ?? "";
    form.categoryId = String(props.item.category?.id ?? "");
  },
  { immediate: true },
);

function closeModal() {
  emit("update:modelValue", false);
}

function submitForm() {
  emit("submit", {
    id: props.item?.id,
    title: form.title,
    description: form.description,
    rewardAmount: form.rewardAmount,
    categoryId: form.categoryId,
  });
}

function closeRecruit() {
  if (!props.item) {
    return;
  }
  emit("close-recruit", props.item);
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="编辑招募"
    aria-label="编辑招募弹窗"
    width="min(760px, 100%)"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <template v-if="item">
      <p class="edit-modal__intro">可修改标题、赏金、分类和任务说明，保存后即时生效。</p>

      <form class="edit-modal__form" @submit.prevent="submitForm">
        <div class="edit-modal__grid">
          <label class="edit-modal__field edit-modal__field--full">
            <span>标题</span>
            <input v-model="form.title" class="form-input" type="text" maxlength="160" placeholder="请输入悬赏标题" required />
          </label>

          <label class="edit-modal__field">
            <span>赏金（￥）</span>
            <input
              v-model="form.rewardAmount"
              class="form-input"
              type="number"
              min="1"
              step="0.01"
              placeholder="请输入赏金"
              required
            />
          </label>

          <label class="edit-modal__field">
            <span>分类</span>
            <AppSelect v-model="form.categoryId" :options="categoryOptions" placeholder="选择分类" />
          </label>

          <label class="edit-modal__field edit-modal__field--full">
            <span>任务说明</span>
            <textarea
              v-model="form.description"
              class="form-input"
              rows="5"
              placeholder="请描述任务要求和交付标准"
              required
            />
          </label>
        </div>

        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>

        <footer class="edit-modal__actions">
          <button
            v-if="item.status === 'recruiting'"
            class="btn btn-secondary"
            type="button"
            :disabled="closing || submitting"
            @click="closeRecruit"
          >
            {{ closing ? "关闭中..." : "关闭招募" }}
          </button>
          <button class="btn btn-outline" type="button" :disabled="submitting || closing" @click="closeModal">取消</button>
          <button class="primary-button" type="submit" :disabled="submitting || closing">
            {{ submitting ? "保存中..." : "保存修改" }}
          </button>
        </footer>
      </form>
    </template>
  </BaseModal>
</template>

<style scoped>
.edit-modal__intro {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.edit-modal__form {
  display: grid;
  gap: var(--space-3);
}

.edit-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.edit-modal__field {
  display: grid;
  gap: var(--space-2);
}

.edit-modal__field > span {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.edit-modal__field--full {
  grid-column: 1 / -1;
}

.edit-modal__field textarea {
  min-height: 120px;
  resize: vertical;
}

.edit-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .edit-modal__grid {
    grid-template-columns: 1fr;
  }

  .edit-modal__actions {
    justify-content: flex-start;
    flex-direction: column;
    align-items: stretch;
  }

  .edit-modal__actions .btn,
  .edit-modal__actions .primary-button {
    width: 100%;
  }
}
</style>
