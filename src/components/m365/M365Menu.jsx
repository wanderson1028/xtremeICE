import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * Presentational dropdown used by ribbon menus, command bars and body buttons.
 *
 * The list is fixed-positioned and measured against the viewport, so no
 * ancestor's overflow, scroll container or clipping window can hide it: the
 * whole menu is drawn above the application window and every item is reachable
 * without scrolling the page. Only a menu taller than the viewport itself
 * scrolls internally.
 */
export function MenuList({ items, onChoose, placement = "down", align = "left", minWidth = 200 }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const anchor = menuRef.current?.parentElement;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const box = menuRef.current;
    const width = Math.max(minWidth, box?.offsetWidth || 0);
    const height = box?.offsetHeight || 0;
    const margin = 8;

    let left = align === "right" ? rect.right - width : rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    let top = placement === "up" ? rect.top - height - 2 : rect.bottom + 2;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 2);
    if (top < margin) top = margin;

    setPos({ left, top, minWidth, maxHeight: window.innerHeight - margin * 2 });
  }, [items, placement, align, minWidth]);

  return (
    <div
      ref={menuRef}
      role="menu"
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        minWidth: pos?.minWidth ?? minWidth,
        maxHeight: pos?.maxHeight,
        visibility: pos ? "visible" : "hidden",
      }}
      className="z-[100] overflow-y-auto rounded-sm border border-[#c8c6c4] bg-white py-1 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
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
            <span className="flex-1 truncate">{item.label}</span>
            {item.opens ? <span className="pl-3 text-[10px] text-[#a19f9d]">›</span> : null}
          </button>
        );
      })}
    </div>
  );
}