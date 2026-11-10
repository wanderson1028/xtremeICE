/** Excel — simulated ribbon, worksheet targets and scored tasks (fictitious data). */
import { Sigma, DollarSign, Percent, Merge, WrapText, BarChart3, RefreshCw } from "lucide-react";

export const ROW_MENU = [
  { id: "insert-rows", label: "Insert" },
  { id: "delete-rows", label: "Delete" },
  { id: "row-height", label: "Row Height…", opens: true },
  { id: "hide-rows", label: "Hide" },
  { id: "format-cells", label: "Format Cells…", opens: true },
];

export const COLUMN_MENU = [
  { id: "column-insert", label: "Insert" },
  { id: "column-delete", label: "Delete" },
  { id: "column-width", label: "Column Width…", opens: true },
  { id: "column-hide", label: "Hide" },
  { id: "column-format", label: "Format Cells…", opens: true },
];

/** Applies any committed operation to the worksheet state. */
export function reduceExcel(state, action) {
  const next = { ...state };
  const target = action.targetId || null;
  const column = target && target.startsWith("excel-col-") ? target.slice(-1).toUpperCase() : null;

  if (action.type === "control") {
    if (action.controlId === "merge") next.merged = target;
    if (action.controlId === "autosum") next.autosumColumn = target;
    if (action.controlId === "percent") next.percentColumn = column;
    if (action.controlId === "wrap") next.wrapped = target;
  }
  if (action.type === "option") {
    if (action.controlId === "column-chart") next.chart = action.optionId;
    if (action.controlId === "currency") {
      next.currencyFormat = action.optionId;
      next.currencyColumn = column;
    }
    if (action.controlId === "freeze") next.frozen = action.optionId;
    if (action.controlId === "cells-insert") next.insertedCellRange = action.optionId;
    if (action.controlId === "cells-delete") next.deletedCellRange = action.optionId;
    if (action.controlId === "print-orientation") next.printOrientation = action.optionId;
  }
  if (action.type === "menu") {
    if (action.itemId === "insert-rows") next.insertedRowAbove = target;
    if (action.itemId === "delete-rows") next.deletedRow = target;
    if (action.itemId === "column-insert") next.insertedColumnAt = target;
    if (action.itemId === "column-delete") next.deletedColumn = target;
    if (action.itemId === "hide-rows") next.hiddenRow = target;
  }
  return next;
}

