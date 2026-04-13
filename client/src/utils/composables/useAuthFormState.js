import { reactive, ref } from "vue";
import { authStore } from "../../store/auth.js";
import { feedbackStore } from "../../store/feedback.js";
import { AUTH_FALLBACK, REGISTER_ERRORS } from "../constants/authTexts.js";

const phonePattern = /^\d{11}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinLength = 6;

export function useAuthFormState() {
  const mode = ref("login");
  const loading = ref(false);
  const errorMessage = ref("");
  const registerErrors = reactive({
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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

  function clearRegisterErrors() {
    registerErrors.phone = "";
    registerErrors.email = "";
    registerErrors.password = "";
    registerErrors.confirmPassword = "";
  }

  function setMode(nextMode) {
    mode.value = nextMode;
    errorMessage.value = "";
    clearRegisterErrors();
  }

  function togglePassword(field) {
    passwordVisible[field] = !passwordVisible[field];
  }

  function onRegisterPhoneInput(value) {
    registerForm.phone = String(value || "").replace(/\D/g, "").slice(0, 11);
    registerErrors.phone = "";
    errorMessage.value = "";
  }

  function onRegisterEmailInput(value) {
    registerForm.email = String(value || "");
    registerErrors.email = "";
    errorMessage.value = "";
  }

  function onRegisterPasswordInput(value) {
    registerForm.password = String(value || "");
    registerErrors.password = "";
    registerErrors.confirmPassword = "";
    errorMessage.value = "";
  }

  function onRegisterConfirmPasswordInput(value) {
    registerForm.confirmPassword = String(value || "");
    registerErrors.confirmPassword = "";
    errorMessage.value = "";
  }

  function validateRegisterForm() {
    const phone = String(registerForm.phone || "").replace(/\D/g, "").slice(0, 11);
    const email = String(registerForm.email || "").trim().toLowerCase();
    const password = String(registerForm.password || "");
    const confirmPassword = String(registerForm.confirmPassword || "");
    let valid = true;

    registerForm.phone = phone;
    registerForm.email = email;

    clearRegisterErrors();

    if (!phonePattern.test(phone)) {
      registerErrors.phone = REGISTER_ERRORS.phone;
      valid = false;
    }

    if (!emailPattern.test(email)) {
      registerErrors.email = REGISTER_ERRORS.email;
      valid = false;
    }

    if (password.length < passwordMinLength) {
      registerErrors.password = REGISTER_ERRORS.password(passwordMinLength);
      valid = false;
    }

    if (confirmPassword.length < passwordMinLength) {
      registerErrors.confirmPassword = REGISTER_ERRORS.confirmPasswordMin(passwordMinLength);
      valid = false;
    } else if (password !== confirmPassword) {
      registerErrors.confirmPassword = REGISTER_ERRORS.confirmPasswordMismatch;
      valid = false;
    }

    return valid;
  }

  async function submitLogin() {
    loading.value = true;
    errorMessage.value = "";

    try {
      await authStore.login({
        account: String(loginForm.account || "").trim().toLowerCase(),
        password: loginForm.password,
      });
      return { ok: true };
    } catch (error) {
      const message = error.message || AUTH_FALLBACK.loginFailed;
      errorMessage.value = message;
      feedbackStore.pushFeedback(message, { tone: "error", duration: 3000 });
      return { ok: false };
    } finally {
      loading.value = false;
    }
  }

  async function submitRegister() {
    errorMessage.value = "";

    if (!validateRegisterForm()) {
      return { ok: false };
    }

    loading.value = true;

    try {
      await authStore.register({
        username: String(registerForm.username || "").trim(),
        phone: String(registerForm.phone || "").trim(),
        email: String(registerForm.email || "").trim().toLowerCase(),
        password: registerForm.password,
      });
      return { ok: true };
    } catch (error) {
      const message = error.message || AUTH_FALLBACK.registerFailed;
      errorMessage.value = message;
      feedbackStore.pushFeedback(message, { tone: "error", duration: 3000 });
      return { ok: false };
    } finally {
      loading.value = false;
    }
  }

  return {
    mode,
    loading,
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
  };
}
