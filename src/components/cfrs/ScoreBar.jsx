import React from "react";

// Gradient score bar with zone tick marks + aligned rotated labels + prominent score marker.
const CFRS_MIN = -500;
const CFRS_MAX = 1000;
const ZONES = [
  { label: "Extreme", from: -500, to: -250 },
  { label: "Distressed", from: -250, to: 1 },
  { label: "Critical", from: 1, to: 250 },
  { label: "Poor", from: 250, to: 450 },
  { label: "Fair", from: 450, to: 600 },
  { label: "Good", from: 600, to: 750 },
  { label: "Strong", from: 750, to: 900 },
  { label: "Exceptional", from: 900, to: 1000 },
];

const pct = (v) => `${Math.max(0, Math.min(100, ((v - CFRS_MIN) / (CFRS_MAX - CFRS_MIN)) * 100))}%`;

export default function ScoreBar({ score }) {
  const markerPct = pct(score);
  return (
    <div className="relative">
      {/* Score marker badge above the bar */}
      <div
        className="absolute -top-1 z-10 flex -translate-x-1/2 flex-col items-center"
        style={{ left: markerPct }}
      >
        <span className="sg-micro rounded-full bg-[#b91c1c] px-1.5 py-px text-white shadow-sm" style={{ fontSize: 8 }}>
          {score}
        </span>
      </div>

      {/* Gradient bar */}
      <div
        className="relative mt-4 h-2.5 rounded-full"
        style={{ background: "linear-gradient(90deg,#ef4444 0%,#ef4444 16.66%,#f97316 33.33%,#facc15 50%,#86cf55 73.33%,#34d399 100%)" }}
      >
        {/* Marker on the bar: vertical white line + glowing dot */}
        <span className="absolute top-0 z-10 h-full w-[2px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.95)]" style={{ left: markerPct }} />
        <span className="absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" style={{ left: markerPct }} />
      </div>

      {/* Tick marks + aligned rotated labels */}
      <div className="relative mt-1 h-14">
        {/* Dashed marker guide line through the label zone */}
        <span
          className="absolute top-0 z-0 h-full w-px -translate-x-1/2 border-l border-dashed border-[#b91c1c]/60"
          style={{ left: markerPct }}
        />

        {ZONES.map((z) => {
          const center = z.from + (z.to - z.from) / 2;
          return (
            <div
              key={z.label}
              className="absolute top-0 z-[1]"
              style={{ left: pct(center), transform: "translateX(-50%)" }}
            >
              <div className="mx-auto h-2 w-px bg-[#a3a3a3]" />
              <div
                className="sg-micro mt-1 whitespace-nowrap"
                style={{ fontSize: 8, letterSpacing: ".06em", transform: "rotate(-40deg)", transformOrigin: "top center" }}
              >
                {z.label}
              </div>
            </div>
          );
        })}

        <span className="absolute left-0 sg-micro" style={{ fontSize: 8, bottom: 0 }}>−500</span>
        <span className="absolute right-0 sg-micro" style={{ fontSize: 8, bottom: 0 }}>1,000</span>
      </div>
    </div>
  );
}