<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getBounties, updateBounty } from "../api/bounties.js";
import BaseModal from "../components/ui/BaseModal.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import LoadingState from "../components/ui/LoadingState.vue";
import TopToast from "../components/ui/TopToast.vue";
import WorkbenchApplicationsModal from "../components/workbench/WorkbenchApplicationsModal.vue";
import WorkbenchBountyCard from "../components/workbench/WorkbenchBountyCard.vue";
import WorkbenchEditRecruitModal from "../components/workbench/WorkbenchEditRecruitModal.vue";
import WorkbenchRatingModal from "../components/workbench/WorkbenchRatingModal.vue";
import { useTransientToast } from "../composables/useTransientToast.js";
import { useWorkbench } from "../composables/useWorkbench.js";
import { formatDateCN } from "../utils/datetime.js";

const router = useRouter();

const activeTab = ref("published");
const showApplicationsModal = ref(false);
const selectedPublishedItem = ref(null);
const showRatingModal = ref(false);
const ratingTarget = ref(null);
const ratingErrorMessage = ref("");
const showEditRecruitModal = ref(false);
const editRecruitTarget = ref(null);
const editRecruitErrorMessage = ref("");
const editRecruitSubmitting = ref(false);
const categoryOptions = ref([]);
const showDeleteConfirmModal = ref(false);
const deleteTarget = ref(null);
const deleteErrorMessage = ref("");

const { message: toastMessage, showToast } = useTransientToast(2200);

const {
  loading,
  loadingApplications,
  reviewingKey,
  completingBountyId,
  submittingAcceptanceBountyId,
  closingBountyId,
  deletingBountyId,
  ratingSubmitting,
  errorMessage,
  publishedItems,
  acceptedItems,
  pendingRatings,
  stats,
  applications,
  loadOverview,
  loadPublishedApplications,
  reviewApplication,
  completePublishedBounty,
  submitAcceptanceRequest,
  closePublishedBounty,
  deletePublishedBounty,
  submitRating,
} = useWorkbench();

const tabItems = computed(() => [
  {
    key: "published",
    label: "我发布的",
    count: stats.value.publishedCount || publishedItems.value.length,
  },
  {
    key: "accepted",
    label: "我接取的",
    count: stats.value.acceptedCount || acceptedItems.value.length,
  },
  {
    key: "pending_ratings",
    label: "待评价",
    count: stats.value.pendingRatingCount || pendingRatings.value.length,
  },
]);

const activeList = computed(() => {
  if (activeTab.value === "published") {
    return publishedItems.value;
  }

  if (activeTab.value === "accepted") {
    return acceptedItems.value;
  }

  return pendingRatings.value;
});

