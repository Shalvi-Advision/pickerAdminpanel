import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in Vite/webpack bundles
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Live map of rider GPS positions on the Deliveries page.
 * @param {{ locations: Array<{ rider_id, name, last_location: { latitude, longitude }, active_orders? }> }} props
 */
export default function RiderLocationsMap({ locations }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || locations.length === 0) return;

    if (!mapRef.current) {
      const first = locations[0].last_location;
      mapRef.current = L.map(containerRef.current).setView(
        [parseFloat(first.latitude), parseFloat(first.longitude)],
        12
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = [];
    for (const loc of locations) {
      const lat = parseFloat(loc.last_location.latitude);
      const lng = parseFloat(loc.last_location.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      bounds.push([lat, lng]);
      const marker = L.marker([lat, lng])
        .addTo(mapRef.current)
        .bindPopup(
          `<strong>${loc.name}</strong>${
            loc.active_orders?.length
              ? `<br/>Orders: #${loc.active_orders.join(", #")}`
              : ""
          }`
        );
      markersRef.current.push(marker);
    }

    if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], 14);
    }

    return () => {};
  }, [locations]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!locations.length) return null;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Live rider map
      </div>
      <div ref={containerRef} className="h-72 w-full z-0" />
    </div>
  );
}
