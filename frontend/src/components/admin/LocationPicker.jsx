import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, LoaderCircle, Crosshair } from "lucide-react";

// Custom navy pin (matches the agency marker used on the student
// Attendance page's live map) — replaces Leaflet's default blue
// marker+shadow images for a consistent look across the app, and
// sidesteps the usual Vite asset-path workaround entirely.
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

// Falls back to CAAP Dipolog Airport if no coordinates are set yet
const DEFAULT_CENTER = [8.6005, 123.3432];
const DEFAULT_ZOOM = 15;

/**
 * Interactive map for setting an agency's location and geofence
 * radius, with address auto-fill via reverse geocoding.
 * - Click anywhere on the map, or drag the marker, to set the location
 *   (auto-fills the address via reverse geocoding)
 * - Search box (OpenStreetMap Nominatim, free/no API key) to jump to
 *   a place by name, which also fills in its address
 * - The geofence radius is drawn live as a translucent circle, driven
 *   by the `radiusMeters` prop (e.g. from a slider in the parent form)
 *
 * Controlled component: `latitude`/`longitude` props drive the marker
 * position, `radiusMeters` drives the circle. `onLocationChange(lat, lng)`
 * fires whenever the pin moves. `onPlaceFound({ name, address })` fires
 * whenever a name/address is resolved for the current location — the
 * form decides what to do with it (e.g. only prefill Name if empty).
 *
 * NOTE: this component intentionally does NOT render a <form> for the
 * search box — it's already nested inside the parent AgencyForm's
 * <form>, and nested <form> elements are invalid HTML (the browser
 * collapses them, so a submit inside here would trigger the outer
 * form's submit instead of running the search).
 */
export default function LocationPicker({
  latitude,
  longitude,
  radiusMeters,
  onLocationChange,
  onPlaceFound,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Initialize the map once on mount
  useEffect(() => {
    if (mapRef.current) return;

    const initialCenter =
      isValidCoord(latitude) && isValidCoord(longitude)
        ? [latitude, longitude]
        : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView(initialCenter, DEFAULT_ZOOM);
    mapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const circle = L.circle(initialCenter, {
      radius: radiusMeters || 100,
      color: "#19376d",
      weight: 1.5,
      fillColor: "#576cbc",
      fillOpacity: 0.15,
    }).addTo(map);
    circleRef.current = circle;

    const marker = L.marker(initialCenter, {
      draggable: true,
      icon: AGENCY_ICON,
    }).addTo(map);
    markerRef.current = marker;

    marker.on("drag", () => {
      // Live-follow the circle while dragging, not just on release —
      // makes it obvious the radius travels with the pin.
      circle.setLatLng(marker.getLatLng());
    });

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng);
      reverseGeocode(pos.lat, pos.lng);
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      onLocationChange(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    if (isValidCoord(latitude) && isValidCoord(longitude)) {
      map.fitBounds(circle.getBounds(), { padding: [30, 30], maxZoom: 18 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker/circle in sync if lat/lng change from outside the
  // map (e.g. the admin typed coordinates directly into the form fields,
  // or a search result was selected)
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    if (!isValidCoord(latitude) || !isValidCoord(longitude)) return;

    const current = markerRef.current.getLatLng();
    const changed =
      Math.abs(current.lat - latitude) > 1e-9 ||
      Math.abs(current.lng - longitude) > 1e-9;
    if (changed) {
      const next = [latitude, longitude];
      markerRef.current.setLatLng(next);
      circleRef.current?.setLatLng(next);
      mapRef.current.setView(next, mapRef.current.getZoom());
    }
  }, [latitude, longitude]);

  // Keep the circle's radius in sync with the slider
  useEffect(() => {
    if (!circleRef.current) return;
    const next = Number(radiusMeters);
    if (!Number.isNaN(next) && next > 0) {
      circleRef.current.setRadius(next);
    }
  }, [radiusMeters]);

  /**
   * Reverse geocode: given coordinates (from a click or drag), look up
   * the address at that point and pass it up via onPlaceFound. Fails
   * silently — reverse geocoding not resolving shouldn't block the
   * admin from still using the coordinates they just picked.
   */
  async function reverseGeocode(lat, lng) {
    if (!onPlaceFound) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      const result = await res.json();
      if (result && result.display_name) {
        onPlaceFound({
          name: (result.name || result.display_name.split(",")[0]).trim(),
          address: result.display_name,
        });
      }
    } catch {
      // Silent — the admin still has valid coordinates even if this fails
    }
  }

  async function runSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
      );
      const results = await res.json();
      if (results.length === 0) {
        setSearchError(
          "Location not found. Try a different search, or click the map directly.",
        );
        return;
      }
      const result = results[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      onLocationChange(lat, lng);
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 17);
      }
      if (onPlaceFound) {
        onPlaceFound({
          name: (result.name || result.display_name.split(",")[0]).trim(),
          address: result.display_name,
        });
      }
    } catch {
      setSearchError(
        "Search failed. Please try again, or click the map directly.",
      );
    } finally {
      setSearching(false);
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent bubbling to the outer AgencyForm's submit
      runSearch();
    }
  }

  function recenter() {
    if (!mapRef.current || !circleRef.current) return;
    mapRef.current.fitBounds(circleRef.current.getBounds(), {
      padding: [30, 30],
      maxZoom: 18,
    });
  }

  return (
    <div>
      {/* Deliberately a <div>, not a <form> — see note in the component
          doc comment above about nested forms. */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search for a place (e.g. CAAP Dipolog Airport)"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caap-blue"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={searching}
          className="flex items-center gap-1.5 bg-caap-navy text-white px-3 py-2 rounded-lg text-sm hover:bg-caap-blue disabled:opacity-50 shrink-0"
        >
          {searching ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </div>

      {searchError && (
        <p className="text-xs text-red-600 mb-2">{searchError}</p>
      )}

      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full h-80 rounded-xl border border-slate-300"
        />

        {/* Live coordinates + radius readout */}
        {isValidCoord(latitude) && isValidCoord(longitude) && (
          <div className="absolute top-2 left-2 z-[500] bg-white/95 backdrop-blur rounded-lg shadow-sm border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600 font-mono leading-tight">
            <div>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
            <div className="text-caap-navy font-semibold">
              Radius: {radiusMeters || 0}m
            </div>
          </div>
        )}

        {/* Recenter on the pin + geofence */}
        <button
          type="button"
          onClick={recenter}
          className="absolute bottom-4 left-3 z-[500] bg-white rounded-full shadow-md p-2 text-caap-navy hover:bg-slate-50 active:scale-95 transition-transform"
          title="Recenter on the pin"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-1.5">
        Search, click on the map, or drag the pin to set the exact location. The
        shaded circle shows the geofence students must be inside to time in/out.
        Name and address auto-fill below — feel free to edit them.
      </p>
    </div>
  );
}

function isValidCoord(value) {
  return typeof value === "number" && !Number.isNaN(value);
}
