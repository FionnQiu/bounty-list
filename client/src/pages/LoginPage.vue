<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { authStore } from "../store/auth.js";

const router = useRouter();
const mode = ref("login");
const loading = ref(false);
const errorMessage = ref("");
const passwordMatchError = ref("");

const passwordVisible = reactive({
  login: false,
  register: false,
  confirm: false,
});

const loginForm = reactive({
  account: "",
  password: "",
});

const registerForm = reactive({
  username: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
});

function setMode(nextMode) {
  mode.value = nextMode;
  errorMessage.value = "";
  passwordMatchError.value = "";
}

async function submitLogin() {
  loading.value = true;
  errorMessage.value = "";

  try {
    await authStore.login({
      account: String(loginForm.account || "").trim().toLowerCase(),
      password: loginForm.password,
    });
    router.push("/bounties");
  } catch (error) {
    errorMessage.value = error.message || "登录失败，请检查账号和密码。";
  } finally {
    loading.value = false;
  }
}

async function submitRegister() {
  loading.value = true;
  errorMessage.value = "";
  passwordMatchError.value = "";

  if (registerForm.password !== registerForm.confirmPassword) {
    passwordMatchError.value = "两次输入的密码不一致。";
    loading.value = false;
    return;
  }

  try {
    await authStore.register({
      username: String(registerForm.username || "").trim(),
      phone: String(registerForm.phone || "").trim(),
      email: String(registerForm.email || "").trim().toLowerCase(),
      password: registerForm.password,
    });
    router.push("/bounties");
  } catch (error) {
    errorMessage.value = error.message || "注册失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-view__background" aria-hidden="true">
      <span class="bg-watermark bg-watermark--main">BOUNTYLIST</span>
      <span class="bg-watermark bg-watermark--sub">TASK MARKET</span>
      <span class="bg-orb bg-orb--one"></span>
      <span class="bg-orb bg-orb--two"></span>
      <span class="bg-grid"></span>
    </div>

    <main class="login-center">
      <header class="login-intro">
        <p class="login-intro__brand">悬赏榜</p>
        <h1>登录协作平台</h1>
        <p>发布悬赏、接取任务、即时沟通。</p>
      </header>

      <section class="auth-card" aria-label="身份认证">
        <div class="auth-switch" role="tablist" aria-label="登录注册切换">
          <button
            type="button"
            :class="['auth-switch__btn', { 'is-active': mode === 'login' }]"
            @click="setMode('login')"
          >
            登录
          </button>
          <button
            type="button"
            :class="['auth-switch__btn', { 'is-active': mode === 'register' }]"
            @click="setMode('register')"
          >
            注册
          </button>
        </div>

        <h2>{{ mode === 'login' ? '账号登录' : '创建账号' }}</h2>

        <Transition name="auth-fade" mode="out-in">
          <form v-if="mode === 'login'" key="login" class="auth-form" @submit.prevent="submitLogin">
            <label class="auth-field">
              <span>手机号或邮箱</span>
              <input
                v-model="loginForm.account"
                type="text"
                autocomplete="username"
                placeholder="请输入手机号或邮箱"
              />
            </label>

            <label class="auth-field">
              <span>密码</span>
              <div class="password-wrap">
                <input
                  v-model="loginForm.password"
                  :type="passwordVisible.login ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="请输入密码"
                />
                <button
                  class="password-toggle"
                  type="button"
                  :aria-label="passwordVisible.login ? '隐藏密码' : '显示密码'"
                  @click="passwordVisible.login = !passwordVisible.login"
                >
                  <svg v-if="passwordVisible.login" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3 3l18 18M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6M9.9 5.5A10.9 10.9 0 0112 5c5.4 0 9.3 4.3 10 6-.3.7-1.4 2.3-3.2 3.8m-3.1 1.8c-1.1.5-2.4.9-3.7.9-5.4 0-9.3-4.3-10-6 .4-.8 1.8-2.8 4.1-4.4"
                    />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </button>
              </div>
            </label>

            <button class="primary-button primary-button--block" :disabled="loading">
              {{ loading ? "登录中..." : "进入悬赏广场" }}
            </button>
          </form>

          <form v-else key="register" class="auth-form" @submit.prevent="submitRegister">
            <div class="auth-grid">
              <label class="auth-field">
                <span>用户名</span>
                <input
                  v-model="registerForm.username"
                  type="text"
                  autocomplete="username"
                  placeholder="请输入用户名"
                />
              </label>

              <label class="auth-field">
                <span>手机号</span>
                <input
                  v-model="registerForm.phone"
                  type="tel"
                  autocomplete="tel"
                  placeholder="请输入手机号"
                />
              </label>

              <label class="auth-field">
                <span>邮箱</span>
                <input
                  v-model="registerForm.email"
                  type="email"
                  autocomplete="email"
                  placeholder="请输入邮箱"
                />
              </label>

              <label class="auth-field">
                <span>密码</span>
                <div class="password-wrap">
                  <input
                    v-model="registerForm.password"
                    :type="passwordVisible.register ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="请输入密码"
                  />
                  <button
                    class="password-toggle"
                    type="button"
                    :aria-label="passwordVisible.register ? '隐藏密码' : '显示密码'"
                    @click="passwordVisible.register = !passwordVisible.register"
                  >
                    <svg v-if="passwordVisible.register" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6M9.9 5.5A10.9 10.9 0 0112 5c5.4 0 9.3 4.3 10 6-.3.7-1.4 2.3-3.2 3.8m-3.1 1.8c-1.1.5-2.4.9-3.7.9-5.4 0-9.3-4.3-10-6 .4-.8 1.8-2.8 4.1-4.4"
                      />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  </button>
                </div>
              </label>

              <label class="auth-field auth-field--full">
                <span>确认密码</span>
                <div class="password-wrap">
                  <input
                    v-model="registerForm.confirmPassword"
                    :type="passwordVisible.confirm ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="请再次输入密码"
                  />
                  <button
                    class="password-toggle"
                    type="button"
                    :aria-label="passwordVisible.confirm ? '隐藏密码' : '显示密码'"
                    @click="passwordVisible.confirm = !passwordVisible.confirm"
                  >
                    <svg v-if="passwordVisible.confirm" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6M9.9 5.5A10.9 10.9 0 0112 5c5.4 0 9.3 4.3 10 6-.3.7-1.4 2.3-3.2 3.8m-3.1 1.8c-1.1.5-2.4.9-3.7.9-5.4 0-9.3-4.3-10-6 .4-.8 1.8-2.8 4.1-4.4"
                      />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  </button>
                </div>
              </label>
            </div>

            <p v-if="passwordMatchError" class="feedback feedback--error">{{ passwordMatchError }}</p>

            <button class="primary-button primary-button--block" :disabled="loading">
              {{ loading ? "注册中..." : "创建账号并进入" }}
            </button>
          </form>
        </Transition>

        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-view {
  position: relative;
  min-height: 100dvh;
  padding: clamp(20px, 4vw, 42px);
  display: grid;
  place-items: center;
  overflow: auto;
  isolation: isolate;
}

.login-view__background {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 10% 8%, rgba(96, 127, 224, 0.32), transparent 36%),
    radial-gradient(circle at 88% 20%, rgba(54, 186, 152, 0.2), transparent 34%),
    linear-gradient(162deg, #060b14 0%, #0b1424 52%, #0f1a2d 100%);
}

.bg-watermark {
  position: absolute;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(208, 225, 255, 0.08);
  user-select: none;
  pointer-events: none;
}

.bg-watermark--main {
  top: 8%;
  left: clamp(20px, 6vw, 64px);
  font-size: clamp(3rem, 10vw, 9.5rem);
  line-height: 0.88;
}

.bg-watermark--sub {
  right: clamp(14px, 4vw, 40px);
  bottom: 12%;
  font-size: clamp(0.82rem, 1.8vw, 1.32rem);
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
}

.bg-orb--one {
  top: -16%;
  right: -8%;
  width: clamp(220px, 40vw, 430px);
  height: clamp(220px, 40vw, 430px);
  background: radial-gradient(circle, rgba(109, 146, 255, 0.24), rgba(109, 146, 255, 0));
}

.bg-orb--two {
  left: -10%;
  bottom: -20%;
  width: clamp(200px, 34vw, 380px);
  height: clamp(200px, 34vw, 380px);
  background: radial-gradient(circle, rgba(66, 215, 167, 0.18), rgba(66, 215, 167, 0));
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(141, 172, 224, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(141, 172, 224, 0.08) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 52% 46%, rgba(0, 0, 0, 0.82), transparent 74%);
}

.login-center {
  width: min(100%, 540px);
  display: grid;
  gap: 16px;
}

.login-intro {
  display: grid;
  gap: 8px;
  text-align: center;
}

.login-intro__brand {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-intro h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(1.86rem, 3.2vw, 2.32rem);
  line-height: 1.16;
}

.login-intro p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.auth-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: rgba(15, 24, 39, 0.82);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(164, 193, 236, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: clamp(18px, 3.6vw, 30px);
  display: grid;
  gap: 14px;
}

.auth-card h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(1.2rem, 2vw, 1.42rem);
}

.auth-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  border-radius: 999px;
  border: 1px solid var(--line-soft);
  padding: 4px;
  background: rgba(16, 25, 40, 0.95);
}

