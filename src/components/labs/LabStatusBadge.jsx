import React from "react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  draft:     { label: "Draft",      className: "bg-gray-700 text-gray-300 border-0" },
  review:    { label: "In Review",  className: "bg-yellow-900/60 text-yellow-300 border-0" },
  published: { label: "Published",  className: "bg-green-900/60 text-green-300 border-0" },
  archived:  { label: "Archived",   className: "bg-gray-800 text-gray-500 border-0" },
};

export default function LabStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return <Badge className={config.className}>{config.label}</Badge>;
}