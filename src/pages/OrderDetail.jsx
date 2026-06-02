import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";

function money(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return isNaN(n) ? "—" : `₹${n.toFixed(2)}`;
}

// The order has been picked through the mobile app: prefer the picker's recorded
// status, otherwise fall back to the raw field on the order item.
function itemStatus(it) {
  return (
    it.picker_status?.picked_status ||
    (it.product_picked_status
      ? it.product_picked_status.toLowerCase().replace(/\s+/g, "_")
      : null)
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get(`/super-admin/orders/${id}/items`)
      .then((r) => setItems(r.data.data))
      .catch((e) =>
        setErr(
          e.response?.data?.message ||
            (e.response?.status === 404
              ? "This order has not been sent to super admin yet, so its items cannot be shown."
              : e.message)
        )
      )
      .finally(() => setLoading(false));
  }, [id]);

  const totalAmount = items.reduce(
    (sum, it) => sum + Number(it.total_amt_our_price || 0),
    0
  );

  return (
    <>
      <PageHeader
        title={`Order #${id}`}
        subtitle="Item-level picking status"
        actions={
          <Link
            to="/orders"
            className="text-sm border bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg"
          >
            ← Back to orders
          </Link>
        }
      />
      <div className="p-8 space-y-4 max-w-7xl">
        {err && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <>
            {!err && items.length > 0 && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                <span>
                  <span className="font-semibold text-gray-900">
                    {items.length}
                  </span>{" "}
                  {items.length === 1 ? "item" : "items"}
                </span>
                <span>
                  Order total{" "}
                  <span className="font-semibold text-gray-900">
                    {money(totalAmount)}
                  </span>
                </span>
              </div>
            )}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2.5">Item</th>
                    <th className="text-right px-4 py-2.5">Qty</th>
                    <th className="text-right px-4 py-2.5">Price</th>
                    <th className="text-left px-4 py-2.5">Picker status</th>
                    <th className="text-left px-4 py-2.5">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const status = itemStatus(it);
                    const picked = it.picker_status?.picked_quantity;
                    return (
                      <tr key={it._id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-900">
                            {it.item_name || it.product_description || "Item"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {[it.p_code || it.barcode, it.pack_size]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {it.ordered_quantity ?? "—"}
                          {picked != null &&
                            picked !== it.ordered_quantity && (
                              <span className="text-xs text-gray-400">
                                {" "}
                                ({picked} picked)
                              </span>
                            )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {money(it.product_offer_price ?? it.product_mrp)}
                        </td>
                        <td className="px-4 py-2.5">
                          {status ? (
                            <Badge value={status} />
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {it.picker_status?.remark || "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {!items.length && !err && (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        No items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
