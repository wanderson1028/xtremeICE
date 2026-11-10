import React from "react";

/* Windows-style context menu shown on right-click over a control that supports one. */
export default function M365ContextMenu({ menu, onSelect, onClose }) {
  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        className="absolute z-30 w-[38%] min-w-[130px] max-w-[190px] overflow-hidden rounded-sm border border-[#c8c6c4] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.28)]"
        style={{ left: `${menu.x}%`, top: `${menu.y}%` }}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="truncate px-2 pb-1 text-[8px] font-semibold uppercase tracking-wide text-[#8a8886]">
          {menu.title}
        </div>
        {menu.items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="block w-full truncate px-2.5 py-[3px] text-left text-[10px] text-[#201f1e] transition-colors hover:bg-[#e8f1fb]"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}