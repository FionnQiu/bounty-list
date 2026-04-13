<script>
import AppSelect from "../../../components/ui/AppSelect.vue";
import BaseModal from "../../../components/ui/BaseModal.vue";
import EmptyState from "../../../components/ui/EmptyState.vue";
import LoadingState from "../../../components/ui/LoadingState.vue";
import MoneyTag from "../../../components/ui/MoneyTag.vue";
import StatusTag from "../../../components/ui/StatusTag.vue";
import { useBountiesPage } from "../composables/useBountiesPage.js";

export default {
  name: "BountiesPageView",
  components: {
    AppSelect,
    BaseModal,
    EmptyState,
    LoadingState,
    MoneyTag,
    StatusTag,
  },
  setup() {
    return useBountiesPage();
  },
};
</script>

<template>
  <div class="bounties-page">
    <header class="page-header mb-5">
      <h1>悬赏广场</h1>
      <p class="text-secondary">仅展示招募中的悬赏，点击卡片查看详情并可直接接取。</p>
    </header>

    <section class="filters card mb-5">
      <div class="filter-toolbar">
        <div class="filter-fields">
          <input v-model="filters.keyword" type="text" class="form-input filter-input" placeholder="搜索标题或描述" />

          <AppSelect
            v-model="filters.categoryId"
            :options="categories.map((item) => ({ value: item.id, label: item.name }))"
            placeholder="全部分类"
          />

          <AppSelect v-model="filters.sort" :options="sortOptions" placeholder="排序方式" />
        </div>

        <div class="filter-actions">
          <button class="btn btn-secondary" type="button" @click="resetFilters">重置</button>
          <button class="primary-button" type="button" @click="openCreateModal">发布悬赏</button>
        </div>
      </div>
    </section>

    <LoadingState v-if="loading" text="正在加载悬赏..." />
    <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>

    <EmptyState
      v-else-if="bounties.length === 0"
      title="暂无悬赏"
      description="当前没有处于招募中的任务。"
    />

    <section v-else class="bounties-list">
      <article
        v-for="bounty in bounties"
        :key="bounty.id"
        class="bounty-card"
        role="button"
        tabindex="0"
        @click.stop="openBountyModal(bounty)"
        @keydown.enter.prevent="openBountyModal(bounty)"
        @keydown.space.prevent="openBountyModal(bounty)"
      >
        <div class="card-head">
          <StatusTag :status="bounty.status" type="bounty" />
          <span class="glass-tag glass-tag--category card-category">{{ bounty.category?.name || "未分类" }}</span>
          <MoneyTag :amount="bounty.rewardAmount" size="md" />
        </div>

        <h3 class="title">{{ bounty.title }}</h3>
        <p class="summary">{{ bounty.description }}</p>

        <div class="publisher-line">
          <div class="publisher">
            <img
              v-if="bounty.publisher?.avatarUrl"
              :src="bounty.publisher.avatarUrl"
              :alt="bounty.publisher?.username"
              class="avatar small"
            />
            <span v-else class="avatar-fallback">{{ getPublisherInitial(bounty.publisher?.username) }}</span>
            <span class="publisher-name">{{ bounty.publisher?.username || "未知用户" }}</span>
          </div>
          <span class="time">{{ formatDateTimeCN(bounty.createdAt) }}</span>
        </div>
      </article>
    </section>
  </div>

    <BaseModal v-model="showCreateModal" title="发布新悬赏" aria-label="发布悬赏弹窗" width="min(820px, 100%)">
      <p class="text-secondary">补充清晰的任务说明和分类，便于接单人快速判断。</p>

      <form @submit.prevent="handleCreateBounty">
        <div class="create-grid">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input v-model="createForm.title" type="text" class="form-input" placeholder="例如：周末活动海报设计" required />
          </div>

          <div class="form-group">
            <label class="form-label">赏金</label>
            <input v-model="createForm.rewardAmount" type="number" class="form-input" min="1" placeholder="请输入金额" required />
          </div>

          <div class="form-group">
            <label class="form-label">分类</label>
            <AppSelect
              v-model="createForm.categoryId"
              :options="categories.map((item) => ({ value: item.id, label: item.name }))"
              placeholder="请选择分类"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">任务说明</label>
          <textarea
            v-model="createForm.description"
            class="form-input"
            rows="4"
            placeholder="请说明任务要求、交付标准和注意事项"
            required
          ></textarea>
        </div>

        <p v-if="errorMessage" class="error mb-4">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success mb-4">{{ successMessage }}</p>

        <div class="create-actions">
          <button type="submit" class="btn btn-primary" :disabled="createSubmitting">
            {{ createSubmitting ? "发布中..." : "确认发布" }}
          </button>
          <button type="button" class="btn btn-outline" @click="closeCreateModal({ reset: true })">取消</button>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      :model-value="Boolean(activeBounty)"
      title=""
      aria-label="悬赏详情"
      width="min(760px, 100%)"
      @update:model-value="(value) => !value && closeBountyModal()"
    >
      <template v-if="activeBounty">
        <header class="modal-header">
          <div class="modal-main">
            <StatusTag :status="activeBounty.status" type="bounty" />
            <h2>{{ activeBounty.title }}</h2>
          </div>
          <MoneyTag :amount="activeBounty.rewardAmount" size="lg" />
        </header>

        <div class="modal-grid">
          <div class="modal-item">
            <span>分类</span>
            <strong>{{ activeBounty.category?.name || "未分类" }}</strong>
          </div>
          <div class="modal-item">
            <span>发布时间</span>
            <strong>{{ formatDateTimeCN(activeBounty.createdAt) }}</strong>
          </div>
          <div class="modal-item">
            <span>发布者</span>
            <strong>{{ activeBounty.publisher?.username || "未知用户" }}</strong>
          </div>
        </div>

        <section class="modal-description">
          <h3>任务内容</h3>
          <p>{{ activeBounty.description }}</p>
        </section>

        <footer class="modal-actions">
          <p v-if="modalErrorMessage" class="error modal-error">{{ modalErrorMessage }}</p>
          <button class="primary-button" type="button" :disabled="applyingBounty" @click="handleTakeBounty">
            {{ applyingBounty ? "接取中..." : "接取悬赏" }}
          </button>
        </footer>
      </template>
    </BaseModal>
