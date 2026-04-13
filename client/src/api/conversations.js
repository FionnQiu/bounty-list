import { requestData } from "./request.js";

export function getConversations() {
  return requestData({
    url: "/api/conversations",
    method: "GET",
  });
}

export function getConversationMessages(id) {
  return requestData({
    url: `/api/conversations/${id}/messages`,
    method: "GET",
  });
}

export function sendConversationMessage(id, payload) {
  return requestData({
    url: `/api/conversations/${id}/messages`,
    method: "POST",
    data: payload,
  });
}
