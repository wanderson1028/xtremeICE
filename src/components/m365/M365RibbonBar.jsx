import React, { useEffect, useRef, useState } from "react";
import { MenuList } from "./M365Menu";

function RibbonControl({ control, open, onPress, onChoose, onToggle }) {
  const Icon = control.icon;
  const large = control.size === "lg";

  const base =
    "flex items-center justify-center rounded-sm border border-transparent text-[#3b3a39] transition-colors hover:border-[#c8c6c4] hover:bg-[#f3f2f1]";
  const shape = large
    ? "h-[46px] w-[52px] flex-col gap-1 px-1"
    : control.gallery
    ? "h-[34px] w-[54px] flex-col justify-center gap-[1px] px-1 text-[8px]"
    : "h-[24px] gap-1 px-1.5 text-[10px]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onPress(control);
          if (control.menu?.length) onToggle(control.id);
        }}
        onContextMenu={(event) => event.preventDefault()}
        className={`${base} ${shape} ${open ? "border-[#c8c6c4] bg-[#edebe9]" : ""}`}
      >
        {control.gallery ? (
          <span className="font-serif text-[12px] leading-none text-[#2b579a]">AaBbCc</span>
        ) : Icon ? (
          <Icon className={large ? "h-4 w-4" : "h-3 w-3"} />
        ) : null}
        <span className={large ? "text-[8px] leading-tight" : "truncate"}>{control.label}</span>
      </button>
      {open && control.menu?.length ? (
        <MenuList
          items={control.menu}
          onChoose={(item) => {
            onChoose(control, item);
            onToggle(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Tab strip plus ribbon (or the SharePoint command bar) for one simulated app. */
export default function M365RibbonBar({ app, activeTabId, onTab, onAction }) {
  const [openControl, setOpenControl] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!openControl) return undefined;
    const close = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) setOpenControl(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openControl]);

  const press = (control) => onAction({ type: "control", controlId: control.id });
  const choose = (control, item) =>
    onAction({ type: "option", controlId: control.id, optionId: item.id });

  if (app.commandBar) {
    return (
      <div
        ref={barRef}
        className="flex shrink-0 items-center gap-1 border-b border-[#e1dfdd] bg-white px-2 py-1.5"
      >
        {app.commandBar.map((control) => (
          <RibbonControl
            key={control.id}
            control={{ ...control, size: "lg" }}
            open={openControl === control.id}
            onPress={press}
            onChoose={choose}
            onToggle={setOpenControl}
          />
        ))}
        <span className="ml-auto pr-1 text-[9px] uppercase tracking-wide text-[#8a8886]">Security Operations</span>
      </div>
    );
  }

  const tabs = app.tabs || [];
  if (!tabs.length) return null;
  const active = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  return (
    <div ref={barRef} className="shrink-0 border-b border-[#e1dfdd] bg-white">
      <div className="flex items-end gap-[2px] bg-[#f3f2f1] px-2 pt-1">
        {tabs.map((tab) => {
          const isActive = active?.id === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenControl(null);
                onTab(tab.id);
              }}
              className={`rounded-t-[3px] border border-b-0 px-2.5 py-[3px] text-[10px] transition-colors ${
                isActive
                  ? "border-[#e1dfdd] bg-white font-semibold text-[#201f1e]"
                  : "border-transparent text-[#605e5c] hover:bg-white/70"
              }`}
              style={isActive ? { boxShadow: `inset 0 2px 0 ${app.accent}` } : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex h-[62px] items-stretch gap-2 overflow-x-auto px-2 py-1">
        {(active?.groups || []).map((group) => (
          <div
            key={group.id}
            className="flex shrink-0 flex-col justify-between border-r border-[#e1dfdd] pr-2 last:border-r-0 last:pr-0"
          >
            <div className="flex items-start gap-[2px]">
              {group.controls.map((control) => (
                <RibbonControl
                  key={control.id}
                  control={control}
                  open={openControl === control.id}
                  onPress={press}
                  onChoose={choose}
                  onToggle={setOpenControl}
                />
              ))}
            </div>
            <span className="truncate text-center text-[8px] uppercase tracking-wide text-[#8a8886]">
              {group.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}