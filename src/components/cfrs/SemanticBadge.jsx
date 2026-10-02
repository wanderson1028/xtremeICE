import React from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

const TONES = {
  success: { color: "#0f9d58", bg: "#0f9d5814", icon: ShieldCheck },
  attempted: { color: "#b8860b", bg: "#b8860b14", icon: Clock },
  successful: { color: "#dc2626", bg: "#dc262614", icon: ShieldAlert },
  critical: { color: "#dc2626", bg: "#dc262614", icon: AlertTriangle },
  high: { color: "#ea580c", bg: "#ea580c14", icon: AlertTriangle },
  medium: { color: "#b8860b", bg: "#b8860b14", icon: AlertTriangle },
  low: { color: "#404040", bg: "#40404014", icon: AlertTriangle },
  info: { color: "#404040", bg: "#40404014", icon: CheckCircle2 },
  neutral: { color: "#404040", bg: "#40404014", icon: XCircle },
};

export default function SemanticBadge({ tone = "neutral", children, icon: OverrideIcon }) {
  const t = TONES[tone] || TONES.neutral;
  const Icon = OverrideIcon || t.icon;
  return (
    <span className="sg-badge" style={{ color: t.color, background: t.bg, borderColor: `${t.color}40` }}>
      <Icon style={{ width: 12, height: 12 }} />
      {children}
    </span>
  );
}