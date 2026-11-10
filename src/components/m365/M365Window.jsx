import React, { useRef, useState } from "react";
import { menuItemAction } from "@/lib/m365/actions";
import { MenuList } from "./M365Menu";
import M365MenuButton from "./M365MenuButton";
import M365Dialog from "./M365Dialog";
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

/**
 * Simulated application window: title bar, ribbon, body, dialogs and context
 * menus. Every interaction is reported with the current selection and whether
 * it is a commit (an operation) or navigation (opening UI).
 */
export default function M365Window({ app, state, locked, onAction }) {
  const [activeTabId, setActiveTabId] = useState(app.defaultTab || app.tabs?.[0]?.id || null);
  const [selected, setSelected] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [uiFlags, setUiFlags] = useState({});
  const [dialog, setDialog] = useState(null);
  const shellRef = useRef(null);

  const emit = (action) => {
    if (locked) return;
    if (action.type === "control") {
      const control = (app.tabs || [])
        .flatMap((tab) => tab.groups.flatMap((group) => group.controls))
        .concat(app.commandBar || [], app.titleActions || [], app.controls || [])
        .find((item) => item.id === action.controlId);
      if (control?.ui) setUiFlags((prev) => ({ ...prev, [control.ui]: !prev[control.ui] }));
    }
    if (action.dialog) {
      const definition = app.dialogs?.[action.dialog];
      if (definition) setDialog({ id: action.dialog, definition });
    }
    onAction(action);
  };

  const click = (targetId, extra) => {
    setSelected(targetId);
    emit({ type: "click", targetId, commit: Boolean(extra?.commit) });
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
    const item = contextMenu?.items?.find((entry) => entry.id === itemId) || { id: itemId };
    setContextMenu(null);
    emit(menuItemAction({ type: "menu", targetId, itemId }, item));
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
              onPress={() =>
                emit({ type: "control", controlId: action.id, commit: false, targetId: selected })
              }
              onChoose={(item) =>
                emit(
                  menuItemAction(
                    { type: "option", controlId: action.id, targetId: selected },
                    item
                  )
                )
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

      <M365RibbonBar
        app={app}
        activeTabId={activeTabId}
        selected={selected}
        onTab={pressTab}
        onAction={emit}
      />

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

      {dialog ? (
        <M365Dialog
          dialog={dialog.definition}
          onCancel={() => setDialog(null)}
          onConfirm={(value) => {
            const dialogId = dialog.id;
            setDialog(null);
            emit({ type: "confirm", dialogId, value, targetId: selected, commit: true });
          }}
        />
      ) : null}
    </div>
  );
}