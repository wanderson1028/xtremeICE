import React from "react";

export function SkeletonLine({ width = "100%", height = 12, className = "" }) {
  return <div className={`sg-skeleton ${className}`} style={{ width, height }} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="sg-panel p-4">
      <SkeletonLine width="40%" height={10} />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} height={11} />
        ))}
      </div>
    </div>
  );
}

export default function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  );
}