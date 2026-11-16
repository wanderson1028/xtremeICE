import React, { useEffect, useRef, useState } from "react";
import { MenuList } from "./M365Menu";

/** App-chrome button that owns a small dropdown (compose box, channel header, settings). */
export default function M365MenuButton({
  label,
  icon: Icon,
  items,
  onPress,
  onChoose,
  placement = "down",
  align = "left",
  className = "",
  buttonClassName = "",
  title,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hasMenu = Boolean(items?.length);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        title={title || label}
        onClick={(event) => {
          event.stopPropagation();
          if (onPress) onPress();
          if (hasMenu) setOpen((value) => !value);
        }}
        onContextMenu={(event) => event.preventDefault()}
        className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-[#424242] transition-colors hover:bg-black/10 ${buttonClassName}`}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label ? <span className="whitespace-nowrap">{label}</span> : null}
      </button>
      {open && hasMenu ? (
        <MenuList
          items={items}
          placement={placement}
          align={align}
          onChoose={(item) => {
            setOpen(false);
            if (onChoose) onChoose(item);
          }}
        />
      ) : null}
    </div>
  );
}