import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";
import Pagination from "../components/Pagination.jsx";

const STATUSES = ["pending", "assigned", "in_progress", "completed", "rejected"];
const DELIVERY_STATUSES = [
  "ready_for_delivery",
  "assigned",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
];
const PER_PAGE = 25;

// order_date comes from the e-commerce source as IST with no TZ marker.
// MongoDB stores it as UTC (treating IST as UTC), so displaying in UTC
// recovers the original intended local time.
function fmtOrderDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleString("en-IN", {
    timeZone: "UTC",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// System-generated timestamps (sent_to_super_admin_at etc.) are correctly
// stored as UTC and should display in the browser's local timezone (IST).
function fmtSystemDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// delivery_date is stored as a plain date string (e.g. "2026-06-08").
function fmtDelivery(d) {
  if (!d) return "—";
  // Append T00:00:00Z so it's parsed as UTC midnight and shown as a date only.
  const dt = new Date(d.includes("T") ? d : d + "T00:00:00Z");
  if (!isNaN(dt)) {
    return dt.toLocaleDateString("en-IN", {
      timeZone: "UTC",
      day: "2-digit", month: "short", year: "numeric",
    });
  }
  return String(d);
}

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [status, setStatus] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState(
    () => searchParams.get("delivery_status") || ""
  );
  const [storeCode, setStoreCode] = useState("");
  const [sent, setSent] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Reset to page 1 whenever filters or search change
  useEffect(() => { setPage(1); }, [projectCode, status, deliveryStatus, storeCode, sent, search]);

  // Load distinct project codes once
  useEffect(() => {
    api.get("/super-admin/projects")
      .then((r) => setProjects(r.data.data || []))
      .catch(() => {});
  }, []);

  // When project changes, reload stores and clear store selection
  useEffect(() => {
    setStoreCode("");
    const params = projectCode ? { project_code: projectCode } : {};
    api.get("/super-admin/stores", { params })
      .then((r) => setStores(r.data.data || []))
      .catch(() => {});
  }, [projectCode]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (projectCode) params.project_code = projectCode;
      if (status) params.status = status;
      if (deliveryStatus) params.delivery_status = deliveryStatus;
      if (storeCode) params.store_code = storeCode;
      if (sent) params.sent = sent;
      if (search.trim()) params.order_id = search.trim();
      const r = await api.get("/super-admin/all-orders", { params });
      setOrders(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectCode, status, deliveryStatus, storeCode, sent, search]);

  const pagedOrders = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="All orders across every project and store"
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
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
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
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
            <label className="text-xs text-gray-500">Delivery status</label>
            <select
              value={deliveryStatus}
              onChange={(e) => setDeliveryStatus(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              {DELIVERY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Sent to Super Admin</label>
            <select
              value={sent}
              onChange={(e) => setSent(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">Any</option>
              <option value="true">Sent</option>
              <option value="false">Not sent</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Search Order #</label>
            <div className="relative mt-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Order ID…"
                className="border rounded-md pl-7 pr-8 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none">×</button>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500 ml-auto">
            {orders.length} {orders.length === 1 ? "order" : "orders"} total
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
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Order #</th>
                    <th className="text-left px-4 py-2">Project</th>
                    <th className="text-left px-4 py-2">Store</th>
                    <th className="text-left px-4 py-2">Order Date</th>
                    <th className="text-left px-4 py-2">Delivery Date</th>
                    <th className="text-left px-4 py-2">Items</th>
                    <th className="text-left px-4 py-2">Amount</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Delivery</th>
                    <th className="text-left px-4 py-2">Picker</th>
                    <th className="text-left px-4 py-2">Rider</th>
                    <th className="text-left px-4 py-2">Sent</th>
                    <th className="text-right px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((o) => (
                    <tr key={o._id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">
                        #{o.orders_idorders}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-700">
                        {o.project_code || "—"}
                      </td>
                      <td className="px-4 py-2">{o.store_code}</td>
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{fmtOrderDate(o.order_date)}</td>
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{fmtDelivery(o.delivery_date)}</td>
                      <td className="px-4 py-2 text-gray-700">{o.total_items}</td>
                      <td className="px-4 py-2 text-gray-700">
                        ₹{Number(o.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge value={o.status} />
                      </td>
                      <td className="px-4 py-2">
                        {o.delivery_status ? <Badge value={o.delivery_status} /> : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {o.current_assignment?.assigned_to?.name || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {o.current_delivery_assignment?.rider_id?.name || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {o.sent_to_super_admin ? (
                          <span className="text-xs text-emerald-700">
                            ✓ {fmtSystemDate(o.sent_to_super_admin_at)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          to={`/orders/${o.orders_idorders}`}
                          className="text-brand-600 hover:underline text-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!orders.length && (
                    <tr>
                      <td colSpan="11" className="px-4 py-10 text-center text-gray-500">
                        No orders match the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-3">
              <Pagination
                page={page}
                total={orders.length}
                perPage={PER_PAGE}
                onChange={setPage}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
