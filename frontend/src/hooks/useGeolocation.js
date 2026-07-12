import { useState, useCallback } from "react";

/**
 * Wraps navigator.geolocation with React state so components can
 * request the student's current position on demand (e.g. when they
 * press "Time In") rather than tracking location continuously.
 *
 * Returns:
 *   - position: { latitude, longitude, accuracy } | null
 *   - status: 'idle' | 'locating' | 'success' | 'error'
 *   - error: string | null
 *   - getPosition: () => Promise<{ latitude, longitude }>
 */
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const getPosition = useCallback(() => {
    setStatus("locating");
    setError(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const message = "Geolocation is not supported on this device/browser.";
        setStatus("error");
        setError(message);
        reject(new Error(message));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setPosition(coords);
          setStatus("success");
          resolve(coords);
        },
        (err) => {
          const message = mapGeolocationError(err);
          setStatus("error");
          setError(message);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true, // prioritize GPS over wifi/cell triangulation
          timeout: 10000,
          maximumAge: 0, // never use a cached position — must be fresh at time-in/out
        },
      );
    });
  }, []);

  return { position, status, error, getPosition };
}

function mapGeolocationError(err) {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location access was denied. Please enable location permissions to time in/out.";
    case err.POSITION_UNAVAILABLE:
      return "Location information is unavailable. Try moving to an open area.";
    case err.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "An unknown error occurred while getting your location.";
  }
}
