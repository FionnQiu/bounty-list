<script setup>
import { computed } from "vue";
import { feedbackStore } from "../../store/feedback.js";

const props = defineProps({
  inAppLayout: {
    type: Boolean,
    default: false,
  },
});

const items = computed(() => feedbackStore.state.items);

const containerStyle = computed(() => {
  const top = props.inAppLayout
    ? "calc(env(safe-area-inset-top, 0px) + var(--top-dock-height) + 10px)"
    : "calc(env(safe-area-inset-top, 0px) + 14px)";

  return {
    top,
  };
});
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      name="feedback-barrage"
      tag="div"
      class="feedback-barrage"
      :style="containerStyle"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="feedback-barrage__item"
        :class="`feedback-barrage__item--${item.tone}`"
        role="status"
      >
        {{ item.message }}
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.feedback-barrage {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  display: grid;
  gap: 10px;
  z-index: calc(var(--z-overlay) + 20);
  pointer-events: none;
}

.feedback-barrage__item {
  border-radius: 999px;
  border: 1px solid rgba(131, 160, 216, 0.42);
  background:
    linear-gradient(180deg, rgba(16, 26, 43, 0.94), rgba(12, 21, 36, 0.92)),
    radial-gradient(circle at 50% -20%, rgba(214, 229, 255, 0.16), transparent 62%);
  box-shadow: 0 12px 26px rgba(4, 10, 20, 0.46);
  padding: 10px 16px;
  color: var(--text-primary);
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  transform-origin: center top;
  will-change: transform, opacity, filter;
}

.feedback-barrage__item--success {
  border-color: rgba(66, 215, 167, 0.5);
  color: var(--success);
}

.feedback-barrage__item--error {
  border-color: rgba(255, 123, 146, 0.52);
  color: var(--danger);
}

.feedback-barrage__item--info {
  border-color: rgba(106, 141, 255, 0.5);
  color: var(--primary);
}

.feedback-barrage-enter-active {
  transition:
    opacity 220ms cubic-bezier(0.2, 0.72, 0.24, 1),
    transform 260ms cubic-bezier(0.2, 0.82, 0.22, 1),
    filter 220ms ease;
}

.feedback-barrage-leave-active {
  transition:
    opacity 170ms cubic-bezier(0.4, 0, 1, 1),
    transform 170ms cubic-bezier(0.4, 0, 1, 1),
    filter 170ms ease;
  position: absolute;
  width: 100%;
  pointer-events: none;
}

.feedback-barrage-move {
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.feedback-barrage-enter-from {
  opacity: 0;
  transform: translateY(-14px) scale(0.96);
  filter: blur(3px);
}

.feedback-barrage-enter-to,
.feedback-barrage-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

.feedback-barrage-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .feedback-barrage-enter-active,
  .feedback-barrage-leave-active,
  .feedback-barrage-move {
    transition: none;
  }
}
</style>
