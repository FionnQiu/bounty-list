import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  applyToBounty as applyToBountyRequest,
  getBountyDetail,
  reviewBountyApplication,
  updateBounty,
} from "../../../api/bounties.js";
import { BOUNTY_STATUS_OPTIONS, formatApplicationStatusLabel } from "../../../utils/bountyStatus.js";
import { formatDateTimeCN } from "../../../utils/datetime.js";
import { BOUNTY_DETAIL_ERROR_TEXT } from "../constants/bountyDetail.constants.js";

export function useBountyDetailPage() {
  const route = useRoute();
  const router = useRouter();

  const loading = ref(true);
  const submitting = ref(false);
  const reviewingId = ref(0);
  const statusUpdating = ref(false);
  const errorMessage = ref("");
  const successMessage = ref("");
  const detail = ref(null);
  const applicationForm = reactive({ message: "" });

  const selectedStatus = ref("");

  const statusOptions = BOUNTY_STATUS_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  async function loadDetail() {
    loading.value = true;
    errorMessage.value = "";

    try {
      const data = await getBountyDetail(route.params.id);
      detail.value = data;
      selectedStatus.value = data.bounty.status;
    } catch (error) {
      errorMessage.value = error.message || BOUNTY_DETAIL_ERROR_TEXT.loadFailed;
    } finally {
      loading.value = false;
    }
  }

  async function applyToBounty() {
    if (!detail.value || submitting.value) {
      return;
    }

    submitting.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      const data = await applyToBountyRequest(route.params.id, applicationForm);
      successMessage.value = "申请成功，已为你打开可沟通会话。";
      detail.value.viewer.application = {
        id: data.application.id,
        status: data.application.status,
        message: data.application.message,
        conversationId: data.conversation.id,
      };
      applicationForm.message = "";
    } catch (error) {
      errorMessage.value = error.message || BOUNTY_DETAIL_ERROR_TEXT.applyFailed;
    } finally {
      submitting.value = false;
    }
  }

  async function reviewApplication(item, decision) {
    if (!detail.value || reviewingId.value) {
      return;
    }

    reviewingId.value = item.id;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      await reviewBountyApplication(detail.value.bounty.id, item.id, { decision });
      successMessage.value = decision === "accepted" ? "已通过该申请。" : "已拒绝该申请。";
      await loadDetail();
    } catch (error) {
      errorMessage.value = error.message || BOUNTY_DETAIL_ERROR_TEXT.reviewFailed;
    } finally {
      reviewingId.value = 0;
    }
  }

  async function updateStatus() {
    if (!detail.value || statusUpdating.value || selectedStatus.value === detail.value.bounty.status) {
      return;
    }

    statusUpdating.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    try {
      await updateBounty(detail.value.bounty.id, {
        title: detail.value.bounty.title,
        description: detail.value.bounty.description,
        rewardAmount: detail.value.bounty.rewardAmount,
        categoryId: detail.value.bounty.category.id,
        status: selectedStatus.value,
      });

      successMessage.value = "状态已更新。";
      await loadDetail();
    } catch (error) {
      errorMessage.value = error.message || BOUNTY_DETAIL_ERROR_TEXT.updateStatusFailed;
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
    errorMessage,
    successMessage,
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
