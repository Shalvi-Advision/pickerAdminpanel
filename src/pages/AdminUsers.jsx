import { useEffect, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";

// The pages a project_admin can be granted. Keys match the backend page caps.
const PAGE_TOGGLES = [
  { cap: "can_access_dashboard", label: "Dashboard" },
  { cap: "can_access_orders", label: "Orders" },
  { cap: "can_access_deliveries", label: "Deliveries" },
  { cap: "can_access_riders", label: "Riders" },
  { cap: "can_access_projects", label: "Projects" },
];

const DEFAULT_PAGE_ACCESS = PAGE_TOGGLES.reduce(
  (acc, p) => ({ ...acc, [p.cap]: true }),
  {}
);

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  project_code: "",
  is_active: true,
  page_access: { ...DEFAULT_PAGE_ACCESS },
};

export default function AdminUsers() {
  const [admins, setAdmins] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // user being edited, or null = create
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/super-admin/admin-users"),
      api.get("/super-admin/projects"),
    ])
      .then(([a, p]) => {
        setAdmins(a.data.data || []);
        setProjects(p.data.data || []);
        setErr("");
      })
      .catch((e) => setErr(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, page_access: { ...DEFAULT_PAGE_ACCESS } });
    setFormErr("");
    setModalOpen(true);
  }

  function openEdit(u) {
    setEditing(u);
    // Build page_access from the user's stored capability_overrides.
    const overrides = u.capability_overrides || {};
    const page_access = PAGE_TOGGLES.reduce(
      (acc, p) => ({ ...acc, [p.cap]: overrides[p.cap] !== false }),
      {}
    );
    setForm({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      project_code: u.project_code || "",
      is_active: u.is_active !== false,
      page_access,
    });
    setFormErr("");
    setModalOpen(true);
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function togglePage(cap) {
    setForm((f) => ({
      ...f,
      page_access: { ...f.page_access, [cap]: !f.page_access[cap] },
    }));
  }

  async function save() {
    setFormErr("");
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setFormErr("Name, email and phone are required.");
      return;
    }
    if (!form.project_code) {
      setFormErr("Please select a project.");
      return;
    }
    if (!editing && !form.password.trim()) {
      setFormErr("Password is required for a new admin.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      project_code: form.project_code,
      is_active: form.is_active,
      page_access: form.page_access,
    };
    if (form.password.trim()) payload.password = form.password.trim();

    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/super-admin/admin-users/${editing._id}`, payload);
      } else {
        await api.post("/super-admin/admin-users", {
          ...payload,
          email: form.email.trim(),
          password: form.password.trim(),
        });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormErr(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(u) {
    if (!window.confirm(`Delete admin "${u.name}" (${u.email})?`)) return;
    try {
      await api.delete(`/super-admin/admin-users/${u._id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  function pageSummary(u) {
    const overrides = u.capability_overrides || {};
    const on = PAGE_TOGGLES.filter((p) => overrides[p.cap] !== false).map((p) => p.label);
    return on.length ? on.join(", ") : "—";
  }

  return (
    <>
      <PageHeader
        title="Admin Users"
        subtitle="Project admins — scoped to a single project and all its stores."
        actions={
          <button
            onClick={openCreate}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            + Add Project Admin
          </button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-6xl">
        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="text-gray-400 text-sm">No project admins yet.</div>
            <button
              onClick={openCreate}
              className="mt-3 text-brand-600 text-sm font-medium hover:underline"
            >
              Create your first project admin
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Email</th>
                  <th className="text-left px-4 py-2.5">Project</th>
                  <th className="text-left px-4 py-2.5">Pages</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {admins.map((u) => (
                  <tr key={u._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                        {u.project_code || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[220px]">
                      {pageSummary(u)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={u.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-brand-600 hover:underline text-sm mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(u)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Project Admin" : "Add Project Admin"}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Create admin"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              disabled={!!editing}
              onChange={(e) => setField("email", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </Field>

          <Field label={editing ? "New password (leave blank to keep)" : "Password"}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>

          <Field label="Project (single) — grants access to all its stores">
            <select
              value={form.project_code}
              onChange={(e) => setField("project_code", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">Page access</div>
            <div className="grid grid-cols-2 gap-2">
              {PAGE_TOGGLES.map((p) => (
                <label
                  key={p.cap}
                  className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={!!form.page_access[p.cap]}
                    onChange={() => togglePage(p.cap)}
                  />
                  <span className="text-sm">{p.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Roles, Users, Admin Users, App Release and Webhook Logs are super-admin
              only and never available to a project admin.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField("is_active", e.target.checked)}
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>

          {formErr && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {formErr}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
