import React from "react";
import { demoUserForRole } from "./demoUsers";

/**
 * Renders the demo user's logo/avatar for a given company + response-team role.
 * Returns null when no demo user maps to that role (non-demo organizations).
 */
export default function DemoUserAvatar({ company, role, size = 24, className = "" }) {
  const user = demoUserForRole(company, role);
  if (!user) return null;
  return (
    <img
      src={user.avatar_url}
      alt={user.full_name}
      title={`${user.full_name} · ${role}`}
      className={`rounded-full object-cover ring-2 ring-slate-700/70 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}