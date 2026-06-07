import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
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
            className="h-4.5 w-4.5 h-[18px] w-[18px]"
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

function QuickAction({ to, title, desc, icon, accent }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div
        className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ring-4 ${ACCENTS[accent]}`}
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
      <div className="min-w-0">
        <div className="font-semibold text-gray-900 text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 text-gray-300 ml-auto"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">👋</span>
              <h3 className="font-semibold text-gray-900">Welcome back</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Manage your team and keep an eye on fulfillment across every store
              from one place. Pick a shortcut below to jump straight in.
            </p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <QuickAction
                to="/users"
                title="Manage Users"
                desc="Add or remove team members"
                icon="users"
                accent="indigo"
              />
              <QuickAction
                to="/orders"
                title="Review Orders"
                desc="Track orders across stores"
                icon="orders"
                accent="sky"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-700 to-brand-900 rounded-2xl shadow-sm p-6 text-white flex flex-col">
            <div className="text-xs font-medium uppercase tracking-wider text-brand-100/70">
              This Month
            </div>
            <div className="mt-2 text-4xl font-bold tabular-nums">
              {loading ? "—" : kpis?.sent_this_month ?? 0}
            </div>
            <div className="text-sm text-brand-100/80 mt-1">
              orders sent to super admin
            </div>
            <div className="mt-auto pt-6">
              <Link
                to="/orders?sent=true"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white"
              >
                View sent orders
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