.auth-switch__btn {
  height: 38px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color var(--duration-fast) var(--ease-standard),
    background-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

.auth-switch__btn.is-active {
  color: #ebf2ff;
  background: rgba(96, 127, 224, 0.36);
  box-shadow: inset 0 0 0 1px rgba(128, 161, 255, 0.3);
}

.auth-form {
  display: grid;
  gap: 14px;
}

.auth-field {
  display: grid;
  gap: 6px;
}

.auth-field span {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.auth-field input {
  width: 100%;
  height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-strong);
  background: rgba(15, 24, 39, 0.92);
  color: var(--text-primary);
  padding: 0 12px;
}

.auth-field input::placeholder {
  color: #7f94b8;
}

.auth-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.auth-field--full {
  grid-column: 1 / -1;
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9eb2d6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.password-toggle:hover {
  background: rgba(42, 60, 90, 0.95);
  color: #dce7ff;
}

.password-toggle svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard);
}

.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 768px) {
  .login-view {
    padding: 16px;
  }

  .bg-watermark--main {
    top: 8px;
    left: 12px;
  }

  .bg-watermark--sub {
    right: 10px;
    bottom: 10px;
  }

  .login-center {
    width: 100%;
  }

  .auth-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-fade-enter-active,
  .auth-fade-leave-active {
    transition: none;
  }
}
</style>
