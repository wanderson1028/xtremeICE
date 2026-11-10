import React from "react";

/** Presentational dropdown used by ribbon menus, command bars and body buttons. */
export function MenuList({ items, onChoose, placement = "down", width = "w-48", align = "left" }) {
  return (
    <div
      role="menu"
      onClick={(event) => event.stopPropagation()}
      className={`absolute z-40 max-h-56 overflow-y-auto rounded-sm border border-[#c8c6c4] bg-white py-1 shadow-[0_6px_18px_rgba(0,0,0,0.22)] ${width} ${
        align === "right" ? "right-0" : "left-0"
      } ${placement === "up" ? "bottom-full mb-1" : "top-full mt-[2px]"}`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              onChoose(item);
            }}
            className="flex w-full items-center gap-2 whitespace-nowrap px-2.5 py-[5px] text-left text-[11px] text-[#201f1e] transition-colors hover:bg-[#e8f1fb]"
          >
            {Icon ? <Icon className="h-3 w-3 shrink-0 text-[#605e5c]" /> : null}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}