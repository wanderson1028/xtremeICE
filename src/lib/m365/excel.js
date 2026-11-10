/** Excel — simulated ribbon, worksheet targets and scored tasks (fictitious data). */
import { Sigma, DollarSign, Percent, Merge, WrapText, BarChart3, RefreshCw } from "lucide-react";

export const ROW_MENU = [
  { id: "insert-rows", label: "Insert" },
  { id: "delete-rows", label: "Delete" },
  { id: "row-height", label: "Row Height…" },
  { id: "hide-rows", label: "Hide" },
  { id: "format-cells", label: "Format Cells…" },
];

export const COLUMN_MENU = [
  { id: "column-insert", label: "Insert" },
  { id: "column-delete", label: "Delete" },
  { id: "column-width", label: "Column Width…" },
  { id: "column-hide", label: "Hide" },
  { id: "column-format", label: "Format Cells…" },
];

export const excelApp = {
  id: "excel",
  name: "Excel",
  accent: "#217346",
  windowTitle: "Q4_Budget.xlsx — Excel",
  variant: "sheet",
  defaults: {
    currency: false,
    insertedRow: false,
    merged: false,
    frozen: false,
    chart: false,
    autosum: false,
    notice: "",
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
          { id: "merge", label: "Merge & Center", icon: Merge },
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
            { id: "format-row-height", label: "Row Height…" },
            { id: "format-cell-format", label: "Format Cells…" },
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
          { id: "autosum", label: "AutoSum", icon: Sigma, size: "lg" },
          { id: "insert-function", label: "Insert Function" },
        ] },
        { id: "calculation", label: "Calculation", controls: [
          { id: "calculate-now", label: "Calculate Now", icon: RefreshCw },
        ] },
        { id: "names", label: "Defined Names", controls: [{ id: "name-manager", label: "Name Manager" }] },
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
          { id: "text-to-columns", label: "Text to Columns" },
          { id: "remove-duplicates", label: "Remove Duplicates" },
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
      task: "Compare the quarterly totals visually by adding a clustered column chart to the sheet.",
      steps: [
        { do: "tab", tab: "insert" },
        { do: "control", control: "column-chart" },
        { do: "option", control: "column-chart", option: "cluster" },
      ],
      effect: { chart: true, notice: "Clustered column chart inserted" },
      explanation:
        "Charts live on the Insert tab. The Column button opens the chart gallery, and Clustered Column inserts the chart.",
    },
    {
      id: "excel-q2",
      task: "Insert a blank row directly above the Marketing line so a new department can be added.",
      steps: [
        { do: "context", target: "excel-row-marketing" },
        { do: "menu", target: "excel-row-marketing", item: "insert-rows" },
      ],
      effect: { insertedRow: true, notice: "Blank row inserted above Marketing" },
      explanation:
        "Right-clicking a row number opens the row context menu. Insert adds a blank row above the selected row and keeps formulas intact.",
    },
    {
      id: "excel-q3",
      task: "Format the Q4 figures as US dollars using the built-in currency format.",
      steps: [
        { do: "click", target: "excel-col-e" },
        { do: "control", control: "currency" },
        { do: "option", control: "currency", option: "currency-usd" },
      ],
      effect: { currency: true, notice: "Q4 range formatted as $ English (United States)" },
      explanation:
        "The column is selected first, then the Currency gallery on the Home tab applies the $ format to the whole range.",
    },
    {
      id: "excel-q4",
      task: "Keep the header row visible while scrolling through the rest of the budget.",
      steps: [
        { do: "tab", tab: "view" },
        { do: "control", control: "freeze" },
        { do: "option", control: "freeze", option: "freeze-top" },
      ],
      effect: { frozen: true, notice: "Top row frozen" },
      explanation: "Freeze Panes sits on the View tab; Freeze Top Row pins the header row in place.",
    },
    {
      id: "excel-q5",
      task: "Center the report title across the whole width of the table by merging A1 through E1.",
      steps: [
        { do: "click", target: "excel-cell-a1" },
        { do: "control", control: "merge" },
      ],
      effect: { merged: true, notice: "A1:E1 merged and centered" },
      explanation: "Merge & Center on the Home tab joins the selected cells into one centered cell.",
    },
    {
      id: "excel-q6",
      task: "Total the Q3 column without typing a formula.",
      steps: [
        { do: "click", target: "excel-col-d" },
        { do: "tab", tab: "formulas" },
        { do: "control", control: "autosum" },
      ],
      effect: { autosum: true, notice: "=SUM entered below the Q3 range" },
      explanation:
        "AutoSum in the Function Library reads the selected column and writes the SUM formula below the range.",
    },
  ],
};