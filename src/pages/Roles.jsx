import { useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

const EDITABLE_ROLES = [
  { value: "picker", label: "Picker" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin (mobile)" },
];

export default function Roles() {
  const [catalog, setCatalog] = useState([]);
  const [roleCaps, setRoleCaps] = useState({}); // { role: { capKey: bool } }
  const [active, setActive] = useState("manager");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await api.get("/super-admin/capabilities");
      setCatalog(r.data.data.catalog);
      setRoleCaps(r.data.data.roles);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Capabilities that apply to the active role, grouped by `group`.
  const groups = useMemo(() => {
    const applicable = catalog.filter((c) => c.applies_to?.includes(active));
    const byGroup = {};
    for (const c of applicable) {
      (byGroup[c.group] ||= []).push(c);
    }
    return byGroup;
  }, [catalog, active]);

  function toggle(capKey, value) {
    setRoleCaps((prev) => ({
      ...prev,
      [active]: { ...prev[active], [capKey]: value },
    }));
  }

  async function save() {
    setSaving(true);
    setErr("");
    setToast("");
    try {
      const r = await api.patch(`/super-admin/roles/${active}/capabilities`, {
        capabilities: roleCaps[active] || {},
      });
      // Re-sync from the authoritative merged map the backend returns.
      setRoleCaps((prev) => ({ ...prev, [active]: r.data.data.capabilities }));
      setToast(`Saved ${active} permissions`);
      setTimeout(() => setToast(""), 2500);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Control what each persona can do in the mobile app"
        actions={
          <button
            onClick={save}
            disabled={saving || loading}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />
      <div className="p-8 space-y-5 max-w-4xl">
        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}
        {toast && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            {toast}
          </div>
        )}

        {/* Role tabs */}
        <div className="flex flex-wrap gap-2">
          {EDITABLE_ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setActive(r.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                active === r.value
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
          <div className="px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-400 bg-gray-50/50">
            Super Admin · all access (not editable)
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groups).map(([group, caps]) => (
              <div
                key={group}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3 border-b bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {group}
                </div>
                <div className="divide-y">
                  {caps.map((cap) => {
                    const on = roleCaps[active]?.[cap.key] === true;
                    return (
                      <label
                        key={cap.key}
                        className="flex items-center justify-between gap-4 px-5 py-3 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {cap.label}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <code>{cap.key}</code>
                            {cap.kind === "ui" && (
                              <span className="text-gray-400">· app UI only</span>
                            )}
                            {cap.kind === "read" && (
                              <span className="text-gray-400">· hides list + blocks read</span>
                            )}
                          </div>
                        </div>
                        <Toggle checked={on} onChange={(v) => toggle(cap.key, v)} />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
