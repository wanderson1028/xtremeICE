import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SplashNav from "@/components/splash/SplashNav";
import SplashHero from "@/components/splash/SplashHero";
import SplashFeatures from "@/components/splash/SplashFeatures";
import SplashCapabilities from "@/components/splash/SplashCapabilities";
import SplashCta from "@/components/splash/SplashCta";
import SplashFooter from "@/components/splash/SplashFooter";

export default function Splash() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    base44.auth
      .me()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch((err) => {
        const status = err?.status || err?.response?.status;
        if (status && status !== 401) throw err;
      });
    return () => {
      active = false;
    };
  }, []);

  // Signed-in visitors go straight into the platform.
  if (user) return <Navigate to="/Home" replace />;

  return (
    <div className="splash relative min-h-screen overflow-hidden px-6 pb-20 sm:px-12 lg:px-24">
      <div className="splash-grid" aria-hidden="true" />
      <div className="splash-glow-a" aria-hidden="true" />
      <div className="splash-glow-b" aria-hidden="true" />
      <div className="splash-glow-c" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1257px]">
        <SplashNav />
        <SplashHero />
        <SplashFeatures />
        <SplashCapabilities />
        <SplashCta />
        <SplashFooter />
      </div>
    </div>
  );
}