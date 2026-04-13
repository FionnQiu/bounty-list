<script setup>
const props = defineProps({
  text: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  model: { type: Object, required: true },
  passwordVisible: { type: Object, required: true },
});

const emit = defineEmits(["submit", "toggle-password"]);

function togglePassword(field) {
  emit("toggle-password", field);
}
</script>

<template>
  <form class="auth-form" @submit.prevent="emit('submit')">
    <label class="auth-field">
      <span class="auth-label">{{ text.accountLabel }}</span>
      <input
        v-model="model.account"
        type="text"
        autocomplete="username"
        :placeholder="text.accountPlaceholder"
      />
    </label>

    <label class="auth-field">
      <span class="auth-label">{{ text.password }}</span>
      <div class="password-wrap">
        <input
          v-model="model.password"
          :type="passwordVisible.login ? 'text' : 'password'"
          autocomplete="current-password"
          :placeholder="text.passwordPlaceholder"
        />
        <button
          class="password-toggle"
          type="button"
          :aria-label="passwordVisible.login ? text.hidePassword : text.showPassword"
          @click="togglePassword('login')"
        >
          <svg v-if="passwordVisible.login" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 3l18 18M10.7 10.7A2 2 0 0012 14a2 2 0 001.3-.5M9.9 5.4A10.9 10.9 0 0112 5c5.4 0 9.3 4.3 10 6-.4.8-1.5 2.3-3.1 3.7m-3.3 1.9c-1.1.6-2.4.9-3.6.9-5.4 0-9.3-4.3-10-6 .4-.8 1.7-2.8 4.1-4.4"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
        </button>
      </div>
    </label>

    <button class="primary-action" :disabled="loading">
      {{ loading ? text.loginLoading : text.enterBounty }}
    </button>
  </form>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: 14px;
}

.auth-field {
  display: grid;
  gap: 6px;
}

.auth-label {
  margin: 0;
  color: rgba(198, 216, 246, 0.92);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.auth-field input {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(134, 161, 208, 0.48);
  background: rgba(15, 27, 44, 0.72);
  color: #eef4ff;
  padding: 0 12px;
  font-size: 14px;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.auth-field input::placeholder {
  color: rgba(151, 173, 208, 0.9);
}

.auth-field input:hover {
  border-color: rgba(157, 186, 239, 0.62);
}

.auth-field input:focus {
  border-color: rgba(148, 183, 243, 0.84);
  background: rgba(15, 29, 48, 0.84);
  box-shadow: 0 0 0 3px rgba(76, 126, 228, 0.22);
}

.auth-field input:focus-visible,
.password-toggle:focus-visible,
.primary-action:focus-visible {
  outline: 2px solid rgba(142, 184, 255, 0.92);
  outline-offset: 2px;
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 42px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: rgba(175, 197, 232, 0.96);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.password-toggle:hover {
  color: #f0f6ff;
  border-color: rgba(147, 175, 227, 0.44);
  background: rgba(40, 58, 89, 0.72);
}

.password-toggle svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.primary-action {
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(153, 187, 243, 0.54);
  background:
    linear-gradient(160deg, rgba(58, 101, 192, 0.42), rgba(51, 87, 163, 0.32)),
    rgba(44, 73, 133, 0.28);
  box-shadow: inset 0 1px 0 rgba(216, 231, 255, 0.2);
  color: #f5f9ff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.primary-action:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(171, 200, 248, 0.72);
  box-shadow:
    0 10px 22px rgba(21, 38, 74, 0.32),
    inset 0 1px 0 rgba(224, 238, 255, 0.24);
}

.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

@media (max-width: 560px) {
  .primary-action {
    min-height: 44px;
  }

  .password-toggle {
    width: 30px;
    height: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-field input,
  .password-toggle,
  .primary-action {
    transition: none;
  }

  .primary-action:hover:not(:disabled) {
    transform: none;
  }
}
</style>
