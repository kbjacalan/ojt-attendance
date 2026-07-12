/**
 * Maps a logged-in user's role to their "home" route — the page they land
 * on after login, and the page they get bounced back to if they try to
 * revisit an auth page (login/signup) while already signed in.
 */
export function getHomeRouteForRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "in_charge") return "/incharge/records";
  return "/attendance";
}
