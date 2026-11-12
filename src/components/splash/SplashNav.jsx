import React from "react";
import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";

export default function SplashNav() {
  return (
    <div className="splash-enter relative pt-11" style={{ animationDelay: ".1s" }}>
      <div className="flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3.5">
          <BrandMark className="h-11 w-11" />
          <span className="text-[26px] font-extrabold tracking-[-0.02em] text-[#151515]">
            Xtreme I.C.E.
          </span>
        </Link>
        <Link to="/login" className="splash-btn">
          Login
        </Link>
      </div>
    </div>
  );
}