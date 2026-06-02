import { useState } from "react";
import PageHeader from "../components/PageHeader.jsx";

const EDITABLE_ROLES = [
  { value: "picker", label: "Picker" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin (mobile)" },
];

export default function Roles() {
  const [active, setActive] = useState("manager");

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Control what each persona can do in the mobile app"
      />
      <div className="p-8 space-y-5 max-w-4xl">
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
        <p className="text-sm text-gray-500">
          Select a role above to view and edit its capabilities.
        </p>
      </div>
    </>
  );
}