function openConversation(conversationId) {
  const id = Number(conversationId || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  router.push(`/messages/${id}`);
}

function switchTab(tabKey) {
  activeTab.value = tabKey;
}

function normalizeCategoryOptions(categories = []) {
  return categories
    .map((item) => ({
      value: String(item?.id ?? ""),
      label: String(item?.name ?? ""),
    }))
    .filter((item) => item.value && item.label);
}

function ensureCategoryOption(category) {
  const value = String(category?.id ?? "");
  const label = String(category?.name ?? "");
  if (!value || !label) {
    return;
  }

  const exists = categoryOptions.value.some((item) => item.value === value);
  if (!exists) {
    categoryOptions.value.push({ value, label });
  }
}

async function loadCategoryOptions() {
  try {
    const data = await getBounties({ pageSize: 1, sort: "latest", status: "recruiting" });
    categoryOptions.value = normalizeCategoryOptions(data?.categories || []);
  } catch {
    categoryOptions.value = [];
  }
}

async function openApplications(item) {
  selectedPublishedItem.value = item;
  showApplicationsModal.value = true;

  try {
    await loadPublishedApplications(item.id);
  } catch {
    // Error is surfaced by composable.
  }
}

function closeApplicationsModal() {
  showApplicationsModal.value = false;
  selectedPublishedItem.value = null;
}

async function handleReviewApplication({ application, decision }) {
  if (!selectedPublishedItem.value) {
    return;
  }

  try {
    await reviewApplication({
      bountyId: selectedPublishedItem.value.id,
      applicationId: application.id,
      decision,
    });

    showToast(decision === "accepted" ? "已同意接取申请。" : "已拒绝该申请。");
  } catch {
    // Error message handled by composable.
  }
}

async function handleClosePublished(item) {
  const target = item || editRecruitTarget.value;
  if (!target) {
    return;
  }

  try {
    await closePublishedBounty(target.id);
    showToast("已关闭招募。", 2000);
    if (Number(editRecruitTarget.value?.id || 0) === Number(target.id || 0)) {
      closeEditRecruitModal();
    }
  } catch {
    // Error message handled by composable.
  }
}

async function handleCompleteAcceptance(item) {
  if (!item) {
    return;
  }

  try {
    await completePublishedBounty(item.id);
    showToast("验收已完成，悬赏状态已更新为已完成。", 2200);
  } catch {
    // Error message handled by composable.
  }
}

async function handleSubmitAccepted(item) {
  if (!item) {
    return;
  }

  try {
    await submitAcceptanceRequest(item.id);
    showToast("已提交验收申请，等待发布者确认。", 2200);
  } catch {
    // Error message handled by composable.
  }
}

function openDeleteConfirmModal(item) {
  const target = item || editRecruitTarget.value;
  if (!target) {
    return;
  }

  deleteTarget.value = target;
  deleteErrorMessage.value = "";
  showDeleteConfirmModal.value = true;
}

function closeDeleteConfirmModal() {
  if (deletingBountyId.value) {
    return;
  }

  showDeleteConfirmModal.value = false;
  deleteTarget.value = null;
  deleteErrorMessage.value = "";
}

async function handleDeletePublished() {
  const target = deleteTarget.value;
  if (!target) {
    return;
  }

  try {
    await deletePublishedBounty(target.id);
    showToast("招募已删除。", 2000);

    if (Number(editRecruitTarget.value?.id || 0) === Number(target.id || 0)) {
      closeEditRecruitModal();
    }

    closeDeleteConfirmModal();
  } catch {
    deleteErrorMessage.value = errorMessage.value || "删除招募失败，请稍后重试。";
  }
}

function openEditRecruit(item) {
  ensureCategoryOption(item?.category);
  editRecruitTarget.value = item;
  editRecruitErrorMessage.value = "";
  showEditRecruitModal.value = true;
}

function closeEditRecruitModal() {
  showEditRecruitModal.value = false;
  editRecruitTarget.value = null;
  editRecruitErrorMessage.value = "";
}

async function handleSubmitEditRecruit(payload) {
  editRecruitErrorMessage.value = "";

  const bountyId = Number(payload?.id || 0);
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const rewardAmount = Number(payload?.rewardAmount);
  const categoryId = Number(payload?.categoryId);

  if (!Number.isInteger(bountyId) || bountyId <= 0) {
    editRecruitErrorMessage.value = "悬赏参数不合法，请关闭后重试。";
    return;
  }

  if (!title || !description) {
    editRecruitErrorMessage.value = "请完整填写标题和任务说明。";
    return;
  }

  if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
    editRecruitErrorMessage.value = "赏金必须是大于 0 的数字。";
    return;
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    editRecruitErrorMessage.value = "请选择有效分类。";
    return;
  }

  editRecruitSubmitting.value = true;
  try {
    await updateBounty(bountyId, {
      title,
      description,
      rewardAmount,
      categoryId,
      status: "recruiting",
    });

    await loadOverview({ silent: true });
    showToast("招募信息已更新。", 2000);
    closeEditRecruitModal();
  } catch (error) {
    editRecruitErrorMessage.value = error.message || "更新招募失败，请稍后重试。";
  } finally {
    editRecruitSubmitting.value = false;
  }
}

function openRatingModal(target) {
  ratingErrorMessage.value = "";
  ratingTarget.value = target;
  showRatingModal.value = true;
}

function closeRatingModal() {
  showRatingModal.value = false;
  ratingTarget.value = null;
  ratingErrorMessage.value = "";
}

async function handleSubmitRating(payload) {
  ratingErrorMessage.value = "";

  try {
    await submitRating(payload);
    showToast("评价已提交。", 2200);
    closeRatingModal();
  } catch (error) {
    ratingErrorMessage.value = error.message || "提交评价失败，请稍后重试。";
  }
}

onMounted(() => {
  loadOverview();
  loadCategoryOptions();
});
</script>

