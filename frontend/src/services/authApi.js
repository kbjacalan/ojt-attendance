const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export async function loginRequest(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Login failed. Please try again.");
  }

  return data; // { token, user }
}

export async function signupRequest({
  fullName,
  email,
  password,
  course,
  university,
  batch,
  agencyId,
  requiredHours,
  amStart,
  amEnd,
  pmStart,
  pmEnd,
  controlNumberId,
}) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName,
      email,
      password,
      course,
      university,
      batch,
      agencyId,
      requiredHours,
      amStart,
      amEnd,
      pmStart,
      pmEnd,
      controlNumberId,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Sign up failed. Please try again.");
  }

  return data; // { message, email }
}

/**
 * Public, unauthenticated agency list for the signup page's Agency
 * dropdown — unlike adminApi's listAgencies, this doesn't require a
 * login token and only returns the minimal id/name fields.
 */
export async function listPublicAgencies() {
  const res = await fetch(`${API_BASE_URL}/agencies/public`);
  const data = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(data.error || "Failed to load agencies.");
  }

  return data; // [{ id, name }]
}

/**
 * Public, unauthenticated list of control numbers not yet claimed by
 * another student, for the signup page's OJT Control Number dropdown.
 */
export async function listPublicControlNumbers() {
  const res = await fetch(`${API_BASE_URL}/control-numbers/public`);
  const data = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(data.error || "Failed to load control numbers.");
  }

  return data; // [{ id, control_number }]
}

/**
 * Self-service profile update (currently just full name) for the
 * logged-in user (any role). Authenticated the same way as
 * changePasswordRequest below.
 */
export async function updateProfileRequest(fullName) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fullName }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Failed to update profile.");
  }

  return data; // { user }
}

/**
 * Self-service password change for the currently logged-in user
 * (any role). Unlike the other functions in this file, this one is
 * authenticated, so it attaches the stored token the same way
 * adminApi/inchargeApi do.
 */
export async function changePasswordRequest(currentPassword, newPassword) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Failed to change password.");
  }

  return data; // { message }
}
