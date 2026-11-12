import React, { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { getBreadcrumbTrail } from "@/lib/breadcrumbTrail";

// Site-wide location trail: shows the section path of the current page and
// links back to each parent that has a page of its own.
export default function AppBreadcrumb() {
  const { pathname } = useLocation();
  const trail = getBreadcrumbTrail(pathname);

  if (!trail.length) return null;

  return (
    <div className="border-b border-red-900/30 bg-gray-900/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-0.5 py-2 text-[11px] leading-4">
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
                    {crumb.label}
                  </span>
                ) : crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-semibold uppercase tracking-[0.12em] text-gray-300 transition-colors hover:bg-red-950/50 hover:text-white"
                  >
                    {index === 0 && <LayoutDashboard className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />}
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {index === 0 && <LayoutDashboard className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />}
                    {crumb.label}
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