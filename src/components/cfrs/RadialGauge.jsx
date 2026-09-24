import React from "react";

// Compact semicircular arc gauge. score in [min,max]; fills proportionally with accent.
export default function RadialGauge({ score, min = -500, max = 1000, size = 120, trend = null }) {
  const clamped = Math.max(min, Math.min(max, Number(score) || min));
  const trendColor = trend == null ? "#9aa1ad" : trend > 0 ? "#0f9d58" : trend < 0 ? "#dc2626" : "#9aa1ad";
  const trendArrow = trend == null ? "" : trend > 0 ? "▲" : trend < 0 ? "▼" : "▬";
  const trendLabel = trend == null ? "" : `${trend > 0 ? "+" : ""}${Math.round(trend)}`;
  const pct = (clamped - min) / (max - min);
  const r = 52;
  const cx = 60;
  const cy = 60;
  const startAngle = Math.PI; // 180deg
  const endAngle = 0; // 0deg
  const angle = startAngle + (endAngle - startAngle) * pct;
  const polar = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [sx, sy] = polar(startAngle);
  const [ex, ey] = polar(endAngle);
  const [vx, vy] = polar(angle);
  const largeArc = 0;
  const trackPath = `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  const valuePath = `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${vx} ${vy}`;

  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 120 74" className="sg-tabular">
      <defs>
        <linearGradient id="sg-gauge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <path d={trackPath} fill="none" stroke="#d6dae2" strokeWidth="9" strokeLinecap="round" />
      <path d={valuePath} fill="none" stroke="url(#sg-gauge)" strokeWidth="9" strokeLinecap="round" />
      <circle cx={vx} cy={vy} r="4.5" fill="#fff" stroke="#0EA5C7" strokeWidth="2" />
      <text x="60" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill="#2A2F3A">
        {Math.round(clamped)}
      </text>
      {trend !== null && (
        <text x="60" y="67" textAnchor="middle" fontSize="9" fontWeight="700" fill={trendColor}>
          {trendArrow} {trendLabel}
        </text>
      )}
    </svg>
  );
}