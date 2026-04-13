<script setup>
import { computed } from "vue";
import { useEscapeKey } from "../../utils/composables/useEscapeKey.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "" },
  ariaLabel: { type: String, default: "Dialog" },
  width: { type: String, default: "min(760px, 100%)" },
  fullScreenOnMobile: { type: Boolean, default: false },
  closeOnMask: { type: Boolean, default: true },
  closeOnEsc: { type: Boolean, default: true },
  showClose: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue", "close"]);

const modalStyle = computed(() => ({ width: props.width }));

function close() {
  emit("update:modelValue", false);
  emit("close");
}

function onMaskClick() {
  if (!props.closeOnMask) {
    return;
  }
  close();
}

useEscapeKey(() => {
  if (!props.modelValue || !props.closeOnEsc) {
    return;
  }
  close();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="base-modal" appear>
      <div
        v-if="modelValue"
        :class="['base-modal-mask', { 'base-modal-mask--mobile-full': fullScreenOnMobile }]"
        @click.self="onMaskClick"
      >
        <section
          :class="['base-modal', { 'base-modal--mobile-full': fullScreenOnMobile }]"
          role="dialog"
          :aria-label="ariaLabel"
          aria-modal="true"
          :style="modalStyle"
          @click.stop
        >
          <button
            v-if="showClose"
            class="base-modal__close"
            type="button"
            aria-label="Close dialog"
            @click="close"
          >
            &times;
          </button>

          <header v-if="title || $slots.header" class="base-modal__header">
            <slot name="header">
              <h3>{{ title }}</h3>
            </slot>
          </header>

          <div class="base-modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="base-modal__footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal-enter-active,
.base-modal-leave-active {
  transition: opacity 180ms var(--ease-standard);
}

.base-modal-enter-active .base-modal,
.base-modal-leave-active .base-modal {
  transition:
    transform 200ms var(--ease-standard),
    opacity 200ms var(--ease-standard),
    filter 200ms var(--ease-standard);
}

.base-modal-enter-from,
.base-modal-leave-to {
  opacity: 0;
}

.base-modal-enter-from .base-modal,
.base-modal-leave-to .base-modal {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
  filter: blur(2px);
}

.base-modal-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: rgba(5, 10, 18, 0.64);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
}

.base-modal {
  max-height: 90dvh;
  overflow: auto;
  border-radius: var(--radius-lg);
  background: var(--glass-surface-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(calc(var(--glass-blur) + 2px)) saturate(132%);
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 2px)) saturate(132%);
  padding: var(--space-6);
  position: relative;
}

.base-modal__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--line-soft);
  background: rgba(20, 31, 50, 0.9);
  color: var(--text-secondary);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition:
    color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    background-color var(--duration-fast) var(--ease-standard);
}

.base-modal__close:hover {
  color: var(--text-primary);
  border-color: rgba(126, 160, 255, 0.44);
  background: rgba(33, 48, 74, 0.95);
}

.base-modal__header {
  margin-bottom: var(--space-4);
  padding-right: 44px;
}

.base-modal__header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.base-modal__body {
  display: grid;
  gap: var(--space-4);
}

.base-modal__footer {
  margin-top: var(--space-5);
}

@media (max-width: 768px) {
  .base-modal-mask {
    padding: var(--space-4);
  }

  .base-modal-mask--mobile-full {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  .base-modal {
    padding: var(--space-5) var(--space-4);
  }

  .base-modal--mobile-full {
    width: 100vw !important;
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    padding: 0;
  }

  .base-modal--mobile-full .base-modal__close {
    top: 12px;
    right: 12px;
    z-index: 4;
  }

  .base-modal--mobile-full .base-modal__body {
    height: 100%;
    min-height: 0;
  }
}

@media (max-width: 560px) {
  .base-modal-mask {
    padding: var(--space-3);
  }

  .base-modal-mask--mobile-full {
    padding: 0;
  }

  .base-modal {
    max-height: 92dvh;
    border-radius: var(--radius-md);
    padding: 16px 14px;
  }

  .base-modal--mobile-full {
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
    padding: 0;
  }

  .base-modal__close {
    width: 36px;
    height: 36px;
    top: 10px;
    right: 10px;
  }

  .base-modal__header {
    padding-right: 42px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-modal-enter-active,
  .base-modal-leave-active,
  .base-modal-enter-active .base-modal,
  .base-modal-leave-active .base-modal {
    transition: none;
  }
}
</style>
