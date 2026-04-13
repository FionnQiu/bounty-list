<script>
import AppSelect from "../../../components/ui/AppSelect.vue";
import EmptyState from "../../../components/ui/EmptyState.vue";
import LoadingState from "../../../components/ui/LoadingState.vue";
import MoneyTag from "../../../components/ui/MoneyTag.vue";
import StatusTag from "../../../components/ui/StatusTag.vue";
import { useBountyDetailPage } from "../composables/useBountyDetailPage.js";

export default {
  name: "BountyDetailPageView",
  components: {
    AppSelect,
    EmptyState,
    LoadingState,
    MoneyTag,
    StatusTag,
  },
  setup() {
    return useBountyDetailPage();
  },
};
</script>

<template>
    <section v-if="loading" class="panel">
      <LoadingState text="正在加载悬赏详情..." />
    </section>

    <section v-else-if="errorMessage && !detail" class="panel">
      <p class="feedback feedback--error">{{ errorMessage }}</p>
    </section>

    <section v-else-if="detail" class="workspace workspace--detail detail-page">
      <article class="panel panel--detail-main detail-main">
        <header class="detail-main__header">
          <div class="bounty-item__meta">
            <StatusTag :status="detail.bounty.status" type="bounty" />
            <span class="bulletin-card__time">发布于 {{ formatDateTimeCN(detail.bounty.createdAt) }}</span>
          </div>
          <MoneyTag :amount="detail.bounty.rewardAmount" size="lg" />
        </header>

        <h2 class="detail-title">{{ detail.bounty.title }}</h2>
        <p class="detail-desc">{{ detail.bounty.description }}</p>

        <div class="detail-grid">
          <div class="detail-item">
            <p class="detail-label">发布时间</p>
            <p>{{ formatDateTimeCN(detail.bounty.createdAt) }}</p>
          </div>
          <div class="detail-item">
            <p class="detail-label">发布者</p>
            <p>{{ detail.bounty.publisher.username }}</p>
          </div>
          <div class="detail-item">
            <p class="detail-label">分类</p>
            <p>{{ detail.bounty.category?.name || "未分类" }}</p>
          </div>
        </div>

        <section v-if="detail.viewer.isPublisher" class="detail-status card">
          <h3>状态控制</h3>
          <div class="detail-status__row">
            <AppSelect v-model="selectedStatus" :options="statusOptions" placeholder="选择状态" />
            <button class="btn btn-primary" :disabled="statusUpdating" @click="updateStatus">
              {{ statusUpdating ? "更新中..." : "更新状态" }}
            </button>
          </div>
        </section>

        <section class="detail-status card">
          <h3>状态日志</h3>
          <EmptyState
            v-if="!detail.statusLogs?.length"
            title="暂无状态日志"
            description="当前悬赏还没有状态迁移记录。"
          />
          <div v-else class="status-log-list">
            <article v-for="log in detail.statusLogs" :key="log.id" class="status-log-item">
              <p>
                {{ log.actorUsername }} 将状态从
                <strong>{{ log.fromStatusLabel }}</strong>
                更新为
                <strong>{{ log.toStatusLabel }}</strong>
              </p>
              <span>{{ formatDateTimeCN(log.createdAt) }}</span>
            </article>
          </div>
        </section>
      </article>

      <aside class="panel panel--detail-side detail-side">
        <section class="publisher-card surface-card">
          <img
            v-if="detail.bounty.publisher.avatarUrl"
            :src="detail.bounty.publisher.avatarUrl"
            :alt="detail.bounty.publisher.username"
            class="avatar"
          />
          <h3>{{ detail.bounty.publisher.username }}</h3>
          <p>{{ detail.bounty.publisher.bio || "发布者暂无简介。" }}</p>
        </section>

        <div v-if="canApply || canReapply" class="form detail-apply">
          <label>
            <span>{{ canReapply ? "重新申请说明" : "申请说明" }}</span>
            <textarea
              v-model="applicationForm.message"
              rows="5"
              placeholder="说明你的时间安排、完成方式和交付节点"
            />
          </label>
          <button class="primary-button" :disabled="submitting" @click="applyToBounty">
            {{ submitting ? "提交中..." : canReapply ? "重新申请并发起对话" : "提交申请并发起对话" }}
          </button>
        </div>

        <section v-else-if="detail.viewer.application" class="callout surface-card">
          <h3>你已申请该悬赏</h3>
          <p>{{ detail.viewer.application.message }}</p>
          <p class="text-secondary">申请状态：{{ formatApplicationStatusLabel(detail.viewer.application.status) }}</p>
          <button class="primary-button" @click="openConversation(detail.viewer.application.conversationId)">进入会话</button>
        </section>

        <section v-else class="callout surface-card">
          <h3>这是你发布的任务</h3>
          <p>申请人接单后会自动在对话页创建会话。</p>
          <RouterLink class="ghost-button" to="/messages">查看会话</RouterLink>
        </section>

        <section v-if="detail.viewer.isPublisher" class="callout surface-card">
          <h3>申请管理</h3>
          <EmptyState
            v-if="!detail.applications?.length"
            title="暂无申请"
            description="等待他人提交申请。"
          />
          <div v-else class="application-list">
            <article v-for="item in detail.applications" :key="item.id" class="application-item">
              <header>
                <strong>{{ item.applicantUsername }}</strong>
                <StatusTag :status="item.status" type="application" />
              </header>
              <p>{{ item.message }}</p>
              <div class="application-actions">
                <button
                  v-if="item.status === 'pending' || item.status === 'contacting'"
                  class="btn btn-primary"
                  :disabled="reviewingId === item.id"
                  @click="reviewApplication(item, 'accepted')"
                >
                  通过
                </button>
                <button
                  v-if="item.status === 'pending' || item.status === 'contacting'"
                  class="btn btn-outline"
                  :disabled="reviewingId === item.id"
                  @click="reviewApplication(item, 'rejected')"
                >
                  拒绝
                </button>
                <button
                  v-if="item.conversationId"
                  class="btn btn-secondary"
                  type="button"
                  @click="openConversation(item.conversationId)"
                >
                  进入会话
                </button>
              </div>
            </article>
          </div>
        </section>

        <p v-if="successMessage" class="feedback feedback--success">{{ successMessage }}</p>
        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      </aside>
    </section>
