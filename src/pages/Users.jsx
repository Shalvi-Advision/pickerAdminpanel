import { useEffect, useMemo, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";
import Pagination from "../components/Pagination.jsx";

const PER_PAGE = 20;
const MOBILE_ROLES = ["picker", "manager", "admin"];

const ROLE_OPTIONS = [
  { value: "picker", label: "Picker" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin (mobile)" },
  { value: "super_admin", label: "Super Admin (web panel)" },
];

const UNSCOPED_ROLES = ["admin", "super_admin"];

const empty = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "picker",
  store_codes: "",
  project_code: "",
  is_active: true,
  capability_overrides: {}, // capKey -> true (allow) / false (deny); absent = inherit
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [catalog, setCatalog] = useState([]); // [{ key, label, group, applies_to }]
  const [roleDefaults, setRoleDefaults] = useState({}); // { role: { capKey: bool } }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({ open: false, mode: "create", form: empty });
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [testPushState, setTestPushState] = useState({}); // { [userId]: "sending"|"ok"|"err" }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (storeFilter) params.store_code = storeFilter;
      if (q) params.q = q;
      const [u, s, c] = await Promise.all([
        api.get("/super-admin/users", { params }),
        api.get("/super-admin/stores"),
        api.get("/super-admin/capabilities"),
      ]);
      setUsers(u.data.data);
      setStores(s.data.data);
      setCatalog(c.data.data.catalog);
      setRoleDefaults(c.data.data.roles);
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

  // Unique project codes derived from loaded users (excludes unscoped roles with empty codes).
  const projectCodes = useMemo(
    () => [...new Set(users.map((u) => u.project_code).filter(Boolean))].sort(),
    [users]
  );

  const filtered = useMemo(() => {
    if (!projectFilter) return users;
    return users.filter((u) => u.project_code === projectFilter);
  }, [users, projectFilter]);

  const grouped = useMemo(() => {
    return {
      super_admin: filtered.filter((u) => u.role === "super_admin"),
      admin: filtered.filter((u) => u.role === "admin"),
      manager: filtered.filter((u) => u.role === "manager"),
      picker: filtered.filter((u) => u.role === "picker"),
    };
  }, [filtered]);

  // FCM token stats across ALL loaded users (not just current page/filter)
  const tokenStats = useMemo(() => {
    const mobile = users.filter((u) => MOBILE_ROLES.includes(u.role));
    const withToken = mobile.filter((u) => u.fcm_token);
    return {
      total: mobile.length,
      withToken: withToken.length,
      noToken: mobile.length - withToken.length,
    };
  }, [users]);

  async function sendTestPush(userId) {
    setTestPushState((s) => ({ ...s, [userId]: "sending" }));
    try {
      await api.post(`/test/push-user/${userId}`);
      setTestPushState((s) => ({ ...s, [userId]: "ok" }));
      setTimeout(() => setTestPushState((s) => { const n = { ...s }; delete n[userId]; return n; }), 3000);
    } catch (e) {
      setTestPushState((s) => ({ ...s, [userId]: "err" }));
      setTimeout(() => setTestPushState((s) => { const n = { ...s }; delete n[userId]; return n; }), 4000);
      alert(e.response?.data?.error_message || e.response?.data?.message || e.message);
    }
  }

  // Reset page when any filter changes
  useEffect(() => { setPage(1); }, [roleFilter, storeFilter, projectFilter, q]);

  // Current page slice + per-page grouping for table rows
  const pagedUsers = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page]
  );
  const pagedGrouped = useMemo(() => ({
    super_admin: pagedUsers.filter((u) => u.role === "super_admin"),
    admin: pagedUsers.filter((u) => u.role === "admin"),
    manager: pagedUsers.filter((u) => u.role === "manager"),
    picker: pagedUsers.filter((u) => u.role === "picker"),
  }), [pagedUsers]);

  function openCreate() {
    setSubmitErr("");
    setModal({ open: true, mode: "create", form: { ...empty } });
  }
  function openEdit(u) {
    setSubmitErr("");
    setModal({
      open: true,
      mode: "edit",
      form: {
        _id: u._id,
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        password: "",
        role: u.role,
        store_codes: (u.store_codes || []).join(", "),
        project_code: u.project_code || "",
        is_active: !!u.is_active,
        capability_overrides: { ...(u.capability_overrides || {}) },
      },
    });
  }

  // next: "inherit" | "allow" | "deny". Inherit removes the key entirely so the
  // payload only carries explicit allow/deny decisions.
  function setOverride(capKey, next) {
    setModal((m) => {
      const ov = { ...(m.form.capability_overrides || {}) };
      if (next === "inherit") delete ov[capKey];
      else ov[capKey] = next === "allow";
      return { ...m, form: { ...m.form, capability_overrides: ov } };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitErr("");
    try {
      const { form, mode } = modal;
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        project_code: form.project_code.trim(),
        is_active: form.is_active,
        store_codes: UNSCOPED_ROLES.includes(form.role)
          ? []
          : form.store_codes
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean),
        // super_admin is always-all; never send overrides for it.
        capability_overrides:
          form.role === "super_admin" ? {} : form.capability_overrides || {},
      };
      if (mode === "create") {
        payload.email = form.email.trim().toLowerCase();
        payload.password = form.password;
        await api.post("/super-admin/users", payload);
      } else {
        if (form.password) payload.password = form.password;
        await api.patch(`/super-admin/users/${form._id}`, payload);
      }
      setModal({ open: false, mode: "create", form: empty });
      load();
    } catch (e2) {
      setSubmitErr(e2.response?.data?.message || e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(u) {
    if (!confirm(`Delete user "${u.name}" (${u.email})? This cannot be undone.`)) return;
    try {
      await api.delete(`/super-admin/users/${u._id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage pickers, store managers, and super admins"
        actions={
          <button
            onClick={openCreate}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + Add user
          </button>
        }
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All projects</option>
              {projectCodes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block mt-1 border rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
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
                <option key={s} value={s}>
                  {s}
                </option>
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

        {/* FCM Token summary bar */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-4 bg-white border rounded-xl px-4 py-3 text-sm shadow-sm">
            <span className="text-gray-500 font-medium">Device Tokens</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="font-semibold text-gray-800">{tokenStats.withToken}</span>
              <span className="text-gray-500">registered</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              <span className="font-semibold text-gray-800">{tokenStats.noToken}</span>
              <span className="text-gray-500">no token</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-gray-400">of</span>
              <span className="font-semibold text-gray-800">{tokenStats.total}</span>
              <span className="text-gray-500">mobile users</span>
            </span>
            {tokenStats.total > 0 && (
              <span className="ml-auto text-xs text-gray-400">
                {Math.round((tokenStats.withToken / tokenStats.total) * 100)}% coverage
              </span>
            )}
          </div>
        )}

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Phone</th>
                    <th className="text-left px-4 py-2">Role</th>
                    <th className="text-left px-4 py-2">Project</th>
                    <th className="text-left px-4 py-2">Stores</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Push</th>
                    <th className="text-right px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {["super_admin", "admin", "manager", "picker"].flatMap((role) => {
                    const list = pagedGrouped[role];
                    if (!list.length) return [];
                    return [
                      <tr key={`h-${role}`} className="bg-gray-50/50">
                        <td colSpan="9" className="px-4 py-2 text-xs uppercase text-gray-500 tracking-wide font-medium">
                          {role.replace("_", " ")} ({grouped[role].length})
                        </td>
                      </tr>,
                      ...list.map((u) => {
                        const isMobile = MOBILE_ROLES.includes(u.role);
                        const pushStatus = testPushState[u._id];
                        return (
                          <tr key={u._id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-900">{u.name}</td>
                            <td className="px-4 py-2 text-gray-700">{u.email}</td>
                            <td className="px-4 py-2 text-gray-700">{u.phone}</td>
                            <td className="px-4 py-2"><Badge value={u.role} /></td>
                            <td className="px-4 py-2 text-gray-700 font-mono text-xs">
                              {u.project_code || "—"}
                            </td>
                            <td className="px-4 py-2 text-gray-700">
                              {(u.store_codes || []).join(", ") || "—"}
                            </td>
                            <td className="px-4 py-2">
                              <Badge value={u.is_active ? "active" : "inactive"} />
                            </td>
                            <td className="px-4 py-2">
                              {isMobile ? (
                                u.fcm_token ? (
                                  <span title={u.fcm_token} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Token
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                                    No token
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              {isMobile && u.fcm_token && (
                                <button
                                  onClick={() => sendTestPush(u._id)}
                                  disabled={pushStatus === "sending"}
                                  className={`text-xs mr-3 px-2 py-0.5 rounded border transition-colors ${
                                    pushStatus === "ok"
                                      ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                      : pushStatus === "err"
                                      ? "border-red-300 text-red-600 bg-red-50"
                                      : "border-gray-200 text-gray-500 hover:bg-gray-100"
                                  }`}
                                >
                                  {pushStatus === "sending" ? "Sending…" : pushStatus === "ok" ? "Sent!" : pushStatus === "err" ? "Failed" : "Test Push"}
                                </button>
                              )}
                              <button
                                onClick={() => openEdit(u)}
                                className="text-brand-600 hover:underline text-sm mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDelete(u)}
                                className="text-red-600 hover:underline text-sm"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      }),
                    ];
                  })}
                  {!users.length && (
                    <tr>
                      <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                        No users match the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-3">
              <Pagination
                page={page}
                total={filtered.length}
                perPage={PER_PAGE}
                onChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.mode === "create" ? "Add user" : "Edit user"}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setModal({ ...modal, open: false })}
              className="px-3 py-1.5 rounded-md border bg-white text-sm"
            >
              Cancel
            </button>
            <button
              form="user-form"
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">
            <input
              required
              value={modal.form.name}
              onChange={(e) =>
                setModal({ ...modal, form: { ...modal.form, name: e.target.value } })
              }
              className="input"
            />
          </Field>
          <Field label="Phone">
            <input
              required
              value={modal.form.phone}
              onChange={(e) =>
                setModal({ ...modal, form: { ...modal.form, phone: e.target.value } })
              }
              className="input"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              disabled={modal.mode === "edit"}
              value={modal.form.email}
              onChange={(e) =>
                setModal({ ...modal, form: { ...modal.form, email: e.target.value } })
              }
              className="input disabled:bg-gray-100"
            />
          </Field>
          <Field label={modal.mode === "create" ? "Password" : "Password (leave blank to keep)"}>
            <input
              type="password"
              required={modal.mode === "create"}
              value={modal.form.password}
              onChange={(e) =>
                setModal({ ...modal, form: { ...modal.form, password: e.target.value } })
              }
              className="input"
            />
          </Field>
          <Field label="Role">
            <select
              value={modal.form.role}
              onChange={(e) =>
                setModal({ ...modal, form: { ...modal.form, role: e.target.value } })
              }
              className="input"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project code">
            <input
              value={modal.form.project_code}
              onChange={(e) =>
                setModal({ ...modal, form: { ...modal.form, project_code: e.target.value } })
              }
              className="input"
            />
          </Field>
          <Field
            label={
              UNSCOPED_ROLES.includes(modal.form.role)
                ? `Store codes (${modal.form.role.replace("_", " ")} sees all stores, ignored)`
                : "Store codes (comma-separated, e.g. STR001, STR002)"
            }
            span={2}
          >
            <input
              disabled={UNSCOPED_ROLES.includes(modal.form.role)}
              value={modal.form.store_codes}
              onChange={(e) =>
                setModal({ ...modal, form: { ...modal.form, store_codes: e.target.value } })
              }
              className="input disabled:bg-gray-100"
              placeholder="STR001, STR002"
            />
          </Field>
          <Field label="Active" span={2}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={modal.form.is_active}
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: { ...modal.form, is_active: e.target.checked },
                  })
                }
              />
              User is active
            </label>
          </Field>
          {modal.form.role !== "super_admin" ? (
            <div className="col-span-2">
              <details className="border rounded-md bg-gray-50/50">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-700">
                  ⚙ Capability overrides (advanced)
                </summary>
                <div className="px-3 pb-3 pt-1 space-y-1">
                  <p className="text-xs text-gray-500 mb-2">
                    Per-user overrides win over the role default. Leave on{" "}
                    <em>Inherit</em> to follow the role.
                  </p>
                  {catalog
                    .filter((c) => c.applies_to?.includes(modal.form.role))
                    .map((cap) => {
                      const ov = modal.form.capability_overrides || {};
                      const state = cap.key in ov ? (ov[cap.key] ? "allow" : "deny") : "inherit";
                      const roleDefault =
                        roleDefaults[modal.form.role]?.[cap.key] === true;
                      const effective = state === "inherit" ? roleDefault : state === "allow";
                      return (
                        <div
                          key={cap.key}
                          className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-gray-800">{cap.label}</div>
                            <div className="text-[11px] text-gray-400">
                              role default:{" "}
                              <span className={roleDefault ? "text-emerald-600" : "text-gray-400"}>
                                {roleDefault ? "allowed" : "denied"}
                              </span>
                              {" · "}effective:{" "}
                              <span className={effective ? "text-emerald-600" : "text-red-500"}>
                                {effective ? "allowed" : "denied"}
                              </span>
                            </div>
                          </div>
                          <TriState
                            value={state}
                            onChange={(next) => setOverride(cap.key, next)}
                          />
                        </div>
                      );
                    })}
                </div>
              </details>
            </div>
          ) : (
            <div className="col-span-2 text-xs text-gray-500 bg-gray-50 border rounded-md px-3 py-2">
              Super Admin has full access — capabilities are not configurable.
            </div>
          )}
          {submitErr && (
            <div className="col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {submitErr}
            </div>
          )}
        </form>
        <style>{`
          .input {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 14px;
            background: white;
            outline: none;
          }
          .input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgb(37 99 235 / 0.2); }
        `}</style>
      </Modal>
    </>
  );
}

function Field({ label, children, span }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="text-xs text-gray-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const TRI_OPTS = [
  { value: "inherit", label: "Inherit" },
  { value: "allow", label: "Allow" },
  { value: "deny", label: "Deny" },
];
const TRI_ACTIVE = {
  inherit: "bg-gray-200 text-gray-700",
  allow: "bg-emerald-600 text-white",
  deny: "bg-red-600 text-white",
};

function TriState({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 overflow-hidden shrink-0">
      {TRI_OPTS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.value ? TRI_ACTIVE[o.value] : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
