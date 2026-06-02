import { useEffect, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

const ICONS = {
  users: (
    <path d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-2.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm6 0a4 4 0 1 0-3-1.35" />
  ),
  orders: (
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
  ),
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />,
  store: (
    <path d="M3 9 4 4h16l1 5M3 9h18M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M9 21v-6h6v6" />
  ),
};

const ACCENTS = {
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
};

function Kpi({ label, value, hint, icon, accent = "indigo", loading }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase text-gray-400 tracking-wider">
          {label}
        </div>
        <div
          className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ring-4 ${ACCENTS[accent]}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
          >
            {ICONS[icon]}
          </svg>
        </div>
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-16 rounded-md bg-gray-100 animate-pulse" />
      ) : (
        <div className="text-3xl font-bold text-gray-900 mt-2 tabular-nums">
          {value}
        </div>
      )}
      {hint && <div className="text-xs text-gray-400 mt-1.5">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [counts, setCounts] = useState({ users: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/super-admin/dashboard"),
      api.get("/super-admin/users"),
      api.get("/super-admin/all-orders"),
    ])
      .then(([k, u, o]) => {
        setKpis(k.data.data);
        setCounts({ users: u.data.data.length, orders: o.data.data.length });
      })
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Operational overview across all stores"
      />
      <div className="p-8 space-y-6 max-w-7xl">
        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {err}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            label="Total Users"
            value={counts.users}
            hint="pickers, managers, admins"
            icon="users"
            accent="indigo"
            loading={loading}
          />
          <Kpi
            label="Total Orders"
            value={counts.orders}
            hint="recent 500"
            icon="orders"
            accent="sky"
            loading={loading}
          />
          <Kpi
            label="Sent to Super Admin"
            value={kpis?.total_sent ?? "—"}
            hint={`${kpis?.sent_this_month ?? 0} this month`}
            icon="send"
            accent="emerald"
            loading={loading}
          />
          <Kpi
            label="Stores Covered"
            value={kpis?.stores_covered ?? "—"}
            hint="distinct store codes"
            icon="store"
            accent="amber"
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}
