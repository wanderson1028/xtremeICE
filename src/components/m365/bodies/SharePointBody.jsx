import React, { useState } from "react";
import { FileText, FolderOpen, Presentation } from "lucide-react";
import Hit, { BodyStatus } from "./Hit";
import { MenuList } from "../M365Menu";
import { ITEM_MENU, SORT_MENU } from "@/lib/m365/sharepoint";

const BASE_FILES = [
  {
    id: "sp-row-policy",
    name: "Q4_Security_Policy.docx",
    icon: FileText,
    modified: "Nov 8, 09:14",
    by: "Dana Whitfield",
    stamp: 8.1,
  },
  {
    id: "sp-row-ir-plan",
    name: "Incident_Response_Plan.pptx",
    icon: Presentation,
    modified: "Nov 6, 16:02",
    by: "Marcus Lee",
    stamp: 6.16,
  },
  {
    id: "sp-row-vendor",
    name: "Vendor_Renewal_Tracker.xlsx",
    icon: FileText,
    modified: "Nov 5, 11:38",
    by: "Priya Raman",
    stamp: 5.11,
  },
  {
    id: "sp-row-notes",
    name: "Tabletop_Notes_Oct.docx",
    icon: FileText,
    modified: "Nov 1, 08:20",
    by: "Dana Whitfield",
    stamp: 1.08,
  },
];

export default function SharePointBody({ state, selectedId, click, context, choose }) {
  const [sortMenu, setSortMenu] = useState(false);

  let items = [...BASE_FILES];
  if (state.uploaded) {
    items.unshift({
      id: "sp-row-upload",
      name: "Q4_Report.pdf",
      icon: FileText,
      modified: "just now",
      by: "You",
      stamp: 99,
    });
  }
  if (state.folder) {
    items.unshift({
      id: "sp-row-folder",
      name: "Q4 Evidence",
      icon: FolderOpen,
      modified: "just now",
      by: "You",
      stamp: 98,
    });
  }
  if (state.sorting === "newest") items = items.sort((a, b) => b.stamp - a.stamp);

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-[22%] shrink-0 flex-col gap-1 border-r border-[#e1dfdd] bg-[#faf9f8] px-2 py-2 text-[9px] text-[#3b3a39] sm:flex">
        <div className="font-semibold uppercase tracking-wide text-[#605e5c]">Quick access</div>
        <div className="rounded px-1.5 py-[3px] hover:bg-white">Security Operations</div>
        {state.pinned ? (
          <div className="rounded bg-white px-1.5 py-[3px] shadow-sm">Vendor_Renewal_Tracker.xlsx</div>
        ) : null}
        <div className="mt-2 font-semibold uppercase tracking-wide text-[#605e5c]">Recent</div>
        <div className="px-1.5 py-[3px]">Q4_Security_Policy.docx</div>
        <div className="px-1.5 py-[3px]">Incident_Response_Plan.pptx</div>
        <div className="mt-2 font-semibold uppercase tracking-wide text-[#605e5c]">Shared with me</div>
        <div className="px-1.5 py-[3px]">Tabletop_Notes_Oct.docx</div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-[#e1dfdd] px-3 py-1 text-[9px] text-[#605e5c]">
          <span>Security Operations</span>
          <span>›</span>
          <span>Documents</span>
          <span className="ml-auto">{items.length} items</span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] border-b border-[#e1dfdd] bg-[#faf9f8] text-[9px] font-semibold text-[#3b3a39]">
            <div className="px-3 py-[5px]">Name</div>
            <div className="relative border-l border-[#e1dfdd] px-3 py-[5px]">
              <Hit
                id="sp-col-modified"
                click={(id) => {
                  click(id);
                  setSortMenu(true);
                }}
                selected={selectedId === "sp-col-modified"}
                className="cursor-pointer"
                title="Click to sort"
              >
                Modified {state.sorting === "newest" ? "▼" : ""}
              </Hit>
              {sortMenu ? (
                <MenuList
                  items={SORT_MENU}
                  onChoose={(item) => {
                    setSortMenu(false);
                    choose("sp-col-modified", item.id);
                  }}
                />
              ) : null}
            </div>
            <div className="border-l border-[#e1dfdd] px-3 py-[5px]">Modified by</div>
          </div>

          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Hit
                key={item.id}
                id={item.id}
                click={click}
                context={context}
                menu={ITEM_MENU}
                selected={selectedId === item.id}
                className="grid cursor-default grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] border-b border-[#f3f2f1] text-[9px] text-[#201f1e]"
              >
                <div className="flex items-center gap-1.5 px-3 py-[5px]">
                  <Icon className="h-3 w-3 shrink-0 text-[#036c70]" />
                  <span className="truncate">{item.name}</span>
                </div>
                <div className="truncate border-l border-[#f3f2f1] px-3 py-[5px] text-[#605e5c]">
                  {item.modified}
                </div>
                <div className="truncate border-l border-[#f3f2f1] px-3 py-[5px] text-[#605e5c]">
                  {item.by}
                </div>
              </Hit>
            );
          })}
        </div>

        <BodyStatus
          left={`${items.length} items · sorted by ${state.sorting === "newest" ? "Modified (newest first)" : "Name"}`}
          right="Documents · SharePoint"
        />
      </div>

      {state.sharing ? (
        <aside className="hidden w-[26%] shrink-0 border-l border-[#e1dfdd] bg-white px-2.5 py-2 md:block">
          <div className="text-[10px] font-semibold text-[#201f1e]">Manage access</div>
          <div className="mt-1 text-[9px] text-[#605e5c]">Q4_Security_Policy.docx</div>
          <div className="mt-2 space-y-1 text-[9px]">
            <div className="flex items-center justify-between rounded border border-[#e1dfdd] px-1.5 py-1">
              <span>Audit Team</span>
              <span className="text-[#605e5c]">Can view</span>
            </div>
            <div className="flex items-center justify-between rounded border border-[#e1dfdd] px-1.5 py-1">
              <span>Priya Raman</span>
              <span className="text-[#605e5c]">Can edit</span>
            </div>
          </div>
          <button type="button" className="mt-2 w-full rounded bg-[#036c70] py-1 text-[9px] font-semibold text-white">
            Send
          </button>
        </aside>
      ) : null}

      {state.versions ? (
        <aside className="hidden w-[26%] shrink-0 border-l border-[#e1dfdd] bg-white px-2.5 py-2 md:block">
          <div className="text-[10px] font-semibold text-[#201f1e]">Version history</div>
          <div className="mt-1 text-[9px] text-[#605e5c]">Incident_Response_Plan.pptx</div>
          {[
            { v: "2.0", when: "Nov 6, 16:02 · Marcus Lee" },
            { v: "1.0", when: "Oct 24, 10:41 · Dana Whitfield" },
          ].map((row) => (
            <div key={row.v} className="mt-2 rounded border border-[#e1dfdd] px-1.5 py-1 text-[9px]">
              <div className="font-semibold">Version {row.v}</div>
              <div className="text-[#605e5c]">{row.when}</div>
            </div>
          ))}
        </aside>
      ) : null}
    </div>
  );
}