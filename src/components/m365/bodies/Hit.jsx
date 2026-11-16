import React from "react";

/**
 * One simulated UI element that reports interactions to the lab engine.
 * A plain click is a selection (navigation); `commit` marks an element that
 * performs an operation, such as a send button or a filter checkbox.
 */
export default function Hit({
  id,
  className = "",
  selected = false,
  children,
  click,
  context,
  menu,
  commit = false,
  title,
}) {
  return (
    <div
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        if (click) click(id, { commit });
      }}
      onContextMenu={
        menu
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              context(id, menu, event);
            }
          : (event) => event.stopPropagation()
      }
      className={`${className} ${selected ? "bg-sky-100/80 outline outline-1 -outline-offset-1 outline-sky-500" : ""}`}
    >
      {children}
    </div>
  );
}

/** Small status strip drawn at the bottom of a simulated app body. */
export function BodyStatus({ left, right }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-[#e1dfdd] bg-[#f3f2f1] px-3 py-[3px] text-[9px] text-[#605e5c]">
      <span className="truncate">{left}</span>
      <span className="truncate">{right}</span>
    </div>
  );
}