/**
 * Mirrors backend/src/utils/geo.js exactly. Used only to show the
 * student a live "you're inside/outside the geofence" preview on the
 * Attendance page map — the backend independently re-validates every
 * time-in/time-out request, so this never needs to be trusted as the
 * source of truth.
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinGeofence(
  studentLat,
  studentLng,
  agencyLat,
  agencyLng,
  radiusMeters,
) {
  const distance = haversineDistanceMeters(
    studentLat,
    studentLng,
    agencyLat,
    agencyLng,
  );
  return {
    withinRadius: distance <= radiusMeters,
    distanceMeters: Math.round(distance),
  };
}
