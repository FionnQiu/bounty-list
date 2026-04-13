import { onBeforeUnmount, ref } from "vue";

export function useTransientToast(defaultDuration = 2000) {
  const message = ref("");
  let timer = null;

  function clearToast() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function showToast(nextMessage, duration = defaultDuration) {
    message.value = String(nextMessage || "").trim();
    clearToast();

    if (!message.value) {
      return;
    }

    timer = window.setTimeout(() => {
      message.value = "";
      timer = null;
    }, duration);
  }

  onBeforeUnmount(() => {
    clearToast();
  });

  return {
    message,
    showToast,
    clearToast,
  };
}

