import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token && !user) {
      api
        .get("/auth/me")
        .then((r) => {
          if (r.data?.user?.role === "super_admin") {
            setUser(r.data.user);
            localStorage.setItem("admin_user", JSON.stringify(r.data.user));
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
      if (r.data?.user?.role !== "super_admin") {
        throw new Error("This panel is for super admins only.");
      }
      localStorage.setItem("admin_token", r.data.token);
      localStorage.setItem("admin_user", JSON.stringify(r.data.user));
      setUser(r.data.user);
      return r.data.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
