import React from "react";
import Hit, { BodyStatus } from "./Hit";
import { ROW_MENU, COLUMN_MENU } from "@/lib/m365/excel";

const COLUMNS = [
  { id: "excel-col-a", letter: "A" },
  { id: "excel-col-b", letter: "B" },
  { id: "excel-col-c", letter: "C" },
  { id: "excel-col-d", letter: "D" },
  { id: "excel-col-e", letter: "E" },
];
const HEADERS = ["Department", "Q1", "Q2", "Q3", "Q4"];

const DEPARTMENTS = [
  { id: "excel-row-soc", label: "SOC Monitoring", values: [41200, 43800, 45150, 47200] },
  { id: "excel-row-threat", label: "Threat Intel", values: [18600, 19200, 20400, 21100] },
  { id: "excel-row-marketing", label: "Marketing", values: [9200, 8800, 10450, 11200] },
  { id: "excel-row-compliance", label: "Compliance", values: [15400, 16100, 15900, 16800] },
  { id: "excel-row-contractors", label: "Contractors", values: [7300, 8100, 7700, 8400] },
];

const money = (value) => `$${value.toLocaleString("en-US")}`;
const plain = (value) => value.toLocaleString("en-US");
const GRID = "grid grid-cols-[26px_repeat(5,minmax(0,1fr))] items-stretch";

