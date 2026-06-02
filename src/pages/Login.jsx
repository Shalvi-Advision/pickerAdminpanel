import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login failed:", err.message);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-brand-900 text-white px-8 py-6">
          <h1 className="text-2xl font-semibold">Picker Admin Panel</h1>
          <p className="text-sm text-brand-100/80 mt-1">Super admin access only.</p>
        </div>
        <form onSubmit={onSubmit} className="p-8 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
