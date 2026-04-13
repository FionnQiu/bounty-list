import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { applyToBounty, reviewBountyApplication } from "../../api/bounties.js";
import { getConversationMessages, getConversations, sendConversationMessage } from "../../api/conversations.js";
import { authStore } from "../../store/auth.js";
import { feedbackStore } from "../../store/feedback.js";
import { getInitialChar } from "../text.js";
import { MESSAGES_MOBILE_BREAKPOINT } from "../constants/messages.constants.js";

export function useMessagesPage() {
  const route = useRoute();
  const router = useRouter();

  const loading = ref(true);
  const loadingMessages = ref(false);
  const sending = ref(false);
  const actionPending = ref(false);
  const conversations = ref([]);
  const selectedId = ref(Number(route.params.id || route.query.conversation || 0));
  const conversationDetail = ref(null);
  const messageDraft = ref("");
  const isMobile = ref(false);

  let conversationReqSeq = 0;
  let messageReqSeq = 0;

  const routeConversationId = computed(() => Number(route.params.id || route.query.conversation || 0));

  const selectedConversation = computed(
    () => conversations.value.find((item) => item.id === selectedId.value) || null,
  );

  const interaction = computed(() => conversationDetail.value?.conversation?.interaction || null);

  const threadMessages = computed(() =>
    (conversationDetail.value?.messages || []).map((message) => ({
      ...message,
      avatarUrl: getMessageAvatar(message),
    })),
  );

  const mobileModalVisible = computed({
    get() {
      return isMobile.value && Boolean(routeConversationId.value);
    },
    set(next) {
      if (!next) {
        void closeMobileConversation();
      }
    },
  });

  function getInitial(value) {
    return getInitialChar(value, "对");
  }

  function getMessageAvatar(message) {
    if (message.senderAvatarUrl) {
      return message.senderAvatarUrl;
    }

    if (message.senderId === authStore.state.user?.id) {
      return authStore.state.user?.avatarUrl || "";
    }

    return selectedConversation.value?.partner?.avatarUrl || "";
  }

  function updateViewportMode() {
    isMobile.value = window.innerWidth <= MESSAGES_MOBILE_BREAKPOINT;
  }

  function hasConversation(id) {
    return conversations.value.some((item) => item.id === id);
  }

  async function closeMobileConversation() {
    if (!isMobile.value || !routeConversationId.value) {
      return;
    }

    await router.replace("/messages");
  }

  async function loadMessages(id, { silent = false } = {}) {
    const currentSeq = ++messageReqSeq;
    if (!silent) {
      loadingMessages.value = true;
    }

    try {
      const data = await getConversationMessages(id);
      if (currentSeq !== messageReqSeq) {
        return;
      }
      conversationDetail.value = data;
    } catch (error) {
      if (currentSeq === messageReqSeq) {
        feedbackStore.pushFeedback(error.message || "加载会话消息失败。", {
          tone: "error",
          duration: 3000,
        });
      }
    } finally {
      if (!silent && currentSeq === messageReqSeq) {
        loadingMessages.value = false;
      }
    }
  }

  async function loadConversations() {
    const currentSeq = ++conversationReqSeq;
    loading.value = true;

    try {
      const data = await getConversations();

      if (currentSeq !== conversationReqSeq) {
        return;
      }

      conversations.value = data.items || [];

      if (isMobile.value) {
        const routeId = routeConversationId.value;

        if (routeId) {
          if (!hasConversation(routeId)) {
            selectedId.value = 0;
            conversationDetail.value = null;
            await router.replace("/messages");
            return;
          }

          selectedId.value = routeId;
          await loadMessages(routeId);
        } else if (selectedId.value && hasConversation(selectedId.value) && !conversationDetail.value) {
          await loadMessages(selectedId.value, { silent: true });
        }

        return;
      }

      let targetId = routeConversationId.value || selectedId.value || conversations.value[0]?.id || 0;

      if (targetId && !hasConversation(targetId)) {
        targetId = conversations.value[0]?.id || 0;
      }

      if (targetId) {
        selectedId.value = targetId;

        if (routeConversationId.value !== targetId) {
          await router.replace(`/messages/${targetId}`);
        }

        await loadMessages(targetId);
      } else {
        conversationDetail.value = null;
      }
    } catch (error) {
      if (currentSeq === conversationReqSeq) {
        feedbackStore.pushFeedback(error.message || "获取会话列表失败。", {
          tone: "error",
          duration: 3000,
        });
      }
    } finally {
      if (currentSeq === conversationReqSeq) {
        loading.value = false;
      }
    }
  }

  async function selectConversation(id) {
    if (!id) {
      return;
    }

    if (routeConversationId.value !== id) {
      if (isMobile.value) {
        await router.push(`/messages/${id}`);
      } else {
        await router.replace(`/messages/${id}`);
      }
      return;
    }

    if (id === selectedId.value && conversationDetail.value?.conversation?.id === id) {
      return;
    }

    selectedId.value = id;
    await loadMessages(id);
  }

  async function sendMessage() {
    if (!selectedId.value || sending.value) {
      return;
    }

    const content = messageDraft.value.trim();
    if (!content) {
      feedbackStore.pushFeedback("发送消息不能为空", {
        tone: "error",
        duration: 3000,
      });
      return;
    }

    sending.value = true;

    try {
      const data = await sendConversationMessage(selectedId.value, { content });

      if (!conversationDetail.value?.messages) {
        conversationDetail.value = { ...(conversationDetail.value || {}), messages: [] };
      }

      conversationDetail.value.messages.push(data.message);
      messageDraft.value = "";
      await loadConversations();
    } catch (error) {
      feedbackStore.pushFeedback(error.message || "发送消息失败。", {
        tone: "error",
        duration: 3000,
      });
    } finally {
      sending.value = false;
    }
  }

  async function applyFromConversation() {
    const currentInteraction = interaction.value;
    const bounty = conversationDetail.value?.conversation?.bounty;

    if (!currentInteraction?.canApply || !bounty?.id || actionPending.value) {
      return;
    }

    actionPending.value = true;

    try {
      const data = await applyToBounty(bounty.id, {
        message: `我想接取「${bounty.title}」，请与我联系。`,
      });

      const nextConversationId = Number(data?.conversation?.id || selectedId.value);
      feedbackStore.pushFeedback("申请已提交。", { tone: "success", duration: 3000 });

      if (nextConversationId && nextConversationId !== selectedId.value) {
        selectedId.value = nextConversationId;
        await router.replace(`/messages/${nextConversationId}`);
      }

      await loadConversations();
    } catch (error) {
      feedbackStore.pushFeedback(error.message || "申请失败，请稍后重试。", {
        tone: "error",
        duration: 3000,
      });
    } finally {
      actionPending.value = false;
    }
  }

  async function reviewFromConversation(decision) {
    const currentInteraction = interaction.value;
    const bounty = conversationDetail.value?.conversation?.bounty;
    const applicationId = currentInteraction?.application?.id;

    if (
      !["accepted", "rejected"].includes(decision) ||
      !currentInteraction?.canAccept ||
      !bounty?.id ||
      !applicationId ||
      actionPending.value
    ) {
      return;
    }

    actionPending.value = true;

    try {
      await reviewBountyApplication(bounty.id, applicationId, { decision });
      feedbackStore.pushFeedback(decision === "accepted" ? "已同意该申请。" : "已拒绝该申请。", {
        tone: "success",
        duration: 3000,
      });
      await loadConversations();
    } catch (error) {
      feedbackStore.pushFeedback(
        error.message ||
          (decision === "accepted" ? "同意接取失败，请稍后重试。" : "拒绝接取失败，请稍后重试。"),
        {
          tone: "error",
          duration: 3000,
        },
      );
    } finally {
      actionPending.value = false;
    }
  }

  watch(
    () => routeConversationId.value,
    async (nextId) => {
      if (!nextId) {
        if (!isMobile.value && conversations.value.length) {
          const fallbackId = selectedId.value && hasConversation(selectedId.value)
            ? selectedId.value
            : conversations.value[0].id;

          if (fallbackId && route.path === "/messages") {
            selectedId.value = fallbackId;
            await router.replace(`/messages/${fallbackId}`);
          }
        }
        return;
      }

      if (conversations.value.length && !hasConversation(nextId)) {
        feedbackStore.pushFeedback("会话不存在或已失效。", {
          tone: "error",
          duration: 3000,
        });
        await router.replace("/messages");
        return;
      }

      selectedId.value = nextId;

      if (conversationDetail.value?.conversation?.id === nextId) {
        return;
      }

      await loadMessages(nextId);
    },
  );

  watch(
    isMobile,
    async (mobile, prevMobile) => {
      if (mobile === prevMobile) {
        return;
      }

      if (mobile) {
        if (
          routeConversationId.value &&
          (!conversationDetail.value || conversationDetail.value.conversation?.id !== routeConversationId.value)
        ) {
          selectedId.value = routeConversationId.value;
          await loadMessages(routeConversationId.value, { silent: true });
        }
        return;
      }

      if (!routeConversationId.value && conversations.value.length) {
        const fallbackId = selectedId.value && hasConversation(selectedId.value)
          ? selectedId.value
          : conversations.value[0].id;

        if (fallbackId) {
          selectedId.value = fallbackId;
          await router.replace(`/messages/${fallbackId}`);
        }
      }
    },
  );

  function handleResize() {
    updateViewportMode();
  }

  function handleMessageDraftUpdate(value) {
    messageDraft.value = value;
  }

  onMounted(async () => {
    updateViewportMode();
    window.addEventListener("resize", handleResize, { passive: true });
    await loadConversations();
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", handleResize);
  });

  return {
    loading,
    loadingMessages,
    sending,
    actionPending,
    conversations,
    selectedId,
    conversationDetail,
    messageDraft,
    isMobile,
    interaction,
    threadMessages,
    mobileModalVisible,
    authStore,
    getInitial,
    selectConversation,
    sendMessage,
    applyFromConversation,
    reviewFromConversation,
    handleMessageDraftUpdate,
  };
}
