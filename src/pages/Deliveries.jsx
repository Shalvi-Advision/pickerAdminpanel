import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";
import Pagination from "../components/Pagination.jsx";
import RiderLocationsMap from "../components/RiderLocationsMap.jsx";
import { osmPointUrl } from "../utils/osmLinks.js";

const TABS = [
  { key: "", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "assigned", label: "Assigned" },
  { key: "out", label: "Out" },
  { key: "delivered", label: "Delivered" },
  { key: "failed", label: "Failed" },
];

const PER_PAGE = 25;

function fmtWhen(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// GPS older than this is treated as stale — dot turns amber/gray so the admin
// can tell a live rider from one whose phone hasn't reported in a while.
const GPS_FRESH_MS = 5 * 60 * 1000; // 5 min = live
const GPS_STALE_MS = 30 * 60 * 1000; // >30 min = offline

function gpsFreshness(updatedAt) {
  const t = updatedAt ? new Date(updatedAt).getTime() : NaN;
  if (!Number.isFinite(t)) return { dot: "bg-gray-300", label: "no fix" };
  const age = Date.now() - t;
  if (age <= GPS_FRESH_MS) return { dot: "bg-emerald-500", label: "live" };
  if (age <= GPS_STALE_MS) return { dot: "bg-amber-400", label: "idle" };
  return { dot: "bg-gray-400", label: "offline" };
}

// How many order chips to show on a card before collapsing into "+N".
const ORDER_CHIP_LIMIT = 4;

function RiderCard({ loc }) {
  const lat = loc.last_location?.latitude;
  const lng = loc.last_location?.longitude;
  const orders = loc.active_orders || [];
  const shown = orders.slice(0, ORDER_CHIP_LIMIT);
  const extra = orders.length - shown.length;
  const fresh = gpsFreshness(loc.last_location?.updated_at);

  return (
    <div className="rounded-lg border bg-gray-50/60 hover:bg-gray-50 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${fresh.dot}`}
          title={fresh.label}
        />
        <span className="font-semibold text-gray-800 text-sm truncate flex-1">
          {loc.name}
        </span>
        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium shrink-0">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>{fmtWhen(loc.last_location?.updated_at)}</span>
        {lat && lng && (
          <a
            href={osmPointUrl(lat, lng)}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:underline shrink-0"
          >
            View on map ↗
          </a>
        )}
      </div>

      {orders.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {shown.map((id) => (
            <Link
              key={id}
              to={`/orders/${id}`}
              className="text-[11px] px-1.5 py-0.5 rounded bg-white border text-brand-600 hover:bg-brand-50"
            >
              #{id}
            </Link>
          ))}
          {extra > 0 && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded bg-white border text-gray-500"
              title={orders.map((id) => `#${id}`).join(", ")}
            >
              +{extra} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function LiveRiderGPS({ locations }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const filtered = term
    ? locations.filter(
        (l) =>
          l.name?.toLowerCase().includes(term) ||
          (l.active_orders || []).some((id) => String(id).includes(term))
      )
    : locations;

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Live rider GPS ({locations.length})
        </div>
        {locations.length > 6 && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search rider or order #"
            className="border rounded-md px-2.5 py-1 text-sm w-56"
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 py-4 text-center">
          No riders match “{q}”.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-80 overflow-y-auto pr-1">
          {filtered.map((loc) => (
            <RiderCard key={loc.rider_id} loc={loc} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Deliveries() {
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    setPage(1);
  }, [tab, projectCode, storeCode, deliveryDate, deliverySlot, search]);

  useEffect(() => {
    api.get("/super-admin/projects").then((r) => setProjects(r.data.data || [])).catch(() => {});
    const loadLocs = () =>
      api.get("/super-admin/riders/locations").then((r) => setLocations(r.data.data || [])).catch(() => {});
    loadLocs();
    const id = setInterval(loadLocs, 30000);
    return () => clearInterval(id);
  }, []);

  // Reload stores and clear store selection when project changes
  useEffect(() => {
    setStoreCode("");
    const params = projectCode ? { project_code: projectCode } : {};
    api.get("/super-admin/stores", { params }).then((r) => setStores(r.data.data || [])).catch(() => {});
  }, [projectCode]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (tab) params.delivery_status = tab;
      if (projectCode) params.project_code = projectCode;
      if (storeCode) params.store_code = storeCode;
      if (deliveryDate) params.delivery_date = deliveryDate;
      if (deliverySlot.trim()) params.delivery_slot = deliverySlot.trim();
      if (search.trim()) params.order_id = search.trim();
      const r = await api.get("/super-admin/deliveries", { params });
      setRows(r.data.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, projectCode, storeCode, deliveryDate, deliverySlot, search]);

  const paged = useMemo(
    () => rows.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [rows, page]
  );

  const counts = useMemo(() => {
    const c = { ready: 0, assigned: 0, out: 0, delivered: 0, failed: 0 };
    for (const o of rows) {
      const s = o.delivery_status;
      if (s === "ready_for_delivery") c.ready++;
      else if (s === "assigned") c.assigned++;
      else if (s === "out_for_delivery") c.out++;
      else if (s === "delivered") c.delivered++;
      else if (s === "failed") c.failed++;
    }
    return c;
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Deliveries"
        subtitle="Live delivery operations across all stores"
        actions={
          <button
            type="button"
            onClick={load}
            className="text-sm border bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg"
          >
            Refresh
          </button>
        }
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-7xl">
        {(locations.length > 0 || rows.length > 0) && (
          <RiderLocationsMap locations={locations} orders={rows} />
        )}

        {locations.length > 0 && (
          <LiveRiderGPS locations={locations} />
        )}

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key || "all"}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                tab === t.key
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Project</label>
            <select
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Store</label>
            <select
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Delivery date</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Slot</label>
            <input
              value={deliverySlot}
              onChange={(e) => setDeliverySlot(e.target.value)}
              placeholder="10:00-12:00"
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm w-36"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Search Order #</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order ID…"
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm w-40"
            />
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Order</th>
                  <th className="text-left px-4 py-2">Store</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Rider</th>
                  <th className="text-left px-4 py-2">Slot / Date</th>
                  <th className="text-left px-4 py-2">Address</th>
                  <th className="text-left px-4 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((o) => {
                  const da = o.current_delivery_assignment;
                  const rider = da?.rider_id;
                  return (
                    <tr key={o.orders_idorders} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/orders/${o.orders_idorders}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          #{o.orders_idorders}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-700">{o.store_code}</td>
                      <td className="px-4 py-2.5">
                        <Badge value={o.delivery_status} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {rider?.name || "—"}
                        {da?.stop_sequence && (
                          <span className="text-xs text-gray-400 block">Stop {da.stop_sequence}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        <div>{o.delivery_slot || "—"}</div>
                        <div className="text-gray-400">{o.delivery_date || "—"}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">
                        {o.delivery_details || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {fmtWhen(da?.delivered_at || da?.started_at || da?.assigned_at || o.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
                {!paged.length && (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                      No deliveries match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} perPage={PER_PAGE} total={rows.length} onChange={setPage} />
      </div>
    </>
  );
}
