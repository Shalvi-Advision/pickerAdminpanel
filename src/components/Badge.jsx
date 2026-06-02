const COLORS = {
  pending: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  // picker item statuses
  picked: "bg-emerald-100 text-emerald-700",
  not_available: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  damaged: "bg-rose-100 text-rose-700",
  picker: "bg-indigo-100 text-indigo-700",
  manager: "bg-purple-100 text-purple-700",
  admin: "bg-orange-100 text-orange-700",
  super_admin: "bg-rose-100 text-rose-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-200 text-gray-600",
};

export default function Badge({ value, label }) {
  const cls = COLORS[value] || "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {label || String(value || "").replace(/_/g, " ")}
    </span>
  );
}
