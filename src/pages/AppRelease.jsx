import { useEffect, useRef, useState } from "react";
import api from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";

const Svg = ({ children, className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);

const CHANNELS = [
  {
    key: "apk",
    label: "APK / Direct",
    desc: "Users download APK from your server",
    activeClass: "bg-brand-600 text-white border-brand-600 shadow-md",
    inactiveClass: "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
    icon: (
      <Svg className="w-5 h-5">
        <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </Svg>
    ),
  },
  {
    key: "store",
    label: "Play Store / App Store",
    desc: "Redirect users to the store listing",
    activeClass: "bg-indigo-600 text-white border-indigo-600 shadow-md",
    inactiveClass: "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
    icon: (
      <Svg className="w-5 h-5">
        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
        <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
        <path d="M12 12v5M9.5 14.5 12 12l2.5 2.5" />
      </Svg>
    ),
  },
  {
    key: "none",
    label: "Off",
    desc: "No updates sent to users",
    activeClass: "bg-gray-700 text-white border-gray-700 shadow-md",
    inactiveClass: "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
    icon: (
      <Svg className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </Svg>
    ),
  },
];

export default function AppRelease() {
  const [current, setCurrent] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("none");
  const [channelSaving, setChannelSaving] = useState(false);

  // ── APK form ─────────────────────────────────────────────────────────────────
  const [apkFile, setApkFile] = useState(null);
  const [apkForm, setApkForm] = useState({ version_code: "", version_name: "", release_notes: "", apk_force_update: false });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [apkErr, setApkErr] = useState("");
  const [apkSuccess, setApkSuccess] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();

  // ── Store form ────────────────────────────────────────────────────────────────
  const [storeForm, setStoreForm] = useState({
    android_latest_version: "", android_review_version: "",
    ios_latest_version: "", ios_review_version: "",
    play_store_url: "", app_store_url: "",
    store_force_update: false,
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
        setChannel(d.update_channel || "none");
        setStoreForm({
          android_latest_version: d.android_latest_version || "",
          android_review_version: d.android_review_version || "",
          ios_latest_version: d.ios_latest_version || "",
          ios_review_version: d.ios_review_version || "",
          play_store_url: d.play_store_url || "",
          app_store_url: d.app_store_url || "",
          store_force_update: d.store_force_update || false,
        });
      }
    } catch (e) {
      setApkErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function switchChannel(ch) {
    if (ch === channel || channelSaving) return;
    setChannelSaving(true);
    try {
      const res = await api.put("/super-admin/app-release/channel", { channel: ch });
      setCurrent(res.data.data);
      setChannel(ch);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setChannelSaving(false);
    }
  }

  // ── APK handlers ──────────────────────────────────────────────────────────────
  function pickFile(f) {
    if (!f) return;
    setApkFile(f);
    setApkErr("");
    setApkSuccess("");
    const match = f.name.match(/v(\d+)\.apk$/i);
    if (match) setApkForm((p) => ({ ...p, version_code: match[1] }));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".apk")) pickFile(f);
    else setApkErr("Only .apk files allowed");
  }

  async function onApkSubmit(e) {
    e.preventDefault();
    if (!apkFile) return setApkErr("Select an APK file first");
    if (!apkForm.version_code || !apkForm.version_name) return setApkErr("Version code and name are required");

    setUploading(true); setApkErr(""); setApkSuccess(""); setProgress(0);

    // Text fields MUST come before the file — multer's filename callback fires
    // when the file stream starts, before later fields are parsed.
    const fd = new FormData();
    fd.append("version_code", apkForm.version_code);
    fd.append("version_name", apkForm.version_name);
    fd.append("release_notes", apkForm.release_notes);
    fd.append("apk_force_update", String(apkForm.apk_force_update));
    fd.append("apk", apkFile);

    try {
      const res = await api.post("/super-admin/app-release", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      setApkSuccess(`Version ${res.data.data.version_name} published!`);
      setCurrent(res.data.data);
      setApkFile(null);
      setApkForm({ version_code: "", version_name: "", release_notes: "", apk_force_update: false });
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (e2) {
      setApkErr(e2.response?.data?.message || e2.message);
    } finally {
      setUploading(false); setProgress(0);
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

  // ── Store handlers ────────────────────────────────────────────────────────────
  async function onStoreSubmit(e) {
    e.preventDefault();
    setStoreSaving(true); setStoreErr(""); setStoreSuccess("");
    try {
      const res = await api.put("/super-admin/app-release/store-config", storeForm);
      setCurrent(res.data.data);
      setStoreSuccess("Store config saved!");
    } catch (e2) {
      setStoreErr(e2.response?.data?.message || e2.message);
    } finally {
      setStoreSaving(false);
    }
  }

  // ── Active channel info ────────────────────────────────────────────────────────
  const activeChannel = CHANNELS.find((c) => c.key === channel) || CHANNELS[2];

  return (
    <>
      <PageHeader title="App Release" subtitle="Manage app updates — choose one active channel at a time" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">

        {/* ── Channel Selector ── */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Svg className="w-4 h-4 text-gray-600">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </Svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-700">Active Update Channel</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-10">Only one channel is active at a time. The app ignores the inactive channel's config.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CHANNELS.map((ch) => {
              const isActive = channel === ch.key;
              return (
                <button
                  key={ch.key}
                  onClick={() => switchChannel(ch.key)}
                  disabled={channelSaving}
                  className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${isActive ? ch.activeClass : ch.inactiveClass} disabled:opacity-60`}
                >
                  {isActive && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
                      Active
                    </span>
                  )}
                  <span className={isActive ? "opacity-90" : "text-gray-400"}>{ch.icon}</span>
                  <span className={`text-sm font-semibold ${isActive ? "" : "text-gray-700"}`}>{ch.label}</span>
                  <span className={`text-xs leading-tight ${isActive ? "opacity-75" : "text-gray-400"}`}>{ch.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Live Version Status ── */}
        {!loading && current && (
          <div className="bg-white border rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Svg className="w-4 h-4 text-brand-600">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </Svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-700">Live Status</h2>
              <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                channel === "apk" ? "bg-brand-100 text-brand-700" :
                channel === "store" ? "bg-indigo-100 text-indigo-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {activeChannel.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 items-start">
              {channel === "apk" && current.version_name && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Svg className="w-5 h-5 text-brand-600">
                      <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </Svg>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">{current.version_name}</div>
                    <div className="text-xs text-gray-400">Build {current.version_code} · {current.file_size_mb} MB</div>
                  </div>
                </div>
              )}
              {channel === "store" && (current.android_latest_version || current.ios_latest_version) && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Svg className="w-5 h-5 text-indigo-600">
                      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
                    </Svg>
                  </div>
                  <div className="space-y-1">
                    {current.android_latest_version && (
                      <div className="text-sm font-semibold text-gray-800">Android {current.android_latest_version}
                        {current.android_review_version && <span className="ml-2 text-xs text-gray-400 font-normal">review: {current.android_review_version}</span>}
                      </div>
                    )}
                    {current.ios_latest_version && (
                      <div className="text-sm font-semibold text-gray-800">iOS {current.ios_latest_version}
                        {current.ios_review_version && <span className="ml-2 text-xs text-gray-400 font-normal">review: {current.ios_review_version}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs items-center">
                {channel === "apk" && (
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${current.apk_force_update ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {current.apk_force_update ? "Force ON" : "Force OFF"}
                  </span>
                )}
                {channel === "store" && (
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${current.store_force_update ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {current.store_force_update ? "Force ON" : "Force OFF"}
                  </span>
                )}
                {current.published_at && channel === "apk" && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {new Date(current.published_at).toLocaleString()}
                  </span>
                )}
                {current.play_store_url && channel === "store" && (
                  <a href={current.play_store_url} target="_blank" rel="noreferrer"
                    className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 hover:underline">
                    Play Store ↗
                  </a>
                )}
                {current.app_store_url && channel === "store" && (
                  <a href={current.app_store_url} target="_blank" rel="noreferrer"
                    className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 hover:underline">
                    App Store ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── APK / Direct section ── */}
        <div className={`bg-white border-2 rounded-xl shadow-sm transition-opacity ${channel === "apk" ? "border-brand-200" : "border-gray-100 opacity-60"}`}>
          {/* Section header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${channel === "apk" ? "bg-brand-50" : "bg-gray-100"}`}>
              <Svg className={`w-4 h-4 ${channel === "apk" ? "text-brand-600" : "text-gray-400"}`}>
                <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </Svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700">APK / Direct Distribution</h2>
              <p className="text-xs text-gray-400">Upload signed APK — users download directly from your server</p>
            </div>
            {channel !== "apk" && (
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* APK upload form */}
            <div>
              {apkErr && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{apkErr}</div>}
              {apkSuccess && <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{apkSuccess}</div>}

              <form onSubmit={onApkSubmit} className="space-y-4">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragging ? "border-brand-500 bg-brand-50" : apkFile ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <input ref={fileInputRef} type="file" accept=".apk" onChange={(e) => pickFile(e.target.files[0])} className="hidden" />
                  {apkFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <Svg className="w-6 h-6 text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></Svg>
                      </div>
                      <div className="font-semibold text-gray-800 text-sm">{apkFile.name}</div>
                      <div className="text-xs text-gray-500">{(apkFile.size / (1024 * 1024)).toFixed(1)} MB · click to change</div>
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
                      <div className="text-sm font-medium text-gray-600">Drop APK here or click to browse</div>
                      <div className="text-xs text-gray-400">Only .apk · Max 200 MB</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Version Name</label>
                    <input required value={apkForm.version_name}
                      onChange={(e) => setApkForm({ ...apkForm, version_name: e.target.value })}
                      placeholder="1.3.0"
                      className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Version Code <span className="text-gray-400">(integer)</span></label>
                    <input required type="number" min="1" value={apkForm.version_code}
                      onChange={(e) => setApkForm({ ...apkForm, version_code: e.target.value })}
                      placeholder="13"
                      className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-600">Release Notes <span className="text-gray-400">(optional)</span></label>
                    <textarea value={apkForm.release_notes}
                      onChange={(e) => setApkForm({ ...apkForm, release_notes: e.target.value })}
                      placeholder="What's new…" rows={2}
                      className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-brand-500 resize-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input type="checkbox" checked={apkForm.apk_force_update}
                        onChange={(e) => setApkForm({ ...apkForm, apk_force_update: e.target.checked })}
                        className="w-4 h-4" />
                      <div>
                        <div className="text-sm font-medium text-gray-800">Force Update (APK)</div>
                        <div className="text-xs text-gray-400">Users must download the new APK to continue</div>
                      </div>
                    </label>
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500"><span>Uploading…</span><span>{progress}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-brand-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={uploading || !apkFile}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  {uploading ? `Uploading… ${progress}%` : "Publish APK Release"}
                </button>
              </form>
            </div>

            {/* APK file list */}
            {files.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Files on Server</h3>
                  <span className="text-xs text-gray-400">{files.length} file{files.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-1">
                  {files.map((f) => (
                    <div key={f.name} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Svg className="w-3.5 h-3.5 text-blue-500">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </Svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{f.name}</div>
                        <div className="text-xs text-gray-400">{f.size_mb} MB · {new Date(f.uploaded_at).toLocaleString()}</div>
                      </div>
                      <button onClick={() => deleteFile(f.name)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                        <Svg className="w-4 h-4">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </Svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Store Distribution section ── */}
        <div className={`bg-white border-2 rounded-xl shadow-sm transition-opacity ${channel === "store" ? "border-indigo-200" : "border-gray-100 opacity-60"}`}>
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${channel === "store" ? "bg-indigo-50" : "bg-gray-100"}`}>
              <Svg className={`w-4 h-4 ${channel === "store" ? "text-indigo-600" : "text-gray-400"}`}>
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
              </Svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Store Distribution</h2>
              <p className="text-xs text-gray-400">Redirect users to Play Store or App Store</p>
            </div>
            {channel !== "store" && (
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>

          <div className="p-5">
            {storeErr && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{storeErr}</div>}
            {storeSuccess && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{storeSuccess}</div>}

            <form onSubmit={onStoreSubmit} className="space-y-4">
              {/* Android + iOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center">
                      <Svg className="w-3.5 h-3.5 text-green-700"><path d="M5 16L3 5l5.5 5 3.5-7 3.5 7L21 5l-2 11H5Z" /></Svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Android</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Latest Version</label>
                    <input value={storeForm.android_latest_version}
                      onChange={(e) => setStoreForm({ ...storeForm, android_latest_version: e.target.value })}
                      placeholder="e.g. 1.3.0"
                      className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-400 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Review Version <span className="text-gray-400">(skip prompt while under review)</span></label>
                    <input value={storeForm.android_review_version}
                      onChange={(e) => setStoreForm({ ...storeForm, android_review_version: e.target.value })}
                      placeholder="e.g. 1.3.0"
                      className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-400 bg-white" />
                  </div>
                </div>

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
                    <input value={storeForm.ios_latest_version}
                      onChange={(e) => setStoreForm({ ...storeForm, ios_latest_version: e.target.value })}
                      placeholder="e.g. 1.3.0"
                      className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-400 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Review Version <span className="text-gray-400">(skip prompt while under review)</span></label>
                    <input value={storeForm.ios_review_version}
                      onChange={(e) => setStoreForm({ ...storeForm, ios_review_version: e.target.value })}
                      placeholder="e.g. 1.3.0"
                      className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-400 bg-white" />
                  </div>
                </div>
              </div>

              {/* Store URLs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Svg className="w-3.5 h-3.5 text-green-600"><path d="M5 16L3 5l5.5 5 3.5-7 3.5 7L21 5l-2 11H5Z" /></Svg>
                    Google Play URL
                  </label>
                  <input value={storeForm.play_store_url}
                    onChange={(e) => setStoreForm({ ...storeForm, play_store_url: e.target.value })}
                    placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                    className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-400 font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Svg className="w-3.5 h-3.5 text-gray-600">
                      <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4Z" />
                      <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                    </Svg>
                    App Store URL
                  </label>
                  <input value={storeForm.app_store_url}
                    onChange={(e) => setStoreForm({ ...storeForm, app_store_url: e.target.value })}
                    placeholder="https://apps.apple.com/app/id000000000"
                    className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-400 font-mono" />
                </div>
              </div>

              {/* Force update toggle */}
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={storeForm.store_force_update}
                    onChange={(e) => setStoreForm({ ...storeForm, store_force_update: e.target.checked })}
                    className="w-4 h-4" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Force Update (Store)</div>
                    <div className="text-xs text-gray-400">Users cannot skip — they must update from the store to continue</div>
                  </div>
                </label>
              </div>

              {/* Info note */}
              <div className="flex gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <Svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Svg>
                <span>
                  Set <strong>Review Version</strong> to the version currently under store review. Users on that version won't be prompted — so reviewers can test without interruption.
                </span>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={storeSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                  {storeSaving ? "Saving…" : "Save Store Config"}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </>
  );
}
