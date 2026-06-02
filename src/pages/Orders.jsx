import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleString();
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/super-admin/all-orders")
      .then((r) => setOrders(r.data.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Orders" subtitle="All orders across every store" />
      <div className="p-8 space-y-4">
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
                    <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                      No orders found.
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
