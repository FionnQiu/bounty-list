import { onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { applyToBounty, createBounty, getBounties } from "../../../api/bounties.js";
import { formatDateTimeCN } from "../../../utils/datetime.js";
import { getInitialChar } from "../../../utils/text.js";
import { ACTIVE_BOUNTY_STATUS, BOUNTY_SORT_OPTIONS } from "../constants/bountiesPage.constants.js";

export function useBountiesPage() {
  const router = useRouter();

  const loading = ref(false);
  const createSubmitting = ref(false);
  const errorMessage = ref("");
  const successMessage = ref("");
  const showCreateModal = ref(false);
  const activeBounty = ref(null);
  const applyingBounty = ref(false);
  const modalErrorMessage = ref("");

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
    errorMessage.value = "";

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
        errorMessage.value = error.message || "悬赏加载失败，请稍后重试。";
      }
    } finally {
      if (currentSeq === requestSeq.value) {
        loading.value = false;
      }
    }
  }

  function openCreateModal() {
    errorMessage.value = "";
    successMessage.value = "";

    if (!createForm.categoryId && categories.value.length > 0) {
      createForm.categoryId = String(categories.value[0].id);
    }

    showCreateModal.value = true;
  }

  function closeCreateModal({ reset = false } = {}) {
    showCreateModal.value = false;
    errorMessage.value = "";
    successMessage.value = "";

    if (reset) {
      resetCreateForm();
    }
  }

  function openBountyModal(item) {
    modalErrorMessage.value = "";
    activeBounty.value = item;
  }

  function closeBountyModal() {
    activeBounty.value = null;
    modalErrorMessage.value = "";
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
    errorMessage.value = "";
    successMessage.value = "";

    try {
      await createBounty({
        title: createForm.title,
        description: createForm.description,
        rewardAmount: Number(createForm.rewardAmount),
        categoryId: Number(createForm.categoryId),
        status: ACTIVE_BOUNTY_STATUS,
      });

      successMessage.value = "悬赏发布成功。";
      resetCreateForm();
      await loadBounties();
      closeCreateModal();
    } catch (error) {
      errorMessage.value = error.message || "发布失败，请检查内容后重试。";
    } finally {
      createSubmitting.value = false;
    }
  }

  async function handleTakeBounty() {
    if (!activeBounty.value || applyingBounty.value) {
      return;
    }

    applyingBounty.value = true;
    modalErrorMessage.value = "";

    try {
      const data = await applyToBounty(activeBounty.value.id, {
        message: `我想接取「${activeBounty.value.title}」，请与我联系。`,
      });

      const conversationId = data?.conversation?.id;
      if (!conversationId) {
        throw new Error("会话创建失败，请稍后重试。");
      }

      closeBountyModal();
      await router.push(`/messages/${conversationId}`);
    } catch (error) {
      modalErrorMessage.value = error.message || "接取失败，请稍后重试。";
    } finally {
      applyingBounty.value = false;
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
    errorMessage,
    successMessage,
    showCreateModal,
    activeBounty,
    applyingBounty,
    modalErrorMessage,
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
    handleTakeBounty,
    formatDateTimeCN,
  };
}
