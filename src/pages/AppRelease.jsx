import { useEffect, useRef, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

const Svg = ({ children, className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);

export default function AppRelease() {
  const [current, setCurrent] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [apkFile, setApkFile] = useState(null);
  const [form, setForm] = useState({
    version_code: "",
    version_name: "",
    release_notes: "",
    force_update: false,
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();

  const [storeForm, setStoreForm] = useState({
    android_latest_version: "",
    android_review_version: "",
    ios_latest_version: "",
    ios_review_version: "",
    play_store_url: "",
    app_store_url: "",
  });
  const [storeErr, setStoreErr] = useState("");
  const [storeSuccess, setStoreSuccess] = useState("");
  const [storeSaving, setStoreSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [rel, fl] = await Promise.all([
        api.get("/super-admin/app-release"),
        api.get("/super-admin/app-release/files"),
      ]);
      const d = rel.data.data;
      setCurrent(d);
      setFiles(fl.data.data);
      if (d) {
        setStoreForm({
          android_latest_version: d.android_latest_version || "",
          android_review_version: d.android_review_version || "",
          ios_latest_version: d.ios_latest_version || "",
          ios_review_version: d.ios_review_version || "",
          play_store_url: d.play_store_url || "",
          app_store_url: d.app_store_url || "",
        });
      }
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveStoreConfig(e) {
    e.preventDefault();
    setStoreSaving(true);
    setStoreErr("");
    setStoreSuccess("");
    try {
      const res = await api.put("/super-admin/app-release/store-config", storeForm);
      setCurrent(res.data.data);
      setStoreSuccess("Store config saved successfully!");
    } catch (e2) {
      setStoreErr(e2.response?.data?.message || e2.message);
    } finally {
      setStoreSaving(false);
    }
  }

  function pickFile(f) {
    if (!f) return;
    setApkFile(f);
    setErr("");
    setSuccess("");
    // Auto-fill version_code from filename if it matches picker_vXX.apk
    const match = f.name.match(/v(\d+)\.apk$/i);
    if (match) setForm((prev) => ({ ...prev, version_code: match[1] }));
  }

  function onFileInput(e) { pickFile(e.target.files[0]); }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".apk")) pickFile(f);
    else setErr("Only .apk files allowed");
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!apkFile) return setErr("Select an APK file first");
    if (!form.version_code || !form.version_name) return setErr("Version code and name are required");

    setUploading(true);
    setErr("");
    setSuccess("");
    setProgress(0);

    const fd = new FormData();
    fd.append("apk", apkFile);
    fd.append("version_code", form.version_code);
    fd.append("version_name", form.version_name);
    fd.append("release_notes", form.release_notes);
    fd.append("force_update", String(form.force_update));

    try {
      const res = await api.post("/super-admin/app-release", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      setSuccess(`Version ${res.data.data.version_name} published successfully!`);
      setCurrent(res.data.data);
      setApkFile(null);
      setForm({ version_code: "", version_name: "", release_notes: "", force_update: false });
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function deleteFile(name) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await api.delete(`/super-admin/app-release/${name}`);
      load();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  return (
    <>
      <PageHeader
        title="App Release"
        subtitle="Upload and publish the Android picker app APK"
      />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">

        {/* ── Current live version ── */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Svg className="w-4 h-4 text-brand-600">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </Svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-700">Live Version</h2>
          </div>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : current ? (
            <div className="flex flex-wrap gap-6 items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Svg className="w-5 h-5 text-green-600">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
                  </Svg>
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-900">{current.version_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Build {current.version_code}</div>
                </div>
              </div>
              <div className="flex-1 space-y-2 min-w-[200px]">
                {current.release_notes && (
                  <p className="text-sm text-gray-600">{current.release_notes}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${current.force_update ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {current.force_update ? "Force Update ON" : "Force Update OFF"}
                  </span>
                  {current.file_size_mb && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{current.file_size_mb} MB</span>
                  )}
                  {current.published_at && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {new Date(current.published_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {current.apk_url && (
                  <a href={current.apk_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline break-all">
                    <Svg className="w-3.5 h-3.5 shrink-0">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </Svg>
                    {current.apk_url}
                  </a>
                )}
                <div className="flex flex-wrap gap-2 text-xs mt-1">
                  {current.android_latest_version && (
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                      Android {current.android_latest_version}
                      {current.android_review_version ? ` · review ${current.android_review_version}` : ""}
                    </span>
                  )}
                  {current.ios_latest_version && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      iOS {current.ios_latest_version}
                      {current.ios_review_version ? ` · review ${current.ios_review_version}` : ""}
                    </span>
                  )}
                  {current.play_store_url && (
                    <a href={current.play_store_url} target="_blank" rel="noreferrer"
                      className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 hover:underline">
                      Play Store ↗
                    </a>
                  )}
                  {current.app_store_url && (
                    <a href={current.app_store_url} target="_blank" rel="noreferrer"
                      className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 hover:underline">
                      App Store ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No release published yet.</div>
          )}
        </div>

        {/* ── Store Distribution Config ── */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Svg className="w-4 h-4 text-indigo-600">
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
                <path d="M12 12v5" />
                <path d="M9.5 14.5 12 12l2.5 2.5" />
              </Svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-700">Store Distribution</h2>
            <span className="ml-2 text-xs text-gray-400">Play Store / App Store forced updates</span>
          </div>

          {storeErr && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{storeErr}</div>
          )}
          {storeSuccess && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{storeSuccess}</div>
          )}

          <form onSubmit={saveStoreConfig} className="space-y-4">
            {/* Android + iOS version rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Android */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center">
                    <Svg className="w-3.5 h-3.5 text-green-700">
                      <path d="M5 16L3 5l5.5 5 3.5-7 3.5 7L21 5l-2 11H5Z" />
                    </Svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Android</span>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Latest Version</label>
                  <input
                    value={storeForm.android_latest_version}
                    onChange={(e) => setStoreForm({ ...storeForm, android_latest_version: e.target.value })}
                    placeholder="e.g. 1.3.0"
                    className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Review Version
                    <span className="ml-1 text-gray-400">(skip update prompt for reviewers)</span>
                  </label>
                  <input
                    value={storeForm.android_review_version}
                    onChange={(e) => setStoreForm({ ...storeForm, android_review_version: e.target.value })}
                    placeholder="e.g. 1.3.0"
                    className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white"
                  />
                </div>
              </div>

              {/* iOS */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gray-200 flex items-center justify-center">
                    <Svg className="w-3.5 h-3.5 text-gray-700">
                      <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4Z" />
                      <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                    </Svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">iOS</span>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Latest Version</label>
                  <input
                    value={storeForm.ios_latest_version}
                    onChange={(e) => setStoreForm({ ...storeForm, ios_latest_version: e.target.value })}
                    placeholder="e.g. 1.3.0"
                    className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Review Version
                    <span className="ml-1 text-gray-400">(skip update prompt for reviewers)</span>
                  </label>
                  <input
                    value={storeForm.ios_review_version}
                    onChange={(e) => setStoreForm({ ...storeForm, ios_review_version: e.target.value })}
                    placeholder="e.g. 1.3.0"
                    className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Store URLs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1.5">
                  <Svg className="w-3.5 h-3.5 text-green-600">
                    <path d="M5 16L3 5l5.5 5 3.5-7 3.5 7L21 5l-2 11H5Z" />
                  </Svg>
                  Google Play URL
                </label>
                <input
                  value={storeForm.play_store_url}
                  onChange={(e) => setStoreForm({ ...storeForm, play_store_url: e.target.value })}
                  placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                  className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1.5">
                  <Svg className="w-3.5 h-3.5 text-gray-600">
                    <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4Z" />
                    <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                  </Svg>
                  App Store URL
                </label>
                <input
                  value={storeForm.app_store_url}
                  onChange={(e) => setStoreForm({ ...storeForm, app_store_url: e.target.value })}
                  placeholder="https://apps.apple.com/app/id000000000"
                  className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>

            {/* Info note */}
            <div className="flex gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <Svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </Svg>
              <span>
                When a store URL is set, the app redirects users to the store instead of downloading the APK.
                Set <strong>Review Version</strong> to the version currently under store review — users on that version will not be prompted, so reviewers can test without interruption.
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={storeSaving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {storeSaving ? "Saving…" : "Save Store Config"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Upload form ── */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Svg className="w-4 h-4 text-brand-600">
                <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </Svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-700">Publish New Release</h2>
          </div>

          {err && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>
          )}
          {success && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{success}</div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragging ? "border-brand-500 bg-brand-50" : apkFile ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <input ref={fileInputRef} type="file" accept=".apk" onChange={onFileInput} className="hidden" />
              {apkFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Svg className="w-6 h-6 text-green-600">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <path d="m9 11 3 3L22 4" />
                    </Svg>
                  </div>
                  <div className="font-semibold text-gray-800 text-sm">{apkFile.name}</div>
                  <div className="text-xs text-gray-500">{(apkFile.size / (1024 * 1024)).toFixed(1)} MB — click to change</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Svg className="w-6 h-6 text-gray-400">
                      <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </Svg>
                  </div>
                  <div className="text-sm font-medium text-gray-600">Drop your APK here or click to browse</div>
                  <div className="text-xs text-gray-400">Only .apk files · Max 200 MB</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Version Name <span className="text-gray-400">(e.g. 1.3.0)</span></label>
                <input
                  required
                  value={form.version_name}
                  onChange={(e) => setForm({ ...form, version_name: e.target.value })}
                  placeholder="1.3.0"
                  className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Version Code <span className="text-gray-400">(integer, e.g. 13)</span></label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.version_code}
                  onChange={(e) => setForm({ ...form, version_code: e.target.value })}
                  placeholder="13"
                  className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600">Release Notes <span className="text-gray-400">(optional)</span></label>
                <textarea
                  value={form.release_notes}
                  onChange={(e) => setForm({ ...form, release_notes: e.target.value })}
                  placeholder="What's new in this version…"
                  rows={2}
                  className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.force_update}
                    onChange={(e) => setForm({ ...form, force_update: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Force Update</div>
                    <div className="text-xs text-gray-400">Users cannot skip — they must update to continue using the app</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Uploading…</span><span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !apkFile}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {uploading ? `Uploading… ${progress}%` : "Publish Release"}
            </button>
          </form>
        </div>

        {/* ── APK files on server ── */}
        {files.length > 0 && (
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Svg className="w-4 h-4 text-gray-500">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </Svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-700">APK Files on Server</h2>
              <span className="ml-auto text-xs text-gray-400">{files.length} file{files.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-1">
              {files.map((f) => (
                <div key={f.name} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Svg className="w-4 h-4 text-blue-500">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </Svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.size_mb} MB · {new Date(f.uploaded_at).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => deleteFile(f.name)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Delete"
                  >
                    <Svg className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </Svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
