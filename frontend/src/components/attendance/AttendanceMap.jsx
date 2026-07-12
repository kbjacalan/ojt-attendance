import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, LoaderCircle, AlertTriangle } from "lucide-react";
import { isWithinGeofence } from "../../utils/geo";

const DEFAULT_CENTER = [8.6005, 123.3432]; // CAAP Dipolog Airport fallback
const DEFAULT_ZOOM = 16;

const AGENCY_ICON = L.divIcon({
  className: "",
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-8 h-8 rounded-full bg-caap-navy border-2 border-white shadow-md flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
      </div>
      <div class="absolute -bottom-1 w-2 h-2 rotate-45 bg-caap-navy"></div>
    </div>
  `,
  iconSize: [32, 36],
  iconAnchor: [16, 34],
});

const USER_ICON = L.divIcon({
  className: "",
  html: `
    <div class="relative flex items-center justify-center w-6 h-6">
      <div class="gps-pulse-ring absolute w-6 h-6 rounded-full bg-caap-blue/40"></div>
      <div class="relative w-3.5 h-3.5 rounded-full bg-caap-blue border-2 border-white shadow"></div>
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
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Recenter button */}
      {!agencyLoading && !agencyError && (
        <button
          onClick={recenter}
          className="absolute bottom-4 left-4 z-[1000] bg-white rounded-full shadow-md p-2.5 text-caap-navy hover:bg-slate-50 active:scale-95 transition-transform"
          aria-label="Recenter map on my location"
        >
          <LocateFixed className="w-5 h-5" />
        </button>
      )}

      {/* Loading state */}
      {agencyLoading && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <LoaderCircle className="w-4 h-4 animate-spin" />
          Loading map…
        </div>
      )}

      {/* Agency load error (e.g. unassigned) */}
      {!agencyLoading && agencyError && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center px-6 text-center">
          <div className="flex flex-col items-center gap-2 text-slate-500 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {agencyError}
          </div>
        </div>
      )}

      {/* Geofence status pill */}
      {!agencyLoading && !agencyError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm">
          {geofence ? (
            <div
              className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-md border ${
                geofence.withinRadius
                  ? "bg-emerald-50/95 text-emerald-700 border-emerald-200"
                  : "bg-amber-50/95 text-amber-700 border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  geofence.withinRadius ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {geofence.withinRadius
                ? "You're inside the geofence"
                : `${geofence.distanceMeters}m away, move closer to time in/out`}
            </div>
          ) : locationError ? (
            <div className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-md border bg-red-50/95 text-red-700 border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {locationError}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-md border bg-white/95 text-slate-500 border-slate-200">
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              Finding your location…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
