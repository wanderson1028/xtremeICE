import React from "react";
import { ChevronRight, Gauge } from "lucide-react";

// Breadcrumb trail for CFRS pages. `crumbs` is an ordered list of { label, href? }.
// The last crumb is rendered as the current page (no link).
export default function CFRSBreadcrumb({ crumbs }) {
  return (
    <nav aria-label="CFRS navigation" className="sg-enter mb-4 flex flex-wrap items-center gap-1 text-xs">
      <span className="sg-micro flex items-center gap-1.5" style={{ color: "#b91c1c" }}>
        <Gauge className="h-3.5 w-3.5" /> Capital Intelligence
      </span>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "#737373" }} />
            {crumb.href && !isLast ? (
              <a href={crumb.href} className="font-medium transition-colors hover:underline" style={{ color: "#404040" }}>
                {crumb.label}
              </a>
            ) : (
              <span className="font-semibold" style={{ color: "#000000" }}>{crumb.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}