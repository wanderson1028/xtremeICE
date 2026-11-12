import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

const LOGO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0a5a90473fac0aa3ea135/6a3fbf99a_XtremeICED52aR00aP01ZL-Hoover.png";

const HERO_IMAGE =
  "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/1836c306c_generated_ae415d9c.jpg";

export default function SplashHero() {
  return (
    <>
      <div
        className="splash-enter flex justify-center pt-[34px]"
        style={{ animationDelay: ".2s" }}
      >
        <img src={LOGO} alt="Xtreme I.C.E." className="splash-logo" />
      </div>

      <div className="mt-[18px] grid items-center gap-14 lg:grid-cols-[1fr_600px]">
        <div>
          <p
            className="splash-enter flex items-center gap-3 text-[13px] font-extrabold uppercase tracking-[0.22em] text-[#00D7C5]"
            style={{ animationDelay: ".3s" }}
          >
            <span className="block h-0.5 w-9 bg-[#00D7C5]" />
            Cybersecurity Training
          </p>

          <h1
            className="splash-enter mt-[18px] text-[64px] font-black leading-none tracking-[-0.045em] text-[#F7F9FC] [text-shadow:0_0_40px_rgba(0,215,197,0.35)] sm:text-[88px] xl:text-[112px]"
            style={{ animationDelay: ".4s" }}
          >
            Xtreme I.C.E.
          </h1>

          <p
            className="splash-enter mt-[22px] text-[15px] font-extrabold uppercase leading-[1.5] tracking-[0.18em] text-[#C90032] [text-shadow:0_0_18px_rgba(201,0,50,0.5)]"
            style={{ animationDelay: ".55s" }}
          >
            Hands-On Cyber Range &amp; SOC Training
          </p>

          <p
            className="splash-enter mt-5 max-w-[560px] text-[19px] leading-[1.6] text-[#F7F9FC]/80"
            style={{ animationDelay: ".7s" }}
          >
            Design enterprise network infrastructure, run live SOC and SIEM investigations, and
            prove capability with scored assessments, from first requirement to Eve-NG deployment.
          </p>

          <div className="splash-enter mt-[30px]" style={{ animationDelay: ".85s" }}>
            <Link to="/login" className="splash-btn">
              Login
              <ArrowRight strokeWidth={2.4} />
            </Link>
          </div>
        </div>

        <div className="splash-enter relative" style={{ animationDelay: ".5s" }}>
          <div className="splash-scene relative overflow-hidden rounded-[32px] border border-[#00D7C5]/40 bg-white/5 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.7),0_0_60px_rgba(0,215,197,0.18),inset_0_1px_rgba(255,255,255,0.2)]">
            <img
              src={HERO_IMAGE}
              alt="Layered 3D network scene"
              className="block aspect-[4/3] w-full object-cover"
            />
            <div className="splash-sweep" aria-hidden="true" />
          </div>
          <div className="splash-shield absolute bottom-[44px] left-[-30px] flex h-[78px] w-[78px] items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,#e0003a,#C90032)] shadow-[0_18px_36px_rgba(201,0,50,0.5),inset_0_1px_rgba(255,255,255,0.35)]">
            <ShieldCheck className="h-[38px] w-[38px] text-white" strokeWidth={1.8} />
          </div>
        </div>
      </div>
    </>
  );
}