import { publicRequest, request } from "./http";

export async function loginRequest(email, password) {
  return publicRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
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
  return publicRequest("/auth/signup", {
    method: "POST",
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
}

/**
 * Public, unauthenticated agency list for the signup page's Agency
 * dropdown — unlike adminApi's listAgencies, this doesn't require a
 * login token and only returns the minimal id/name fields.
 */
export async function listPublicAgencies() {
  return publicRequest("/agencies/public");
}

/**
 * Public, unauthenticated list of control numbers not yet claimed by
 * another student, for the signup page's OJT Control Number dropdown.
 */
export async function listPublicControlNumbers() {
  return publicRequest("/control-numbers/public");
}

/**
 * Self-service profile update (currently just full name) for the
 * logged-in user (any role). Authenticated the same way as
 * changePasswordRequest below.
 */
export async function updateProfileRequest(fullName) {
  return request("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ fullName }),
  });
}

/**
 * Self-service password change for the currently logged-in user
 * (any role). Unlike the other functions in this file, this one is
 * authenticated, so it attaches the stored token the same way
 * adminApi/inchargeApi do.
 */
export async function changePasswordRequest(currentPassword, newPassword) {
  return request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
