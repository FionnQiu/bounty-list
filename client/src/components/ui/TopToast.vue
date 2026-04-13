<script setup>
defineProps({
  message: { type: String, default: "" },
  tone: { type: String, default: "success" },
});
</script>

<template>
  <Teleport to="body">
    <Transition name="top-toast-fade">
      <div v-if="message" class="top-toast" :class="`top-toast--${tone}`" role="status" aria-live="polite">
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.top-toast {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 16px);
  left: 50%;
  transform: translate(-50%, 0);
  z-index: calc(var(--z-overlay) + 10);
  max-width: min(92vw, 440px);
  border: 1px solid rgba(66, 215, 167, 0.42);
  border-radius: 999px;
  background: rgba(16, 26, 43, 0.94);
  color: var(--success);
  box-shadow: 0 10px 24px rgba(4, 10, 20, 0.46);
  padding: 10px 16px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}

.top-toast--info {
  border-color: rgba(106, 141, 255, 0.42);
  color: var(--primary);
}

.top-toast--error {
  border-color: rgba(255, 123, 146, 0.42);
  color: var(--danger);
}

.top-toast-fade-enter-active,
.top-toast-fade-leave-active {
  transition:
    opacity 180ms var(--ease-standard),
    transform 180ms var(--ease-standard);
}

.top-toast-fade-enter-from,
.top-toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

.top-toast-fade-enter-to,
.top-toast-fade-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
