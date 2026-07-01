import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

// Roles allowed into the web admin panel.
const PANEL_ROLES = ["super_admin", "project_admin"];

function readStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStored("admin_user"));
  const [uiConfig, setUiConfig] = useState(() => readStored("admin_ui_config"));
  const [loading, setLoading] = useState(false);

  function persist(u, cfg) {
    setUser(u);
    setUiConfig(cfg || null);
    localStorage.setItem("admin_user", JSON.stringify(u));
    if (cfg) localStorage.setItem("admin_ui_config", JSON.stringify(cfg));
  }

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token && !user) {
      api
        .get("/auth/me")
        .then((r) => {
          if (PANEL_ROLES.includes(r.data?.user?.role)) {
            persist(r.data.user, r.data.ui_config);
          } else {
            logout();
          }
        })
        .catch(() => logout());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login({ email, password }) {
    setLoading(true);
    try {
      const r = await api.post("/auth/login", {
        email,
        password,
        client: "admin_panel",
      });
      if (!PANEL_ROLES.includes(r.data?.user?.role)) {
        throw new Error("This panel is for admin users only.");
      }
      localStorage.setItem("admin_token", r.data.token);
      persist(r.data.user, r.data.ui_config);
      return r.data.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_ui_config");
    setUser(null);
    setUiConfig(null);
  }

  // Pages this user may access (from server ui_config.allowed_pages).
  const allowedPages = uiConfig?.allowed_pages || [];
  const allowedPageKeys = new Set(allowedPages.map((p) => p.key));

  // super_admin implicitly has every page even if ui_config is momentarily stale.
  const isSuperAdmin = user?.role === "super_admin";
  const hasPage = (pageKey) => isSuperAdmin || allowedPageKeys.has(pageKey);

  // First page the user can land on (for index redirects).
  const firstPagePath = allowedPages[0]?.path || (isSuperAdmin ? "/dashboard" : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        uiConfig,
        allowedPages,
        hasPage,
        firstPagePath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
