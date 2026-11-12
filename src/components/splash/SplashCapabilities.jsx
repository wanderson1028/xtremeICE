import React from "react";
import {
  Network,
  Crosshair,
  ShieldCheck,
  Radar,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: Network,
    red: false,
    title: "Network Design",
    description: "Multi-site topology, routing and WAN design through to Eve-NG.",
  },
  {
    icon: Crosshair,
    red: false,
    title: "Certification Labs",
    description: "CCNA, Security+, Azure and Linux labs with live consoles.",
  },
  {
    icon: ShieldCheck,
    red: true,
    title: "SOC & SIEM Training",
    description: "Guided incident response from alert triage to recovery.",
  },
  {
    icon: Radar,
    red: true,
    title: "MSSP Operations",
    description: "Multi-client SOC work across detection and response.",
  },
  {
    icon: ClipboardCheck,
    red: false,
    title: "Tabletop Exercises",
    description: "Executive incident simulations scored against your plan.",
  },
  {
    icon: GraduationCap,
    red: false,
    title: "Candidate Assessments",
    description: "Invite, track and score candidates end to end.",
  },
];

export default function SplashCapabilities() {
  return (
    <div className="relative pt-[120px]">
      <div className="mb-12 flex items-center gap-5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#c90032]" />
        <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#151515]">
          Built In
        </span>
        <i className="h-px flex-1 bg-gradient-to-r from-[#151515] to-[#d9d9d9]" />
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex min-h-[110px] items-start gap-4 rounded-[22px] border border-[#ececec] bg-[#fafafa] p-[22px] transition-[border-color,box-shadow] duration-200 hover:border-[#c90032] hover:shadow-[0_12px_26px_-12px_rgba(201,0,50,0.3)]"
            >
              <span
                className={`flex h-11 w-11 flex-none items-center justify-center rounded-[14px] ${
                  item.red ? "bg-[#c90032]" : "bg-[#151515]"
                }`}
              >
                <Icon className="h-[22px] w-[22px] text-white" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span className="block text-[15px] font-extrabold tracking-[-0.01em] text-[#151515]">
                  {item.title}
                </span>
                <span className="mt-1 block text-[14px] leading-[1.5] text-[#555]">
                  {item.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}