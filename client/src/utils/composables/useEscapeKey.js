import { onBeforeUnmount, onMounted } from "vue";

export function useEscapeKey(onEscape) {
  function handleKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    onEscape?.(event);
  }

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
}

