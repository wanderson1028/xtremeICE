import React from "react";

export default function HotspotTask({ task, value, onChange }) {
  const regions = task.hotspot_regions || [];

  return (
    <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: "#d4d4d4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ background: "#f5f5f5", borderColor: "#e5e5e5" }}>
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full" style={{ background: "#f87171" }} />
          <span className="h-2 w-2 rounded-full" style={{ background: "#fbbf24" }} />
          <span className="h-2 w-2 rounded-full" style={{ background: "#34d399" }} />
        </span>
        <span className="truncate text-[11px] font-semibold">{task.interface_name || "Management console"}</span>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {regions.map((region) => {
          const isOn = value === region.id;
          return (
            <button
              key={region.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(region.id)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${isOn ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
            >
              <span className="block text-xs font-semibold">{region.label}</span>
              {region.detail && <span className="mt-0.5 block text-[11px]" style={{ color: "#525252" }}>{region.detail}</span>}
            </button>
          );
        })}
      </div>
      <p className="border-t px-3 py-2 text-[11px]" style={{ borderColor: "#e5e5e5", color: "#525252" }}>
        Click the area of the console the task asks about.
      </p>
    </div>
  );
}