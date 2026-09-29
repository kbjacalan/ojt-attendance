import { request } from "./http";

export const getMyTodayOTRequest = () => request("/ot-requests/today");

export const requestOvertime = (requestedStart, requestedEnd, reason) =>
  request("/ot-requests", {
    method: "POST",
    body: JSON.stringify({ requestedStart, requestedEnd, reason }),
  });

export const cancelOvertimeRequest = (requestId) =>
  request(`/ot-requests/${requestId}`, { method: "DELETE" });
