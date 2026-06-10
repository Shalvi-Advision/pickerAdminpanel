import { useEffect, useState, useCallback } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

const STATUSES = ["success", "skipped", "auth_failed", "validation_failed", "error"];
const LIMIT = 100;

function fmtTs(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

const STATUS_STYLE = {
  success:           "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  skipped:           "bg-gray-100  text-gray-600   ring-1 ring-gray-200",
  auth_failed:       "bg-red-50    text-red-700    ring-1 ring-red-200",
  validation_failed: "bg-amber-50  text-amber-700  ring-1 ring-amber-200",
  error:             "bg-red-50    text-red-700    ring-1 ring-red-200",
};

function StatusPill({ value }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[value] || "bg-gray-100 text-gray-600"}`}>
      {value?.replace(/_/g, " ")}
    </span>
  );
}

export default function WebhookLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async (s = 0) => {
    setLoading(true);
    setErr("");
    try {
      const params = { limit: LIMIT, skip: s };
      if (statusFilter) params.status = statusFilter;
      const r = await api.get("/super-admin/webhook-logs", { params });
      setLogs(r.data.data.logs);
      setTotal(r.data.data.total);
      setSkip(s);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(0); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(skip / LIMIT) + 1;

  return (
    <>
      <PageHeader
        title="Webhook Logs"
        subtitle="Every inbound call to POST /api/webhook/order"
        actions={
          <button
            onClick={() => load(skip)}
            className="border bg-white hover:bg-gray-50 text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Refresh
          </button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Filters + summary */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); }}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            {total} total calls
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        {/* Stats row */}
        {!loading && logs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {STATUSES.map((s) => {
              const count = logs.filter((l) => l.status === s).length;
              const isError = ["auth_failed", "validation_failed", "error"].includes(s);
              return (
                <div key={s} className={`bg-white rounded-xl border shadow-sm px-4 py-3 ${isError && count > 0 ? "border-red-200" : "border-gray-100"}`}>
                  <div className={`text-2xl font-bold ${isError && count > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.replace(/_/g, " ")}</div>
                </div>
              );
            })}
            {/* Assign failed — success webhooks where round-robin couldn't assign */}
            {(() => {
              const count = logs.filter((l) => l.status === "success" && l.assigned === false).length;
              return (
                <div className={`bg-white rounded-xl border shadow-sm px-4 py-3 ${count > 0 ? "border-amber-200" : "border-gray-100"}`}>
                  <div className={`text-2xl font-bold ${count > 0 ? "text-amber-600" : "text-gray-900"}`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">assign failed</div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2.5">Received At</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-left px-4 py-2.5">Order #</th>
                    <th className="text-left px-4 py-2.5">Project</th>
                    <th className="text-left px-4 py-2.5">Store</th>
                    <th className="text-left px-4 py-2.5">Items</th>
                    <th className="text-left px-4 py-2.5">Assigned</th>
                    <th className="text-left px-4 py-2.5">Caller IP</th>
                    <th className="text-right px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr
                        key={log._id}
                        className="border-t hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                      >
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {fmtTs(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill value={log.status} />
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {log.orders_idorders ? `#${log.orders_idorders}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700">
                          {log.project_code || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {log.store_code || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          {log.items_count ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {log.assigned === true ? (
                            <span className="text-emerald-600 text-xs font-medium">✓ Yes</span>
                          ) : log.assigned === false ? (
                            <span className="text-red-500 text-xs">✗ No</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                          {log.caller_ip || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                          {expanded === log._id ? "▲" : "▼"}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expanded === log._id && (
                        <tr key={`${log._id}-detail`} className="bg-gray-50/80">
                          <td colSpan="9" className="px-4 py-3">
                            <div className="space-y-1 text-xs text-gray-700">
                              {log.error_message && (
                                <div className="flex gap-2">
                                  <span className="font-medium text-red-600 shrink-0">Error:</span>
                                  <span>{log.error_message}</span>
                                </div>
                              )}
                              {log.assign_error && (
                                <div className="flex gap-2">
                                  <span className="font-medium text-amber-600 shrink-0">Assign error:</span>
                                  <span>{log.assign_error}</span>
                                </div>
                              )}
                              {!log.error_message && !log.assign_error && (
                                <span className="text-gray-400">No error details.</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}

                  {!logs.length && (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                        No webhook calls recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
                <span>
                  Page {currentPage} of {totalPages} &nbsp;·&nbsp; {total} total
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={skip === 0}
                    onClick={() => load(skip - LIMIT)}
                    className="px-3 py-1 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={skip + LIMIT >= total}
                    onClick={() => load(skip + LIMIT)}
                    className="px-3 py-1 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
