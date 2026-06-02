import { useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";

const ROLE_OPTIONS = [
  { value: "picker", label: "Picker" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin (mobile)" },
  { value: "super_admin", label: "Super Admin (web panel)" },
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (storeFilter) params.store_code = storeFilter;
      if (q) params.q = q;
      const [u, s] = await Promise.all([
        api.get("/super-admin/users", { params }),
        api.get("/super-admin/stores"),
      ]);
      setUsers(u.data.data);
      setStores(s.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, storeFilter]);

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
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Store</label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500">Search</label>
            <div className="flex gap-2 mt-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="name, email or phone…"
                className="flex-1 border rounded-md px-3 py-1.5 text-sm"
              />
              <button
                onClick={load}
                className="border rounded-md px-3 py-1.5 text-sm bg-white hover:bg-gray-50"
              >
                Search
              </button>
            </div>
          </div>
        </div>

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
                      No users match the filters.
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
