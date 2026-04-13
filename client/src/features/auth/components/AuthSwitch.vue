<script setup>
defineProps({
  text: { type: Object, required: true },
  mode: { type: String, required: true },
});

const emit = defineEmits(["change"]);
</script>

<template>
  <div class="auth-switch" role="tablist" :aria-label="text.authSwitchAria">
    <button
      type="button"
      :class="['auth-switch__btn', { 'is-active': mode === 'login' }]"
      :aria-selected="mode === 'login'"
      @click="emit('change', 'login')"
    >
      {{ text.login }}
    </button>
    <button
      type="button"
      :class="['auth-switch__btn', { 'is-active': mode === 'register' }]"
      :aria-selected="mode === 'register'"
      @click="emit('change', 'register')"
    >
      {{ text.register }}
    </button>
  </div>
</template>

<style scoped>
.auth-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(142, 171, 221, 0.34);
  background: rgba(11, 20, 34, 0.76);
}

.auth-switch__btn {
  border: 1px solid transparent;
  border-radius: 999px;
  height: 38px;
  background: transparent;
  color: rgba(196, 214, 244, 0.9);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.auth-switch__btn.is-active {
  color: #f4f8ff;
  border-color: rgba(153, 183, 234, 0.34);
  background: rgba(59, 101, 198, 0.34);
  box-shadow: inset 0 1px 0 rgba(223, 236, 255, 0.12);
}

.auth-switch__btn:focus-visible {
  outline: 2px solid rgba(142, 184, 255, 0.92);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .auth-switch__btn {
    height: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-switch__btn {
    transition: none;
  }
}
</style>
