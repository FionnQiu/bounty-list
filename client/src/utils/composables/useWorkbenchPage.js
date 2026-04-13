import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getBounties, updateBounty } from "../../api/bounties.js";
import { feedbackStore } from "../../store/feedback.js";
import { useWorkbench } from "./useWorkbench.js";
import { WORKBENCH_DEFAULT_TAB } from "../constants/workbenchPage.constants.js";
import { WORKBENCH_STATUS } from "../constants/workbenchStatus.constants.js";

export function useWorkbenchPage() {
  const router = useRouter();

  const activeTab = ref(WORKBENCH_DEFAULT_TAB);
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

  const {
    loading,
    loadingApplications,
    completingBountyId,
    submittingAcceptanceBountyId,
    closingBountyId,
    deletingBountyId,
    ratingSubmitting,
    errorMessage,
    publishedItems,
    acceptedItems,
    stats,
    applications,
    loadOverview,
    loadPublishedApplications,
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
  ]);

  const activeList = computed(() => {
    if (activeTab.value === "published") {
      return publishedItems.value;
    }
    return acceptedItems.value;
  });

  function showSuccess(message) {
    feedbackStore.pushFeedback(message, { tone: "success", duration: 3000 });
  }

  function showError(message) {
    feedbackStore.pushFeedback(message, { tone: "error", duration: 3000 });
  }

  function openConversation(conversationId) {
    const id = Number(conversationId || 0);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }

    void router.push(`/messages/${id}`);
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
    } catch (error) {
      showError(error?.message || errorMessage.value || "加载申请列表失败，请稍后重试。");
    }
  }

  function closeApplicationsModal() {
    showApplicationsModal.value = false;
    selectedPublishedItem.value = null;
  }

  async function handleClosePublished(item) {
    const target = item || editRecruitTarget.value;
    if (!target) {
      return;
    }

    try {
      await closePublishedBounty(target.id);
      showSuccess("已关闭招募。");
      if (Number(editRecruitTarget.value?.id || 0) === Number(target.id || 0)) {
        closeEditRecruitModal();
      }
    } catch (error) {
      showError(error?.message || errorMessage.value || "关闭招募失败，请稍后重试。");
    }
  }

  async function handleCompleteAcceptance(item) {
    if (!item) {
      return;
    }

    try {
      await completePublishedBounty(item.id);
      showSuccess("验收已完成，悬赏状态已更新为已完成。");
    } catch (error) {
      showError(error?.message || errorMessage.value || "完成验收失败，请稍后重试。");
    }
  }

  async function handleSubmitAccepted(item) {
    if (!item) {
      return;
    }

    try {
      await submitAcceptanceRequest(item.id);
      showSuccess("已提交验收申请，等待发布者确认。");
    } catch (error) {
      showError(error?.message || errorMessage.value || "提交验收申请失败，请稍后重试。");
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
      showSuccess("招募已删除。");

      if (Number(editRecruitTarget.value?.id || 0) === Number(target.id || 0)) {
        closeEditRecruitModal();
      }

      closeDeleteConfirmModal();
    } catch (error) {
      deleteErrorMessage.value = "";
      showError(error?.message || errorMessage.value || "删除招募失败，请稍后重试。");
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
        status: WORKBENCH_STATUS.RECRUITING,
      });

      await loadOverview({ silent: true });
      showSuccess("招募信息已更新。");
      closeEditRecruitModal();
    } catch (error) {
      showError(error?.message || "更新招募失败，请稍后重试。");
    } finally {
      editRecruitSubmitting.value = false;
    }
  }

  function openRatingModal(target) {
    ratingErrorMessage.value = "";
    ratingTarget.value = target;
    showRatingModal.value = true;
  }

  function openPublishedRating(item) {
    const targetUser = item?.acceptedApplicant;
    if (!item?.id || !targetUser?.id || !item?.canRateAccepted) {
      return;
    }

    openRatingModal({
      role: "publisher",
      bounty: item,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        avatarUrl: targetUser.avatarUrl || "",
      },
      conversationId: targetUser.conversationId || null,
    });
  }

  function openAcceptedRating(item) {
    const targetUser = item?.publisher;
    if (!item?.id || !targetUser?.id || !item?.canRatePublisher) {
      return;
    }

    openRatingModal({
      role: "applicant",
      bounty: item,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        avatarUrl: targetUser.avatarUrl || "",
      },
      conversationId: item.conversationId || null,
    });
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
      showSuccess("评价已提交。");
      closeRatingModal();
    } catch (error) {
      showError(error?.message || "提交评价失败，请稍后重试。");
    }
  }

  onMounted(() => {
    void loadOverview().catch((error) => {
      showError(error?.message || errorMessage.value || "加载工作台失败，请稍后重试。");
    });
    void loadCategoryOptions();
  });

  return {
    activeTab,
    showApplicationsModal,
    selectedPublishedItem,
    showRatingModal,
    ratingTarget,
    ratingErrorMessage,
    showEditRecruitModal,
    editRecruitTarget,
    editRecruitErrorMessage,
    editRecruitSubmitting,
    categoryOptions,
    showDeleteConfirmModal,
    deleteTarget,
    deleteErrorMessage,
    loading,
    loadingApplications,
    completingBountyId,
    submittingAcceptanceBountyId,
    closingBountyId,
    deletingBountyId,
    ratingSubmitting,
    publishedItems,
    acceptedItems,
    stats,
    applications,
    tabItems,
    activeList,
    openConversation,
    switchTab,
    openApplications,
    closeApplicationsModal,
    handleClosePublished,
    handleCompleteAcceptance,
    handleSubmitAccepted,
    openDeleteConfirmModal,
    closeDeleteConfirmModal,
    handleDeletePublished,
    openEditRecruit,
    closeEditRecruitModal,
    handleSubmitEditRecruit,
    openPublishedRating,
    openAcceptedRating,
    closeRatingModal,
    handleSubmitRating,
  };
}
