import { onBeforeUnmount, ref } from "vue";

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export function useAvatarUpload({ maxSize = DEFAULT_MAX_SIZE } = {}) {
  const avatarFile = ref(null);
  const avatarPreviewUrl = ref("");
  const avatarPreviewObjectUrl = ref("");

  function revokeAvatarPreviewObjectUrl() {
    if (!avatarPreviewObjectUrl.value) {
      return;
    }

    URL.revokeObjectURL(avatarPreviewObjectUrl.value);
    avatarPreviewObjectUrl.value = "";
  }

  function setAvatarPreviewFromUrl(url) {
    if (avatarPreviewObjectUrl.value) {
      return;
    }

    avatarPreviewUrl.value = url || "";
  }

  function resetAvatarSelection(fallbackUrl = "") {
    avatarFile.value = null;
    revokeAvatarPreviewObjectUrl();
    avatarPreviewUrl.value = fallbackUrl || "";
  }

  function changeAvatarFile(event) {
    const file = event?.target?.files?.[0];

    if (!file) {
      return {
        ok: false,
        message: "",
      };
    }

    if (!String(file.type || "").startsWith("image/")) {
      if (event?.target) {
        event.target.value = "";
      }
      return {
        ok: false,
        message: "请上传图片文件。",
      };
    }

    if (file.size > maxSize) {
      if (event?.target) {
        event.target.value = "";
      }
      return {
        ok: false,
        message: "头像图片不能超过 5MB。",
      };
    }

    avatarFile.value = file;
    revokeAvatarPreviewObjectUrl();
    avatarPreviewObjectUrl.value = URL.createObjectURL(file);
    avatarPreviewUrl.value = avatarPreviewObjectUrl.value;

    return {
      ok: true,
      message: "",
    };
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("头像文件读取失败，请重试。"));
      reader.readAsDataURL(file);
    });
  }

  onBeforeUnmount(() => {
    revokeAvatarPreviewObjectUrl();
  });

  return {
    avatarFile,
    avatarPreviewUrl,
    setAvatarPreviewFromUrl,
    resetAvatarSelection,
    changeAvatarFile,
    fileToDataUrl,
    revokeAvatarPreviewObjectUrl,
  };
}

