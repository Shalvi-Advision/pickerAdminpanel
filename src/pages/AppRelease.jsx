import { useEffect, useRef, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

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

  async function load() {
    setLoading(true);
    try {
      const [rel, fl] = await Promise.all([
        api.get("/super-admin/app-release"),
        api.get("/super-admin/app-release/files"),
      ]);
      setCurrent(rel.data.data);
      setFiles(fl.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Live Version</h2>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : current ? (
            <div className="flex flex-wrap gap-6 items-start">
              <div>
                <div className="text-3xl font-black text-gray-900">{current.version_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">Build {current.version_code}</div>
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
                    className="text-xs text-brand-600 hover:underline break-all">
                    {current.apk_url}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No release published yet.</div>
          )}
        </div>

        {/* ── Upload form ── */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Publish New Release</h2>

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
                <div className="space-y-1">
                  <div className="text-2xl">📦</div>
                  <div className="font-semibold text-gray-800 text-sm">{apkFile.name}</div>
                  <div className="text-xs text-gray-500">{(apkFile.size / (1024 * 1024)).toFixed(1)} MB — click to change</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl">📱</div>
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">APK Files on Server</h2>
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.size_mb} MB · {new Date(f.uploaded_at).toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => deleteFile(f.name)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium ml-4"
                  >
                    Delete
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
