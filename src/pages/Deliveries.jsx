import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";
import Pagination from "../components/Pagination.jsx";

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

export default function Deliveries() {
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [page, setPage] = useState(1);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    setPage(1);
  }, [tab, storeCode, deliveryDate, deliverySlot]);

  useEffect(() => {
    api.get("/super-admin/stores").then((r) => setStores(r.data.data || [])).catch(() => {});
    api.get("/super-admin/riders/locations").then((r) => setLocations(r.data.data || [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (tab) params.delivery_status = tab;
      if (storeCode) params.store_code = storeCode;
      if (deliveryDate) params.delivery_date = deliveryDate;
      if (deliverySlot.trim()) params.delivery_slot = deliverySlot.trim();
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
  }, [tab, storeCode, deliveryDate, deliverySlot]);

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
        {locations.length > 0 && (
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Live rider GPS ({locations.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <a
                  key={loc.rider_id}
                  href={`https://www.google.com/maps?q=${loc.last_location.latitude},${loc.last_location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100 text-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium">{loc.name}</span>
                  <span className="text-gray-400 text-xs">
                    {fmtWhen(loc.last_location.updated_at)}
                  </span>
                  {loc.active_orders?.length > 0 && (
                    <span className="text-xs text-brand-600">#{loc.active_orders.join(", #")}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
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
