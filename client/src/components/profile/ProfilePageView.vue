<script>
import BaseModal from "../ui/BaseModal.vue";
import EmptyState from "../ui/EmptyState.vue";
import LoadingState from "../ui/LoadingState.vue";
import MoneyTag from "../ui/MoneyTag.vue";
import StatusTag from "../ui/StatusTag.vue";
import { useProfilePage } from "../../utils/composables/useProfilePage.js";

export default {
  name: "ProfilePageView",
  components: {
    BaseModal,
    EmptyState,
    LoadingState,
    MoneyTag,
    StatusTag,
  },
  setup() {
    return useProfilePage();
  },
};
</script>

<template>
  <div class="profile-page">
    <section v-if="loading" class="profile-shell profile-shell--loading">
      <LoadingState text="正在加载个人信息..." />
    </section>

    <section v-else-if="profile" class="profile-shell">
      <article class="profile-card profile-hero">
        <div class="hero-identity">
          <img
            v-if="profile.user.avatarUrl"
            :src="profile.user.avatarUrl"
            :alt="profile.user.username || '用户头像'"
            class="profile-avatar"
          />
          <span v-else class="profile-avatar-fallback">{{ getInitial(profile.user.username) }}</span>

          <div class="hero-meta">
            <p class="hero-kicker">个人中心</p>
            <h1 :title="profile.user.username || '未设置用户名'">{{ profile.user.username || "未设置用户名" }}</h1>
            <p :title="profile.user.bio || ''">{{ profile.user.bio || "完善你的简介，方便协作者快速了解你。" }}</p>
          </div>
        </div>

        <dl class="hero-contact">
          <div class="hero-contact__item">
            <dt>手机号</dt>
            <dd :title="profile.user.phone || '未设置'">{{ profile.user.phone || "未设置" }}</dd>
          </div>
          <div class="hero-contact__item">
            <dt>邮箱</dt>
            <dd :title="profile.user.email || '未设置'">{{ profile.user.email || "未设置" }}</dd>
          </div>
        </dl>

        <div class="hero-stats">
          <article>
            <span>发布悬赏</span>
            <strong>{{ profile.stats?.publishedCount ?? 0 }}</strong>
          </article>
          <article>
            <span>接取记录</span>
            <strong>{{ profile.stats?.appliedCount ?? 0 }}</strong>
          </article>
        </div>

        <div class="hero-actions">
          <button class="primary-button" type="button" @click="openEditModal">编辑信息</button>
          <button class="btn btn-outline hero-logout-btn" type="button" @click="handleLogout">退出登录</button>
        </div>
      </article>

      <article class="profile-card ratings-panel">
        <header class="section-head ratings-head">
          <div>
            <h2>评价面板</h2>
            <p>查看历史评价和获得的评价</p>
          </div>

          <div class="ratings-summary">
            <span class="summary-chip">已评价 {{ ratingsSummary.sentCount }}</span>
            <span class="summary-chip">已被评 {{ ratingsSummary.receivedCount }}</span>
          </div>
        </header>

        <div class="section-body ratings-body">
          <div class="ratings-tabs" role="tablist" aria-label="评价记录切换">
            <button
              type="button"
              role="tab"
              class="ratings-tab-btn"
              :class="{ 'ratings-tab-btn--active': ratingTab === 'sent' }"
              :aria-selected="ratingTab === 'sent'"
              @click="setRatingTab('sent')"
            >
              发出的评价</button>
            <button
              type="button"
              role="tab"
              class="ratings-tab-btn"
              :class="{ 'ratings-tab-btn--active': ratingTab === 'received' }"
              :aria-selected="ratingTab === 'received'"
              @click="setRatingTab('received')"
            >
              获得的评价</button>
          </div>

          <LoadingState v-if="ratingsLoading" text="正在加载评价记录..." />

          <section v-else-if="activeRatings.length === 0" class="ratings-empty">
            <h3>暂无评价记录</h3>
            <p>完成悬赏协作后，你的评价会在这里显示。</p>
          </section>

          <ul v-else class="rating-list" :aria-label="ratingTab === 'sent' ? '已发出的评价列表' : '已获得的评价列表'">
            <li v-for="item in activeRatings" :key="`${ratingTab}-${item.id}`" class="rating-item" tabindex="0">
              <header class="rating-item__head">
                <div class="rating-item__identity">
                  <img
                    v-if="item.counterpartUser?.avatarUrl"
                    :src="item.counterpartUser.avatarUrl"
                    :alt="item.counterpartUser?.username || '用户头像'"
                    class="rating-item__avatar"
                  />
                  <span v-else class="rating-item__avatar rating-item__avatar--fallback">
                    {{ getInitial(item.counterpartUser?.username || "") }}
                  </span>

                  <div class="rating-item__meta">
                    <p class="rating-item__role">{{ ratingTab === "sent" ? "评价对象" : "评价人" }}</p>
                    <p class="rating-item__name" :title="item.counterpartUser?.username || '未知用户'">
                      {{ item.counterpartUser?.username || "未知用户" }}
                    </p>
                    <p class="rating-item__time">{{ formatRatingTime(item.createdAt) }}</p>
                  </div>
                </div>

                <div class="rating-item__score" :title="`${formatRatingScore(item.score)} 分`">
                  <span>{{ getScoreStars(item.score) }}</span>
                  <strong>{{ formatRatingScore(item.score) }}</strong>
                </div>
              </header>

              <p class="rating-item__comment" :title="item.comment || '未填写评价'">
                {{ item.comment || "未填写评价" }}
              </p>

              <footer class="rating-item__bounty">
                <p class="rating-item__bounty-title" :title="item.bounty?.title || '悬赏信息不可用'">
                  {{ item.bounty?.title || "悬赏信息不可用" }}
                </p>

                <div class="rating-item__tags">
                  <StatusTag :status="item.bounty?.status || ''" type="bounty" />
                  <span v-if="item.bounty?.category?.name" class="rating-category" :title="item.bounty.category.name">
                    {{ item.bounty.category.name }}
                  </span>
                  <MoneyTag :amount="item.bounty?.rewardAmount || 0" size="sm" />
                </div>
              </footer>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <section v-else class="profile-shell profile-shell--loading">
      <EmptyState title="个人中心加载失败" description="请刷新后重试。" />
    </section>

    <BaseModal v-model="showEditModal" title="编辑信息" aria-label="编辑个人信息" width="min(760px, 100%)">
      <form class="edit-form" @submit.prevent="updateProfileForm">
        <section class="edit-group">
          <h4>头像图片</h4>
          <div class="edit-avatar">
            <div class="edit-avatar__preview-shell">
              <img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" alt="头像预览" class="edit-avatar__preview" />
              <span v-else class="edit-avatar__fallback">{{ getInitial(profile.user.username) }}</span>
              <span class="edit-avatar__badge">{{ avatarFile ? "新头像" : "当前头像" }}</span>
            </div>

            <div class="edit-avatar__actions">
              <input
                id="avatar-upload"
                class="edit-avatar__input"
                type="file"
                accept="image/*"
                @change="onAvatarFileChange"
              />
              <label class="edit-avatar__trigger" for="avatar-upload">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 16V5m0 0l-4 4m4-4l4 4M5 15v2a2 2 0 002 2h10a2 2 0 002-2v-2"
                  />
                </svg>
                <span>选择头像图片</span>
              </label>
              <p class="edit-avatar__filename" :class="{ 'is-empty': !avatarFile }" aria-live="polite">
                {{ avatarFile ? avatarFile.name : "未选择图片文件" }}
              </p>
              <small class="edit-avatar__hint">支持 JPG / PNG / WEBP，建议不超过 2MB。</small>
            </div>
          </div>
        </section>

        <section class="edit-grid">
          <label class="edit-field">
            <span>用户名</span>
            <input v-model="form.username" type="text" maxlength="50" placeholder="请输入用户名" />
          </label>

          <label class="edit-field">
            <span>手机号</span>
            <input v-model="form.phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入 11 位手机号" />
          </label>

          <label class="edit-field">
            <span>邮箱</span>
            <input v-model="form.email" type="email" placeholder="请输入邮箱" />
          </label>

          <label class="edit-field edit-field--full">
            <span>简介</span>
            <textarea v-model="form.bio" rows="4" placeholder="介绍你的擅长方向与协作偏好"></textarea>
          </label>
        </section>

        <p v-if="saveErrorMessage" class="feedback feedback--error">{{ saveErrorMessage }}</p>

        <footer class="edit-actions">
          <button class="btn btn-outline" type="button" :disabled="saving" @click="closeEditModal">取消</button>
          <button class="primary-button" type="submit" :disabled="saving">{{ saving ? "保存中..." : "保存信息" }}</button>
        </footer>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.profile-page {
  height: 100%;
  min-height: 0;
  display: flex;
  justify-content: center;
  padding: clamp(12px, 2vw, 20px);
}

