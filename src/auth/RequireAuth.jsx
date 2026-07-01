import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

/**
 * Gate a route. Always requires a logged-in panel user. If `page` is given,
 * also requires that page to be in the user's allowed_pages (RBAC).
 */
export default function RequireAuth({ children, page }) {
  const { user, hasPage, firstPagePath } = useAuth();
  const loc = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;

  if (page && !hasPage(page)) {
    // Bounce to a page they can actually see, rather than a dead-end.
    if (firstPagePath && firstPagePath !== loc.pathname) {
      return <Navigate to={firstPagePath} replace />;
    }
    return (
      <div className="min-h-full grid place-items-center p-10 text-center">
        <div>
          <h2 className="text-xl font-semibold text-red-700">Access denied</h2>
          <p className="text-gray-600 mt-2">
            Your account doesn’t have access to this page.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
