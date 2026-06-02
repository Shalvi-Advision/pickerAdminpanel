import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/roles", label: "Roles" },
  { to: "/orders", label: "Orders" },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-brand-900 to-[#162a63] text-white flex flex-col z-10">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="text-base font-semibold leading-tight">Picker Admin</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-brand-100/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full bg-white/10 hover:bg-white/20 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
