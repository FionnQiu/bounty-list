import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  applyToBounty as applyToBountyRequest,
  getBountyDetail,
  reviewBountyApplication,
  updateBounty,
} from "../../api/bounties.js";
import { feedbackStore } from "../../store/feedback.js";
import { BOUNTY_STATUS_OPTIONS, formatApplicationStatusLabel } from "../bountyStatus.js";
import { formatDateTimeCN } from "../datetime.js";
import { BOUNTY_DETAIL_ERROR_TEXT } from "../constants/bountyDetail.constants.js";

export function useBountyDetailPage() {
  const route = useRoute();
  const router = useRouter();

  const loading = ref(true);
  const submitting = ref(false);
  const reviewingId = ref(0);
  const statusUpdating = ref(false);
  const detail = ref(null);
  const applicationForm = reactive({ message: "" });

  const selectedStatus = ref("");

  const statusOptions = BOUNTY_STATUS_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  async function loadDetail() {
    loading.value = true;

    try {
      const data = await getBountyDetail(route.params.id);
      detail.value = data;
      selectedStatus.value = data.bounty.status;
    } catch (error) {
      detail.value = null;
      feedbackStore.pushFeedback(error.message || BOUNTY_DETAIL_ERROR_TEXT.loadFailed, {
        tone: "error",
        duration: 3000,
      });
    } finally {
      loading.value = false;
    }
  }

  async function applyToBounty() {
    if (!detail.value || submitting.value) {
      return;
    }

    submitting.value = true;

    try {
      const data = await applyToBountyRequest(route.params.id, applicationForm);
      detail.value.viewer.application = {
        id: data.application.id,
        status: data.application.status,
        message: data.application.message,
        conversationId: data.conversation.id,
      };
      applicationForm.message = "";
      feedbackStore.pushFeedback("申请成功，已为你打开可沟通会话。", {
        tone: "success",
        duration: 3000,
      });
    } catch (error) {
      feedbackStore.pushFeedback(error.message || BOUNTY_DETAIL_ERROR_TEXT.applyFailed, {
        tone: "error",
        duration: 3000,
      });
    } finally {
      submitting.value = false;
    }
  }

  async function reviewApplication(item, decision) {
    if (!detail.value || reviewingId.value) {
      return;
    }

    reviewingId.value = item.id;

    try {
      await reviewBountyApplication(detail.value.bounty.id, item.id, { decision });
      feedbackStore.pushFeedback(decision === "accepted" ? "已通过该申请。" : "已拒绝该申请。", {
        tone: "success",
        duration: 3000,
      });
      await loadDetail();
    } catch (error) {
      feedbackStore.pushFeedback(error.message || BOUNTY_DETAIL_ERROR_TEXT.reviewFailed, {
        tone: "error",
        duration: 3000,
      });
    } finally {
      reviewingId.value = 0;
    }
  }

  async function updateStatus() {
    if (!detail.value || statusUpdating.value || selectedStatus.value === detail.value.bounty.status) {
      return;
    }

    statusUpdating.value = true;

    try {
      await updateBounty(detail.value.bounty.id, {
        title: detail.value.bounty.title,
        description: detail.value.bounty.description,
        rewardAmount: detail.value.bounty.rewardAmount,
        categoryId: detail.value.bounty.category.id,
        status: selectedStatus.value,
      });

      feedbackStore.pushFeedback("状态已更新。", { tone: "success", duration: 3000 });
      await loadDetail();
    } catch (error) {
      feedbackStore.pushFeedback(error.message || BOUNTY_DETAIL_ERROR_TEXT.updateStatusFailed, {
        tone: "error",
        duration: 3000,
      });
      selectedStatus.value = detail.value.bounty.status;
    } finally {
      statusUpdating.value = false;
    }
  }

  const canApply = computed(() => {
    if (!detail.value) {
      return false;
    }

    const hasApplication = Boolean(detail.value.viewer.application);
    const status = String(detail.value.bounty.status || "");
    const isRecruiting = status === "recruiting";
    return !detail.value.viewer.isPublisher && isRecruiting && !hasApplication;
  });

  const canReapply = computed(() => {
    const applicationStatus = detail.value?.viewer?.application?.status;
    return ["rejected", "withdrawn"].includes(applicationStatus || "");
  });

  function openConversation(conversationId) {
    if (!conversationId) {
      return;
    }
    void router.push(`/messages/${conversationId}`);
  }

  onMounted(loadDetail);

  return {
    loading,
    submitting,
    reviewingId,
    statusUpdating,
    detail,
    applicationForm,
    selectedStatus,
    statusOptions,
    canApply,
    canReapply,
    loadDetail,
    applyToBounty,
    reviewApplication,
    updateStatus,
    openConversation,
    formatApplicationStatusLabel,
    formatDateTimeCN,
  };
}
