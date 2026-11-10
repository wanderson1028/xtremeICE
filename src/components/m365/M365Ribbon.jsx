import React from "react";

/* Decorative ribbon groups to the right of the interactive ribbon buttons. */
const GROUPS = {
  word: ["Styles", "Editing"],
  excel: ["Number", "Cells", "Editing"],
  outlook: ["Tags", "Find", "Send"],
  powerbi: ["Data", "Model", "Insert"],
};

export default function M365Ribbon({ app }) {
  const groups = GROUPS[app.id];
  if (!groups) return null;

  return (
    <div
      className="pointer-events-none absolute flex items-stretch gap-2"
      style={{ left: "52%", right: "2%", top: "14.4%", height: "10%" }}
    >
      {groups.map((group) => (
        <div
          key={group}
          className="flex flex-1 flex-col justify-between border-r border-[#e1dfdd] pr-2 last:border-r-0 last:pr-0"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[13px] w-[13px] rounded-sm border border-[#d0cecc] bg-[#f3f2f1]" />
            ))}
          </div>
          <span className="truncate text-[7px] text-[#8a8886]">{group}</span>
        </div>
      ))}
    </div>
  );
}