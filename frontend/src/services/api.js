import { request } from "./http";

export function timeIn({ studentId, latitude, longitude, period }) {
  return request("/attendance/time-in", {
    method: "POST",
    body: JSON.stringify({ studentId, latitude, longitude, period }),
  });
}

export function timeOut({ studentId, latitude, longitude, period }) {
  return request("/attendance/time-out", {
    method: "POST",
    body: JSON.stringify({ studentId, latitude, longitude, period }),
  });
}

export function getMyAgency() {
  return request("/attendance/my-agency");
}
