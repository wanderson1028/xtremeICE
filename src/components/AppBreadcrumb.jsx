import React, { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { getBreadcrumbTrail } from "@/lib/breadcrumbTrail";

// Section-level trail labels are translated; page-specific names (product,
// certification and lab titles) stay in their source form.
const SECTION_KEYS = {
  Dashboard: "dashboard",
  Design: "design",
  Training: "training",
  Collaboration: "collaboration",
  "Capital Intelligence": "capitalIntelligence",
  Administration: "administration",
  Assessments: "assessments",
  "Course Lab Builder": "labBuilder",
  "Live Fire": "liveFire",
  "MSSP SOC & SIEM": "mssp",
};

// Site-wide location trail: shows the section path of the current page and
// links back to each parent that has a page of its own.
export default function AppBreadcrumb() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const trail = getBreadcrumbTrail(pathname);

  if (!trail.length) return null;

  const labelFor = (crumb) => (SECTION_KEYS[crumb.label] ? t(`routes.${SECTION_KEYS[crumb.label]}`) : crumb.label);

  return (
    <div className="sticky top-20 z-40 border-b border-red-900/30 bg-gray-900/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label={t("a11y.breadcrumb")} className="flex flex-wrap items-center gap-0.5 py-2 text-[11px] leading-4">
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-red-500/60" aria-hidden="true" />}
                {isLast ? (
                  <span
                    aria-current="page"
                    className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-semibold text-white"
                  >
                    {labelFor(crumb)}
                  </span>
                ) : crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-semibold uppercase tracking-[0.12em] text-gray-300 transition-colors hover:bg-red-950/50 hover:text-white"
                  >
                    {index === 0 && <LayoutDashboard className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />}
                    {labelFor(crumb)}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {index === 0 && <LayoutDashboard className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />}
                    {labelFor(crumb)}
                  </span>
                )}
              </Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
}