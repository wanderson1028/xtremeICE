import React from "react";

// Gradient score bar with zone tick marks + glowing sliding marker.
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
    <div>
      <div
        className="relative h-2.5 rounded-full"
        style={{ background: "linear-gradient(90deg,#ef4444 0%,#ef4444 16.66%,#f97316 33.33%,#facc15 50%,#86cf55 73.33%,#34d399 100%)" }}
      >
        <span className="sg-marker" style={{ left: markerPct }} />
      </div>
      <div className="relative mt-2 h-12">
        {ZONES.map((z) => (
          <span
            key={z.label}
            className="absolute"
            style={{ left: pct(z.from + (z.to - z.from) / 2), transform: "translateX(-50%)" }}
          >
            <span className="block h-2 w-px bg-[#b6bcc7]" />
            <span
              className="sg-micro mt-0.5 block whitespace-nowrap"
              style={{ fontSize: 8, letterSpacing: ".06em", transform: "rotate(-40deg) translateX(-4px)", transformOrigin: "top left", position: "absolute", top: "10px" }}
            >
              {z.label}
            </span>
          </span>
        ))}
        <span className="absolute left-0 sg-micro" style={{ fontSize: 8, bottom: 0 }}>−500</span>
        <span className="absolute right-0 sg-micro" style={{ fontSize: 8, bottom: 0 }}>1,000</span>
      </div>
    </div>
  );
}