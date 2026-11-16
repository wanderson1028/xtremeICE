import React from "react";

const KIND_STYLE = {
  application_test: {
    label: "Application Test",
    cls: "bg-blue-900/30 border-blue-700/40 text-blue-400",
  },
  hands_on: {
    label: "Hands-on Labs",
    cls: "bg-amber-900/30 border-amber-700/40 text-amber-400",
  },
};

export default function AssessmentCell({ assessment }) {
  if (!assessment) {
    return (
      <p className="text-gray-400 text-[10px] italic truncate">
        Assessment unavailable
      </p>
    );
  }

  const kind = KIND_STYLE[assessment.assessment_kind] || KIND_STYLE.hands_on;
  const name = assessment.title || assessment.position_title || "—";

  return (
    <div className="min-w-0">
      <p className="text-gray-100 text-xs font-medium truncate" title={name}>
        {name}
      </p>
      <div className="flex items-center gap-1.5 mt-1 min-w-0">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${kind.cls}`}>
          {kind.label}
        </span>
        {assessment.assessment_type && (
          <span className="text-gray-400 text-[10px] truncate" title={assessment.assessment_type}>
            {assessment.assessment_type}
          </span>
        )}
      </div>
    </div>
  );
}