export const excelApp = {
  id: "excel",
  name: "Excel",
  accent: "#217346",
  windowTitle: "Q4_Budget.xlsx — Excel",
  variant: "sheet",
  reduce: reduceExcel,
  defaults: {
    chart: null,
    insertedRowAbove: null,
    currencyFormat: null,
    currencyColumn: null,
    frozen: null,
    merged: null,
    autosumColumn: null,
  },
  tabs: [
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "clipboard", label: "Clipboard", controls: [{ id: "paste", label: "Paste" }] },
        { id: "number", label: "Number", controls: [
          { id: "currency", label: "Currency", icon: DollarSign, menu: [
            { id: "currency-usd", label: "$ English (United States)" },
            { id: "currency-eur", label: "€ Euro (€ 123)" },
            { id: "currency-pct", label: "Percentage" },
          ] },
          { id: "percent", label: "%", icon: Percent },
        ] },
        { id: "alignment", label: "Alignment", controls: [
          { id: "merge", label: "Merge & Center", icon: Merge, commits: true },
          { id: "wrap", label: "Wrap Text", icon: WrapText },
        ] },
        { id: "cells", label: "Cells", controls: [
          { id: "cells-insert", label: "Insert", menu: [
            { id: "insert-sheet-rows", label: "Insert Sheet Rows" },
            { id: "insert-sheet-columns", label: "Insert Sheet Columns" },
            { id: "insert-sheet", label: "Insert Sheet" },
          ] },
          { id: "cells-delete", label: "Delete", menu: [
            { id: "delete-sheet-rows", label: "Delete Sheet Rows" },
            { id: "delete-sheet-columns", label: "Delete Sheet Columns" },
          ] },
          { id: "cells-format", label: "Format", menu: [
            { id: "format-row-height", label: "Row Height…", opens: true },
            { id: "format-cell-format", label: "Format Cells…", opens: true },
          ] },
        ] },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      groups: [
        { id: "tables", label: "Tables", controls: [
          { id: "pivottable", label: "PivotTable" },
          { id: "table", label: "Table" },
        ] },
        { id: "charts", label: "Charts", controls: [
          { id: "column-chart", label: "Column", icon: BarChart3, menu: [
            { id: "cluster", label: "Clustered Column" },
            { id: "stacked", label: "Stacked Column" },
            { id: "clustered-bar", label: "Clustered Bar" },
          ] },
          { id: "line-chart", label: "Line" },
          { id: "pie-chart", label: "Pie" },
        ] },
      ],
    },
    {
      id: "page-layout",
      label: "Page Layout",
      groups: [
        { id: "themes", label: "Themes", controls: [{ id: "themes-btn", label: "Themes" }] },
        { id: "page-setup", label: "Page Setup", controls: [
          { id: "print-orientation", label: "Orientation", menu: [
            { id: "print-portrait", label: "Portrait" },
            { id: "print-landscape", label: "Landscape" },
          ] },
          { id: "print-area", label: "Print Area" },
          { id: "print-titles", label: "Print Titles" },
        ] },
      ],
    },
    {
      id: "formulas",
      label: "Formulas",
      groups: [
        { id: "library", label: "Function Library", controls: [
          { id: "autosum", label: "AutoSum", icon: Sigma, size: "lg", commits: true },
          { id: "insert-function", label: "Insert Function", opens: true },
        ] },
        { id: "calculation", label: "Calculation", controls: [
          { id: "calculate-now", label: "Calculate Now", icon: RefreshCw },
        ] },
        { id: "names", label: "Defined Names", controls: [{ id: "name-manager", label: "Name Manager", opens: true }] },
      ],
    },
    {
      id: "data",
      label: "Data",
      groups: [
        { id: "sort-filter", label: "Sort & Filter", controls: [
          { id: "sort-az", label: "Sort A → Z" },
          { id: "sort-za", label: "Sort Z → A" },
          { id: "filter", label: "Filter" },
        ] },
        { id: "data-tools", label: "Data Tools", controls: [
          { id: "text-to-columns", label: "Text to Columns", opens: true },
          { id: "remove-duplicates", label: "Remove Duplicates", opens: true },
        ] },
      ],
    },
    {
      id: "review",
      label: "Review",
      groups: [
        { id: "comments", label: "Comments", controls: [
          { id: "new-comment", label: "New Comment" },
          { id: "protect-sheet", label: "Protect Sheet" },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "workbook-views", label: "Workbook Views", controls: [
          { id: "page-layout-view", label: "Page Layout" },
          { id: "page-break", label: "Page Break Preview" },
        ] },
        { id: "window", label: "Window", controls: [
          { id: "freeze", label: "Freeze Panes", menu: [
            { id: "freeze-top", label: "Freeze Top Row" },
            { id: "freeze-first", label: "Freeze First Column" },
            { id: "unfreeze", label: "Unfreeze Panes" },
          ] },
          { id: "new-window", label: "New Window" },
        ] },
      ],
    },
  ],
  questions: [
    {
      id: "excel-q1",
      /* Insert tab, Column gallery, Clustered Column. */
      minClicks: 3,
      task: "Compare the quarterly totals visually by adding a clustered column chart to the sheet.",
      answers: [{ kind: "option", control: "column-chart", option: "cluster" }],
      verify: (state) => state.chart === "cluster",
      explanation:
        "Charts live on the Insert tab. The Column button opens the chart gallery, and Clustered Column inserts the chart.",
    },
    {
      id: "excel-q2",
      /* Right-click the Marketing row header, then Insert. */
      minClicks: 2,
      task: "Insert a blank row directly above the Marketing line so a new department can be added.",
      answers: [{ kind: "menu", target: "excel-row-marketing", item: "insert-rows" }],
      verify: (state) => state.insertedRowAbove === "excel-row-marketing",
      explanation:
        "Right-clicking a row number opens the row context menu. Insert adds a blank row above the row you targeted.",
    },
    {
      id: "excel-q3",
      /* Select column E, Currency gallery (Home), $ English (US). */
      minClicks: 3,
      task: "Format the Q4 figures as US dollars: select column E, then apply the built-in $ format.",
      answers: [
        { kind: "option", control: "currency", option: "currency-usd", target: "excel-col-e" },
      ],
      verify: (state) => state.currencyFormat === "currency-usd" && state.currencyColumn === "E",
      explanation:
        "The number format applies to the selected range, so the Q4 column is selected before the Currency gallery is used.",
    },
    {
      id: "excel-q4",
      /* View tab, Freeze Panes menu, Freeze Top Row. */
      minClicks: 3,
      task: "Keep the header row visible while scrolling through the rest of the budget.",
      answers: [{ kind: "option", control: "freeze", option: "freeze-top" }],
      verify: (state) => state.frozen === "freeze-top",
      explanation: "Freeze Panes sits on the View tab; Freeze Top Row pins the header row in place.",
    },
    {
      id: "excel-q5",
      /* Select the title cell, then Merge & Center (Home). */
      minClicks: 2,
      task: "Center the report title across the whole width of the table: select the title cell, then merge A1 through E1.",
      answers: [{ kind: "control", control: "merge", target: "excel-cell-a1" }],
      verify: (state) => state.merged === "excel-cell-a1",
      explanation:
        "Merge & Center joins the cells of the current selection into one centered cell, so the title cell is selected first.",
    },
    {
      id: "excel-q6",
      /* Select column D, Formulas tab, AutoSum. */
      minClicks: 3,
      task: "Total the Q3 column without typing a formula: select column D, then use AutoSum.",
      answers: [{ kind: "control", control: "autosum", target: "excel-col-d" }],
      verify: (state) => state.autosumColumn === "excel-col-d",
      explanation:
        "AutoSum in the Function Library reads the selected column and writes the SUM formula below the range.",
    },
  ],
};