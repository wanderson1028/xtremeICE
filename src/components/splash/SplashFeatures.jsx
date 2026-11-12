import React from "react";

const FEATURES = [
  {
    number: "01",
    title: "Live Cyber Ranges",
    description:
      "Deploy multi-site topologies with real routing, then attack and defend them in the range.",
    image:
      "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/cf1e2039a_generated_d51c9df5.jpg",
  },
  {
    number: "02",
    title: "SOC & SIEM Simulators",
    description:
      "Triage alerts, build detections and work the full incident lifecycle inside a live console.",
    image:
      "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/e7c1e5b5f_generated_dedf8930.jpg",
  },
  {
    number: "03",
    title: "Assessments & Scorecards",
    description:
      "Role-based labs and application tests that score candidates the moment they submit.",
    image:
      "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/e96b456fe_generated_245d1d15.jpg",
  },
];

export default function SplashFeatures() {
  return (
    <div className="relative pt-[120px]">
      <div className="mb-12 flex items-center gap-5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#c90032]" />
        <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#151515]">
          Platform Features
        </span>
        <i className="h-px flex-1 bg-gradient-to-r from-[#151515] to-[#d9d9d9]" />
      </div>

      <div className="grid gap-7 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.number}
            className="flex flex-col overflow-hidden rounded-[28px] border border-[#e6e6e6] bg-white shadow-[0_18px_40px_-18px_rgba(21,21,21,0.18)] transition-[box-shadow,border-color] [transition-duration:250ms] hover:border-[#c90032] hover:shadow-[0_26px_50px_-16px_rgba(201,0,50,0.28)]"
          >
            <img
              src={feature.image}
              alt={feature.title}
              className="block aspect-[3/2] w-full object-cover"
            />
            <div className="flex flex-1 flex-col gap-2.5 px-7 pb-[30px] pt-[26px]">
              <span className="text-[13px] font-extrabold tracking-[0.14em] text-[#c90032]">
                {feature.number}
              </span>
              <span className="text-2xl font-extrabold tracking-[-0.02em] text-[#151515]">
                {feature.title}
              </span>
              <p className="text-[15px] leading-[1.55] text-[#555]">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}