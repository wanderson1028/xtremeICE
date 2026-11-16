import React from "react";

const HEX_ROWS = [
  "0x4F", "A7:E2", "10.0.0.0/8", "0x1C", "TLS 1.3", "B3:91",
  "AES-256", "0x9D", "SYN/ACK", "172.16.4.1", "0x7B", "SHA-256",
];

const CIRCUIT_PATHS = [
  "M58 0 V96 H24 V208 H58 V320 H30 V440 H58 V600",
  "M96 0 V64 H72 V176 H96 V288 H76 V412 H96 V600",
];

const NODE_TOPS = [14, 36, 58, 80];

function CyberRail({ side }) {
  const isLeft = side === "left";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-y-0 z-0 hidden overflow-hidden lg:block lg:opacity-70 xl:opacity-100 ${
        isLeft ? "left-0" : "right-0"
      } w-[clamp(96px,15vw,220px)]`}
    >
      {/* ambient side glow */}
      <div
        className={`absolute inset-0 ${
          isLeft
            ? "bg-[radial-gradient(circle_at_25%_45%,rgba(201,0,50,0.16),transparent_70%)]"
            : "bg-[radial-gradient(circle_at_75%_55%,rgba(0,215,197,0.12),transparent_70%)]"
        }`}
      />

      {/* circuit traces with travelling data pulses */}
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        <svg
          viewBox="0 0 120 600"
          preserveAspectRatio="none"
          className={`h-full w-full ${isLeft ? "" : "scale-x-[-1]"}`}
        >
          {CIRCUIT_PATHS.map((d, i) => (
            <path
              key={`base-${i}`}
              d={d}
              fill="none"
              stroke="#C90032"
              strokeWidth="1"
              opacity="0.32"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {CIRCUIT_PATHS.map((d, i) => (
            <path
              key={`flow-${i}`}
              d={d}
              fill="none"
              stroke="#00D7C5"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="18 260"
              vectorEffect="non-scaling-stroke"
              className={i === 0 ? "cyber-flow" : "cyber-flow-slow"}
              style={{ animationDelay: `${i * 1.6}s` }}
            />
          ))}
        </svg>
      </div>

      {/* vertical spine */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-red-800/40 to-transparent" />

      {/* travelling packets */}
      {[0, 1, 2].map((i) => (
        <span key={i} className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2">
          <span className="cyber-packet relative block h-full w-full" style={{ animationDelay: `${i * 1.6}s` }}>
            <span className="absolute inset-x-0 top-0 h-[16%] bg-gradient-to-b from-transparent via-[#00D7C5] to-transparent" />
          </span>
        </span>
      ))}

      {/* node beacons */}
      {NODE_TOPS.map((top, i) => (
        <span
          key={top}
          className="cyber-node absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#00D7C5]"
          style={{ top: `${top}%`, animationDelay: `${i * 0.55}s` }}
        />
      ))}

      {/* streaming hex readout along the outer edge */}
      <div
        className={`absolute inset-y-0 w-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] ${
          isLeft ? "left-2" : "right-2"
        }`}
      >
        <div className="cyber-stream flex flex-col gap-3 font-mono text-[9px] uppercase tracking-[0.18em] text-red-500/40">
          {[...HEX_ROWS, ...HEX_ROWS].map((row, i) => (
            <span key={i} className="whitespace-nowrap">
              {row}
            </span>
          ))}
        </div>
      </div>

      {/* HUD corner brackets */}
      <div
        className={`absolute top-24 h-8 w-8 border-[#00D7C5]/30 ${
          isLeft ? "left-3 border-l border-t" : "right-3 border-r border-t"
        }`}
      />
      <div
        className={`absolute bottom-24 h-8 w-8 border-red-800/40 ${
          isLeft ? "left-3 border-b border-l" : "right-3 border-b border-r"
        }`}
      />
    </div>
  );
}

export default function CyberSideAccents() {
  return (
    <>
      <CyberRail side="left" />
      <CyberRail side="right" />
    </>
  );
}