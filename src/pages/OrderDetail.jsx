import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";
import { osmPointUrl } from "../utils/osmLinks.js";

function money(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return isNaN(n) ? "—" : `₹${n.toFixed(2)}`;
}

// Upgrade http:// asset URLs to https:// so they aren't blocked as mixed
// content when the panel is served over HTTPS (fixes broken POD/signature
// images already stored with an http:// origin).
function secureUrl(u) {
  if (typeof u !== "string") return u;
  return u.startsWith("http://") ? "https://" + u.slice("http://".length) : u;
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
  return osmPointUrl(lat, lng);
}

// "23.02145, 72.57132" or null when either coordinate is missing/invalid.
function fmtCoords(lat, lng) {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `${la.toFixed(5)}, ${lo.toFixed(5)}`;
}

// Opens an asset (POD photo / signature) in a new tab via an eye icon button,
// avoiding inline image rendering altogether.
function ViewLink({ href, label }) {
  return (
    <a
      href={secureUrl(href)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm text-gray-700"
      title={`View ${label}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-brand-600"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      View {label}
    </a>
  );
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
  const [searchParams] = useSearchParams();
  // Order ids are unique per project only — the list passes project_code (and
  // store_code) so the detail fetch resolves the RIGHT order when the same id
  // exists in multiple projects/stores.
  const projectCode = searchParams.get("project_code") || "";
  const storeCode = searchParams.get("store_code") || "";
  const [items, setItems] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    setErr("");
    const params = projectCode ? { project_code: projectCode } : {};
    api
      .get(`/super-admin/orders/${id}/delivery`, { params })
      .then((r) => setDelivery(r.data.data))
      .catch((e) => setErr(e.response?.data?.message || e.message));

    api
      .get(`/super-admin/orders/${id}/items`, { params })
      .then((r) => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [id, projectCode]);

  const totalAmount = items.reduce(
    (sum, it) => sum + Number(it.total_amt_our_price || 0),
    0
  );

  const order = delivery?.order;
  const da = delivery?.delivery_assignment;
  const pod = da?.proof_of_delivery;
  const rider = da?.rider_id;
  const mapLink = mapsUrl(order?.latitude, order?.longitude);
  const coords = fmtCoords(order?.latitude, order?.longitude);

  return (
    <>
      <PageHeader
        title={`Order #${id}`}
        subtitle={
          [
            (order?.project_code || projectCode) &&
              `Project ${order?.project_code || projectCode}`,
            (order?.store_code || storeCode) &&
              `Store ${order?.store_code || storeCode}`,
          ]
            .filter(Boolean)
            .join(" · ") || "Picking items & delivery status"
        }
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
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Coordinates:</span>
                  {coords ? (
                    <>
                      <span className="font-mono text-xs text-gray-700">{coords}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(coords)}
                        title="Copy coordinates"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Copy
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">not available</span>
                  )}
                </div>
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
                  {pod.photo_urls.map((url, i) => (
                    <ViewLink
                      key={url}
                      href={url}
                      label={pod.photo_urls.length > 1 ? `photo ${i + 1}` : "photo"}
                    />
                  ))}
                </div>
                {pod.notes && (
                  <p className="text-sm text-gray-600 mt-2">Notes: {pod.notes}</p>
                )}
                {pod.signature_url && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 uppercase mb-1">Signature</div>
                    <ViewLink href={pod.signature_url} label="signature" />
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
