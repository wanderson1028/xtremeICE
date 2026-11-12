import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SplashCta() {
  return (
    <div className="splash-cta mt-[120px] flex flex-col items-center gap-[30px] overflow-hidden rounded-[40px] bg-[#151515] px-10 py-16 text-center shadow-[0_40px_80px_-24px_rgba(21,21,21,0.5)] lg:px-20 lg:py-24">
      <p className="relative flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.2em] text-[#ff6b8a]">
        <span className="h-0.5 w-9 bg-[#ff6b8a]" />
        Get Started
      </p>
      <Link to="/login" className="splash-btn">
        Login
        <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
      </Link>
    </div>
  );
}