<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { getMyProfile, updateMyProfile } from "../api/users.js";
import BaseModal from "../components/ui/BaseModal.vue";
import LoadingState from "../components/ui/LoadingState.vue";
import TopToast from "../components/ui/TopToast.vue";
import { useAvatarUpload } from "../composables/useAvatarUpload.js";
import { useTransientToast } from "../composables/useTransientToast.js";
import { getInitialChar } from "../utils/text.js";
import { authStore } from "../store/auth.js";

const phonePattern = /^1\d{10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const showEditModal = ref(false);
const pageErrorMessage = ref("");
const saveErrorMessage = ref("");
const profile = ref(null);
const toastTone = ref("success");

const { message: toastMessage, showToast } = useTransientToast(2000);
const {
  avatarFile,
  avatarPreviewUrl,
  setAvatarPreviewFromUrl,
  resetAvatarSelection,
  changeAvatarFile,
  fileToDataUrl,
} = useAvatarUpload();

const form = reactive({
  username: "",
  bio: "",
  phone: "",
  email: "",
});

function showTopToast(message, tone = "success") {
  toastTone.value = tone;
  showToast(message, 2000);
}

function getInitial(value) {
  return getInitialChar(value, "我");
}

function syncFormFromProfile() {
  if (!profile.value) {
    return;
  }

  form.username = profile.value.user.username || "";
  form.bio = profile.value.user.bio || "";
  form.phone = profile.value.user.phone || "";
  form.email = profile.value.user.email || "";
  setAvatarPreviewFromUrl(profile.value.user.avatarUrl || "");
}

function onAvatarFileChange(event) {
  if (!event?.target?.files?.[0]) {
    resetAvatarSelection(profile.value?.user?.avatarUrl || "");
    saveErrorMessage.value = "";
    return;
  }

  const result = changeAvatarFile(event);
  saveErrorMessage.value = result.ok ? "" : result.message;
}

function validateProfileForm() {
  const username = String(form.username || "").trim();
  const phone = String(form.phone || "").trim();
  const email = String(form.email || "").trim().toLowerCase();
  const bio = String(form.bio || "").trim();

  if (!username || !phone || !email) {
    return "用户名、手机号和邮箱不能为空。";
  }

  if (username.length > 50) {
    return "用户名不能超过 50 个字符。";
  }

  if (!phonePattern.test(phone)) {
    return "手机号格式不正确，请输入 11 位手机号。";
  }

  if (!emailPattern.test(email)) {
    return "邮箱格式不正确，请检查后重试。";
  }

  form.username = username;
  form.phone = phone;
  form.email = email;
  form.bio = bio;
  return "";
}

async function copyField(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    return;
  }

  if (!navigator?.clipboard?.writeText) {
    showTopToast("当前环境不支持自动复制，请手动复制。", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showTopToast(`${label}已复制`, "info");
  } catch {
    showTopToast("复制失败，请手动复制。", "error");
  }
}

async function loadProfile() {
  loading.value = true;
  pageErrorMessage.value = "";

  try {
    const data = await getMyProfile();
    profile.value = data;
    syncFormFromProfile();
  } catch (error) {
    pageErrorMessage.value = error.message || "加载个人中心失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

function openEditModal() {
  if (!profile.value) {
    return;
  }

  syncFormFromProfile();
  resetAvatarSelection(profile.value.user.avatarUrl || "");
  saveErrorMessage.value = "";
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  saveErrorMessage.value = "";
}

function goWorkbench() {
  router.push("/workbench");
}

function goMessages() {
  router.push("/messages");
}

function goBounties() {
  router.push("/bounties");
}

async function updateProfileForm() {
  if (saving.value) {
    return;
  }

  const validationError = validateProfileForm();
  if (validationError) {
    saveErrorMessage.value = validationError;
    return;
  }

  saveErrorMessage.value = "";
  saving.value = true;

  try {
    const payload = {
      username: form.username,
      bio: form.bio,
      phone: form.phone,
      email: form.email,
    };

    if (avatarFile.value) {
      payload.avatarImageData = await fileToDataUrl(avatarFile.value);
      payload.avatarImageName = avatarFile.value.name;
    }

    const data = await updateMyProfile(payload);
    authStore.updateUser(data.user);
    showTopToast("个人资料已更新。", "success");
    await loadProfile();
    closeEditModal();
  } catch (error) {
    saveErrorMessage.value = error.message || "保存失败，请稍后重试。";
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadProfile();
});
</script>

<template>
  <section v-if="loading" class="profile-shell profile-shell--loading">
    <LoadingState text="正在加载个人信息..." />
  </section>

  <section v-else-if="profile" class="profile-shell">
    <article class="profile-hero panel-surface">
      <div class="profile-hero__identity">
        <img v-if="profile.user.avatarUrl" :src="profile.user.avatarUrl" :alt="profile.user.username" class="profile-avatar" />
        <span v-else class="profile-avatar-fallback">{{ getInitial(profile.user.username) }}</span>

        <div class="profile-hero__meta">
          <p class="profile-kicker">个人中心</p>
          <h1 :title="profile.user.username || '未设置用户名'">{{ profile.user.username || "未设置用户名" }}</h1>
          <p :title="profile.user.bio || ''">{{ profile.user.bio || "完善你的简介，方便协作者快速了解你。" }}</p>
        </div>
      </div>

      <dl class="profile-hero__contact">
        <div>
          <dt>手机号</dt>
          <dd :title="profile.user.phone || '未设置'">{{ profile.user.phone || "未设置" }}</dd>
        </div>
        <div>
          <dt>邮箱</dt>
          <dd :title="profile.user.email || '未设置'">{{ profile.user.email || "未设置" }}</dd>
        </div>
      </dl>

      <div class="profile-hero__stats">
        <article>
          <span>发布悬赏</span>
          <strong>{{ profile.stats?.publishedCount ?? 0 }}</strong>
        </article>
        <article>
          <span>接取记录</span>
          <strong>{{ profile.stats?.appliedCount ?? 0 }}</strong>
        </article>
      </div>

      <div class="profile-hero__actions">
        <button class="primary-button" type="button" @click="openEditModal">编辑信息</button>
      </div>
    </article>

    <section class="profile-panels">
      <article class="profile-panel panel-surface">
        <header class="profile-panel__head">
          <h2>账号资料</h2>
          <p>信息可复制，便于快速分享。</p>
        </header>

        <div class="profile-panel__body">
          <dl class="profile-details">
            <div class="profile-details__row">
              <dt>用户名</dt>
              <dd :title="profile.user.username || '未设置'">{{ profile.user.username || "未设置" }}</dd>
              <button
                class="profile-copy"
                type="button"
                :disabled="!profile.user.username"
                @click="copyField(profile.user.username, '用户名')"
              >
                复制
              </button>
            </div>

            <div class="profile-details__row">
              <dt>手机号</dt>
              <dd :title="profile.user.phone || '未设置'">{{ profile.user.phone || "未设置" }}</dd>
              <button
                class="profile-copy"
                type="button"
                :disabled="!profile.user.phone"
                @click="copyField(profile.user.phone, '手机号')"
              >
                复制
              </button>
            </div>

            <div class="profile-details__row">
              <dt>邮箱</dt>
              <dd :title="profile.user.email || '未设置'">{{ profile.user.email || "未设置" }}</dd>
              <button
                class="profile-copy"
                type="button"
                :disabled="!profile.user.email"
                @click="copyField(profile.user.email, '邮箱')"
              >
                复制
              </button>
            </div>

            <div class="profile-details__row profile-details__row--bio">
              <dt>简介</dt>
              <dd :title="profile.user.bio || '暂无简介'">{{ profile.user.bio || "暂无简介" }}</dd>
              <button
                class="profile-copy"
                type="button"
                :disabled="!profile.user.bio"
                @click="copyField(profile.user.bio, '简介')"
              >
                复制
              </button>
            </div>
          </dl>
        </div>
      </article>

      <article class="profile-panel panel-surface">
        <header class="profile-panel__head">
          <h2>协作概览</h2>
          <p>常用入口与数据聚合展示。</p>
        </header>

        <div class="profile-panel__body profile-panel__body--overview">
          <div class="overview-stats">
            <article>
              <span>我发布的</span>
              <strong>{{ profile.stats?.publishedCount ?? 0 }}</strong>
            </article>
            <article>
              <span>我接取的</span>
              <strong>{{ profile.stats?.appliedCount ?? 0 }}</strong>
            </article>
          </div>

          <div class="overview-links">
            <button class="btn btn-outline" type="button" @click="goWorkbench">前往工作台</button>
            <button class="btn btn-outline" type="button" @click="goMessages">进入私信</button>
            <button class="btn btn-outline" type="button" @click="goBounties">浏览悬赏广场</button>
          </div>
        </div>
      </article>
    </section>

    <p v-if="pageErrorMessage" class="feedback feedback--error">{{ pageErrorMessage }}</p>
  </section>

  <section v-else class="profile-shell profile-shell--loading">
    <p class="feedback feedback--error">{{ pageErrorMessage || "个人中心加载失败，请刷新重试。" }}</p>
  </section>

  <TopToast :message="toastMessage" :tone="toastTone" />

  <BaseModal v-model="showEditModal" title="编辑信息" aria-label="编辑个人信息" width="min(760px, 100%)">
    <form class="edit-form" @submit.prevent="updateProfileForm">
      <section class="edit-group">
        <h4>头像图片</h4>
        <div class="edit-avatar">
          <img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" alt="头像预览" class="edit-avatar__preview" />
          <span v-else class="edit-avatar__fallback">{{ getInitial(profile.user.username) }}</span>

          <div class="edit-avatar__actions">
            <div class="edit-avatar__file-shell">
              <svg class="edit-avatar__file-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10m0-10 4 4m-4-4-4 4M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
              </svg>
              <span class="edit-avatar__file-text" :title="avatarFile ? avatarFile.name : '选择头像图片（JPG/PNG/WEBP）'">
                {{ avatarFile ? `已选择：${avatarFile.name}` : "选择头像图片（JPG/PNG/WEBP）" }}
              </span>
              <span class="edit-avatar__file-cta">上传</span>
              <input class="edit-avatar__file-input" type="file" accept="image/*" aria-label="上传头像图片" @change="onAvatarFileChange" />
            </div>
            <small>支持 JPG、PNG、WEBP，大小不超过 5MB</small>
          </div>
        </div>
      </section>

      <section class="edit-group">
        <h4>基础信息</h4>
        <div class="edit-grid">
          <label class="edit-field">
            <span>用户名</span>
            <input v-model="form.username" type="text" maxlength="50" placeholder="请输入用户名" required />
          </label>

          <label class="edit-field">
            <span>手机号</span>
            <input v-model="form.phone" type="tel" placeholder="请输入 11 位手机号" required />
          </label>

          <label class="edit-field edit-field--full">
            <span>邮箱</span>
            <input v-model="form.email" type="email" placeholder="请输入邮箱" required />
          </label>
        </div>
      </section>

      <section class="edit-group">
        <h4>个人简介</h4>
        <label class="edit-field">
          <textarea v-model="form.bio" rows="4" placeholder="说明你的擅长领域、在线时段与协作偏好" />
        </label>
      </section>

      <p v-if="saveErrorMessage" class="feedback feedback--error">{{ saveErrorMessage }}</p>

      <div class="edit-form__actions">
        <button type="button" class="btn btn-outline" @click="closeEditModal">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? "保存中..." : "保存修改" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.profile-shell {
  --profile-bg: #0b1220;
  --profile-surface: rgba(18, 29, 45, 0.76);
  --profile-surface-soft: rgba(24, 37, 58, 0.72);
  --profile-border: rgba(114, 145, 194, 0.34);
  --profile-text-main: #ecf2ff;
  --profile-text-sub: #b2c4e1;

  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 14px;
  height: calc(100dvh - var(--top-dock-height) - var(--page-padding) - var(--page-padding));
  max-height: calc(100dvh - var(--top-dock-height) - var(--page-padding) - var(--page-padding));
  min-height: 0;
  overflow: hidden;
  padding: clamp(12px, 1.8vw, 20px);
  border-radius: 24px;
  background:
    radial-gradient(940px 360px at -12% -22%, rgba(124, 156, 255, 0.18), transparent 62%),
    linear-gradient(180deg, var(--profile-bg), #080f1b);
}

.profile-shell--loading {
  max-width: 560px;
  align-content: start;
}

.panel-surface {
  border: 1px solid var(--profile-border);
  border-radius: 20px;
  background: var(--profile-surface);
  box-shadow: 0 16px 34px rgba(3, 10, 20, 0.32);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.profile-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.85fr) auto auto;
  align-items: center;
  gap: 14px;
  padding: clamp(14px, 2.2vw, 22px);
  min-height: 0;
}

.profile-hero__identity {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.profile-avatar,
.profile-avatar-fallback {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  flex-shrink: 0;
}

.profile-avatar {
  object-fit: cover;
  border: 1px solid var(--profile-border);
}

.profile-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--profile-text-sub);
  background: linear-gradient(160deg, rgba(73, 104, 155, 0.5), rgba(35, 53, 83, 0.52));
  border: 1px solid var(--profile-border);
  font-size: 27px;
  font-weight: 700;
}

.profile-hero__meta {
  min-width: 0;
}

.profile-kicker {
  margin: 0;
  color: var(--profile-text-sub);
  font-size: 12px;
  letter-spacing: 0.06em;
}

.profile-hero__meta h1 {
  margin: 6px 0 0;
  color: var(--profile-text-main);
  font-size: clamp(1.25rem, 1.8vw, 1.72rem);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-hero__meta p {
  margin: 8px 0 0;
  color: var(--profile-text-sub);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-hero__contact {
  margin: 0;
  display: grid;
  gap: 8px;
  min-width: 0;
}

.profile-hero__contact dt {
  margin: 0;
  color: var(--profile-text-sub);
  font-size: 12px;
}

.profile-hero__contact dd {
  margin: 4px 0 0;
  color: var(--profile-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(88px, 112px));
  gap: 8px;
}

.profile-hero__stats article {
  border: 1px solid var(--profile-border);
  border-radius: 14px;
  background: var(--profile-surface-soft);
  padding: 10px 12px;
  display: grid;
  gap: 3px;
}

.profile-hero__stats span {
  color: var(--profile-text-sub);
  font-size: 12px;
}

.profile-hero__stats strong {
  color: var(--profile-text-main);
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
}

.profile-hero__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
}

.profile-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

.profile-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.profile-panel__head {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(114, 145, 194, 0.24);
}

.profile-panel__head h2 {
  margin: 0;
  font-size: 1.04rem;
  color: var(--profile-text-main);
}

.profile-panel__head p {
  margin: 0;
  color: var(--profile-text-sub);
  font-size: 12px;
}

.profile-panel__body {
  padding: 12px 18px 16px;
  min-height: 0;
  overflow: auto;
}

.profile-details {
  margin: 0;
  display: grid;
  gap: 10px;
}

.profile-details__row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(114, 145, 194, 0.24);
  border-radius: 12px;
  background: rgba(24, 37, 58, 0.42);
}

.profile-details__row dt {
  margin: 0;
  color: var(--profile-text-sub);
  font-size: 12px;
}

.profile-details__row dd {
  margin: 0;
  color: var(--profile-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-details__row--bio {
  align-items: start;
}

.profile-details__row--bio dd {
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

.profile-copy {
  height: 28px;
  min-width: 52px;
  border-radius: 999px;
  border: 1px solid rgba(114, 145, 194, 0.36);
  background: rgba(24, 37, 58, 0.68);
  color: var(--profile-text-sub);
  padding: 0 11px;
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 160ms var(--ease-standard),
    color 160ms var(--ease-standard),
    background-color 160ms var(--ease-standard);
}

.profile-copy:hover:not(:disabled),
.profile-copy:focus-visible:not(:disabled) {
  border-color: rgba(143, 173, 218, 0.76);
  color: var(--profile-text-main);
  background: rgba(34, 51, 78, 0.82);
  outline: none;
}

.profile-copy:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.profile-panel__body--overview {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 14px;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.overview-stats article {
  border: 1px solid rgba(114, 145, 194, 0.24);
  border-radius: 12px;
  background: rgba(24, 37, 58, 0.42);
  padding: 12px;
  display: grid;
  gap: 4px;
}

.overview-stats span {
  color: var(--profile-text-sub);
  font-size: 12px;
}

.overview-stats strong {
  color: var(--profile-text-main);
  font-size: 1.32rem;
  font-variant-numeric: tabular-nums;
}

.overview-links {
  display: grid;
  gap: 8px;
  align-content: start;
}

.edit-form {
  display: grid;
  gap: 14px;
}

.edit-group {
  border: 1px solid rgba(129, 154, 194, 0.34);
  border-radius: 14px;
  background: rgba(20, 31, 50, 0.42);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.edit-group h4 {
  margin: 0;
  font-size: 14px;
  color: var(--profile-text-main);
}

.edit-avatar {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(129, 154, 194, 0.5);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(30, 45, 70, 0.78), rgba(19, 30, 48, 0.72)),
    radial-gradient(circle at 82% -20%, rgba(166, 193, 238, 0.14), transparent 60%);
  padding: 12px;
}

.edit-avatar__preview,
.edit-avatar__fallback {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  flex-shrink: 0;
}

.edit-avatar__preview {
  object-fit: cover;
  border: 1px solid var(--profile-border);
  background: #142036;
}

.edit-avatar__fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--profile-border);
  background: #1a2a43;
  color: var(--profile-text-sub);
  font-weight: 700;
}

.edit-avatar__actions {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.edit-avatar__file-shell {
  position: relative;
  min-height: 48px;
  border: 1px dashed rgba(133, 162, 208, 0.58);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(30, 44, 67, 0.72), rgba(20, 31, 49, 0.64)),
    radial-gradient(circle at 15% 0%, rgba(173, 199, 241, 0.14), transparent 58%);
  padding: 0 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  transition:
    border-color 160ms var(--ease-standard),
    box-shadow 160ms var(--ease-standard);
}

.edit-avatar__file-shell:hover,
.edit-avatar__file-shell:focus-within {
  border-color: rgba(161, 188, 233, 0.9);
  box-shadow:
    0 0 0 3px rgba(114, 147, 215, 0.22),
    inset 0 1px 0 rgba(231, 241, 255, 0.2);
}

.edit-avatar__file-icon {
  width: 16px;
  height: 16px;
  stroke: #cfe0ff;
  stroke-width: 2;
  fill: none;
  opacity: 0.92;
}

.edit-avatar__file-text {
  color: #d8e5ff;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-avatar__file-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(136, 165, 214, 0.56);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(58, 84, 128, 0.56), rgba(38, 57, 88, 0.48)),
    radial-gradient(circle at 50% -25%, rgba(224, 236, 255, 0.22), transparent 65%);
  color: #e6efff;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
}

.edit-avatar__file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
}

.edit-avatar__actions small {
  color: var(--profile-text-sub);
  font-size: 12px;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.edit-field {
  display: grid;
  gap: 7px;
}

.edit-field--full {
  grid-column: 1 / -1;
}

.edit-field span {
  font-size: 13px;
  color: var(--profile-text-main);
  font-weight: 600;
}

.edit-field input,
.edit-field textarea {
  width: 100%;
  border: 1px solid rgba(129, 154, 194, 0.58);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(29, 43, 67, 0.84), rgba(18, 28, 45, 0.82)),
    radial-gradient(circle at 88% -20%, rgba(168, 194, 238, 0.16), transparent 58%);
  color: var(--profile-text-main);
  padding: 0 12px;
  transition:
    border-color 160ms var(--ease-standard),
    box-shadow 160ms var(--ease-standard);
}

.edit-field input {
  height: 42px;
}

.edit-field textarea {
  min-height: 116px;
  padding: 10px 12px;
  resize: vertical;
}

.edit-field input:hover,
.edit-field textarea:hover {
  border-color: rgba(151, 178, 221, 0.74);
}

.edit-field input:focus,
.edit-field textarea:focus {
  outline: none;
  border-color: rgba(165, 191, 233, 0.92);
  box-shadow:
    0 0 0 3px rgba(109, 142, 208, 0.3),
    inset 0 1px 0 rgba(228, 238, 255, 0.18);
}

.edit-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 1200px) {
  .profile-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .profile-hero__actions {
    justify-self: start;
  }
}

@media (max-width: 900px) {
  .profile-panels {
    grid-template-columns: 1fr;
  }

  .overview-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .profile-shell {
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .profile-hero__identity {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-hero__stats {
    grid-template-columns: 1fr 1fr;
  }

  .profile-hero__actions {
    flex-wrap: wrap;
  }

  .profile-details__row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "label action"
      "value value";
  }

  .profile-details__row dt {
    grid-area: label;
  }

  .profile-details__row dd {
    grid-area: value;
  }

  .profile-copy {
    grid-area: action;
  }

  .edit-avatar {
    flex-direction: column;
    align-items: flex-start;
  }

  .edit-grid {
    grid-template-columns: 1fr;
  }

  .edit-form__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .overview-stats {
    grid-template-columns: 1fr;
  }
}
</style>
