import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireAuth({ children, role = "super_admin" }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (role && user.role !== role) {
    return (
      <div className="min-h-full grid place-items-center p-10 text-center">
        <div>
          <h2 className="text-xl font-semibold text-red-700">Access denied</h2>
          <p className="text-gray-600 mt-2">
            Your role ({user.role}) cannot access this panel.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
