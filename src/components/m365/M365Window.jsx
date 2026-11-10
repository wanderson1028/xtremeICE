import React, { useRef, useState } from "react";
import { findControl } from "@/lib/m365";
import { MenuList } from "./M365Menu";
import M365MenuButton from "./M365MenuButton";
import M365RibbonBar from "./M365RibbonBar";
import WordBody from "./bodies/WordBody";
import ExcelBody from "./bodies/ExcelBody";
import SharePointBody from "./bodies/SharePointBody";
import OutlookBody from "./bodies/OutlookBody";
import TeamsBody from "./bodies/TeamsBody";
import PowerBiBody from "./bodies/PowerBiBody";

const BODIES = {
  word: WordBody,
  sheet: ExcelBody,
  library: SharePointBody,
  mail: OutlookBody,
  chat: TeamsBody,
  report: PowerBiBody,
};

/** Simulated application window: title bar, ribbon, body, and right-click menus. */
export default function M365Window({ app, state, locked, onAction }) {
  const [activeTabId, setActiveTabId] = useState(app.defaultTab || app.tabs?.[0]?.id || null);
  const [selected, setSelected] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [uiFlags, setUiFlags] = useState({});
  const shellRef = useRef(null);

  const emit = (action) => {
    if (locked) return;
    if (action.type === "control") {
      const control = findControl(app, action.controlId);
      if (control?.ui) {
        setUiFlags((prev) => ({ ...prev, [control.ui]: !prev[control.ui] }));
      }
    }
    onAction(action);
  };

  const click = (targetId) => {
    setSelected(targetId);
    emit({ type: "click", targetId });
  };

  const context = (targetId, items, event) => {
    setSelected(targetId);
    const rect = shellRef.current?.getBoundingClientRect();
    if (rect) {
      setContextMenu({
        x: Math.max(4, Math.min(event.clientX - rect.left, rect.width - 190)),
        y: Math.max(4, Math.min(event.clientY - rect.top, rect.height - 170)),
        targetId,
        items,
      });
    } else {
      setContextMenu({ x: 12, y: 60, targetId, items });
    }
    emit({ type: "context", targetId });
  };

  const choose = (targetId, itemId) => {
    setContextMenu(null);
    emit({ type: "menu", targetId, itemId });
  };

  const pressTab = (tabId) => {
    if (tabId === activeTabId) return;
    setActiveTabId(tabId);
    emit({ type: "tab", tabId });
  };

  const Body = BODIES[app.variant] || WordBody;

  return (
    <div
      ref={shellRef}
      onClick={() => setContextMenu(null)}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-gray-700 bg-white shadow-[0_18px_44px_-12px_rgba(0,0,0,0.55)]"
    >
      {/* Title bar */}
      <div
        className="flex shrink-0 items-center gap-2 px-2.5 py-1.5"
        style={{ backgroundColor: app.accent, color: app.titleInk || "#ffffff" }}
      >
        <span className="h-2 w-2 rounded-sm bg-white/70" />
        <span className="truncate text-[10px] font-semibold">{app.windowTitle}</span>
        <div className="ml-auto flex items-center gap-1">
          {app.titleActions?.map((action) => (
            <M365MenuButton
              key={action.id}
              label=""
              icon={action.icon}
              items={action.menu}
              align="right"
              buttonClassName="text-white/90 hover:bg-white/20"
              onPress={() => emit({ type: "control", controlId: action.id })}
              onChoose={(item) =>
                emit({ type: "option", controlId: action.id, optionId: item.id })
              }
              title={action.label}
            />
          ))}
          <span className="ml-1 flex items-center gap-2 opacity-80">
            <span className="h-[2px] w-2.5 bg-current" />
            <span className="h-2 w-2 border border-current" />
            <span className="text-[9px]">×</span>
          </span>
        </div>
      </div>

      <M365RibbonBar app={app} activeTabId={activeTabId} onTab={pressTab} onAction={emit} />

      <div className="flex min-h-0 flex-1 flex-col">
        <Body
          state={state}
          ui={uiFlags}
          selectedId={selected}
          click={click}
          context={context}
          choose={choose}
          press={emit}
        />
      </div>

      {state.notice ? (
        <div
          className="flex shrink-0 items-center gap-1.5 border-t px-2.5 py-[3px] text-[8.5px]"
          style={{ borderColor: `${app.accent}40`, backgroundColor: `${app.accent}14`, color: "#3b3a39" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: app.accent }} />
          <span className="truncate">{state.notice}</span>
        </div>
      ) : null}

      {contextMenu ? (
        <>
          <div
            className="absolute inset-0 z-20"
            onClick={() => setContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="absolute z-30"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <MenuList
              items={contextMenu.items}
              onChoose={(item) => choose(contextMenu.targetId, item.id)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}