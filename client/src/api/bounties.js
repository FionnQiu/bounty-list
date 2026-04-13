import { requestData } from "./request.js";

export function getBounties(params = {}) {
  return requestData({
    url: "/api/bounties",
    method: "GET",
    params,
  });
}

export function createBounty(payload) {
  return requestData({
    url: "/api/bounties",
    method: "POST",
    data: payload,
  });
}

export function getBountyDetail(id) {
  return requestData({
    url: `/api/bounties/${id}`,
    method: "GET",
  });
}

export function applyToBounty(id, payload) {
  return requestData({
    url: `/api/bounties/${id}/applications`,
    method: "POST",
    data: payload,
  });
}

export function updateBounty(id, payload) {
  return requestData({
    url: `/api/bounties/${id}`,
    method: "PUT",
    data: payload,
  });
}

export function reviewBountyApplication(id, applicationId, payload) {
  return requestData({
    url: `/api/bounties/${id}/applications/${applicationId}/review`,
    method: "POST",
    data: payload,
  });
}
