import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth.jsx";
import { useAuth } from "./auth/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Users from "./pages/Users.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import Roles from "./pages/Roles.jsx";
import Orders from "./pages/Orders.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";
import Riders from "./pages/Riders.jsx";
import Deliveries from "./pages/Deliveries.jsx";
import Projects from "./pages/Projects.jsx";
import WebhookLogs from "./pages/WebhookLogs.jsx";
import AppRelease from "./pages/AppRelease.jsx";

// Land the user on the first page their role can access (Dashboard for most;
// a project_admin without Dashboard falls through to whatever they do have).
function IndexRedirect() {
  const { firstPagePath } = useAuth();
  return <Navigate to={firstPagePath || "/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<IndexRedirect />} />
        <Route path="dashboard" element={<RequireAuth page="dashboard"><Dashboard /></RequireAuth>} />
        <Route path="users" element={<RequireAuth page="users"><Users /></RequireAuth>} />
        <Route path="admin-users" element={<RequireAuth page="admin_users"><AdminUsers /></RequireAuth>} />
        <Route path="roles" element={<RequireAuth page="roles"><Roles /></RequireAuth>} />
        <Route path="orders" element={<RequireAuth page="orders"><Orders /></RequireAuth>} />
        <Route path="orders/:id" element={<RequireAuth page="orders"><OrderDetail /></RequireAuth>} />
        <Route path="riders" element={<RequireAuth page="riders"><Riders /></RequireAuth>} />
        <Route path="deliveries" element={<RequireAuth page="deliveries"><Deliveries /></RequireAuth>} />
        <Route path="projects" element={<RequireAuth page="projects"><Projects /></RequireAuth>} />
        <Route path="webhook-logs" element={<RequireAuth page="webhook_logs"><WebhookLogs /></RequireAuth>} />
        <Route path="app-release" element={<RequireAuth page="app_release"><AppRelease /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
