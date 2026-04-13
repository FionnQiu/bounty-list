<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { applyToBounty, reviewBountyApplication } from "../api/bounties.js";
import { getConversationMessages, getConversations, sendConversationMessage } from "../api/conversations.js";
import EmptyState from "../components/ui/EmptyState.vue";
import LoadingState from "../components/ui/LoadingState.vue";
import MoneyTag from "../components/ui/MoneyTag.vue";
import StatusTag from "../components/ui/StatusTag.vue";
import { authStore } from "../store/auth.js";
import { formatApplicationStatusLabel } from "../utils/bountyStatus.js";
import { formatDateTimeCN } from "../utils/datetime.js";
import { getInitialChar } from "../utils/text.js";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const loadingMessages = ref(false);
const sending = ref(false);
const actionPending = ref(false);
const errorMessage = ref("");
const actionErrorMessage = ref("");
const actionSuccessMessage = ref("");
const conversations = ref([]);
const selectedId = ref(Number(route.params.id || route.query.conversation || 0));
const conversationDetail = ref(null);
const messageDraft = ref("");

let conversationReqSeq = 0;
let messageReqSeq = 0;

const selectedConversation = computed(
  () => conversations.value.find((item) => item.id === selectedId.value) || null,
);

const interaction = computed(() => conversationDetail.value?.conversation?.interaction || null);

function clearActionFeedback() {
  actionErrorMessage.value = "";
  actionSuccessMessage.value = "";
}

function getInitial(value) {
  return getInitialChar(value, "私");
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
      errorMessage.value = error.message || "加载会话消息失败。";
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
  errorMessage.value = "";

  try {
    const data = await getConversations();

    if (currentSeq !== conversationReqSeq) {
      return;
    }

    conversations.value = data.items || [];

    if (!selectedId.value && conversations.value[0]) {
      selectedId.value = conversations.value[0].id;
      router.replace(`/messages/${selectedId.value}`);
    }

    if (selectedId.value) {
      const exists = conversations.value.some((item) => item.id === selectedId.value);
      if (!exists && conversations.value[0]) {
        selectedId.value = conversations.value[0].id;
        router.replace(`/messages/${selectedId.value}`);
      }
      await loadMessages(selectedId.value);
    } else {
      conversationDetail.value = null;
    }
  } catch (error) {
    if (currentSeq === conversationReqSeq) {
      errorMessage.value = error.message || "获取会话列表失败。";
    }
  } finally {
    if (currentSeq === conversationReqSeq) {
      loading.value = false;
    }
  }
}

async function selectConversation(id) {
  if (id === selectedId.value) {
    return;
  }

  selectedId.value = id;
  router.replace(`/messages/${id}`);
  clearActionFeedback();
  await loadMessages(id);
}

