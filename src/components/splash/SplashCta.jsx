import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SplashCta() {
  return (
    <div className="mt-16 flex flex-col items-center gap-6 rounded-[26px] border border-[#00D7C5]/40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,215,197,0.22),rgba(255,255,255,0.04)_60%)] px-6 py-12 text-center shadow-[0_40px_80px_-24px_rgba(0,0,0,0.7),inset_0_1px_rgba(255,255,255,0.2)] sm:mt-[100px] sm:gap-7 sm:rounded-[36px] sm:px-10 sm:py-[72px]">
      <p className="flex items-center gap-3 text-[13px] font-extrabold uppercase tracking-[0.22em] text-[#ff6b8a]">
        <span className="block h-0.5 w-9 bg-[#ff6b8a]" />
        Get Started
      </p>
      <Link to="/login" className="splash-btn">
        Login
        <ArrowRight strokeWidth={2.4} />
      </Link>
    </div>
  );
}