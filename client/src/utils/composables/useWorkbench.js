import { ref } from "vue";
import { reviewBountyApplication } from "../../api/bounties.js";
import {
  closeWorkbenchBounty,
  deleteWorkbenchBounty,
  completeWorkbenchBounty,
  requestWorkbenchAcceptance,
  createWorkbenchRating,
  getWorkbenchOverview,
  getWorkbenchPublishedApplications,
} from "../../api/workbench.js";

export function useWorkbench() {
  const loading = ref(false);
  const loadingApplications = ref(false);
  const applicationsBountyId = ref(0);
  const reviewingKey = ref("");
  const completingBountyId = ref(0);
  const submittingAcceptanceBountyId = ref(0);
  const closingBountyId = ref(0);
  const deletingBountyId = ref(0);
  const ratingSubmitting = ref(false);
  const errorMessage = ref("");

  const publishedItems = ref([]);
  const acceptedItems = ref([]);
  const pendingRatings = ref([]);
  const stats = ref({
    publishedCount: 0,
    acceptedCount: 0,
    pendingReviewCount: 0,
    pendingRatingCount: 0,
  });

  const applications = ref([]);

  async function loadOverview({ silent = false } = {}) {
    if (!silent) {
      loading.value = true;
    }

    errorMessage.value = "";

    try {
      const data = await getWorkbenchOverview();
      publishedItems.value = data.publishedItems || [];
      acceptedItems.value = data.acceptedItems || [];
      pendingRatings.value = data.pendingRatings || [];
      stats.value = data.stats || {
        publishedCount: 0,
        acceptedCount: 0,
        pendingReviewCount: 0,
        pendingRatingCount: 0,
      };
    } catch (error) {
      errorMessage.value = error.message || "加载工作台失败，请稍后重试。";
      throw error;
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  }

  async function loadPublishedApplications(bountyId) {
    loadingApplications.value = true;
    applicationsBountyId.value = Number(bountyId || 0);
    applications.value = [];

    try {
      const data = await getWorkbenchPublishedApplications(bountyId);
      applications.value = data.items || [];
      return applications.value;
    } catch (error) {
      errorMessage.value = error.message || "加载申请列表失败，请稍后重试。";
      throw error;
    } finally {
      loadingApplications.value = false;
    }
  }

  async function reviewApplication({ bountyId, applicationId, decision }) {
    const key = `${bountyId}:${applicationId}`;
    reviewingKey.value = key;
    errorMessage.value = "";

    try {
      const data = await reviewBountyApplication(bountyId, applicationId, { decision });
      await loadOverview({ silent: true });

      if (applicationsBountyId.value === Number(bountyId || 0)) {
        await loadPublishedApplications(bountyId);
      }

      return data;
    } catch (error) {
      errorMessage.value = error.message || "审核申请失败，请稍后重试。";
      throw error;
    } finally {
      reviewingKey.value = "";
    }
  }

  async function completePublishedBounty(bountyId) {
    completingBountyId.value = Number(bountyId || 0);
    errorMessage.value = "";

    try {
      const data = await completeWorkbenchBounty(bountyId);
      await loadOverview({ silent: true });
      return data;
    } catch (error) {
      errorMessage.value = error.message || "完成验收失败，请稍后重试。";
      throw error;
    } finally {
      completingBountyId.value = 0;
    }
  }

  async function submitAcceptanceRequest(bountyId) {
    submittingAcceptanceBountyId.value = Number(bountyId || 0);
    errorMessage.value = "";

    try {
      const data = await requestWorkbenchAcceptance(bountyId);
      await loadOverview({ silent: true });
      return data;
    } catch (error) {
      errorMessage.value = error.message || "提交验收申请失败，请稍后重试。";
      throw error;
    } finally {
      submittingAcceptanceBountyId.value = 0;
    }
  }

  async function closePublishedBounty(bountyId) {
    closingBountyId.value = Number(bountyId || 0);
    errorMessage.value = "";

    try {
      const data = await closeWorkbenchBounty(bountyId);
      await loadOverview({ silent: true });
      return data;
    } catch (error) {
      errorMessage.value = error.message || "关闭招募失败，请稍后重试。";
      throw error;
    } finally {
      closingBountyId.value = 0;
    }
  }

  async function deletePublishedBounty(bountyId) {
    deletingBountyId.value = Number(bountyId || 0);
    errorMessage.value = "";

    try {
      const data = await deleteWorkbenchBounty(bountyId);
      await loadOverview({ silent: true });
      return data;
    } catch (error) {
      errorMessage.value = error.message || "删除招募失败，请稍后重试。";
      throw error;
    } finally {
      deletingBountyId.value = 0;
    }
  }

  async function submitRating(payload) {
    ratingSubmitting.value = true;
    errorMessage.value = "";

    try {
      const data = await createWorkbenchRating(payload);
      await loadOverview({ silent: true });
      return data;
    } catch (error) {
      errorMessage.value = error.message || "提交评价失败，请稍后重试。";
      throw error;
    } finally {
      ratingSubmitting.value = false;
    }
  }

  return {
    loading,
    loadingApplications,
    applicationsBountyId,
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
  };
}
