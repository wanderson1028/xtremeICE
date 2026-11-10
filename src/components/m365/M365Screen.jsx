import React, { useState } from "react";
import { appTargets } from "@/lib/m365Assessment";
import M365ContextMenu from "./M365ContextMenu";
import M365Ribbon from "./M365Ribbon";
import {
  DocumentBody, SheetBody, LibraryBody, MailBody, ChatBody, ReportBody,
} from "./M365Bodies";

const BODIES = {
  document: DocumentBody,
  sheet: SheetBody,
  library: LibraryBody,
  mail: MailBody,
  chat: ChatBody,
  report: ReportBody,
};

const BARE = new Set(["row", "rowhead", "column", "visual"]);
const BASE = "absolute flex items-center justify-center gap-1 overflow-hidden text-[10px] leading-none";

function targetClass(target) {
  switch (target.kind) {
    case "tab":
      return `${BASE} font-medium text-[#3b3a39] hover:bg-black/5`;
    case "ribbon":
      return `${BASE} flex-col gap-[3px] rounded-sm text-[#3b3a39] hover:bg-black/5`;
    case "titlebar":
      return `${BASE} rounded bg-white/25 hover:bg-white/40`;
    case "tool":
      return `${BASE} rounded border border-[#d0cecc] bg-white font-medium text-[#3b3a39] shadow-sm hover:bg-[#f3f2f1]`;
    case "field":
      return `${BASE} justify-start rounded-full border border-[#c8c6c4] bg-white px-2 text-[#8a8886]`;
    case "pane":
      return `${BASE} flex-col items-start justify-start gap-[5px] border-l border-[#e1dfdd] bg-white px-2 pt-2 text-[#3b3a39]`;
    case "rowhead":
      return `${BASE} hover:bg-sky-500/25`;
    case "column":
      return `${BASE} hover:bg-sky-500/15`;
    case "row":
      return `${BASE} hover:bg-sky-500/10`;
    case "visual":
      return `${BASE} hover:bg-sky-500/5 hover:outline hover:outline-1 hover:outline-sky-400`;
    default:
      return BASE;
  }
}

function TargetContent({ target }) {
  if (BARE.has(target.kind)) return null;

  if (target.kind === "pane") {
    return (
      <>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#605e5c]">{target.label}</span>
        <span className="h-[3px] w-full rounded-sm bg-[#e1dfdd]" />
        <span className="h-[3px] w-4/5 rounded-sm bg-[#e1dfdd]" />
        <span className="h-[3px] w-3/5 rounded-sm bg-[#e1dfdd]" />
      </>
    );
  }

  const Icon = target.icon;
  return (
    <>
      {Icon ? <Icon className="h-[11px] w-[11px] shrink-0" /> : null}
      <span className="truncate">{target.label}</span>
    </>
  );
}

function Ring({ rect, tone }) {
  const border = tone === "correct" ? "border-emerald-500 bg-emerald-400/20" : "border-red-500 bg-red-500/20";
  return (
    <div
      className={`pointer-events-none absolute rounded border-2 ${border}`}
      style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
    />
  );
}

function hitTest(targets, x, y) {
  const hits = targets.filter((t) => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h);
  if (!hits.length) return null;
  return hits.sort((a, b) => a.w * a.h - b.w * b.h)[0];
}

