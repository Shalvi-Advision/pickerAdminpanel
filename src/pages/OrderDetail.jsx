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

function fmtDt(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function mapsUrl(lat, lng) {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
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
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    setErr("");
    api
      .get(`/super-admin/orders/${id}/delivery`)
      .then((r) => setDelivery(r.data.data))
      .catch((e) => setErr(e.response?.data?.message || e.message));

    api
      .get(`/super-admin/orders/${id}/items`)
      .then((r) => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [id]);

  const totalAmount = items.reduce(
    (sum, it) => sum + Number(it.total_amt_our_price || 0),
    0
  );

  const order = delivery?.order;
  const da = delivery?.delivery_assignment;
  const pod = da?.proof_of_delivery;
  const rider = da?.rider_id;
  const mapLink = mapsUrl(order?.latitude, order?.longitude);

  return (
    <>
      <PageHeader
        title={`Order #${id}`}
        subtitle="Picking items & delivery status"
        actions={
          <Link
            to="/orders"
            className="text-sm border bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg"
          >
            ← Back to orders
          </Link>
        }
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-7xl">
        {err && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        {!loading && order && (
          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900">Delivery</h3>
              {order.delivery_status ? (
                <Badge value={order.delivery_status} />
              ) : (
                <span className="text-xs text-gray-400">Not started</span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500">Address</span>
                <p className="text-gray-900">{order.delivery_details || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Delivery date</span>
                <p className="text-gray-900">{order.delivery_date || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Delivery slot</span>
                <p className="text-gray-900">{order.delivery_slot || "—"}</p>
              </div>
              {rider && (
                <div>
                  <span className="text-gray-500">Rider</span>
                  <p className="text-gray-900">
                    {rider.name}
                    {rider.phone ? ` · ${rider.phone}` : ""}
                  </p>
                </div>
              )}
              {da && (
                <>
                  <div>
                    <span className="text-gray-500">Assigned</span>
                    <p className="text-gray-900">{fmtDt(da.assigned_at)}</p>
                  </div>
                  {da.started_at && (
                    <div>
                      <span className="text-gray-500">Started</span>
                      <p className="text-gray-900">{fmtDt(da.started_at)}</p>
                    </div>
                  )}
                  {da.delivered_at && (
                    <div>
                      <span className="text-gray-500">Delivered</span>
                      <p className="text-gray-900">{fmtDt(da.delivered_at)}</p>
                    </div>
                  )}
                  {da.failed_reason && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500">Failure reason</span>
                      <p className="text-red-700">{da.failed_reason}</p>
                    </div>
                  )}
                  {da.delivery_otp && da.status === "out_for_delivery" && (
                    <div>
                      <span className="text-gray-500">Delivery OTP (testing)</span>
                      <p className="font-mono text-gray-900">{da.delivery_otp}</p>
                    </div>
                  )}
                  {da.stop_sequence && (
                    <div>
                      <span className="text-gray-500">Route stop</span>
                      <p className="text-gray-900">#{da.stop_sequence}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            {mapLink && (
              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-brand-700 hover:underline"
              >
                View on map →
              </a>
            )}
            {pod?.photo_urls?.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Proof of delivery</div>
                <div className="flex flex-wrap gap-2">
                  {pod.photo_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt="POD"
                        className="h-20 w-20 object-cover rounded-lg border"
                      />
                    </a>
                  ))}
                </div>
                {pod.notes && (
                  <p className="text-sm text-gray-600 mt-2">Notes: {pod.notes}</p>
                )}
                {pod.signature_url && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 uppercase mb-1">Signature</div>
                    <a href={pod.signature_url} target="_blank" rel="noreferrer">
                      <img
                        src={pod.signature_url}
                        alt="Signature"
                        className="h-16 max-w-xs object-contain rounded border bg-white"
                      />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <>
            {items.length > 0 && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                <span>
                  <span className="font-semibold text-gray-900">{items.length}</span>{" "}
                  {items.length === 1 ? "item" : "items"}
                </span>
                <span>
                  Order total{" "}
                  <span className="font-semibold text-gray-900">{money(totalAmount)}</span>
                </span>
              </div>
            )}
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[540px]">
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
                            {[it.p_code || it.barcode, it.pack_size].filter(Boolean).join(" · ")}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {it.ordered_quantity ?? "—"}
                          {picked != null && picked !== it.ordered_quantity && (
                            <span className="text-xs text-gray-400"> ({picked} picked)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {money(it.product_offer_price ?? it.product_mrp)}
                        </td>
                        <td className="px-4 py-2.5">
                          {status ? <Badge value={status} /> : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{it.picker_status?.remark || "—"}</td>
                      </tr>
                    );
                  })}
                  {!items.length && !err && (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-gray-500">
                        No items found (order may not be sent to super admin yet).
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
