import React from "react";

const LOGO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0a5a90473fac0aa3ea135/6a3fbf99a_XtremeICED52aR00aP01ZL-Hoover.png";

export default function BrandMark({ className = "h-11 w-11", radius = "rounded-[13px]" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#151515] shadow-[0_8px_18px_rgba(21,21,21,0.25)] ${radius} ${className}`}
    >
      <img src={LOGO} alt="Xtreme I.C.E." className="h-full w-full object-contain" />
    </span>
  );
}