import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { getMyProfile, getMyRatings, updateMyProfile } from "../../api/users.js";
import { useAvatarUpload } from "./useAvatarUpload.js";
import { authStore } from "../../store/auth.js";
import { feedbackStore } from "../../store/feedback.js";
import { formatDateTimeCN } from "../datetime.js";
import { getInitialChar } from "../text.js";
import {
  PROFILE_DEFAULT_RATING_TAB,
  PROFILE_EMAIL_PATTERN,
  PROFILE_PHONE_PATTERN,
} from "../constants/profilePage.constants.js";

export function useProfilePage() {
  const router = useRouter();

  const loading = ref(true);
  const saving = ref(false);
  const showEditModal = ref(false);
  const pageErrorMessage = ref("");
  const saveErrorMessage = ref("");
  const profile = ref(null);
  const ratingsLoading = ref(false);
  const ratingTab = ref(PROFILE_DEFAULT_RATING_TAB);
  const sentRatings = ref([]);
  const receivedRatings = ref([]);
  const ratingsSummary = reactive({
    sentCount: 0,
    receivedCount: 0,
    receivedAverageScore: 0,
  });

  const activeRatings = computed(() => (ratingTab.value === "sent" ? sentRatings.value : receivedRatings.value));

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
    feedbackStore.pushFeedback(message, { tone, duration: 3000 });
  }

  function getInitial(value) {
    return getInitialChar(value, "我");
  }

  function formatAverageScore(value) {
    const score = Number(value || 0);
    if (!Number.isFinite(score)) {
      return "0.0";
    }

    return score.toFixed(1);
  }

  function formatRatingScore(value) {
    const score = Number(value || 0);
    if (!Number.isFinite(score)) {
      return "0.0";
    }

    return score.toFixed(1);
  }

  function formatRatingTime(value) {
    return formatDateTimeCN(value, "-");
  }

  function getScoreStars(value) {
    const score = Number(value || 0);
    const rounded = Number.isFinite(score) ? Math.round(score) : 0;
    const safeScore = Math.max(0, Math.min(5, rounded));
    return `${"★".repeat(safeScore)}${"☆".repeat(5 - safeScore)}`;
  }

  function setRatingTab(nextTab) {
    if (nextTab !== "sent" && nextTab !== "received") {
      return;
    }

    ratingTab.value = nextTab;
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

    if (!PROFILE_PHONE_PATTERN.test(phone)) {
      return "手机号格式不正确，请输入 11 位手机号。";
    }

    if (!PROFILE_EMAIL_PATTERN.test(email)) {
      return "邮箱格式不正确，请检查后重试。";
    }

    form.username = username;
    form.phone = phone;
    form.email = email;
    form.bio = bio;
    return "";
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
      feedbackStore.pushFeedback(pageErrorMessage.value, { tone: "error", duration: 3000 });
    } finally {
      loading.value = false;
    }
  }

  async function loadRatings() {
    ratingsLoading.value = true;

    try {
      const data = await getMyRatings();
      const summary = data.summary || {};

      sentRatings.value = Array.isArray(data.sentRatings) ? data.sentRatings : [];
      receivedRatings.value = Array.isArray(data.receivedRatings) ? data.receivedRatings : [];
      ratingsSummary.sentCount = Number(summary.sentCount || 0);
      ratingsSummary.receivedCount = Number(summary.receivedCount || 0);
      ratingsSummary.receivedAverageScore = Number(summary.receivedAverageScore || 0);
    } catch (error) {
      sentRatings.value = [];
      receivedRatings.value = [];
      ratingsSummary.sentCount = 0;
      ratingsSummary.receivedCount = 0;
      ratingsSummary.receivedAverageScore = 0;
      feedbackStore.pushFeedback(error.message || "加载评价记录失败，请稍后重试。", {
        tone: "error",
        duration: 3000,
      });
    } finally {
      ratingsLoading.value = false;
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

  function handleLogout() {
    authStore.clearSession();
    void router.push("/login");
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
      saveErrorMessage.value = "";
      feedbackStore.pushFeedback(error.message || "保存失败，请稍后重试。", {
        tone: "error",
        duration: 3000,
      });
    } finally {
      saving.value = false;
    }
  }

  onMounted(() => {
    void loadProfile();
    void loadRatings();
  });

  return {
    loading,
    saving,
    showEditModal,
    pageErrorMessage,
    saveErrorMessage,
    profile,
    ratingsLoading,
    ratingTab,
    sentRatings,
    receivedRatings,
    ratingsSummary,
    activeRatings,
    avatarFile,
    avatarPreviewUrl,
    form,
    getInitial,
    formatAverageScore,
    formatRatingScore,
    formatRatingTime,
    getScoreStars,
    setRatingTab,
    onAvatarFileChange,
    openEditModal,
    closeEditModal,
    handleLogout,
    updateProfileForm,
  };
}
