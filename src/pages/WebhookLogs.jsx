import { Fragment, useEffect, useState, useCallback } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

const STATUSES = ["success", "skipped", "auth_failed", "validation_failed", "error"];

const EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "order_receive", label: "New order" },
  { value: "order_cancel", label: "Cancel order" },
  { value: "order_assign_rider", label: "Assign rider" },
  { value: "rider_delivered", label: "Delivered sync" },
];

const EVENT_LABELS = {
  order_receive: "New order",
  order_cancel: "Cancel",
  order_assign_rider: "Assign rider",
  rider_delivered: "Delivered sync",
};

const EVENT_STYLE = {
  order_receive: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  order_cancel: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  order_assign_rider: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  rider_delivered: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

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

function EventPill({ value }) {
  const key = value || "order_receive";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${EVENT_STYLE[key] || "bg-gray-100 text-gray-600"}`}>
      {EVENT_LABELS[key] || key?.replace(/_/g, " ") || "New order"}
    </span>
  );
}

function MetadataDetail({ log }) {
  const m = log.metadata;
  if (!m || typeof m !== "object") return null;

  if (log.event_type === "order_cancel") {
    return (
      <div className="space-y-1 text-xs text-gray-700">
        {m.reason && (
          <div><span className="font-medium text-gray-500">Reason:</span> {m.reason}</div>
        )}
        {m.already_cancelled && (
          <div className="text-amber-700">Already cancelled (idempotent)</div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Picker assignments cancelled: <strong>{m.picker_assignments_cancelled ?? 0}</strong></span>
          <span>Rider assignments cancelled: <strong>{m.delivery_assignments_cancelled ?? 0}</strong></span>
          <span>Routes updated: <strong>{m.routes_updated ?? 0}</strong></span>
        </div>
      </div>
    );
  }

  if (log.event_type === "rider_delivered") {
    return (
      <div className="space-y-1 text-xs text-gray-700">
        <div>
          <span className="font-medium text-gray-500">Outgoing sync attempt:</span>{" "}
          {m.attempt ?? "?"} of {m.max_attempts ?? "?"}
        </div>
        {m.api_url && (
          <div className="font-mono text-gray-500">{m.api_url}</div>
        )}
      </div>
    );
  }

  if (log.event_type === "order_assign_rider") {
    return (
      <div className="space-y-1 text-xs text-gray-700">
        {m.rider_name && (
          <div><span className="font-medium text-gray-500">Rider:</span> {m.rider_name}{m.rider_email ? ` (${m.rider_email})` : ""}</div>
        )}
        {m.use_round_robin && m.round_robin && (
          <div>
            Round-robin pool {m.round_robin.riders_in_pool} · index {m.round_robin.rider_index}
            {" · "}{m.round_robin.store_code}/{m.round_robin.project_code}
          </div>
        )}
        {!m.use_round_robin && (
          <div className="text-gray-500">Manual rider override (not round-robin)</div>
        )}
      </div>
    );
  }

  return (
    <pre className="text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(m, null, 2)}</pre>
  );
}

function PayloadDetail({ payload }) {
  if (!payload || typeof payload !== "object") return null;
  const { items, items_total, items_truncated } = payload;
  const shownItems = Array.isArray(items) ? items.length : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-500">Request payload</span>
        {items_total != null && (
          <span className="text-gray-500">
            · {items_total} item{items_total === 1 ? "" : "s"} received
            {items_truncated ? ` (showing first ${shownItems})` : ""}
          </span>
        )}
      </div>
      <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white border rounded-md p-2 max-h-96 overflow-auto">
{JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

export default function WebhookLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async (s = 0) => {
    setLoading(true);
    setErr("");
    try {
      const params = { limit: LIMIT, skip: s };
      if (statusFilter) params.status = statusFilter;
      if (eventFilter) params.event_type = eventFilter;
      if (projectFilter) params.project_code = projectFilter;
      if (search.trim()) params.order_id = search.trim();
      const r = await api.get("/super-admin/webhook-logs", { params });
      setLogs(r.data.data.logs);
      setTotal(r.data.data.total);
      setSkip(s);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, eventFilter, projectFilter, search]);

  useEffect(() => { load(0); }, [load]);

  useEffect(() => {
    api.get("/super-admin/project-stores")
      .then((r) => {
        const codes = (r.data.data || [])
          .map((p) => p.project_code)
          .filter(Boolean)
          .sort();
        setProjects([...new Set(codes)]);
      })
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(skip / LIMIT) + 1;

  const eventCounts = EVENT_TYPES.filter((e) => e.value).map((e) => ({
    ...e,
    count: logs.filter((l) => (l.event_type || "order_receive") === e.value).length,
  }));

  return (
    <>
      <PageHeader
        title="Webhook Logs"
        subtitle="Inbound webhooks (new order, cancel, assign rider) and outgoing delivered-status syncs"
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
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500">Event</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white min-w-[140px]"
            >
              {EVENT_TYPES.map((e) => (
                <option key={e.value || "all"} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All</option>
              {projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
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
          <div className="ml-auto text-sm text-gray-500">
            {total} total calls
          </div>
        </div>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {eventCounts.map((e) => (
              <div key={e.value} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="text-2xl font-bold text-gray-900">{e.count}</div>
                <div className="text-xs text-gray-500 mt-0.5">{e.label} (page)</div>
              </div>
            ))}
            {STATUSES.filter((s) => ["error", "auth_failed", "validation_failed"].includes(s)).map((s) => {
              const count = logs.filter((l) => l.status === s).length;
              return (
                <div key={s} className={`bg-white rounded-xl border shadow-sm px-4 py-3 ${count > 0 ? "border-red-200" : "border-gray-100"}`}>
                  <div className={`text-2xl font-bold ${count > 0 ? "text-red-600" : "text-gray-900"}`}>{count}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.replace(/_/g, " ")} (page)</div>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2.5">Received At</th>
                    <th className="text-left px-4 py-2.5">Event</th>
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
                    <Fragment key={log._id}>
                      <tr
                        className="border-t hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                      >
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {fmtTs(log.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <EventPill value={log.event_type} />
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
                          {log.event_type === "order_receive" ? (log.items_count ?? "—") : "—"}
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

                      {expanded === log._id && (
                        <tr className="bg-gray-50/80">
                          <td colSpan="10" className="px-4 py-3">
                            <div className="space-y-2 text-xs text-gray-700">
                              {log.metadata && (
                                <MetadataDetail log={log} />
                              )}
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
                              {log.payload && <PayloadDetail payload={log.payload} />}
                              {!log.error_message && !log.assign_error && !log.metadata && !log.payload && (
                                <span className="text-gray-400">No extra details.</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}

                  {!logs.length && (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                        No webhook calls recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
                <span>
                  Page {currentPage} of {totalPages} · {total} total
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
