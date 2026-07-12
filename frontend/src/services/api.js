const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

/**
 * Thin fetch wrapper. Attaches the JWT (once auth is built) and
 * normalizes error handling so components just try/catch a clean Error.
 */
async function request(path, options = {}) {
  const token = localStorage.getItem("token"); // replace with your real auth storage later

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
    const error = new Error(
      data.error || "Something went wrong. Please try again.",
    );
    if (data.code) error.code = data.code;
    throw error;
  }

  return data;
}

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
