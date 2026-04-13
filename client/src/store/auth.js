import { reactive } from "vue";
import { login, register } from "../api/auth.js";
import { getCurrentUser } from "../api/users.js";
import { bindAuthStore } from "../api/request.js";

const storedToken = localStorage.getItem("bounty_token");
const storedUser = localStorage.getItem("bounty_user");

const state = reactive({
  token: storedToken || "",
  user: storedUser ? JSON.parse(storedUser) : null,
  ready: false,
});

function persist() {
  if (state.token) {
    localStorage.setItem("bounty_token", state.token);
  } else {
    localStorage.removeItem("bounty_token");
  }

  if (state.user) {
    localStorage.setItem("bounty_user", JSON.stringify(state.user));
  } else {
    localStorage.removeItem("bounty_user");
  }
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  persist();
}

export const authStore = {
  state,
  async bootstrap() {
    if (!state.token) {
      state.ready = true;
      return;
    }

    try {
      const data = await getCurrentUser();
      state.user = data.user;
      persist();
    } catch {
      this.clearSession();
    } finally {
      state.ready = true;
    }
  },
  async login(payload) {
    const data = await login(payload);
    setSession(data.token, data.user);
    return data.user;
  },
  async register(payload) {
    const data = await register(payload);
    setSession(data.token, data.user);
    return data.user;
  },
  updateUser(user) {
    state.user = user;
    persist();
  },
  clearSession() {
    state.token = "";
    state.user = null;
    persist();
  },
};

bindAuthStore(authStore);
