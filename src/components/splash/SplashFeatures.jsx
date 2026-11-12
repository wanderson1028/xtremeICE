import React from "react";

const FEATURES = [
  {
    number: "01",
    title: "Live Cyber Ranges",
    description:
      "Deploy multi-site topologies with real routing, then attack and defend them in the range.",
    image:
      "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/e48cdf2e1_generated_989d63ce.jpg",
  },
  {
    number: "02",
    title: "SOC & SIEM Simulators",
    description:
      "Triage alerts, build detections and work the full incident lifecycle inside a live console.",
    image:
      "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/21fe96577_generated_3feec9f5.jpg",
  },
  {
    number: "03",
    title: "Assessments & Scorecards",
    description:
      "Role-based labs and application tests that score candidates the moment they submit.",
    image:
      "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/c4c53befc_generated_0da9e236.jpg",
  },
];

export default function SplashFeatures() {
  return (
    <div className="relative mt-16 sm:mt-24">
      <div className="mb-9 flex items-center gap-[18px]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#C90032] shadow-[0_0_14px_#C90032]" />
        <span className="text-sm font-extrabold uppercase tracking-[0.22em] text-[#F7F9FC]">
          Platform Features
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-[#00D7C5] to-transparent" />
      </div>

      <div className="grid gap-7 md:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.number}
            className={`flex flex-col overflow-hidden rounded-[26px] border border-[#00D7C5]/[0.28] bg-[linear-gradient(160deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] shadow-[0_24px_50px_-18px_rgba(0,0,0,0.7),inset_0_1px_rgba(255,255,255,0.2)] [transition:border-color_250ms,box-shadow_250ms] hover:border-[#00D7C5] hover:shadow-[0_28px_60px_-16px_rgba(0,215,197,0.35),inset_0_1px_rgba(255,255,255,0.3)] ${
              index === 1 ? "md:translate-y-6" : ""
            }`}
          >
            <img
              src={feature.image}
              alt={feature.title}
              className="block aspect-[3/2] w-full object-cover"
            />
            <div className="flex flex-1 flex-col gap-2.5 px-[26px] pb-7 pt-6">
              <span className="text-[13px] font-extrabold tracking-[0.16em] text-[#00D7C5]">
                {feature.number}
              </span>
              <span className="text-2xl font-black tracking-[-0.02em] text-[#F7F9FC]">
                {feature.title}
              </span>
              <p className="text-[15px] leading-[1.55] text-[#F7F9FC]/75">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}