export default function ExcelBody({ state, selectedId, click, context }) {
  const rows = [];
  DEPARTMENTS.forEach((dept) => {
    if (state.insertedRow && dept.id === "excel-row-marketing") {
      rows.push({ id: "excel-row-new", label: "", values: null });
    }
    rows.push(dept);
  });

  const totals = [0, 1, 2, 3].map((col) =>
    DEPARTMENTS.reduce((sum, dept) => sum + dept.values[col], 0)
  );

  const cellClass = "border-b border-r border-[#e1dfdd] px-1.5 py-[3px] text-[9px] text-[#201f1e]";
  const frozenMark = state.frozen ? "border-b-2 border-b-[#217346]" : "border-b border-b-[#c8c6c4]";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Column letters */}
        <div className={`${GRID} shrink-0 bg-[#f3f2f1] text-[9px] text-[#605e5c]`}>
          <div className="border-b border-r border-[#d0cecc]" />
          {COLUMNS.map((column) => (
            <Hit
              key={column.id}
              id={column.id}
              click={click}
              context={context}
              menu={COLUMN_MENU}
              selected={selectedId === column.id}
              className="cursor-default border-b border-r border-[#d0cecc] py-[2px] text-center font-semibold text-[#3b3a39]"
            >
              {column.letter}
            </Hit>
          ))}
        </div>

        {/* Title row (row 1) */}
        <div className={`${GRID} shrink-0`}>
          <div className="border-b border-r border-[#d0cecc] bg-[#f3f2f1] py-[3px] text-center text-[9px] text-[#605e5c]">
            1
          </div>
          {state.merged ? (
            <Hit
              id="excel-cell-a1"
              click={click}
              selected={selectedId === "excel-cell-a1"}
              className="col-span-5 cursor-default border-b border-r border-[#d0cecc] bg-[#f0f6f0] px-2 py-[3px] text-center text-[10px] font-semibold text-[#0f5132]"
            >
              Q4 Budget — Security Operations
            </Hit>
          ) : (
            <>
              <Hit
                id="excel-cell-a1"
                click={click}
                selected={selectedId === "excel-cell-a1"}
                className="cursor-default truncate border-b border-r border-[#d0cecc] px-1.5 py-[3px] text-[10px] font-semibold text-[#201f1e]"
              >
                Q4 Budget — Security Operations
              </Hit>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="border-b border-r border-[#e1dfdd]" />
              ))}
            </>
          )}
        </div>

        {/* Header row (row 2) */}
        <div className={`${GRID} shrink-0 bg-[#f3f2f1]`}>
          <div className={`border-r border-[#d0cecc] py-[3px] text-center text-[9px] text-[#605e5c] ${frozenMark}`}>
            2
          </div>
          {HEADERS.map((header) => (
            <div
              key={header}
              className={`${cellClass} ${frozenMark} font-semibold ${state.frozen ? "bg-[#e4f2e8]" : ""}`}
            >
              {header}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {rows.map((row, index) => (
          <div key={row.id} className={`${GRID} shrink-0`}>
            <Hit
              id={row.id}
              click={click}
              context={context}
              menu={ROW_MENU}
              selected={selectedId === row.id}
              className="cursor-default border-b border-r border-[#d0cecc] bg-[#f3f2f1] py-[3px] text-center text-[9px] text-[#605e5c]"
            >
              {index + 3}
            </Hit>
            {row.values ? (
              <>
                <div className={`${cellClass} truncate`}>{row.label}</div>
                {row.values.map((value, col) => (
                  <div key={col} className={`${cellClass} truncate text-right tabular-nums`}>
                    {state.currency && col === 3 ? money(value) : plain(value)}
                  </div>
                ))}
              </>
            ) : (
              <div className="col-span-5 border-b border-r border-[#e1dfdd] bg-[#fffdf5] px-2 py-[3px] text-[9px] italic text-[#8a8886]">
                new row
              </div>
            )}
          </div>
        ))}

        {/* AutoSum total row */}
        {state.autosum ? (
          <div className={`${GRID} shrink-0 bg-[#e4f2e8]`}>
            <div className="border-b border-r border-[#d0cecc] py-[3px] text-center text-[9px] font-semibold text-[#3b3a39]">
              {rows.length + 3}
            </div>
            <div className={`${cellClass} font-semibold`}>Total</div>
            {totals.map((total, col) => (
              <div
                key={col}
                className={`${cellClass} text-right font-semibold tabular-nums ${
                  col === 2 ? "bg-[#217346]/15 text-[#0f5132]" : ""
                }`}
              >
                {state.currency && col === 3 ? money(total) : plain(total)}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Inserted chart */}
      {state.chart ? (
        <div className="mt-1 shrink-0 border-t border-[#e1dfdd] px-3 pb-1 pt-1.5">
          <div className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-[#605e5c]">
            Quarterly spend by department — clustered column
          </div>
          <svg viewBox="0 0 320 54" className="h-[52px] w-full">
            {[0, 1, 2, 3].map((group) => (
              <g key={group} transform={`translate(${8 + group * 78},0)`}>
                {DEPARTMENTS.map((dept, deptIndex) => {
                  const height = Math.round(dept.values[group] / 1400);
                  return (
                    <rect
                      key={dept.id}
                      x={deptIndex * 5.6}
                      y={44 - height}
                      width={4.4}
                      height={height}
                      rx={0.6}
                      fill={["#217346", "#4fa06b", "#8fc9a6", "#b7ddc4", "#dfeee5"][deptIndex]}
                    />
                  );
                })}
              </g>
            ))}
            <line x1="0" y1="44" x2="320" y2="44" stroke="#c8c6c4" strokeWidth="0.6" />
            {HEADERS.slice(1).map((label, index) => (
              <text key={label} x={30 + index * 78} y={52} fontSize="5.5" fill="#605e5c" textAnchor="middle">
                {label}
              </text>
            ))}
          </svg>
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-1 border-t border-[#e1dfdd] bg-[#f3f2f1] px-2 py-[2px] text-[9px]">
        <span className="rounded-t-sm border border-[#c8c6c4] border-b-0 bg-white px-2 py-[1px] font-semibold text-[#0f5132]">
          Budget
        </span>
        <span className="px-2 py-[1px] text-[#605e5c]">Forecast</span>
        <span className="px-2 py-[1px] text-[#605e5c]">Variance</span>
        <span className="px-1 text-[#605e5c]">＋</span>
      </div>

      <BodyStatus
        left={`Ready · ${state.frozen ? "2 rows frozen" : "no frozen panes"}`}
        right={`${state.currency ? "$ English (United States)" : "General"} · 100%`}
      />
    </div>
  );
}