import React from "react";
import BrandMark from "@/components/BrandMark";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children, brand }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          {brand ? (
            <div className="flex flex-col items-center">
              <BrandMark className="h-16 w-16" radius="rounded-2xl" />
              <span className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-foreground">
                Xtreme I.C.E.
              </span>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#c90032]">
                Cyber Range &amp; Security Operations Training
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
          )}
          <h1 className={`text-3xl font-bold tracking-tight text-foreground ${brand ? "mt-6" : ""}`}>
            {title}
          </h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}