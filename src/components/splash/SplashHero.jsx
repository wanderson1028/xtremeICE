import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

const HERO_IMAGE =
  "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/faec1f8e5_generated_0717339e.jpg";

export default function SplashHero() {
  return (
    <div className="relative grid items-center gap-12 pt-10 lg:min-h-[760px] lg:grid-cols-[1fr_560px] lg:gap-[72px]">
      <div>
        <p
          className="splash-enter mb-[22px] flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.2em] text-[#c90032]"
          style={{ animationDelay: ".25s" }}
        >
          <span className="h-0.5 w-9 bg-[#c90032]" />
          Cybersecurity Training
        </p>

        <h1
          className="splash-enter text-[56px] font-extrabold leading-none tracking-[-0.04em] text-[#151515] sm:text-[76px] lg:text-[104px]"
          style={{ animationDelay: ".25s" }}
        >
          Xtreme I.C.E.
        </h1>

        <p
          className="splash-enter mt-7 text-[15px] font-bold uppercase leading-relaxed tracking-[0.16em] text-[#c90032]"
          style={{ animationDelay: ".4s" }}
        >
          Hands-On Cyber Range &amp; SOC Training
        </p>

        <p
          className="splash-enter mt-[22px] max-w-[560px] text-[21px] leading-[1.6] text-[#3b3b3b]"
          style={{ animationDelay: ".55s" }}
        >
          Design enterprise network infrastructure, run live SOC and SIEM investigations, and prove
          capability with scored assessments, from first requirement to Eve-NG deployment.
        </p>

        <div className="splash-enter mt-9" style={{ animationDelay: ".7s" }}>
          <Link to="/login" className="splash-btn">
            Login
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </Link>
        </div>
      </div>

      <div
        className="splash-enter relative overflow-hidden rounded-[36px] border border-[#ececec] bg-white shadow-[0_40px_80px_-20px_rgba(21,21,21,0.35)]"
        style={{ animationDelay: ".4s" }}
      >
        <img
          src={HERO_IMAGE}
          alt="Analyst working through a live cyber range exercise"
          className="block aspect-[4/5] w-full object-cover"
        />
        <div className="splash-float absolute bottom-12 left-4 flex h-[78px] w-[78px] items-center justify-center rounded-[22px] bg-[#c90032] shadow-[0_18px_36px_rgba(201,0,50,0.4)] sm:left-6 lg:-left-7">
          <ShieldCheck className="h-9 w-9 text-white" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}