<template>
    <section class="workbench-page">
      <header class="workbench-header surface-toolbar">
        <div>
          <h1>交易工作台</h1>
          <p>统一处理申请审核、任务验收与互评。</p>
        </div>
        <div class="workbench-stats">
          <span class="glass-tag">待审核 {{ stats.pendingReviewCount || 0 }}</span>
          <span class="glass-tag">待评价 {{ stats.pendingRatingCount || 0 }}</span>
        </div>
      </header>

      <nav class="workbench-tabs" role="tablist" aria-label="工作台分区">
        <button
          v-for="tab in tabItems"
          :key="tab.key"
          :class="['workbench-tab', { 'is-active': activeTab === tab.key }]"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="switchTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ tab.count }}</strong>
        </button>
      </nav>

      <LoadingState v-if="loading" text="正在加载工作台数据..." />
      <p v-else-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>

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
          />
        </div>

        <div v-else-if="activeTab === 'accepted'" class="workbench-grid">
          <WorkbenchBountyCard
            v-for="item in acceptedItems"
            :key="item.id"
            :item="item"
            type="accepted"
            :submitting="submittingAcceptanceBountyId === item.id"
            @open-chat="openConversation"
            @submit-delivery="handleSubmitAccepted"
          />
        </div>

        <div v-else class="rating-list">
          <article v-for="item in pendingRatings" :key="`${item.role}-${item.bounty.id}`" class="rating-row surface-card">
            <div class="rating-row__main">
              <h4 :title="item.bounty.title">{{ item.bounty.title }}</h4>
              <p>
                {{ item.role === "publisher" ? "待评价接取者" : "待评价发布者" }}：{{ item.targetUser.username }}
              </p>
              <small>结束时间：{{ formatDateCN(item.bounty.updatedAt || item.bounty.createdAt) }}</small>
            </div>
            <div class="rating-row__actions">
              <button
                v-if="item.conversationId"
                class="btn btn-secondary"
                type="button"
                @click="openConversation(item.conversationId)"
              >
                进入私信
              </button>
              <button class="primary-button" type="button" @click="openRatingModal(item)">去评价</button>
            </div>
          </article>
        </div>
      </section>
    </section>

    <WorkbenchApplicationsModal
      v-model="showApplicationsModal"
      :bounty="selectedPublishedItem"
      :loading="loadingApplications"
      :applications="applications"
      :reviewing-key="reviewingKey"
      @review="handleReviewApplication"
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

    <BaseModal
      v-model="showDeleteConfirmModal"
      title="确认删除招募"
      aria-label="删除招募确认弹窗"
      width="min(560px, 100%)"
      :close-on-mask="!deletingBountyId"
      :close-on-esc="!deletingBountyId"
      @close="closeDeleteConfirmModal"
    >
      <div v-if="deleteTarget" class="delete-confirm">
        <p class="delete-confirm__text">
          删除后将清理该招募的申请记录、私信会话与消息、互评信息，且不可恢复。
        </p>
        <p class="delete-confirm__target" :title="deleteTarget.title">
          目标招募：{{ deleteTarget.title }}
        </p>

        <p v-if="deleteErrorMessage" class="feedback feedback--error">{{ deleteErrorMessage }}</p>

        <footer class="delete-confirm__actions">
          <button
            class="btn btn-outline"
            type="button"
            :disabled="deletingBountyId === Number(deleteTarget.id || 0)"
            @click="closeDeleteConfirmModal"
          >
            取消
          </button>
          <button
            class="primary-button delete-confirm__danger"
            type="button"
            :disabled="deletingBountyId === Number(deleteTarget.id || 0)"
            @click="handleDeletePublished"
          >
            {{ deletingBountyId === Number(deleteTarget.id || 0) ? "删除中..." : "确认删除" }}
          </button>
        </footer>
      </div>
    </BaseModal>

    <TopToast :message="toastMessage" tone="success" />
</template>

<style scoped>
.workbench-page {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: var(--space-4);
  height: calc(100dvh - var(--top-dock-height) - var(--page-padding) - var(--page-padding));
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

.workbench-tabs {
  display: flex;
  gap: var(--space-2);
}

.workbench-tab {
  min-height: 38px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: rgba(23, 35, 56, 0.84);
  color: var(--text-secondary);
  padding: 0 var(--space-4);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.workbench-tab strong {
  font-variant-numeric: tabular-nums;
}

.workbench-tab.is-active {
  border-color: rgba(132, 166, 255, 0.54);
  background: rgba(106, 141, 255, 0.24);
  color: #e8f0ff;
}

.workbench-content {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: var(--space-1);
}

.workbench-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
  align-content: start;
}

.rating-list {
  display: grid;
  gap: var(--space-3);
  align-content: start;
}

.rating-row {
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.rating-row__main {
  min-width: 0;
}

.rating-row__main h4 {
  margin: 0;
  font-size: 1.02rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rating-row__main p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.rating-row__main small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.rating-row__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

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

@media (max-width: 900px) {
  .workbench-header {
    flex-direction: column;
  }

  .workbench-tabs {
    overflow-x: auto;
    padding-bottom: 2px;
  }
}

@media (max-width: 768px) {
  .workbench-page {
    height: auto;
    min-height: calc(100dvh - var(--top-dock-height) - var(--page-padding) - var(--page-padding));
  }

  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .rating-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .rating-row__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
