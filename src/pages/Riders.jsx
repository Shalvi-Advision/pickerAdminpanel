import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

const PER_PAGE = 20;

export default function Riders() {
  const { hasPage } = useAuth();
  const [riders, setRiders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [storeFilter, q]);

  useEffect(() => {
    api.get("/super-admin/stores").then((r) => setStores(r.data.data || [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (storeFilter) params.store_code = storeFilter;
      if (q.trim()) params.q = q.trim();
      const r = await api.get("/super-admin/riders", { params });
      setRiders(r.data.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeFilter, q]);

  const paged = useMemo(
    () => riders.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [riders, page]
  );

  const stats = useMemo(() => {
    const online = riders.filter((r) => r.rider_availability !== "offline").length;
    const active = riders.reduce((s, r) => s + (r.active_deliveries || 0), 0);
    const today = riders.reduce((s, r) => s + (r.delivered_today || 0), 0);
    return { total: riders.length, online, active, today };
  }, [riders]);

  return (
    <>
      <PageHeader
        title="Riders"
        subtitle="Delivery workforce across all stores"
        actions={
          hasPage("users") ? (
            <Link
              to="/users"
              className="text-sm border bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg"
            >
              + Add rider in Users
            </Link>
          ) : null
        }
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-7xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Total riders", stats.total],
            ["Online", stats.online],
            ["Active deliveries", stats.active],
            ["Delivered today", stats.today],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Store</label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone…"
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm w-48"
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
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Rider</th>
                  <th className="text-left px-4 py-2">Store(s)</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Active</th>
                  <th className="text-right px-4 py-2">Today</th>
                  <th className="text-left px-4 py-2">FCM</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
                      {r.phone && <div className="text-xs text-gray-400">{r.phone}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {(r.store_codes || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {!r.is_active ? (
                        <Badge value="inactive" />
                      ) : r.rider_availability === "offline" ? (
                        <Badge value="offline" />
                      ) : (
                        <Badge value="online" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.active_deliveries ?? 0}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.delivered_today ?? 0}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {r.fcm_token ? "✓" : "—"}
                    </td>
                  </tr>
                ))}
                {!paged.length && (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                      No riders found. Create one from Users with role Rider.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} perPage={PER_PAGE} total={riders.length} onChange={setPage} />
      </div>
    </>
  );
}
