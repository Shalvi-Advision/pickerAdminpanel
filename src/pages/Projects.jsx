import { useEffect, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

// ── helpers ──────────────────────────────────────────────────────────────────

function Badge({ children, color = "gray" }) {
  const colors = {
    gray:   "bg-gray-100 text-gray-600",
    blue:   "bg-blue-100 text-blue-700",
    green:  "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Simple full-screen backdrop wrapper (used instead of the shared Modal which
// has its own opinionated header / open-prop pattern).
function Overlay({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">{children}</div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function StoreUsersDrawer({ projectCode, storeCode, onClose }) {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/super-admin/project-stores/${projectCode}/stores/${storeCode}/users`)
      .then((r) => setUsers(r.data.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [projectCode, storeCode]);

  return (
    <Overlay onClose={onClose}>
      <div className="p-6 min-w-[420px] max-w-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Users in {storeCode}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Project: {projectCode}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No users assigned to this store yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {users.map((u) => (
              <li key={u._id} className="py-3 flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold uppercase">
                  {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{u.name}</div>
                  <div className="text-xs text-gray-500 truncate">{u.email}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={u.role === "manager" ? "purple" : "blue"}>{u.role}</Badge>
                  <Badge color={u.is_active ? "green" : "gray"}>
                    {u.is_active ? "active" : "inactive"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Overlay>
  );
}

function AddMappingModal({ onClose, onAdded }) {
  const [projectCode, setProjectCode] = useState("");
  const [storeCode,   setStoreCode]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/super-admin/project-stores", {
        project_code: projectCode.trim().toUpperCase(),
        store_code:   storeCode.trim().toUpperCase(),
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add mapping");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 w-[360px]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Project / Store</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Project Code</label>
            <input
              required
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="e.g. RET3163"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store Code</label>
            <input
              required
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              placeholder="e.g. RCM"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
        )}

        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add Mapping"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Projects() {
  const [projects, setProjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [drawer, setDrawer]           = useState(null); // { projectCode, storeCode }
  const [deletingId, setDeletingId]   = useState(null);
  const [toast, setToast]             = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/super-admin/project-stores")
      .then((r) => {
        setProjects(r.data.data);
        // Auto-expand all projects on first load
        const exp = {};
        r.data.data.forEach((p) => { exp[p.project_code] = true; });
        setExpanded(exp);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function toggleExpand(pc) {
    setExpanded((e) => ({ ...e, [pc]: !e[pc] }));
  }

  async function handleDelete(id, storeCode) {
    if (!window.confirm(`Remove store "${storeCode}" from this project?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/super-admin/project-stores/${id}`);
      showToast(`Store ${storeCode} removed`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed", true);
    } finally {
      setDeletingId(null);
    }
  }

  function showToast(msg, isErr = false) {
    setToast({ msg, isErr });
    setTimeout(() => setToast(""), 3000);
  }

  const totalStores = projects.reduce((s, p) => s + p.stores.length, 0);

  return (
    <div className="p-8">
      <PageHeader
        title="Projects"
        subtitle="Manage project codes, store codes, and see who's assigned."
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Project / Store
          </button>
        }
      />

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 max-w-sm">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Projects</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{totalStores}</div>
          <div className="text-xs text-gray-500 mt-0.5">Store Codes</div>
        </div>
      </div>

      {/* Project list */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <Spinner />
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-sm">No project mappings yet.</div>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-brand-600 text-sm font-medium hover:underline"
            >
              Add your first project + store
            </button>
          </div>
        ) : (
          projects.map((proj) => (
            <div key={proj.project_code} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Project header */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(proj.project_code)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-brand-600">
                      <path d="M3 9h18M3 15h18M9 3v18" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-sm">{proj.project_code}</div>
                    <div className="text-xs text-gray-500">{proj.stores.length} store{proj.stores.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`h-4 w-4 text-gray-400 transition-transform ${expanded[proj.project_code] ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Store list */}
              {expanded[proj.project_code] && (
                <div className="border-t border-gray-100">
                  {proj.stores.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-gray-400">No stores in this project.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500">
                          <th className="text-left px-5 py-2 font-medium">Store Code</th>
                          <th className="text-left px-5 py-2 font-medium">Users</th>
                          <th className="px-5 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {proj.stores.map((s) => (
                          <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-mono font-medium text-gray-800">
                              {s.store_code}
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => setDrawer({ projectCode: proj.project_code, storeCode: s.store_code })}
                                className="flex items-center gap-1.5 text-brand-600 hover:text-brand-800 text-xs font-medium"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                                  <path d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-2.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                                </svg>
                                {s.user_count} user{s.user_count !== 1 ? "s" : ""}
                              </button>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => handleDelete(s._id, s.store_code)}
                                disabled={deletingId === s._id}
                                className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                                title="Remove store from project"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddMappingModal onClose={() => setShowAddModal(false)} onAdded={load} />
      )}
      {drawer && (
        <StoreUsersDrawer
          projectCode={drawer.projectCode}
          storeCode={drawer.storeCode}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-opacity ${
            toast.isErr ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
