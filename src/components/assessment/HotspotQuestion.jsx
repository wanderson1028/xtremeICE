import React from "react";
import { Crosshair } from "lucide-react";

const clamp = (value) => Math.max(0, Math.min(100, value));

// The smallest region containing the click wins, so a nested area can be
// targeted inside a larger one.
function regionAt(regions, x, y) {
  const hits = regions.filter(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  );
  if (!hits.length) return null;
  return hits.sort((a, b) => a.w * a.h - b.w * b.h)[0];
}

export default function HotspotQuestion({ task, value, onChange }) {
  const regions = Array.isArray(task?.hotspot_regions) ? task.hotspot_regions : [];
  const selected = regions.find((r) => r.id === value?.answer) || null;
  const missed = Boolean(value?.missed);
  const marker = selected ? { x: selected.x + selected.w / 2, y: selected.y + selected.h / 2 } : null;

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100);
    const hit = regionAt(regions, x, y);
    onChange({ ...value, answer: hit ? hit.id : "", missed: !hit });
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-950 cursor-crosshair select-none"
      >
        <img
          src={task.hotspot_image_url}
          alt="Click the area that answers the question"
          className="w-full h-auto block pointer-events-none"
          draggable={false}
        />
        {selected && marker && (
          <span
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-400 bg-red-500/30 pointer-events-none"
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          >
            <span className="absolute inset-1.5 rounded-full bg-red-400" />
          </span>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
        <Crosshair className="h-3 w-3 shrink-0" />
        {selected
          ? `Selected: ${selected.label || "area"}`
          : missed
          ? "Nothing selectable there — click a different spot on the image."
          : "Click the part of the image that answers the question."}
      </p>
    </div>
  );
}

export function isHotspotAnswered(value) {
  return Boolean(value?.answer);
}