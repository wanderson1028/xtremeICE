import React from "react";

export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="sg-panel flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "#0ea5c714", border: "1px solid #0ea5c740", color: "#0EA5C7" }}
        >
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="sg-micro mt-4" style={{ color: "#2A2F3A" }}>
        {title}
      </div>
      {message && <p className="sg-body mt-2 max-w-sm" style={{ color: "#6b7280" }}>{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}