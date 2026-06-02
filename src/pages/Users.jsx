import { useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/super-admin/users")
      .then((r) => setUsers(r.data.data))
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => ({
    super_admin: users.filter((u) => u.role === "super_admin"),
    admin: users.filter((u) => u.role === "admin"),
    manager: users.filter((u) => u.role === "manager"),
    picker: users.filter((u) => u.role === "picker"),
  }), [users]);

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage pickers, store managers, and super admins"
      />
      <div className="p-8 space-y-4">
        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Phone</th>
                  <th className="text-left px-4 py-2">Role</th>
                  <th className="text-left px-4 py-2">Stores</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {["super_admin", "admin", "manager", "picker"].flatMap((role) => {
                  const list = grouped[role];
                  if (!list.length) return [];
                  return [
                    <tr key={`h-${role}`} className="bg-gray-50/50">
                      <td colSpan="6" className="px-4 py-2 text-xs uppercase text-gray-500 tracking-wide font-medium">
                        {role.replace("_", " ")} ({list.length})
                      </td>
                    </tr>,
                    ...list.map((u) => (
                      <tr key={u._id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-2 text-gray-700">{u.email}</td>
                        <td className="px-4 py-2 text-gray-700">{u.phone}</td>
                        <td className="px-4 py-2"><Badge value={u.role} /></td>
                        <td className="px-4 py-2 text-gray-700">
                          {(u.store_codes || []).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-2">
                          <Badge value={u.is_active ? "active" : "inactive"} />
                        </td>
                      </tr>
                    )),
                  ];
                })}
                {!users.length && (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
