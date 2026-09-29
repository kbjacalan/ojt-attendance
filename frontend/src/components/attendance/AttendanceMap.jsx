import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, LoaderCircle, AlertTriangle } from "lucide-react";
import { isWithinGeofence } from "../../utils/geo";
import { AGENCY_ICON } from "../map/agencyIcon";

const DEFAULT_CENTER = [8.6005, 123.3432]; // CAAP Dipolog Airport fallback
const DEFAULT_ZOOM = 16;

const USER_ICON = L.divIcon({
  className: "",
  html: `
    <div class="relative flex items-center justify-center w-6 h-6">
      <div class="gps-pulse-ring absolute w-6 h-6 rounded-full bg-brand/40"></div>
      <div class="relative w-3.5 h-3.5 rounded-full bg-brand border-2 border-white shadow"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * Semi-fullscreen live map for the student Attendance page. Shows:
 *   - The assigned agency's pin + geofence radius (a translucent circle)
 *   - The student's live GPS position (a pulsing "you are here" dot,
 *     updated continuously via useWatchGeolocation in the parent)
 *   - A floating status pill reporting whether the student is currently
 *     inside the geofence, and how far away they are if not
 *
 * This is a live *preview* only — the actual geofence check happens
 * server-side at the moment of Time In/Out, using a fresh GPS fix.
 *
 * Purely presentational: agency/userPosition/loading/error are all
 * passed in from the parent page, which owns the data fetching.
 */
export default function AttendanceMap({
  agency,
  userPosition,
  agencyLoading,
  agencyError,
  locationError,
  greetingLine,
  dateTimeLine,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const agencyMarkerRef = useRef(null);
  const circleRef = useRef(null);
  const userMarkerRef = useRef(null);
  const hasFitBoundsRef = useRef(false);
  const [followMe, setFollowMe] = useState(true);

  // Initialize the map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Manual panning/zooming should stop auto-follow until the student
    // taps "recenter" again.
    map.on("dragstart", () => setFollowMe(false));

    return () => {
      map.remove();
      mapRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

  // Draw/update the agency pin + geofence circle whenever agency data arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !agency) return;

    const center = [agency.latitude, agency.longitude];

    if (!agencyMarkerRef.current) {
      agencyMarkerRef.current = L.marker(center, { icon: AGENCY_ICON })
        .addTo(map)
        .bindPopup(agency.name);
    } else {
      agencyMarkerRef.current.setLatLng(center);
    }

    if (!circleRef.current) {
      circleRef.current = L.circle(center, {
        radius: agency.radiusMeters,
        color: "#19376d",
        weight: 1.5,
        fillColor: "#576cbc",
        fillOpacity: 0.15,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng(center);
      circleRef.current.setRadius(agency.radiusMeters);
    }

    if (!hasFitBoundsRef.current) {
      map.fitBounds(circleRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [agency]);

  // Draw/update the student's live position dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;

    const pos = [userPosition.latitude, userPosition.longitude];

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(pos, {
        icon: USER_ICON,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(pos);
    }

    if (!hasFitBoundsRef.current && agency) {
      const bounds = L.latLngBounds([
        pos,
        [agency.latitude, agency.longitude],
      ]).extend(circleRef.current.getBounds());
      map.fitBounds(bounds, { padding: [50, 50] });
      hasFitBoundsRef.current = true;
    } else if (followMe) {
      map.panTo(pos, { animate: true });
    }
  }, [userPosition, agency, followMe]);

  function recenter() {
    setFollowMe(true);
    const map = mapRef.current;
    if (!map) return;
    if (userPosition) {
      map.panTo([userPosition.latitude, userPosition.longitude], {
        animate: true,
      });
    } else if (agency) {
      map.setView([agency.latitude, agency.longitude], DEFAULT_ZOOM);
    }
  }

  const geofence =
    agency && userPosition
      ? isWithinGeofence(
          userPosition.latitude,
          userPosition.longitude,
          agency.latitude,
          agency.longitude,
          agency.radiusMeters,
        )
      : null;

  return (
    <div className="attendance-map relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {!agencyLoading && !agencyError && (
        <button
          onClick={recenter}
          className="absolute bottom-[var(--attendance-control-clearance)] left-4 z-[1000] bg-bg-primary rounded-full shadow-md p-2.5 text-text-primary hover:bg-bg-secondary active:scale-95 transition-transform"
          aria-label="Recenter map on my location"
        >
          <LocateFixed className="w-5 h-5" />
        </button>
      )}

      {/* Loading state */}
      {agencyLoading && (
        <div className="absolute inset-0 bg-bg-secondary flex items-center justify-center gap-2 text-text-secondary text-sm">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Loading map…
        </div>
      )}

      {/* Agency load error (e.g. unassigned) */}
      {!agencyLoading && agencyError && (
        <div className="absolute inset-0 bg-bg-secondary flex items-center justify-center px-6 text-center">
          <div className="flex flex-col items-center gap-2 text-text-secondary text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {agencyError}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[900]">
        <div className="bg-gradient-to-b from-black/55 to-transparent pt-4">
          <div className="max-w-md mx-auto px-4 text-text-inverse">
            <h1 className="text-lg font-bold drop-shadow-sm">{greetingLine}</h1>
            <p className="text-xs text-text-inverse/80 mt-0.5">{dateTimeLine}</p>
          </div>
        </div>

        {/* Geofence status pill */}
        {!agencyLoading && !agencyError && (
          <div className="px-4 pt-4">
            <div className="mx-auto w-full max-w-sm">
              {geofence ? (
                <div
                  className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-md border ${
                    geofence.withinRadius
                      ? "bg-success-subtle/95 text-success border-success-border"
                      : "bg-warning-subtle/95 text-warning border-warning-border"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      geofence.withinRadius ? "bg-success-subtle0" : "bg-warning-subtle0"
                    }`}
                  />
                  {geofence.withinRadius
                    ? "You're inside the geofence"
                    : `${geofence.distanceMeters}m away, move closer to time in/out`}
                </div>
              ) : locationError ? (
                <div className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-md border bg-error-subtle/95 text-error border-error-border">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {locationError}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-md border bg-bg-primary/95 text-text-secondary border-border">
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  Finding your location…
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
