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

// Markers sharing (nearly) the same coordinate stack into an unreadable pile.
// We fan them out in a small ring around the shared point ("spiderfy") so every
// rider/order stays clickable. Points are bucketed by a coarse rounding of their
// lat/lng; any bucket with >1 point gets its members spread evenly on a circle.
const SPIDER_PRECISION = 4; // ~11m grid — treats points this close as "same spot"
const SPIDER_RADIUS = 0.00035; // ~40m fan-out radius in degrees

function spiderfy(points) {
  const buckets = new Map();
  for (const p of points) {
    const key = `${p.lat.toFixed(SPIDER_PRECISION)},${p.lng.toFixed(SPIDER_PRECISION)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  const out = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      out.push({ ...group[0], dLat: group[0].lat, dLng: group[0].lng });
      continue;
    }
    // Scale the ring up a touch as the pile grows so labels don't touch.
    const radius = SPIDER_RADIUS * (1 + (group.length - 2) * 0.12);
    group.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      // Longitude degrees shrink with latitude; correct so the ring looks circular.
      const cos = Math.cos((p.lat * Math.PI) / 180) || 1;
      out.push({
        ...p,
        dLat: p.lat + radius * Math.sin(angle),
        dLng: p.lng + (radius * Math.cos(angle)) / cos,
      });
    });
  }
  return out;
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

  // When the container resizes (size change / expand), Leaflet must recompute
  // its viewport or it paints a blank/gray area. A ResizeObserver fires exactly
  // when the element's box changes — more reliable than a fixed timeout.
  useEffect(() => {
    if (collapsed || !containerRef.current) return;
    const el = containerRef.current;
    const ping = () => mapRef.current && mapRef.current.invalidateSize();
    const ro = new ResizeObserver(() => {
      // double-rAF so we measure after the browser has painted the new height
      requestAnimationFrame(() => requestAnimationFrame(ping));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsed]);

  // Also nudge immediately on an explicit size switch (covers same-size remounts).
  useEffect(() => {
    if (collapsed || !mapRef.current) return;
    const t = setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 60);
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

    // Collect every point (orders + riders) into one list so overlapping pins of
    // any type get fanned out together, then spiderfy the whole set at once.
    const points = [];

    for (const o of orders) {
      const lat = num(o.latitude);
      const lng = num(o.longitude);
      if (lat == null || lng == null) continue;
      const color = STATUS_COLOR[o.delivery_status] || "#6b7280";
      const rider = o.current_delivery_assignment?.rider_id;
      const stop = o.current_delivery_assignment?.stop_sequence;
      points.push({
        lat,
        lng,
        kind: "order",
        icon: orderIcon(color),
        zIndexOffset: 0,
        popup:
          `<strong>Order #${o.orders_idorders}</strong>` +
          `<br/><span style="color:${color}">${(o.delivery_status || "").replace(/_/g, " ")}</span>` +
          (o.store_code ? `<br/>Store: ${o.store_code}` : "") +
          (rider?.name ? `<br/>Rider: ${rider.name}${stop ? ` (stop ${stop})` : ""}` : "") +
          (o.delivery_details ? `<br/>${o.delivery_details}` : ""),
      });
    }

    for (const loc of locations) {
      const lat = num(loc.last_location?.latitude);
      const lng = num(loc.last_location?.longitude);
      if (lat == null || lng == null) continue;
      points.push({
        lat,
        lng,
        kind: "rider",
        icon: null, // default blue pin
        zIndexOffset: 1000,
        popup:
          `<strong>${loc.name}</strong> (rider)${
            loc.active_orders?.length ? `<br/>Orders: #${loc.active_orders.join(", #")}` : ""
          }`,
      });
    }

    const spread = spiderfy(points);
    for (const p of spread) {
      const displaced = p.dLat !== p.lat || p.dLng !== p.lng;
      // Thin "leg" from the real coordinate to the displaced pin makes it obvious
      // the fanned-out markers actually share one location.
      if (displaced) {
        const leg = L.polyline(
          [
            [p.lat, p.lng],
            [p.dLat, p.dLng],
          ],
          { color: "#94a3b8", weight: 1, opacity: 0.7, interactive: false }
        ).addTo(mapRef.current);
        markersRef.current.push(leg);
      }
      // Only pass `icon` when we have a custom one. Passing `icon: undefined`
      // makes Leaflet skip its default-icon fallback and crash in _initIcon
      // (undefined.createIcon()), so the key must be absent for rider pins.
      const markerOpts = { zIndexOffset: p.zIndexOffset };
      if (p.icon) markerOpts.icon = p.icon;
      const marker = L.marker([p.dLat, p.dLng], markerOpts)
        .addTo(mapRef.current)
        .bindPopup(p.popup);
      markersRef.current.push(marker);
      bounds.push([p.lat, p.lng]);
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
