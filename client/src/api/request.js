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

const FALLBACK_TEXT = {
  requestFailed: "\u8bf7\u6c42\u5931\u8d25",
  networkError: "\u65e0\u6cd5\u8fde\u63a5\u670d\u52a1\uff0c\u8bf7\u786e\u8ba4\u524d\u540e\u7aef\u670d\u52a1\u90fd\u5df2\u542f\u52a8\u3002",
  configError: "\u8bf7\u6c42\u914d\u7f6e\u9519\u8bef",
};

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
          payload.message || FALLBACK_TEXT.requestFailed,
          error.response.status,
          payload,
          error,
        ),
      );
    }

    if (error.request) {
      return Promise.reject(
        createRequestError(
          FALLBACK_TEXT.networkError,
          null,
          null,
          error,
        ),
      );
    }

    return Promise.reject(
      createRequestError(error.message || FALLBACK_TEXT.configError, null, null, error),
    );
  },
);

export async function requestData(config) {
  const response = await request(config);
  const result = response.data || {};

  if (result.success === false) {
    throw createBusinessError(result.message || FALLBACK_TEXT.requestFailed, response.status, result);
  }

  return result.data;
}

export { request };
export default request;
