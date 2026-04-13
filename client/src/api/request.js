import axios from "axios";

let authStoreRef = null;

export function bindAuthStore(store) {
  authStoreRef = store;
}

function createRequestError(message, status = null, payload = null, cause = null) {
  const error = new Error(message);
  error.status = status;
  error.payload = payload;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function createBusinessError(message, status, payload) {
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  return error;
}

const request = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

request.interceptors.request.use((config) => {
  const nextConfig = config;

  if (nextConfig.requiresAuth !== false && authStoreRef?.state?.token) {
    nextConfig.headers = nextConfig.headers || {};
    nextConfig.headers.Authorization = `Bearer ${authStoreRef.state.token}`;
  }

  return nextConfig;
});

request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStoreRef?.clearSession?.();
    }

    if (error.response) {
      const payload = error.response.data || {};
      return Promise.reject(
        createRequestError(
          payload.message || "请求失败",
          error.response.status,
          payload,
          error,
        ),
      );
    }

    if (error.request) {
      return Promise.reject(
        createRequestError(
          "无法连接服务，请确认前后端服务都已启动。",
          null,
          null,
          error,
        ),
      );
    }

    return Promise.reject(createRequestError(error.message || "请求配置错误", null, null, error));
  },
);

export async function requestData(config) {
  const response = await request(config);
  const result = response.data || {};

  if (result.success === false) {
    throw createBusinessError(result.message || "请求失败", response.status, result);
  }

  return result.data;
}

export { request };
export default request;