.profile-shell {
  width: min(1180px, 100%);
  height: 100%;
  display: grid;
  gap: var(--space-4);
  align-content: start;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding-right: var(--space-1);
}

.profile-shell--loading {
  place-items: center;
}

.profile-card {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-lg);
  background: rgba(12, 20, 36, 0.76);
  box-shadow: 0 16px 36px rgba(5, 10, 20, 0.34);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.profile-hero {
  display: grid;
  gap: var(--space-4);
  padding: clamp(18px, 3vw, 26px);
}

.hero-identity {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar,
.profile-avatar-fallback {
  width: 76px;
  height: 76px;
  border-radius: var(--radius-lg);
}

.profile-avatar {
  object-fit: cover;
  border: 1px solid rgba(166, 187, 221, 0.45);
}

.profile-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.55rem;
  font-weight: 700;
  color: #dbe6ff;
  background: rgba(40, 64, 103, 0.62);
  border: 1px solid rgba(143, 169, 219, 0.48);
}

.hero-meta {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.hero-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.hero-meta h1 {
  margin: 0;
  font-size: clamp(1.32rem, 2.2vw, 1.82rem);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-meta p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.hero-contact {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.hero-contact__item {
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: rgba(15, 26, 44, 0.68);
}

.hero-contact__item dt {
  font-size: 12px;
  color: var(--text-muted);
}

.hero-contact__item dd {
  margin: 6px 0 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.hero-stats article {
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: rgba(15, 26, 44, 0.68);
  display: grid;
  gap: 4px;
}

.hero-stats span {
  color: var(--text-muted);
  font-size: 12px;
}

.hero-stats strong {
  color: var(--text-primary);
  font-size: 1.28rem;
  font-variant-numeric: tabular-nums;
}

.hero-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.profile-sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.profile-section {
  min-height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.section-head {
  padding: 16px 18px;
  border-bottom: 1px solid var(--line-soft);
}

.section-head h2 {
  margin: 0;
  font-size: 1.06rem;
}

.section-head p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.section-body {
  padding: 16px 18px;
}

.account-list {
  margin: 0;
  display: grid;
  gap: 10px;
}

.account-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: rgba(15, 26, 44, 0.68);
}

.account-row dt {
  color: var(--text-muted);
  font-size: 12px;
}

.account-row dd {
  margin: 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-row--bio {
  align-items: start;
}

.account-row--bio dd {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.copy-btn {
  min-height: 32px;
  border-radius: calc(var(--radius-xs) + 2px);
  border: 1px solid var(--line-soft);
  background: rgba(20, 33, 55, 0.8);
  color: var(--text-secondary);
  padding: 0 12px;
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.section-body--overview {
  display: grid;
  gap: 14px;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.overview-stats article {
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: rgba(15, 26, 44, 0.68);
  display: grid;
  gap: 4px;
}

.overview-stats span {
  color: var(--text-muted);
  font-size: 12px;
}

.overview-stats strong {
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
}

.overview-links {
  display: grid;
  gap: 10px;
}

.ratings-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.ratings-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.ratings-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-chip {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(134, 162, 214, 0.45);
  background: rgba(21, 36, 60, 0.72);
  font-size: 12px;
  color: var(--text-secondary);
}

.ratings-body {
  display: grid;
  gap: 12px;
}

.ratings-tabs {
  display: inline-flex;
  gap: 8px;
}

.ratings-tab-btn {
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--line-soft);
  padding: 0 14px;
  background: rgba(20, 33, 55, 0.8);
  color: var(--text-secondary);
}

.ratings-tab-btn--active {
  border-color: rgba(132, 166, 255, 0.54);
  color: #dbe8ff;
  background: rgba(106, 141, 255, 0.24);
}

.ratings-empty {
  padding: 24px;
  border: 1px dashed var(--line-soft);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.ratings-empty h3 {
  margin: 0;
}

.ratings-empty p {
  margin: 8px 0 0;
}

.rating-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.rating-item {
  border: 1px solid var(--line-soft);
  border-radius: calc(var(--radius-sm) + 2px);
  background: rgba(15, 26, 44, 0.68);
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.rating-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rating-item__identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rating-item__avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.rating-item__avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(40, 64, 103, 0.62);
  border: 1px solid rgba(143, 169, 219, 0.48);
  color: #dbe6ff;
  font-weight: 700;
}

.rating-item__meta {
  min-width: 0;
}

.rating-item__role,
.rating-item__time {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.2;
}

.rating-item__name {
  margin: 2px 0 0;
  color: var(--text-primary);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rating-item__score {
  display: grid;
  justify-items: end;
  gap: 0;
  color: #ffd972;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

.rating-item__comment {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rating-item__bounty {
  display: grid;
  gap: 6px;
}

.rating-item__bounty-title {
  margin: 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rating-item__tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rating-category {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(134, 162, 214, 0.45);
  background: rgba(21, 36, 60, 0.72);
  font-size: 11px;
  color: var(--text-secondary);
}

.edit-form {
  display: grid;
  gap: 16px;
}

.edit-group h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.edit-avatar {
  margin-top: 10px;
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.edit-avatar__preview-shell {
  position: relative;
  width: 96px;
  min-width: 96px;
  height: 96px;
  border-radius: calc(var(--radius-md) + 2px);
}

.edit-avatar__preview,
.edit-avatar__fallback {
  width: 96px;
  height: 96px;
  border-radius: calc(var(--radius-md) + 2px);
}

.edit-avatar__preview {
  object-fit: cover;
  border: 1px solid rgba(159, 181, 217, 0.55);
  box-shadow:
    0 10px 22px rgba(5, 10, 20, 0.36),
    inset 0 1px 0 rgba(214, 228, 255, 0.16);
}

.edit-avatar__fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: #dbe6ff;
  background: linear-gradient(160deg, rgba(49, 73, 112, 0.88), rgba(33, 50, 81, 0.78));
  border: 1px solid rgba(143, 169, 219, 0.56);
}

.edit-avatar__badge {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(164, 190, 235, 0.5);
  background: rgba(14, 24, 40, 0.78);
  color: #dce8ff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.edit-avatar__actions {
  display: grid;
  align-content: start;
  gap: 10px;
}

.edit-avatar__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.edit-avatar__trigger {
  min-height: 44px;
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(150, 178, 225, 0.55);
  background: linear-gradient(160deg, rgba(23, 38, 62, 0.92), rgba(17, 28, 47, 0.82));
  color: #d9e7ff;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    background-color 180ms ease;
}

.edit-avatar__trigger svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.edit-avatar__trigger:hover {
  border-color: rgba(174, 201, 245, 0.74);
  box-shadow:
    0 8px 18px rgba(8, 16, 30, 0.35),
    inset 0 1px 0 rgba(226, 237, 255, 0.14);
  transform: translateY(-1px);
}

.edit-avatar__trigger:focus-visible {
  outline: 2px solid rgba(149, 189, 255, 0.92);
  outline-offset: 2px;
}

.edit-avatar__filename {
  margin: 0;
  max-width: 320px;
  color: #d5e2fb;
  font-size: 12px;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-avatar__filename.is-empty {
  color: var(--text-muted);
}

.edit-avatar__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.edit-field {
  display: grid;
  gap: 6px;
}

.edit-field--full {
  grid-column: 1 / -1;
}

.edit-field span {
  color: var(--text-secondary);
  font-size: 12px;
}

.edit-field input,
.edit-field textarea {
  width: 100%;
  border-radius: calc(var(--radius-xs) + 2px);
  border: 1px solid var(--line-soft);
  background: rgba(15, 26, 44, 0.68);
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: 14px;
}

.edit-field textarea {
  resize: vertical;
  min-height: 96px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.feedback {
  margin: 0;
  font-size: 13px;
}

.feedback--error {
  color: #ffb7b7;
}

@media (max-width: 992px) {
  .profile-sections {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding: 10px;
  }

  .profile-shell {
    max-height: none;
  }

  .hero-contact,
  .hero-stats,
  .overview-stats,
  .edit-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    justify-content: stretch;
  }

  .hero-actions .primary-button,
  .hero-actions .btn,
  .edit-actions .primary-button,
  .edit-actions .btn {
    width: 100%;
  }

  .hero-actions,
  .edit-actions {
    flex-direction: column;
  }

  .account-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .copy-btn {
    justify-self: flex-start;
  }

  .edit-avatar {
    flex-direction: column;
    align-items: flex-start;
  }

  .edit-avatar__preview-shell {
    width: 88px;
    min-width: 88px;
    height: 88px;
  }

  .edit-avatar__preview,
  .edit-avatar__fallback {
    width: 88px;
    height: 88px;
  }

  .edit-avatar__actions {
    width: 100%;
  }

  .edit-avatar__trigger {
    width: 100%;
    justify-content: center;
  }

  .edit-avatar__filename {
    max-width: 100%;
  }

  .ratings-head {
    flex-direction: column;
  }
}
</style>

