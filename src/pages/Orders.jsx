import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";

const STATUSES = ["pending", "assigned", "in_progress", "completed", "rejected"];

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleString();
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [sent, setSent] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (status) params.status = status;
      if (storeCode) params.store_code = storeCode;
      if (sent) params.sent = sent;
      const [o, s] = await Promise.all([
        api.get("/super-admin/all-orders", { params }),
        api.get("/super-admin/stores"),
      ]);
      setOrders(o.data.data);
      setStores(s.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, storeCode, sent]);

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="All orders across every store"
      />
      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
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
                <option key={s} value={s}>
                  {s}
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
          <div className="text-sm text-gray-500 ml-auto">
            Showing {orders.length} {orders.length === 1 ? "order" : "orders"}
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
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Order #</th>
                  <th className="text-left px-4 py-2">Store</th>
                  <th className="text-left px-4 py-2">Order Date</th>
                  <th className="text-left px-4 py-2">Items</th>
                  <th className="text-left px-4 py-2">Amount</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Assigned To</th>
                  <th className="text-left px-4 py-2">Sent</th>
                  <th className="text-right px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      #{o.orders_idorders}
                    </td>
                    <td className="px-4 py-2">{o.store_code}</td>
                    <td className="px-4 py-2 text-gray-700">{fmtDate(o.order_date)}</td>
                    <td className="px-4 py-2 text-gray-700">{o.total_items}</td>
                    <td className="px-4 py-2 text-gray-700">
                      ₹{Number(o.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge value={o.status} />
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {o.current_assignment?.assigned_to?.name || "—"}
                    </td>
                    <td className="px-4 py-2">
                      {o.sent_to_super_admin ? (
                        <span className="text-xs text-emerald-700">
                          ✓ {fmtDate(o.sent_to_super_admin_at)}
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
                    <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                      No orders match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
