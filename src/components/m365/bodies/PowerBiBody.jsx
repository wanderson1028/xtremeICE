import React from "react";
import { Database, Check } from "lucide-react";
import Hit, { BodyStatus } from "./Hit";
import { VISUAL_MENU } from "@/lib/m365/powerbi";

const REGIONS = [
  { id: "pbi-filter-amer", label: "AMER", value: 38 },
  { id: "pbi-filter-emea", label: "EMEA", value: 24 },
  { id: "pbi-filter-apac", label: "APAC", value: 17 },
];

const RECORDS = [
  { region: "AMER", control: "MFA coverage below target", findings: 14 },
  { region: "AMER", control: "Privileged access not reviewed", findings: 12 },
  { region: "AMER", control: "Log retention under 90 days", findings: 12 },
  { region: "EMEA", control: "MFA coverage below target", findings: 9 },
  { region: "EMEA", control: "Unpatched internet-facing hosts", findings: 8 },
  { region: "EMEA", control: "Backup restore untested", findings: 7 },
  { region: "APAC", control: "Unpatched internet-facing hosts", findings: 10 },
  { region: "APAC", control: "Shared admin accounts in use", findings: 7 },
];

export default function PowerBiBody({ state, ui = {}, selectedId, click, context }) {
  const filtersOpen = Boolean(state.filtersPane || ui.filtersPane);
  const filtered = state.region === "all" ? REGIONS : REGIONS.filter((r) => r.label === state.region);
  const max = Math.max(...REGIONS.map((r) => r.value));
  const totalFindings = state.refreshed ? 82 : 79;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f3f2f1]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#e1dfdd] bg-white px-2 py-1">
        <span className="text-[10px] font-semibold text-[#201f1e]">Security Posture Report</span>
        <span className="rounded-sm bg-[#f2c811]/30 px-1.5 py-[1px] text-[8px] text-[#201f1e]">
          {state.region === "all" ? "All regions" : `Filtered: ${state.region}`}
        </span>
        <span className="ml-auto text-[8px] text-[#605e5c]">
          Last refreshed: {state.refreshed ? "just now" : "today 06:00"}
        </span>
      </div>

      {state.published ? (
        <div className="shrink-0 border-b border-[#107c10]/30 bg-[#dff6dd] px-2 py-[3px] text-[8px] text-[#0f5132]">
          Published to Security Operations workspace · 10:12 AM
        </div>
      ) : null}
      {state.sqlConnected ? (
        <div className="flex shrink-0 items-center gap-1 border-b border-[#e1dfdd] bg-white px-2 py-[3px] text-[8px] text-[#3b3a39]">
          <Database className="h-2.5 w-2.5 text-[#605e5c]" />
          SQL Server · NORTHWIND-SQL01 · Connected
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 p-2">
          <Hit
            id="pbi-visual-1"
            click={click}
            context={context}
            menu={VISUAL_MENU}
            selected={selectedId === "pbi-visual-1"}
            className="min-h-0 flex-1 cursor-default rounded-sm border border-[#e1dfdd] bg-white p-1.5"
            title="Right-click for visual options"
          >
            <div className="text-[8px] font-semibold text-[#201f1e]">Findings by region</div>
            <div className="mt-1 flex h-[calc(100%-14px)] items-end gap-3 px-1">
              {filtered.map((region) => (
                <div key={region.id} className="flex h-full flex-1 flex-col items-center justify-end gap-[2px]">
                  <span className="text-[8px] tabular-nums text-[#605e5c]">{region.value}</span>
                  <div
                    className="w-full rounded-t-sm bg-[#118dff]"
                    style={{ height: `${Math.round((region.value / max) * 82)}%` }}
                  />
                  <span className="text-[8px] text-[#605e5c]">{region.label}</span>
                </div>
              ))}
            </div>
          </Hit>

          <div className="flex h-[34%] shrink-0 gap-1.5">
            <div className="flex flex-1 flex-col justify-center rounded-sm border border-[#e1dfdd] bg-white px-2">
              <div className="text-[8px] uppercase tracking-wide text-[#605e5c]">Open findings</div>
              <div className="text-[16px] font-semibold leading-tight tabular-nums text-[#201f1e]">
                {totalFindings}
              </div>
              <div className="text-[8px] text-[#107c10]">
                {state.refreshed ? "+3 since last refresh" : "no change today"}
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center rounded-sm border border-[#e1dfdd] bg-white px-2">
              <div className="text-[8px] uppercase tracking-wide text-[#605e5c]">Controls at risk</div>
              <div className="text-[16px] font-semibold leading-tight tabular-nums text-[#201f1e]">11</div>
              <div className="text-[8px] text-[#8a8886]">across 3 regions</div>
            </div>
          </div>

          {state.records ? (
            <div className="absolute inset-x-2 bottom-2 top-2 z-10 overflow-hidden rounded-sm border border-[#c8c6c4] bg-white shadow-[0_8px_22px_rgba(0,0,0,0.25)]">
              <div className="flex items-center border-b border-[#e1dfdd] px-2 py-1">
                <span className="text-[9px] font-semibold text-[#201f1e]">See records — Findings by region</span>
                <span className="ml-auto text-[8px] text-[#8a8886]">8 rows</span>
              </div>
              <div className="grid grid-cols-[70px_minmax(0,1fr)_70px] border-b border-[#e1dfdd] bg-[#faf9f8] text-[8px] font-semibold text-[#3b3a39]">
                <div className="px-2 py-[2px]">Region</div>
                <div className="px-2 py-[2px]">Control</div>
                <div className="px-2 py-[2px] text-right">Findings</div>
              </div>
              {RECORDS.map((row, index) => (
                <div
                  key={`${row.region}-${index}`}
                  className="grid grid-cols-[70px_minmax(0,1fr)_70px] border-b border-[#f3f2f1] text-[8px] text-[#3b3a39]"
                >
                  <div className="px-2 py-[2px]">{row.region}</div>
                  <div className="truncate px-2 py-[2px]">{row.control}</div>
                  <div className="px-2 py-[2px] text-right tabular-nums">{row.findings}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {filtersOpen ? (
          <aside className="w-[30%] shrink-0 border-l border-[#e1dfdd] bg-white px-2 py-1.5">
            <div className="text-[9px] font-semibold text-[#201f1e]">Filters</div>
            <div className="mt-1 text-[8px] uppercase tracking-wide text-[#8a8886]">Region</div>
            {REGIONS.map((region) => (
              <Hit
                key={region.id}
                id={region.id}
                click={click}
                selected={state.region === region.label}
                className="mt-[2px] flex cursor-default items-center gap-1 rounded px-1 py-[2px] text-[9px] text-[#3b3a39]"
              >
                <span
                  className={`flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-[2px] border ${
                    state.region === region.label
                      ? "border-[#118dff] bg-[#118dff] text-white"
                      : "border-[#c8c6c4] bg-white"
                  }`}
                >
                  {state.region === region.label ? <Check className="h-2 w-2" /> : null}
                </span>
                {region.label}
              </Hit>
            ))}
          </aside>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 border-t border-[#e1dfdd] bg-white px-2 py-[2px] text-[9px]">
        <span className="rounded-t-sm border border-[#c8c6c4] border-b-0 bg-white px-2 py-[1px] font-semibold text-[#201f1e]">
          Page 1
        </span>
        {state.page2 ? (
          <span className="rounded-t-sm border border-transparent px-2 py-[1px] text-[#605e5c]">Page 2</span>
        ) : null}
        <span className="px-1 text-[#605e5c]">＋</span>
      </div>

      <BodyStatus
        left={`Report view · ${filtersOpen ? "filters pane open" : "filters pane closed"}`}
        right="Power BI Desktop (simulated)"
      />
    </div>
  );
}