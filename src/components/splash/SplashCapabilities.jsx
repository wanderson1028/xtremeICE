import React from "react";
import { Network, Crosshair, ShieldCheck, Radar, ClipboardCheck, GraduationCap } from "lucide-react";

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
    <div className="relative mt-[120px]">
      <div className="mb-9 flex items-center gap-[18px]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#C90032] shadow-[0_0_14px_#C90032]" />
        <span className="text-sm font-extrabold uppercase tracking-[0.22em] text-[#F7F9FC]">
          Built In
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-[#00D7C5] to-transparent" />
      </div>

      <div className="splash-rail relative mt-10 grid gap-[22px] md:grid-cols-3">
        {CAPABILITIES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="relative flex min-h-[118px] items-start gap-4 rounded-[22px] border border-white/[0.16] bg-[#0A1A2C]/[0.72] p-[22px] shadow-[0_16px_36px_-14px_rgba(0,0,0,0.7),inset_0_1px_rgba(255,255,255,0.15)] transition-[border-color,box-shadow] duration-200 hover:border-[#00D7C5] hover:shadow-[0_16px_40px_-10px_rgba(0,215,197,0.4),inset_0_1px_rgba(255,255,255,0.25)]"
            >
              <span
                className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] border ${
                  item.red
                    ? "border-[#ff7896]/60 bg-[linear-gradient(145deg,#e0003a,#C90032)] shadow-[0_0_18px_rgba(201,0,50,0.5)]"
                    : "border-[#00D7C5]/50 bg-[linear-gradient(145deg,#12324a,#07111E)] shadow-[0_0_18px_rgba(0,215,197,0.3)]"
                }`}
              >
                <Icon className="h-[22px] w-[22px] text-[#F7F9FC]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <strong className="block text-base font-black tracking-[-0.01em] text-[#F7F9FC]">
                  {item.title}
                </strong>
                <span className="mt-[5px] block text-sm leading-[1.5] text-[#F7F9FC]/70">
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