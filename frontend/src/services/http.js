import { notifySessionExpired } from "./sessionEvents";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function parseBody(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function toError(data, fallback) {
  const error = new Error(data?.error || fallback);
  if (data?.code) error.code = data.code;
  return error;
}

/**
 * Shared authenticated fetch wrapper. Attaches the JWT when present,
 * always sends JSON, normalizes `{ error, code }`, and notifies on 401.
 */
export async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await parseBody(res);

  if (!res.ok) {
    if (res.status === 401 && token) {
      notifySessionExpired();
    }
    throw toError(data, "Request failed.");
  }

  return data;
}

/**
 * Shared unauthenticated fetch wrapper for public endpoints
 * (login, signup, public dropdowns). No token, no session-expiry ping.
 */
export async function publicRequest(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await parseBody(res);

  if (!res.ok) {
    throw toError(data, "Request failed.");
  }

  return data;
}
