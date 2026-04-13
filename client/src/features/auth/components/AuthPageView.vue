<script setup>
import { useRouter } from "vue-router";
import { AUTH_TEXT } from "../constants/authTexts.js";
import { useAuthFormState } from "../composables/useAuthFormState.js";
import AuthHero from "./AuthHero.vue";
import AuthSwitch from "./AuthSwitch.vue";
import LoginForm from "./LoginForm.vue";
import RegisterForm from "./RegisterForm.vue";

const router = useRouter();
const text = AUTH_TEXT;

const {
  mode,
  loading,
  errorMessage,
  registerErrors,
  passwordVisible,
  loginForm,
  registerForm,
  setMode,
  togglePassword,
  onRegisterPhoneInput,
  onRegisterEmailInput,
  onRegisterPasswordInput,
  onRegisterConfirmPasswordInput,
  submitLogin,
  submitRegister,
} = useAuthFormState();

async function handleLoginSubmit() {
  const result = await submitLogin();
  if (result.ok) {
    await router.push("/bounties");
  }
}

async function handleRegisterSubmit() {
  const result = await submitRegister();
  if (result.ok) {
    await router.push("/bounties");
  }
}
</script>

<template>
  <div class="login-scene">
    <div class="scene-background" aria-hidden="true">
      <span class="scene-orb scene-orb--left"></span>
      <span class="scene-orb scene-orb--right"></span>
      <span class="scene-grid"></span>
      <span class="scene-watermark">WORKBENCH</span>
    </div>

    <main class="auth-shell">
      <AuthHero :text="text" />

      <section class="auth-panel" :aria-label="text.authPanelAria">
        <AuthSwitch :text="text" :mode="mode" @change="setMode" />

        <Transition name="panel-swap" mode="out-in">
          <LoginForm
            v-if="mode === 'login'"
            key="login"
            :text="text"
            :loading="loading"
            :model="loginForm"
            :password-visible="passwordVisible"
            @submit="handleLoginSubmit"
            @toggle-password="togglePassword"
          />

          <RegisterForm
            v-else
            key="register"
            :text="text"
            :loading="loading"
            :model="registerForm"
            :register-errors="registerErrors"
            :password-visible="passwordVisible"
            @submit="handleRegisterSubmit"
            @toggle-password="togglePassword"
            @phone-input="onRegisterPhoneInput"
            @email-input="onRegisterEmailInput"
            @password-input="onRegisterPasswordInput"
            @confirm-password-input="onRegisterConfirmPasswordInput"
          />
        </Transition>

        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-scene {
  position: relative;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: clamp(18px, 4vw, 40px);
  overflow: auto;
  isolation: isolate;
}

.scene-background {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background:
    radial-gradient(circle at 14% 10%, rgba(110, 154, 255, 0.24), transparent 36%),
    radial-gradient(circle at 90% 16%, rgba(74, 231, 181, 0.18), transparent 32%),
    linear-gradient(160deg, #091223 0%, #0c182c 44%, #0f1d34 100%);
}

.scene-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(8px);
}

.scene-orb--left {
  width: clamp(220px, 34vw, 380px);
  height: clamp(220px, 34vw, 380px);
  left: -10%;
  bottom: -18%;
  background: radial-gradient(circle, rgba(98, 141, 255, 0.35) 0%, rgba(98, 141, 255, 0) 70%);
}

.scene-orb--right {
  width: clamp(220px, 36vw, 420px);
  height: clamp(220px, 36vw, 420px);
  right: -10%;
  top: -14%;
  background: radial-gradient(circle, rgba(57, 205, 159, 0.26) 0%, rgba(57, 205, 159, 0) 72%);
}

.scene-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(143, 179, 242, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(143, 179, 242, 0.12) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(circle at 50% 44%, rgba(0, 0, 0, 0.86), transparent 78%);
}

.scene-watermark {
  position: absolute;
  right: clamp(20px, 5vw, 68px);
  bottom: clamp(20px, 6vw, 76px);
  font-size: clamp(1.2rem, 2.2vw, 2rem);
  letter-spacing: 0.48em;
  font-weight: 700;
  color: rgba(186, 208, 247, 0.2);
  text-transform: uppercase;
  user-select: none;
}

.auth-shell {
  width: min(100%, 520px);
  display: grid;
  gap: 18px;
}

.auth-panel {
  border: 1px solid rgba(164, 192, 238, 0.35);
  border-radius: 24px;
  padding: clamp(18px, 3.8vw, 30px);
  background:
    linear-gradient(160deg, rgba(16, 29, 48, 0.88), rgba(14, 23, 40, 0.86)),
    rgba(14, 24, 40, 0.82);
  box-shadow:
    0 26px 50px rgba(4, 10, 22, 0.42),
    inset 0 1px 0 rgba(185, 208, 246, 0.15);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: grid;
  gap: 14px;
}

.feedback {
  margin: 0;
  font-size: 13px;
}

.feedback--error {
  color: #ffb7b7;
}

.panel-swap-enter-active,
.panel-swap-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.panel-swap-enter-from,
.panel-swap-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 768px) {
  .login-scene {
    padding: 16px;
  }

  .auth-shell {
    width: 100%;
  }

  .scene-watermark {
    letter-spacing: 0.24em;
    font-size: 1rem;
  }
}

@media (max-width: 560px) {
  .login-scene {
    padding: 12px;
    align-items: start;
  }

  .auth-shell {
    gap: 14px;
  }

  .auth-panel {
    border-radius: 18px;
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-swap-enter-active,
  .panel-swap-leave-active {
    transition: none;
  }
}
</style>
