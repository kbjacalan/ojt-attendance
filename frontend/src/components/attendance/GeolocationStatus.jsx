import { LoaderCircle, AlertTriangle } from "lucide-react";

const TONE_CLASSES = {
  info: "bg-info-subtle text-info border-info-border",
  danger: "bg-error-subtle text-error border-error-border",
};

function StatusPill({
  tone,
  icon: Icon,
  spin = false,
  className = "",
  role,
  ariaLive,
  children,
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${TONE_CLASSES[tone]} ${className}`}
      role={role}
      aria-live={ariaLive}
    >
      <Icon className={`w-4 h-4 shrink-0 ${spin ? "animate-spin" : ""}`} />
      <span>{children}</span>
    </div>
  );
}

/**
 * Shows geolocation feedback only while it needs the student's
 * attention: while a fresh fix is being fetched for a Time In/Out
 * submit, or when that fix fails. Driven by the `status`/`error`
 * values from the one-shot useGeolocation hook. The idle and success
 * states render nothing, because being out of range is already
 * surfaced by the parent's `disabledReason` and a successful punch is
 * confirmed by its own result message.
 *
 * `liveGeofence` (optional) is the reading already computed from the
 * watched position on the map; it only changes the wording while
 * locating, so pressing Time In/Out reads as confirming what the map
 * already showed.
 *
 * Wrapped in aria-live so a screen reader announces changes.
 *
 * `className` (optional) lets the caller add spacing utilities.
 */
export default function GeolocationStatus({
  status,
  error,
  liveGeofence = null,
  className = "",
}) {
  if (status === "idle" || status === "success") return null;

  if (status === "locating") {
    return (
      <StatusPill
        tone="info"
        icon={LoaderCircle}
        spin
        className={className}
        ariaLive="polite"
      >
        {liveGeofence
          ? "Confirming your exact location…"
          : "Getting your location…"}
      </StatusPill>
    );
  }

  return (
    <StatusPill
      tone="danger"
      icon={AlertTriangle}
      className={className}
      role="alert"
      ariaLive="assertive"
    >
      {error || "Unable to get your location."}
    </StatusPill>
  );
}