</template>

<style scoped>
.bounties-page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--top-dock-height) - var(--page-padding) - var(--page-padding));
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.bounties-page::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.page-header h1 {
  font-size: clamp(1.9rem, 2.6vw, 2.4rem);
}

.filters {
  padding: var(--space-4);
  position: relative;
  z-index: 70;
  overflow: visible;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  overflow: visible;
}

.filter-fields {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 200px 220px;
  gap: var(--space-3);
  overflow: visible;
}

.filter-input {
  height: 40px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.create-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.create-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.bounties-list {
  flex: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
  align-content: start;
  align-items: start;
  min-height: auto;
  overflow: visible;
  padding-right: 0;
  position: relative;
  z-index: 1;
}

.bounty-card {
  background: rgba(17, 27, 43, 0.84);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
  align-self: start;
  cursor: pointer;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition:
    transform var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    background-color var(--duration-fast) var(--ease-standard);
}

.bounty-card:hover {
  transform: translateY(-3px);
  border-color: rgba(120, 154, 255, 0.42);
  background: rgba(22, 34, 54, 0.9);
  box-shadow: var(--shadow-md);
}

.card-head {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: var(--space-3);
}

.card-head :deep(.status-tag),
.card-head :deep(.money-tag),
.card-category {
  width: 100%;
  min-width: 0;
  justify-content: center;
}

.title {
  margin: 0;
  font-size: 1.18rem;
  line-height: 1.35;
}

.summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-category {
  justify-self: stretch;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publisher-line {
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.publisher {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.avatar.small,
.avatar-fallback {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.avatar-fallback {
  border: 1px solid var(--line-soft);
  background: rgba(24, 37, 58, 0.96);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.publisher-name {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}

.modal-header :deep(.money-tag--lg) {
  margin-right: 46px;
  align-self: flex-start;
}

.modal-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.modal-main h2 {
  font-size: 1.55rem;
}

.modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  background: rgba(18, 29, 46, 0.86);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.modal-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.modal-item span {
  font-size: 12px;
  color: var(--text-muted);
}

.modal-item strong {
  font-size: 14px;
  color: var(--text-primary);
}

.modal-description {
  margin-top: var(--space-2);
}

.modal-description h3 {
  margin-bottom: var(--space-2);
  font-size: 1.15rem;
}

.modal-description p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
}

.modal-error {
  width: 100%;
  margin: 0;
}

@media (max-width: 1024px) {
  .filter-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-fields {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .filter-actions {
    width: 100%;
    justify-content: flex-end;
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .bounties-page {
    height: auto;
    min-height: calc(100dvh - var(--top-dock-height) - var(--page-padding) - var(--page-padding));
  }

  .create-grid,
  .modal-grid {
    grid-template-columns: 1fr;
  }

  .modal-header {
    flex-direction: column;
  }

  .modal-header :deep(.money-tag--lg) {
    margin-right: 0;
  }

  .filter-actions {
    width: 100%;
    margin-left: 0;
  }

  .filter-actions .btn,
  .filter-actions .primary-button {
    flex: 1;
    min-height: 42px;
  }
}

@media (max-width: 560px) {
  .bounties-list {
    grid-template-columns: 1fr;
  }

  .bounty-card {
    padding: 12px;
  }

  .card-head {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .card-category {
    max-width: 100%;
  }

  .publisher-line {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .filter-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions .btn,
  .filter-actions .primary-button {
    width: 100%;
    flex: none;
  }

  .modal-actions {
    align-items: stretch;
  }

  .modal-actions .primary-button {
    width: 100%;
  }
}
</style>

