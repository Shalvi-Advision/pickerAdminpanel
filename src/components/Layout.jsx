import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const Icon = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px] shrink-0"
  >
    {children}
  </svg>
);

const NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <Icon>
        <path d="M3 13h8V3H3v10ZM13 21h8V11h-8v10ZM13 3v6h8V3h-8ZM3 21h8v-6H3v6Z" />
      </Icon>
    ),
  },
  {
    to: "/users",
    label: "Users",
    icon: (
      <Icon>
        <path d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-2.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm6 0a4 4 0 1 0-3-1.35" />
      </Icon>
    ),
  },
  {
    to: "/roles",
    label: "Roles",
    icon: (
      <Icon>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </Icon>
    ),
  },
  {
    to: "/orders",
    label: "Orders",
    icon: (
      <Icon>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
      </Icon>
    ),
  },
  {
    to: "/projects",
    label: "Projects",
    icon: (
      <Icon>
        <path d="M3 9h18M3 15h18M9 3v18" />
      </Icon>
    ),
  },
  {
    to: "/webhook-logs",
    label: "Webhook Logs",
    icon: (
      <Icon>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </Icon>
    ),
  },
];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SidebarContent({ user, onLogout, onNavClick }) {
  return (
    <>
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-lg">
            🛒
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-brand-100/60 leading-none">
              Retail Magic
            </div>
            <div className="text-base font-semibold leading-tight mt-0.5">
              Picker Admin
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-brand-100/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white" />
                )}
                {n.icon}
                <span>{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-xs font-semibold">
            {initials(user?.name)}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{user?.name}</div>
            <div className="text-brand-100/60 text-xs truncate">
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg py-2 text-xs font-medium transition-colors"
        >
          <Icon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </Icon>
          Log out
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-brand-900 to-[#162a63] text-white flex-col z-20">
        <SidebarContent user={user} onLogout={onLogout} onNavClick={() => {}} />
      </aside>

      {/* Mobile / tablet drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Drawer panel */}
          <aside
            className="relative w-64 h-full bg-gradient-to-b from-brand-900 to-[#162a63] text-white flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              user={user}
              onLogout={onLogout}
              onNavClick={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        {/* Mobile / tablet top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-gray-700"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-900 flex items-center justify-center text-sm">
              🛒
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              Picker Admin
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
