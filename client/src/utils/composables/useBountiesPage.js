import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createBounty, ensureBountyConversation, getBounties } from "../../api/bounties.js";
import { authStore } from "../../store/auth.js";
import { feedbackStore } from "../../store/feedback.js";
import { formatDateTimeCN } from "../datetime.js";
import { getInitialChar } from "../text.js";
import { ACTIVE_BOUNTY_STATUS, BOUNTY_SORT_OPTIONS } from "../constants/bountiesPage.constants.js";

export function useBountiesPage() {
  const router = useRouter();

  const loading = ref(false);
  const createSubmitting = ref(false);
  const showCreateModal = ref(false);
  const activeBounty = ref(null);
  const enteringConversation = ref(false);

  const bounties = ref([]);
  const categories = ref([]);
  const requestSeq = ref(0);
  const suppressFilterWatch = ref(false);

  const filters = reactive({
    keyword: "",
    sort: "latest",
    categoryId: "",
  });

  const createForm = reactive({
    title: "",
    description: "",
    rewardAmount: "",
    categoryId: "",
  });

  const sortOptions = BOUNTY_SORT_OPTIONS;
  const canEnterConversation = computed(() => {
    if (!activeBounty.value) {
      return false;
    }

    const currentUserId = authStore.state.user?.id;
    const publisherId = activeBounty.value.publisher?.id;
    return String(currentUserId || "") !== String(publisherId || "");
  });

  function getPublisherInitial(name) {
    return getInitialChar(name, "赏");
  }

  function resetCreateForm() {
    createForm.title = "";
    createForm.description = "";
    createForm.rewardAmount = "";
    createForm.categoryId = categories.value.length > 0 ? String(categories.value[0].id) : "";
  }

  async function loadBounties() {
    const currentSeq = ++requestSeq.value;
    loading.value = true;

    try {
      const data = await getBounties({
        keyword: filters.keyword,
        sort: filters.sort,
        categoryId: filters.categoryId,
        status: ACTIVE_BOUNTY_STATUS,
      });

      if (currentSeq !== requestSeq.value) {
        return;
      }

      bounties.value = (data.items || []).filter(
        (item) => String(item.status || "") === ACTIVE_BOUNTY_STATUS,
      );
      categories.value = data.categories || [];

      if (!createForm.categoryId && categories.value.length > 0) {
        createForm.categoryId = String(categories.value[0].id);
      }
    } catch (error) {
      if (currentSeq === requestSeq.value) {
        feedbackStore.pushFeedback(error.message || "悬赏加载失败，请稍后重试。", {
          tone: "error",
          duration: 3000,
        });
      }
    } finally {
      if (currentSeq === requestSeq.value) {
        loading.value = false;
      }
    }
  }

  function openCreateModal() {
    if (!createForm.categoryId && categories.value.length > 0) {
      createForm.categoryId = String(categories.value[0].id);
    }

    showCreateModal.value = true;
  }

  function closeCreateModal({ reset = false } = {}) {
    showCreateModal.value = false;

    if (reset) {
      resetCreateForm();
    }
  }

  function openBountyModal(item) {
    activeBounty.value = item;
  }

  function closeBountyModal() {
    activeBounty.value = null;
  }

  function resetFilters() {
    suppressFilterWatch.value = true;
    filters.keyword = "";
    filters.sort = "latest";
    filters.categoryId = "";
    suppressFilterWatch.value = false;
    void loadBounties();
  }

  async function handleCreateBounty() {
    createSubmitting.value = true;

    try {
      await createBounty({
        title: createForm.title,
        description: createForm.description,
        rewardAmount: Number(createForm.rewardAmount),
        categoryId: Number(createForm.categoryId),
        status: ACTIVE_BOUNTY_STATUS,
      });

      feedbackStore.pushFeedback("悬赏发布成功。", { tone: "success", duration: 3000 });
      resetCreateForm();
      await loadBounties();
      closeCreateModal();
    } catch (error) {
      feedbackStore.pushFeedback(error.message || "发布失败，请检查内容后重试。", {
        tone: "error",
        duration: 3000,
      });
    } finally {
      createSubmitting.value = false;
    }
  }

  async function handleEnterConversation() {
    if (!activeBounty.value || enteringConversation.value || !canEnterConversation.value) {
      return;
    }

    enteringConversation.value = true;

    try {
      const data = await ensureBountyConversation(activeBounty.value.id);
      const conversationId = data?.conversation?.id;

      if (!conversationId) {
        throw new Error("会话创建失败，请稍后重试。");
      }

      closeBountyModal();
      await router.push(`/messages/${conversationId}`);
    } catch (error) {
      feedbackStore.pushFeedback(error.message || "进入对话失败，请稍后重试。", {
        tone: "error",
        duration: 3000,
      });
    } finally {
      enteringConversation.value = false;
    }
  }

  onMounted(loadBounties);

  watch(
    () => [filters.keyword, filters.sort, filters.categoryId],
    () => {
      if (suppressFilterWatch.value) {
        return;
      }
      void loadBounties();
    },
  );

  return {
    ACTIVE_BOUNTY_STATUS,
    loading,
    createSubmitting,
    showCreateModal,
    activeBounty,
    enteringConversation,
    canEnterConversation,
    bounties,
    categories,
    filters,
    createForm,
    sortOptions,
    getPublisherInitial,
    openCreateModal,
    closeCreateModal,
    openBountyModal,
    closeBountyModal,
    resetFilters,
    handleCreateBounty,
    handleEnterConversation,
    formatDateTimeCN,
  };
}
