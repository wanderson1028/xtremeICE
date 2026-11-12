import React from "react";
import { Link } from "react-router-dom";

const LOGO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0a5a90473fac0aa3ea135/6a3fbf99a_XtremeICED52aR00aP01ZL-Hoover.png";

export default function SplashNav() {
  return (
    <div
      className="splash-enter relative flex items-center justify-between gap-4 pt-7 sm:gap-6 sm:pt-9"
      style={{ animationDelay: ".1s" }}
    >
      <Link to="/" className="flex items-center gap-3">
        <img src={LOGO} alt="Xtreme I.C.E." className="h-9 w-auto object-contain sm:h-11" />
        <span className="text-lg font-extrabold tracking-[-0.02em] text-[#F7F9FC] sm:text-2xl">
          Xtreme I.C.E.
        </span>
      </Link>
      <Link to="/login" className="splash-btn">
        Login
      </Link>
    </div>
  );
}