</template>

<style scoped>
.detail-page {
  align-items: start;
  min-height: 0;
}

.detail-main {
  display: grid;
  gap: var(--space-4);
  min-height: 0;
  overflow: auto;
}

.detail-main__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.detail-title {
  margin: 0;
  font-size: clamp(1.48rem, 2.3vw, 1.98rem);
  line-height: 1.3;
}

.detail-desc {
  color: var(--text-secondary);
  line-height: 1.72;
  white-space: pre-wrap;
}

.detail-grid {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  background: rgba(18, 29, 46, 0.86);
  padding: var(--space-4);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.detail-label {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 2px;
}

.detail-status {
  padding: var(--space-4);
}

.detail-status h3 {
  margin-bottom: var(--space-3);
}

.detail-status__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3);
}

.status-log-list {
  display: grid;
  gap: var(--space-2);
}

.status-log-item {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  background: rgba(17, 27, 43, 0.84);
}

.status-log-item p {
  margin: 0 0 var(--space-1);
  color: var(--text-secondary);
}

.status-log-item span {
  color: var(--text-muted);
  font-size: 12px;
}

.detail-side {
  display: grid;
  gap: var(--space-4);
  min-height: 0;
  overflow: auto;
}

.detail-apply textarea {
  min-height: 120px;
}

.application-list {
  display: grid;
  gap: var(--space-3);
}

.application-item {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: rgba(17, 27, 43, 0.84);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.application-item header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.application-item p {
  margin: 0;
  color: var(--text-secondary);
}

.application-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

@media (max-width: 768px) {
  .detail-main,
  .detail-side {
    overflow: visible;
  }

  .detail-main__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-status__row {
    grid-template-columns: 1fr;
  }

  .detail-status__row .btn,
  .detail-status__row .primary-button {
    width: 100%;
  }

  .application-item header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}

@media (max-width: 560px) {
  .detail-main,
  .detail-side {
    gap: var(--space-3);
  }

  .application-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .application-actions .btn,
  .application-actions .primary-button {
    width: 100%;
  }
}
</style>

