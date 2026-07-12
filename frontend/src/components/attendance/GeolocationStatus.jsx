import {
  MapPin,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/**
 * Displays the current geolocation status as a small badge.
 * Driven by the `status`/`error` values returned from the
 * one-shot useGeolocation hook (always a fresh, uncached fix —
 * that part is non-negotiable for an actual Time In/Out submit).
 *
 * `liveGeofence` (optional): the geofence reading already computed
 * from the continuously-watched position shown on the map above this
 * card ({ withinRadius, distanceMeters } | null). This is NOT used to
 * decide whether a punch is allowed — the server always re-checks a
 * fresh fix — it's purely so this badge doesn't lie by omission and
 * claim "not checked yet" when the student can plainly see their dot
 * on the map. Seeding 'idle' and 'locating' with it means pressing
 * Time In/Out reads as "confirming what we already showed you" rather
 * than a reset back to a blank, unknown state.
 *
 * Wrapped in an aria-live region so a screen reader announces status
 * changes (e.g. "Getting your location…" -> "Location found") as they
 * happen, without the student needing to re-focus this element.
 *
 * `className` (optional) lets the caller add spacing/layout utilities
 * (e.g. margin) without this component needing to guess its context.
 */
export default function GeolocationStatus({
  status,
  error,
  liveGeofence = null,
  className = "",
}) {
  if (status === "idle") {
    if (liveGeofence) {
      return (
        <div
          className={`flex items-center gap-2 text-sm ${
            liveGeofence.withinRadius ? "text-emerald-600" : "text-amber-600"
          } ${className}`}
          aria-live="polite"
        >
          <MapPin className="w-4 h-4" />
          <span>
            {liveGeofence.withinRadius
              ? "Last seen inside the geofence"
              : `Last seen ${liveGeofence.distanceMeters}m away`}
          </span>
        </div>
      );
    }
    return (
      <div
        className={`flex items-center gap-2 text-sm text-slate-500 ${className}`}
        aria-live="polite"
      >
        <MapPin className="w-4 h-4" />
        <span>Location not checked yet</span>
      </div>
    );
  }

  if (status === "locating") {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-blue-600 ${className}`}
        aria-live="polite"
      >
        <LoaderCircle className="w-4 h-4 animate-spin" />
        <span>
          {liveGeofence
            ? "Confirming your exact location…"
            : "Getting your location…"}
        </span>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-emerald-600 ${className}`}
        aria-live="polite"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Location confirmed</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 text-sm text-red-600 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle className="w-4 h-4" />
      <span>{error || "Unable to get your location."}</span>
    </div>
  );
}
