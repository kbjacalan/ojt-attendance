const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || "Request failed.");
    if (data.code) error.code = data.code;
    throw error;
  }

  return data;
}

export const getMyTodayOTRequest = () => request("/ot-requests/today");

export const requestOvertime = (requestedStart, requestedEnd, reason) =>
  request("/ot-requests", {
    method: "POST",
    body: JSON.stringify({ requestedStart, requestedEnd, reason }),
  });

export const cancelOvertimeRequest = (requestId) =>
  request(`/ot-requests/${requestId}`, { method: "DELETE" });
