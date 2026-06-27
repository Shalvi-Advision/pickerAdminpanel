import { useEffect, useRef, useState } from "react";
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

// Map height presets the admin can switch between (persisted in localStorage).
const SIZES = {
  S: { label: "S", h: "h-56" }, // 14rem
  M: { label: "M", h: "h-72" }, // 18rem (default)
  L: { label: "L", h: "h-[32rem]" },
};
const SIZE_KEY = "deliveriesMapSize";
const COLLAPSE_KEY = "deliveriesMapCollapsed";

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

  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(SIZE_KEY);
    return saved && SIZES[saved] ? saved : "M";
  });
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1"
  );

  useEffect(() => {
    localStorage.setItem(SIZE_KEY, size);
  }, [size]);
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    // Collapsing unmounts the container; destroy the map so expand rebuilds clean.
    if (collapsed && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current = [];
    }
  }, [collapsed]);

  // When the container resizes (size change / expand), Leaflet must recompute.
  useEffect(() => {
    if (collapsed || !mapRef.current) return;
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [size, collapsed]);

  useEffect(() => {
    if (collapsed || !containerRef.current) return;

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
  }, [locations, orders, collapsed]);

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
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Live rider &amp; order map
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          {!collapsed && (
            <div className="hidden md:flex flex-wrap gap-3 text-[11px] text-gray-500">
              <Legend color="#2563eb" label="Rider" pin />
              <Legend color="#f59e0b" label="Out" />
              <Legend color="#2563eb" label="Assigned" />
              <Legend color="#16a34a" label="Delivered" />
              <Legend color="#dc2626" label="Failed" />
            </div>
          )}
          {/* Size switcher */}
          {!collapsed && (
            <div className="flex items-center rounded-lg border bg-gray-50 p-0.5">
              {Object.entries(SIZES).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSize(key)}
                  title={`${cfg.label === "S" ? "Small" : cfg.label === "M" ? "Medium" : "Large"} map`}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    size === key
                      ? "bg-brand-600 text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          )}
          {/* Collapse / expand */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs border bg-white hover:bg-gray-50 px-2.5 py-1.5 rounded-lg text-gray-600"
            title={collapsed ? "Show map" : "Hide map"}
          >
            {collapsed ? "▸ Show map" : "▾ Hide map"}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div ref={containerRef} className={`${SIZES[size].h} w-full z-0`} />
      )}
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
