import { requestData } from "./request.js";

export function login(payload) {
  return requestData({
    url: "/api/auth/login",
    method: "POST",
    data: payload,
    requiresAuth: false,
  });
}

export function register(payload) {
  return requestData({
    url: "/api/auth/register",
    method: "POST",
    data: payload,
    requiresAuth: false,
  });
}

export function resetPassword(payload) {
  return requestData({
    url: "/api/auth/reset-password",
    method: "POST",
    data: payload,
    requiresAuth: false,
  });
}
