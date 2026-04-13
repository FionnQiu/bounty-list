import { requestData } from "./request.js";

export function getCurrentUser() {
  return requestData({
    url: "/api/users/me",
    method: "GET",
  });
}

export function getMyProfile() {
  return requestData({
    url: "/api/users/me",
    method: "GET",
  });
}

export function updateMyProfile(payload) {
  return requestData({
    url: "/api/users/me",
    method: "PUT",
    data: payload,
  });
}
