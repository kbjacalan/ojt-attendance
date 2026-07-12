import { useEffect, useState } from "react";

/**
 * Continuously watches the device's GPS position, for live map display
 * (showing the student's dot moving on the map in real time).
 *
 * Deliberately separate from useGeolocation, which stays a one-shot,
 * always-fresh request used only at the moment of an actual Time In/Out
 * — that one must never serve a stale/cached fix. This hook is purely
 * a visual aid so the student can see themselves relative to the
 * geofence before pressing anything.
 *
 * Returns:
 *   - position: { latitude, longitude, accuracy } | null
 *   - status: 'idle' | 'locating' | 'success' | 'error'
 *   - error: string | null
 */
export function useWatchGeolocation() {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported on this device/browser.");
      return;
    }

    setStatus("locating");
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus("success");
        setError(null);
      },
      (err) => {
        setStatus("error");
        setError(mapGeolocationError(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, status, error };
}

function mapGeolocationError(err) {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location access was denied. Enable location permissions to see the map.";
    case err.POSITION_UNAVAILABLE:
      return "Location information is unavailable. Try moving to an open area.";
    case err.TIMEOUT:
      return "Location request timed out.";
    default:
      return "An unknown error occurred while getting your location.";
  }
}