async function sendMessage() {
  if (!selectedId.value || !messageDraft.value.trim() || sending.value) {
    return;
  }

  sending.value = true;
  errorMessage.value = "";

  try {
    const content = messageDraft.value.trim();
    const data = await sendConversationMessage(selectedId.value, { content });

    if (!conversationDetail.value?.messages) {
      conversationDetail.value = { ...(conversationDetail.value || {}), messages: [] };
    }

    conversationDetail.value.messages.push(data.message);
    messageDraft.value = "";
    await loadConversations();
  } catch (error) {
    errorMessage.value = error.message || "发送消息失败。";
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
  actionErrorMessage.value = "";
  actionSuccessMessage.value = "";

  try {
    const data = await applyToBounty(bounty.id, {
      message: `我想接取「${bounty.title}」，请与我联系。`,
    });

    const nextConversationId = Number(data?.conversation?.id || selectedId.value);
    actionSuccessMessage.value = "申请已提交。";

    if (nextConversationId && nextConversationId !== selectedId.value) {
      selectedId.value = nextConversationId;
      router.replace(`/messages/${nextConversationId}`);
    }

    await loadConversations();
  } catch (error) {
    actionErrorMessage.value = error.message || "申请失败，请稍后重试。";
  } finally {
    actionPending.value = false;
  }
}

async function acceptFromConversation() {
  const currentInteraction = interaction.value;
  const bounty = conversationDetail.value?.conversation?.bounty;
  const applicationId = currentInteraction?.application?.id;

  if (!currentInteraction?.canAccept || !bounty?.id || !applicationId || actionPending.value) {
    return;
  }

  actionPending.value = true;
  actionErrorMessage.value = "";
  actionSuccessMessage.value = "";

  try {
    await reviewBountyApplication(bounty.id, applicationId, { decision: "accepted" });
    actionSuccessMessage.value = "已同意该申请。";
    await loadConversations();
  } catch (error) {
    actionErrorMessage.value = error.message || "同意接取失败，请稍后重试。";
  } finally {
    actionPending.value = false;
  }
}

watch(
  () => [route.params.id, route.query.conversation],
  async ([paramsId, queryId]) => {
    const nextId = Number(paramsId || queryId || 0);
    if (nextId && nextId !== selectedId.value) {
      selectedId.value = nextId;
      clearActionFeedback();
      await loadMessages(nextId);
    }
  },
);

onMounted(loadConversations);
</script>

<template>
    <section class="workspace workspace--messages messages-page">
      <aside class="panel panel--conversations messages-conversations">
        <header class="surface-toolbar messages-toolbar">
          <h3>会话</h3>
          <span>{{ conversations.length }} 条</span>
        </header>

        <LoadingState v-if="loading" text="正在拉取会话..." />
        <EmptyState
          v-else-if="!conversations.length"
          title="暂无会话"
          description="先去广场接取一条悬赏，会自动创建对话。"
        />

        <div v-else class="conversation-list">
          <button
            v-for="item in conversations"
            :key="item.id"
            :class="['conversation-item', 'surface-card', 'surface-card--interactive', { 'is-active': item.id === selectedId }]"
            @click="selectConversation(item.id)"
          >
            <div class="conversation-item__top">
              <strong :title="item.bounty.title">{{ item.bounty.title }}</strong>
              <MoneyTag :amount="item.bounty.rewardAmount" size="sm" />
            </div>

            <div class="conversation-item__line">
              <img
                v-if="item.partner.avatarUrl"
                :src="item.partner.avatarUrl"
                :alt="item.partner.username"
                class="conversation-avatar"
              />
              <span v-else class="conversation-avatar-fallback">{{ getInitial(item.partner.username) }}</span>

              <div class="conversation-item__text">
                <span class="conversation-name">{{ item.partner.username }}</span>
                <small class="conversation-preview">{{ item.lastMessage || "刚创建，等待第一条消息。" }}</small>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <section class="panel panel--messages-detail messages-detail">
        <div v-if="conversationDetail" class="messages-thread">
          <header class="messages-thread__head surface-toolbar">
            <div>
              <p class="page-head__eyebrow">当前悬赏</p>
              <h3>{{ conversationDetail.conversation.bounty.title }}</h3>
            </div>
            <div class="messages-thread__meta">
              <StatusTag :status="conversationDetail.conversation.bounty.status" type="bounty" />
              <MoneyTag :amount="conversationDetail.conversation.bounty.rewardAmount" size="sm" />
            </div>
          </header>

          <section v-if="interaction" class="messages-thread__interaction surface-card">
            <div class="interaction-main">
              <div class="interaction-copy">
                <p class="interaction-title">
                  {{ interaction.viewerRole === "publisher" ? "接取审核" : "接取申请" }}
                </p>
                <p class="interaction-hint" v-if="interaction.application">
                  当前申请状态：{{ formatApplicationStatusLabel(interaction.application.status) }}
                </p>
                <p class="interaction-hint" v-else>
                  当前会话还没有申请记录。
                </p>
              </div>

              <button
                v-if="interaction.viewerRole === 'applicant'"
                class="primary-button"
                type="button"
                :disabled="actionPending || !interaction.canApply"
                @click="applyFromConversation"
              >
                {{ actionPending ? "提交中..." : interaction.canApply ? "申请接取" : "已提交申请" }}
              </button>

              <button
                v-else
                class="primary-button"
                type="button"
                :disabled="actionPending || !interaction.canAccept"
                @click="acceptFromConversation"
              >
                {{ actionPending ? "处理中..." : interaction.canAccept ? "同意接取" : "暂无可同意申请" }}
              </button>
            </div>

            <p v-if="actionSuccessMessage" class="feedback feedback--success">{{ actionSuccessMessage }}</p>
            <p v-if="actionErrorMessage" class="feedback feedback--error">{{ actionErrorMessage }}</p>
          </section>

          <LoadingState v-if="loadingMessages" text="正在加载消息..." />

          <div v-else class="messages-thread__body">
            <article
              v-for="message in conversationDetail.messages"
              :key="message.id"
              :class="['message-row', { 'message-row--self': message.senderId === authStore.state.user?.id }]"
            >
              <img
                v-if="getMessageAvatar(message)"
                :src="getMessageAvatar(message)"
                :alt="message.senderUsername"
                class="message-avatar"
              />
              <span v-else class="message-avatar-fallback">{{ getInitial(message.senderUsername) }}</span>

              <div class="message-bubble">
                <p>{{ message.content }}</p>
                <small>{{ message.senderUsername }} · {{ formatDateTimeCN(message.createdAt) }}</small>
              </div>
            </article>
          </div>

          <footer class="messages-thread__composer surface-card">
            <textarea
              v-model="messageDraft"
              rows="4"
              placeholder="继续沟通需求、时间安排和交付方式"
            />
            <button class="primary-button" :disabled="sending" @click="sendMessage">
              {{ sending ? "发送中..." : "发送消息" }}
            </button>
          </footer>
        </div>

        <EmptyState v-else title="选择一条会话" description="接取悬赏后会自动生成对应会话。" />

        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      </section>
    </section>
</template>

<style scoped>
.messages-page {
  align-items: stretch;
}

.messages-conversations {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
}

.messages-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.messages-toolbar h3 {
  font-size: 1.06rem;
}

.messages-toolbar span {
  color: var(--text-muted);
  font-size: 12px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: var(--space-1);
  scrollbar-width: thin;
}

.conversation-item {
  padding: var(--space-4);
  min-height: 102px;
  text-align: left;
}

.conversation-item.is-active {
  border-color: rgba(120, 154, 255, 0.52);
  background: rgba(106, 141, 255, 0.2);
  box-shadow: 0 10px 22px rgba(4, 10, 20, 0.36);
}

.conversation-item__line {
  grid-template-columns: 32px minmax(0, 1fr);
}

.conversation-item__text {
  min-width: 0;
}

.messages-detail {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.messages-thread__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.messages-thread__head h3 {
  font-size: clamp(1.08rem, 1.8vw, 1.24rem);
  line-height: 1.35;
}

.messages-thread__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.messages-thread__interaction {
  margin-top: var(--space-3);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.interaction-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.interaction-copy {
  min-width: 0;
}

.interaction-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.interaction-hint {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.messages-thread__composer {
  border-radius: var(--radius-md);
  padding: var(--space-3);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.messages-thread__composer textarea {
  height: 140px;
  min-height: 140px;
  max-height: 140px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  padding-right: 132px;
  padding-bottom: 58px;
  resize: none;
  color: var(--text-primary);
  background: rgba(16, 25, 40, 0.92);
}

.messages-thread__composer textarea::placeholder {
  color: #7f94b8;
}

.messages-thread__composer .primary-button {
  position: absolute;
  right: calc(var(--space-3) + 10px);
  bottom: calc(var(--space-3) + 10px);
  z-index: 2;
  min-width: 110px;
}

@media (max-width: 900px) {
  .interaction-main {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .messages-thread__head {
    flex-direction: column;
  }

  .messages-thread__meta {
    width: 100%;
  }

  .conversation-item {
    min-height: 96px;
  }
}
</style>
