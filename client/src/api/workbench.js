import { requestData } from "./request.js";

export function getWorkbenchOverview() {
  return requestData({
    url: "/api/workbench/overview",
    method: "GET",
  });
}

export function getWorkbenchPublishedApplications(bountyId) {
  return requestData({
    url: `/api/workbench/published/${bountyId}/applications`,
    method: "GET",
  });
}

export function completeWorkbenchBounty(bountyId, payload = {}) {
  return requestData({
    url: `/api/workbench/published/${bountyId}/complete`,
    method: "POST",
    data: payload,
  });
}

export function requestWorkbenchAcceptance(bountyId, payload = {}) {
  return requestData({
    url: `/api/workbench/accepted/${bountyId}/request-confirm`,
    method: "POST",
    data: payload,
  });
}

export function closeWorkbenchBounty(bountyId, payload = {}) {
  return requestData({
    url: `/api/workbench/published/${bountyId}/close`,
    method: "POST",
    data: payload,
  });
}

export function deleteWorkbenchBounty(bountyId) {
  return requestData({
    url: `/api/workbench/published/${bountyId}`,
    method: "DELETE",
  });
}

export function createWorkbenchRating(payload) {
  return requestData({
    url: "/api/workbench/ratings",
    method: "POST",
    data: payload,
  });
}
