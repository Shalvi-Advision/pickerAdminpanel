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

// Color per delivery status, for the order markers.
const STATUS_COLOR = {
  ready_for_delivery: "#6b7280", // gray
  assigned: "#2563eb", // blue
  out_for_delivery: "#f59e0b", // amber
  delivered: "#16a34a", // green
  failed: "#dc2626", // red
};

// A small circular "order" pin (box icon) rendered as a divIcon.
function orderIcon(color) {
  return L.divIcon({
    className: "order-marker",
    html: `<div style="
      width:26px;height:26px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:#fff;font-size:12px;line-height:1;">&#128230;</span>
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Live map showing rider GPS positions AND the order/delivery locations.
 * @param {{
 *   locations: Array<{ rider_id, name, last_location: { latitude, longitude }, active_orders? }>,
 *   orders?: Array<{ orders_idorders, latitude, longitude, delivery_status, store_code, delivery_details, current_delivery_assignment? }>
 * }} props
 */
export default function RiderLocationsMap({ locations, orders = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // First valid coordinate (rider or order) seeds the initial view.
    const seed =
      locations.find((l) => num(l.last_location?.latitude) != null)?.last_location ||
      orders.find((o) => num(o.latitude) != null);
    if (!seed) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(
        [num(seed.latitude), num(seed.longitude)],
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

    // --- Order / delivery-location markers ---
    for (const o of orders) {
      const lat = num(o.latitude);
      const lng = num(o.longitude);
      if (lat == null || lng == null) continue;
      const color = STATUS_COLOR[o.delivery_status] || "#6b7280";
      const rider = o.current_delivery_assignment?.rider_id;
      const stop = o.current_delivery_assignment?.stop_sequence;
      const marker = L.marker([lat, lng], { icon: orderIcon(color) })
        .addTo(mapRef.current)
        .bindPopup(
          `<strong>Order #${o.orders_idorders}</strong>` +
            `<br/><span style="color:${color}">${(o.delivery_status || "").replace(/_/g, " ")}</span>` +
            (o.store_code ? `<br/>Store: ${o.store_code}` : "") +
            (rider?.name ? `<br/>Rider: ${rider.name}${stop ? ` (stop ${stop})` : ""}` : "") +
            (o.delivery_details ? `<br/>${o.delivery_details}` : "")
        );
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    }

    // --- Rider GPS markers (default blue pin, drawn on top) ---
    for (const loc of locations) {
      const lat = num(loc.last_location?.latitude);
      const lng = num(loc.last_location?.longitude);
      if (lat == null || lng == null) continue;
      const marker = L.marker([lat, lng], { zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindPopup(
          `<strong>${loc.name}</strong> (rider)${
            loc.active_orders?.length ? `<br/>Orders: #${loc.active_orders.join(", #")}` : ""
          }`
        );
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    }

    if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], 14);
    }
  }, [locations, orders]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const hasAny =
    locations.some((l) => num(l.last_location?.latitude) != null) ||
    orders.some((o) => num(o.latitude) != null);
  if (!hasAny) return null;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Live rider &amp; order map
        </span>
        <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
          <Legend color="#2563eb" label="Rider" pin />
          <Legend color="#f59e0b" label="Out" />
          <Legend color="#2563eb" label="Assigned" />
          <Legend color="#16a34a" label="Delivered" />
          <Legend color="#dc2626" label="Failed" />
        </div>
      </div>
      <div ref={containerRef} className="h-72 w-full z-0" />
    </div>
  );
}

function Legend({ color, label, pin }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block"
        style={{
          width: 10,
          height: 10,
          background: color,
          borderRadius: pin ? "50%" : "2px",
        }}
      />
      {label}
    </span>
  );
}
