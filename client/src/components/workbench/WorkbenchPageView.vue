<script>
import EmptyState from "../ui/EmptyState.vue";
import LoadingState from "../ui/LoadingState.vue";
import WorkbenchApplicationsModal from "./WorkbenchApplicationsModal.vue";
import WorkbenchBountyCard from "./WorkbenchBountyCard.vue";
import WorkbenchEditRecruitModal from "./WorkbenchEditRecruitModal.vue";
import WorkbenchRatingModal from "./WorkbenchRatingModal.vue";
import WorkbenchHeaderTabs from "./WorkbenchHeaderTabs.vue";
import WorkbenchDeleteConfirmModal from "./WorkbenchDeleteConfirmModal.vue";
import { useWorkbenchPage } from "../../utils/composables/useWorkbenchPage.js";

export default {
  name: "WorkbenchPageView",
  components: {
    EmptyState,
    LoadingState,
    WorkbenchApplicationsModal,
    WorkbenchBountyCard,
    WorkbenchEditRecruitModal,
    WorkbenchRatingModal,
    WorkbenchHeaderTabs,
    WorkbenchDeleteConfirmModal,
  },
  setup() {
    return useWorkbenchPage();
  },
};
</script>

<template>
  <section class="workbench-page">
    <header class="workbench-header surface-toolbar">
      <div>
        <h1>工作台</h1>
        <p>对发布和接取的悬赏进行管理</p>
      </div>
      <div class="workbench-stats">
        <span class="glass-tag">待审核 {{ stats.pendingReviewCount || 0 }}</span>
        <span class="glass-tag">待评价 {{ stats.pendingRatingCount || 0 }}</span>
      </div>
    </header>

    <WorkbenchHeaderTabs
      :tab-items="tabItems"
      :active-tab="activeTab"
      @switch="switchTab"
    />

    <LoadingState v-if="loading" text="正在加载工作台数据..." />

    <section v-else class="workbench-content">
      <EmptyState
        v-if="activeList.length === 0"
        title="暂无数据"
        description="当前分区没有可处理记录。"
      />

      <div v-else-if="activeTab === 'published'" class="workbench-grid">
        <WorkbenchBountyCard
          v-for="item in publishedItems"
          :key="item.id"
          :item="item"
          type="published"
          :deleting="deletingBountyId === item.id"
          :completing="completingBountyId === item.id"
          @view-applications="openApplications"
          @complete-acceptance="handleCompleteAcceptance"
          @edit="openEditRecruit"
          @delete="openDeleteConfirmModal"
          @open-chat="openConversation"
          @rate="openPublishedRating"
        />
      </div>

      <div v-else class="workbench-grid">
        <WorkbenchBountyCard
          v-for="item in acceptedItems"
          :key="item.id"
          :item="item"
          type="accepted"
          :submitting="submittingAcceptanceBountyId === item.id"
          @open-chat="openConversation"
          @submit-delivery="handleSubmitAccepted"
          @rate="openAcceptedRating"
        />
      </div>
    </section>
  </section>

  <WorkbenchApplicationsModal
    v-model="showApplicationsModal"
    :bounty="selectedPublishedItem"
    :loading="loadingApplications"
    :applications="applications"
    @open-chat="openConversation"
  />

  <WorkbenchRatingModal
    v-model="showRatingModal"
    :target="ratingTarget"
    :submitting="ratingSubmitting"
    :error-message="ratingErrorMessage"
    @submit="handleSubmitRating"
  />

  <WorkbenchEditRecruitModal
    v-model="showEditRecruitModal"
    :item="editRecruitTarget"
    :category-options="categoryOptions"
    :submitting="editRecruitSubmitting"
    :closing="closingBountyId === Number(editRecruitTarget?.id || 0)"
    :error-message="editRecruitErrorMessage"
    @submit="handleSubmitEditRecruit"
    @close-recruit="handleClosePublished"
  />

  <WorkbenchDeleteConfirmModal
    v-model="showDeleteConfirmModal"
    :target="deleteTarget"
    :deleting="deletingBountyId === Number(deleteTarget?.id || 0)"
    :error-message="deleteErrorMessage"
    @confirm="handleDeletePublished"
  />
</template>

<style scoped>
.workbench-page {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: var(--space-4);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.workbench-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.workbench-header h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.3vw, 1.9rem);
}

.workbench-header p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.workbench-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.workbench-content {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: var(--space-1);
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.workbench-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
  align-content: start;
}

@media (max-width: 900px) {
  .workbench-header {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .workbench-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .workbench-header {
    padding: 12px;
  }
}
</style>