export default function M365Screen({ app, revealId, wrongId, revealed, flash, onAction }) {
  const targets = appTargets(app);
  const [menu, setMenu] = useState(null);
  const [selected, setSelected] = useState(null);

  const hasTabs = app.tabs.length > 0;
  const showRibbon = hasTabs && app.ribbon !== false;
  const showCommandBar = hasTabs && app.ribbon === false;
  const bodyTop = !hasTabs ? 7.5 : showRibbon ? 25.8 : 21;
  const Body = BODIES[app.variant] || DocumentBody;

  const pointFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleClick = (event) => {
    const point = pointFromEvent(event);
    if (!point) return;
    const hit = hitTest(targets, point.x, point.y);
    if (hit?.selectable) setSelected(hit.id);
    onAction({ type: "click", targetId: hit ? hit.id : null });
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    const point = pointFromEvent(event);
    if (!point) return;
    const hit = hitTest(targets, point.x, point.y);
    if (!hit?.menu) {
      setMenu(null);
      return;
    }
    if (hit.selectable) setSelected(hit.id);
    setMenu({
      title: hit.label,
      items: hit.menu,
      targetId: hit.id,
      x: Math.min(point.x, 66),
      y: Math.min(point.y, 72),
    });
    onAction({ type: "context", targetId: hit.id });
  };

  const selectedTarget = selected ? targets.find((t) => t.id === selected) : null;
  const correctRect = revealed ? targets.find((t) => t.id === revealId) : null;
  const wrongRect = revealed && wrongId && wrongId !== revealId ? targets.find((t) => t.id === wrongId) : null;

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className="relative aspect-[16/10] w-full cursor-default select-none overflow-hidden rounded-xl border border-gray-700 bg-white"
    >
      {/* Title bar */}
      <div
        className="absolute inset-x-0 top-0 flex h-[7%] items-center"
        style={{ backgroundColor: app.accent, color: app.titleInk || "#ffffff" }}
      >
        <span className="ml-[8%] truncate text-[11px] font-semibold">{app.windowTitle}</span>
        <span className="ml-auto mr-[4%] flex items-center gap-3 opacity-80">
          <span className="h-[2px] w-2.5 bg-current" />
          <span className="h-2 w-2 border border-current" />
          <span className="text-[9px]">×</span>
        </span>
      </div>

      {/* Tab strip */}
      {hasTabs && <div className="absolute inset-x-0 bg-[#f3f2f1]" style={{ top: "7%", height: "6.2%" }} />}

      {/* Ribbon or command bar */}
      {showRibbon && (
        <div
          className="absolute inset-x-0 border-b border-[#e1dfdd] bg-white"
          style={{ top: "13.2%", height: `${bodyTop - 13.2}%` }}
        />
      )}
      {showCommandBar && (
        <div
          className="absolute inset-x-0 border-b border-[#e1dfdd] bg-white"
          style={{ top: "13.2%", height: `${bodyTop - 13.2}%` }}
        />
      )}

      <Body top={bodyTop} app={app} />
      {showRibbon && <M365Ribbon app={app} />}

      {targets.map((target) => (
        <div
          key={target.id}
          className={targetClass(target)}
          style={{
            left: `${target.x}%`,
            top: `${target.y}%`,
            width: `${target.w}%`,
            height: `${target.h}%`,
          }}
        >
          <TargetContent target={target} />
        </div>
      ))}

      {selectedTarget?.band && (
        <div
          className="pointer-events-none absolute border-y border-sky-500/70 bg-sky-500/15"
          style={{
            left: `${selectedTarget.band.x}%`,
            width: `${selectedTarget.band.w}%`,
            top: `${selectedTarget.y}%`,
            height: `${selectedTarget.h}%`,
          }}
        />
      )}
      {selectedTarget && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-sky-500/80"
          style={{
            left: `${selectedTarget.x}%`,
            top: `${selectedTarget.y}%`,
            width: `${selectedTarget.w}%`,
            height: `${selectedTarget.h}%`,
          }}
        />
      )}

      {correctRect && <Ring rect={correctRect} tone="correct" />}
      {wrongRect && <Ring rect={wrongRect} tone="wrong" />}

      {menu && (
        <M365ContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onSelect={(item) => {
            setMenu(null);
            onAction({ type: "menu", itemId: item.id, targetId: menu.targetId });
          }}
        />
      )}

      {flash && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div
            className={`rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-xl ${
              flash === "correct" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {flash === "correct" ? "Task complete" : "Not quite"}
          </div>
        </div>
      )}
    </div>
  );
}