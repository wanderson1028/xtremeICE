import React from "react";

export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="sg-panel flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "#b91c1c14", border: "1px solid #b91c1c40", color: "#b91c1c" }}
        >
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="sg-micro mt-4" style={{ color: "#171717" }}>
        {title}
      </div>
      {message && <p className="sg-body mt-2 max-w-sm" style={{ color: "#404040" }}>{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}