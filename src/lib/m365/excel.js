/** Excel — simulated ribbon, worksheet targets and scored tasks (fictitious data). */
import {
  Sigma, DollarSign, Percent, Merge, WrapText, BarChart3, RefreshCw, Save, Printer,
  Scissors, Copy, ClipboardPaste, Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, Filter, ArrowUpDown, Search, Table, Image, Database, LineChart, PieChart,
  Calculator, Trash2, Columns, Share2, Download, Settings,
} from "lucide-react";

export const ROW_MENU = [
  { id: "cut-rows", label: "Cut" },
  { id: "copy-rows", label: "Copy" },
  { id: "paste-rows", label: "Paste" },
  { id: "insert-rows", label: "Insert" },
  { id: "delete-rows", label: "Delete" },
  { id: "row-height", label: "Row Height…", opens: true },
  { id: "hide-rows", label: "Hide" },
  { id: "format-cells", label: "Format Cells…", opens: true },
];

export const COLUMN_MENU = [
  { id: "cut-columns", label: "Cut" },
  { id: "copy-columns", label: "Copy" },
  { id: "paste-columns", label: "Paste" },
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
    if (action.controlId === "number-format") next.numberFormat = action.optionId;
  }
  if (action.type === "menu") {
    if (action.itemId === "insert-rows") next.insertedRowAbove = target;
    if (action.itemId === "delete-rows") next.deletedRow = target;
    if (action.itemId === "column-insert") next.insertedColumnAt = target;
    if (action.itemId === "column-delete") next.deletedColumn = target;
    if (action.itemId === "hide-rows") next.hiddenRow = target;
    if (action.itemId === "column-hide") next.hiddenColumn = target;
  }
  return next;
}

export const excelApp = {
  id: "excel",
  name: "Excel",
  accent: "#217346",
  windowTitle: "Q4_Budget.xlsx — Excel",
  variant: "sheet",
  defaultTab: "home",
  reduce: reduceExcel,
  defaults: {
    chart: null,
    insertedRowAbove: null,
    currencyFormat: null,
    currencyColumn: null,
    frozen: null,
    merged: null,
    autosumColumn: null,
    percentColumn: null,
    wrapped: null,
    numberFormat: null,
  },
  tabs: [
    {
      id: "file",
      label: "File",
      groups: [
        { id: "file-actions", label: "File", controls: [
          { id: "excel-save", label: "Save", icon: Save, size: "lg" },
          { id: "excel-save-as", label: "Save As" },
          { id: "excel-print", label: "Print", icon: Printer, menu: [
            { id: "excel-print-quick", label: "Print" },
            { id: "excel-print-preview", label: "Print Preview" },
            { id: "excel-print-setup", label: "Page Setup…", opens: true },
          ] },
          { id: "excel-export", label: "Export", icon: Download, menu: [
            { id: "excel-export-pdf", label: "Create PDF/XPS Document" },
            { id: "excel-export-csv", label: "Change File Type" },
          ] },
        ] },
        { id: "file-info", label: "Info", controls: [
          { id: "excel-protect", label: "Protect Workbook", menu: [
            { id: "excel-protect-encrypt", label: "Encrypt with Password", opens: true },
            { id: "excel-protect-structure", label: "Protect Workbook Structure" },
          ] },
          { id: "excel-share", label: "Share", icon: Share2 },
          { id: "excel-options", label: "Options", icon: Settings, opens: true },
        ] },
      ],
    },
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "clipboard", label: "Clipboard", controls: [
          { id: "paste", label: "Paste", icon: ClipboardPaste, size: "lg", menu: [
            { id: "paste-all", label: "Paste" },
            { id: "paste-formulas", label: "Formulas" },
            { id: "paste-values", label: "Values" },
            { id: "paste-formatting", label: "Formatting" },
            { id: "paste-transpose", label: "Transpose" },
            { id: "paste-special", label: "Paste Special…", opens: true },
          ] },
          { id: "cut", label: "Cut", icon: Scissors },
          { id: "copy", label: "Copy", icon: Copy },
          { id: "format-painter", label: "Format Painter" },
        ] },
        { id: "font", label: "Font", controls: [
          { id: "bold", label: "Bold", icon: Bold },
          { id: "italic", label: "Italic", icon: Italic },
          { id: "underline", label: "Underline", icon: Underline },
          { id: "borders", label: "Borders", menu: [
            { id: "borders-all", label: "All Borders" },
            { id: "borders-outside", label: "Outside Borders" },
            { id: "borders-thick", label: "Thick Box Border" },
            { id: "borders-none", label: "No Border" },
          ] },
          { id: "fill-color", label: "Fill Color", menu: [
            { id: "fill-yellow", label: "Yellow" },
            { id: "fill-green", label: "Light Green" },
            { id: "fill-none", label: "No Fill" },
          ] },
          { id: "font-color", label: "Font Color", menu: [
            { id: "font-color-red", label: "Red" },
            { id: "font-color-black", label: "Black" },
            { id: "font-color-blue", label: "Blue" },
          ] },
        ] },
        { id: "alignment", label: "Alignment", controls: [
          { id: "align-top", label: "Top Align", icon: AlignLeft },
          { id: "align-middle", label: "Middle Align" },
          { id: "align-left", label: "Align Left", icon: AlignLeft },
          { id: "align-center", label: "Center", icon: AlignCenter },
          { id: "align-right", label: "Align Right", icon: AlignRight },
          { id: "orientation-align", label: "Orientation", menu: [
            { id: "orientation-none", label: "Angle Counterclockwise" },
            { id: "orientation-clockwise", label: "Angle Clockwise" },
            { id: "orientation-vertical", label: "Vertical Text" },
          ] },
          { id: "wrap", label: "Wrap Text", icon: WrapText },
          { id: "merge", label: "Merge & Center", icon: Merge, commits: true, menu: [
            { id: "merge-and-center", label: "Merge & Center" },
            { id: "merge-across", label: "Merge Across" },
            { id: "merge-cells", label: "Merge Cells" },
            { id: "unmerge-cells", label: "Unmerge Cells" },
          ] },
        ] },
        { id: "number", label: "Number", controls: [
          { id: "number-format", label: "Number Format", menu: [
            { id: "format-general", label: "General" },
            { id: "format-number", label: "Number" },
            { id: "format-currency", label: "Currency" },
            { id: "format-accounting", label: "Accounting" },
            { id: "format-short-date", label: "Short Date" },
            { id: "format-long-date", label: "Long Date" },
            { id: "format-time", label: "Time" },
            { id: "format-percentage", label: "Percentage" },
            { id: "format-fraction", label: "Fraction" },
            { id: "format-scientific", label: "Scientific" },
            { id: "format-text", label: "Text" },
            { id: "format-more", label: "More Number Formats…", opens: true },
          ] },
          { id: "currency", label: "Currency", icon: DollarSign, menu: [
            { id: "currency-usd", label: "$ English (United States)" },
            { id: "currency-eur", label: "€ Euro (€ 123)" },
            { id: "currency-gbp", label: "£ English (United Kingdom)" },
            { id: "currency-jpy", label: "¥ Japanese (Japan)" },
            { id: "currency-accounting", label: "Accounting Number Format" },
            { id: "currency-more", label: "More Accounting Formats…", opens: true },
          ] },
          { id: "percent", label: "%", icon: Percent },
          { id: "comma-style", label: ",", icon: Calculator },
          { id: "decimal-increase", label: "Increase Decimal" },
          { id: "decimal-decrease", label: "Decrease Decimal" },
        ] },
        { id: "styles", label: "Styles", controls: [
          { id: "conditional-format", label: "Conditional Formatting", menu: [
            { id: "conditional-highlight", label: "Highlight Cells Rules" },
            { id: "conditional-top", label: "Top/Bottom Rules" },
            { id: "conditional-databars", label: "Data Bars" },
            { id: "conditional-colorscales", label: "Color Scales" },
            { id: "conditional-iconsets", label: "Icon Sets" },
            { id: "conditional-clear", label: "Clear Rules" },
          ] },
          { id: "format-as-table", label: "Format as Table", menu: [
            { id: "table-blue", label: "Blue, Table Style Medium 2" },
            { id: "table-green", label: "Green, Table Style Medium 4" },
            { id: "table-orange", label: "Orange, Table Style Medium 6" },
          ] },
          { id: "cell-styles", label: "Cell Styles", menu: [
            { id: "style-normal", label: "Normal" },
            { id: "style-good", label: "Good" },
            { id: "style-bad", label: "Bad" },
            { id: "style-neutral", label: "Neutral" },
            { id: "style-total", label: "Total" },
          ] },
        ] },
        { id: "cells", label: "Cells", controls: [
          { id: "cells-insert", label: "Insert", menu: [
            { id: "insert-sheet-rows", label: "Insert Sheet Rows" },
            { id: "insert-sheet-columns", label: "Insert Sheet Columns" },
            { id: "insert-cells", label: "Insert Cells…", opens: true },
            { id: "insert-sheet", label: "Insert Sheet" },
          ] },
          { id: "cells-delete", label: "Delete", menu: [
            { id: "delete-sheet-rows", label: "Delete Sheet Rows" },
            { id: "delete-sheet-columns", label: "Delete Sheet Columns" },
            { id: "delete-cells", label: "Delete Cells…", opens: true },
            { id: "delete-sheet", label: "Delete Sheet" },
          ] },
          { id: "cells-format", label: "Format", menu: [
            { id: "format-row-height", label: "Row Height…", opens: true },
            { id: "format-autofit-rows", label: "AutoFit Row Height" },
            { id: "format-column-width", label: "Column Width…", opens: true },
            { id: "format-autofit-columns", label: "AutoFit Column Width" },
            { id: "format-hide-rows", label: "Hide Rows" },
            { id: "format-hide-columns", label: "Hide Columns" },
            { id: "format-cell-format", label: "Format Cells…", opens: true },
            { id: "format-lock-cell", label: "Lock Cell" },
            { id: "format-protect-sheet", label: "Protect Sheet" },
          ] },
        ] },
        { id: "editing", label: "Editing", controls: [
          { id: "autosum-home", label: "AutoSum", icon: Sigma, commits: true },
          { id: "autosum-home-menu", label: "Σ", menu: [
            { id: "sum-auto", label: "Sum" },
            { id: "sum-average", label: "Average" },
            { id: "sum-count", label: "Count Numbers" },
            { id: "sum-max", label: "Max" },
            { id: "sum-min", label: "Min" },
            { id: "sum-more", label: "More Functions…", opens: true },
          ] },
          { id: "fill", label: "Fill", menu: [
            { id: "fill-down", label: "Down" },
            { id: "fill-right", label: "Right" },
            { id: "fill-series", label: "Series…", opens: true },
          ] },
          { id: "clear", label: "Clear", menu: [
            { id: "clear-all", label: "Clear All" },
            { id: "clear-formats", label: "Clear Formats" },
            { id: "clear-contents", label: "Clear Contents" },
          ] },
          { id: "sort-filter-home", label: "Sort & Filter", icon: Filter, menu: [
            { id: "sort-az-home", label: "Sort A → Z" },
            { id: "sort-za-home", label: "Sort Z → A" },
            { id: "sort-custom", label: "Custom Sort…", opens: true },
            { id: "toggle-filter", label: "Filter" },
          ] },
          { id: "find-select", label: "Find & Select", icon: Search, menu: [
            { id: "find-basic", label: "Find…", opens: true },
            { id: "replace-cells", label: "Replace…", opens: true },
            { id: "go-to", label: "Go To…", opens: true },
            { id: "select-formulas", label: "Go To Special…", opens: true },
          ] },
        ] },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      groups: [
        { id: "tables", label: "Tables", controls: [
          { id: "pivottable", label: "PivotTable", icon: Table, size: "lg", menu: [
            { id: "pivot-from-range", label: "From Table/Range" },
            { id: "pivot-recommended", label: "Recommended PivotTables" },
          ] },
          { id: "table", label: "Table" },
          { id: "recommended-pivots", label: "Recommended PivotTables" },
        ] },
        { id: "illustrations", label: "Illustrations", controls: [
          { id: "picture", label: "Pictures", icon: Image },
          { id: "shapes", label: "Shapes" },
          { id: "icons", label: "Icons" },
          { id: "models-3d", label: "3D Models" },
        ] },
        { id: "charts", label: "Charts", controls: [
          { id: "column-chart", label: "Column", icon: BarChart3, menu: [
            { id: "cluster", label: "Clustered Column" },
            { id: "stacked", label: "Stacked Column" },
            { id: "hundred-stacked", label: "100% Stacked Column" },
            { id: "clustered-bar", label: "Clustered Bar" },
            { id: "column-more", label: "More Column Charts…", opens: true },
          ] },
          { id: "line-chart", label: "Line", icon: LineChart, menu: [
            { id: "line-basic", label: "Line" },
            { id: "line-markers", label: "Line with Markers" },
            { id: "line-more", label: "More Line Charts…", opens: true },
          ] },
          { id: "pie-chart", label: "Pie", icon: PieChart, menu: [
            { id: "pie-basic", label: "Pie" },
            { id: "pie-doughnut", label: "Doughnut" },
            { id: "pie-more", label: "More Pie Charts…", opens: true },
          ] },
          { id: "scatter-chart", label: "Scatter", menu: [
            { id: "scatter-basic", label: "Scatter" },
            { id: "scatter-lines", label: "Scatter with Smooth Lines" },
          ] },
          { id: "pivot-chart", label: "PivotChart" },
        ] },
        { id: "sparklines", label: "Sparklines", controls: [
          { id: "spark-line", label: "Line" },
          { id: "spark-column", label: "Column" },
          { id: "spark-winloss", label: "Win/Loss" },
        ] },
        { id: "links-insert", label: "Links", controls: [
          { id: "link-cell", label: "Link" },
        ] },
        { id: "text-insert", label: "Text", controls: [
          { id: "text-box", label: "Text Box" },
          { id: "header-footer", label: "Header & Footer" },
          { id: "wordart", label: "WordArt" },
          { id: "signature-line", label: "Signature Line" },
          { id: "object", label: "Object…", opens: true },
          { id: "equation", label: "Equation" },
          { id: "symbol", label: "Symbol" },
        ] },
      ],
    },
    {
      id: "page-layout",
      label: "Page Layout",
      groups: [
        { id: "themes", label: "Themes", controls: [
          { id: "themes-btn", label: "Themes", menu: [
            { id: "theme-office", label: "Office" },
            { id: "theme-slate", label: "Slate" },
            { id: "theme-badge", label: "Badge" },
            { id: "theme-save", label: "Save Current Theme…", opens: true },
          ] },
          { id: "theme-colors", label: "Colors", menu: [
            { id: "colors-office", label: "Office" },
            { id: "colors-median", label: "Median" },
            { id: "colors-grey", label: "Grayscale" },
          ] },
          { id: "theme-fonts", label: "Fonts" },
          { id: "theme-effects", label: "Effects" },
        ] },
        { id: "page-setup", label: "Page Setup", controls: [
          { id: "print-margins", label: "Margins", menu: [
            { id: "margin-normal", label: "Normal" },
            { id: "margin-wide", label: "Wide" },
            { id: "margin-narrow", label: "Narrow" },
            { id: "margin-custom", label: "Custom Margins…", opens: true },
          ] },
          { id: "print-orientation", label: "Orientation", menu: [
            { id: "print-portrait", label: "Portrait" },
            { id: "print-landscape", label: "Landscape" },
          ] },
          { id: "print-size", label: "Size", menu: [
            { id: "size-a4", label: "A4" },
            { id: "size-letter", label: "Letter" },
            { id: "size-legal", label: "Legal" },
          ] },
          { id: "print-area", label: "Print Area", menu: [
            { id: "print-area-set", label: "Set Print Area" },
            { id: "print-area-clear", label: "Clear Print Area" },
          ] },
          { id: "print-breaks", label: "Breaks", menu: [
            { id: "break-insert", label: "Insert Page Break" },
            { id: "break-remove", label: "Remove Page Break" },
            { id: "break-reset", label: "Reset All Page Breaks" },
          ] },
          { id: "print-titles", label: "Print Titles", opens: true },
        ] },
        { id: "scale-to-fit", label: "Scale to Fit", controls: [
          { id: "fit-width", label: "Width", menu: [
            { id: "width-automatic", label: "Automatic" },
            { id: "width-one-page", label: "1 page" },
            { id: "width-two-pages", label: "2 pages" },
          ] },
          { id: "fit-height", label: "Height", menu: [
            { id: "height-automatic", label: "Automatic" },
            { id: "height-one-page", label: "1 page" },
          ] },
          { id: "fit-scale", label: "Scale" },
        ] },
        { id: "sheet-options", label: "Sheet Options", controls: [
          { id: "gridlines-view", label: "Gridlines" },
          { id: "headings-view", label: "Headings" },
          { id: "gridlines-print", label: "Print Gridlines" },
        ] },
        { id: "arrange", label: "Arrange", controls: [
          { id: "bring-forward", label: "Bring Forward", menu: [
            { id: "bring-forward-one", label: "Bring Forward" },
            { id: "bring-forward-front", label: "Bring to Front" },
          ] },
          { id: "send-backward", label: "Send Backward", menu: [
            { id: "send-backward-one", label: "Send Backward" },
            { id: "send-backward-back", label: "Send to Back" },
          ] },
          { id: "align-objects", label: "Align", menu: [
            { id: "align-objects-left", label: "Align Left" },
            { id: "align-objects-center", label: "Align Center" },
            { id: "align-objects-right", label: "Align Right" },
          ] },
          { id: "group-objects", label: "Group", menu: [
            { id: "group", label: "Group" },
            { id: "ungroup", label: "Ungroup" },
          ] },
        ] },
      ],
    },
    {
      id: "formulas",
      label: "Formulas",
      groups: [
        { id: "library", label: "Function Library", controls: [
          { id: "insert-function", label: "Insert Function", opens: true },
          { id: "autosum", label: "AutoSum", icon: Sigma, size: "lg", commits: true },
          { id: "autosum-menu", label: "Σ", menu: [
            { id: "autosum-sum", label: "Sum" },
            { id: "autosum-average", label: "Average" },
            { id: "autosum-count", label: "Count Numbers" },
            { id: "autosum-max", label: "Max" },
            { id: "autosum-min", label: "Min" },
            { id: "autosum-more", label: "More Functions…", opens: true },
          ] },
          { id: "financial", label: "Financial", menu: [
            { id: "financial-pmt", label: "PMT" },
            { id: "financial-fv", label: "FV" },
            { id: "financial-npv", label: "NPV" },
          ] },
          { id: "logical", label: "Logical", menu: [
            { id: "logical-if", label: "IF" },
            { id: "logical-and", label: "AND" },
            { id: "logical-or", label: "OR" },
            { id: "logical-iferror", label: "IFERROR" },
          ] },
          { id: "lookup", label: "Lookup & Reference", menu: [
            { id: "lookup-vlookup", label: "VLOOKUP" },
            { id: "lookup-xlookup", label: "XLOOKUP" },
            { id: "lookup-index", label: "INDEX" },
            { id: "lookup-match", label: "MATCH" },
          ] },
          { id: "math-trig", label: "Math & Trig", menu: [
            { id: "math-sum", label: "SUM" },
            { id: "math-round", label: "ROUND" },
            { id: "math-abs", label: "ABS" },
          ] },
        ] },
        { id: "names", label: "Defined Names", controls: [
          { id: "name-manager", label: "Name Manager", opens: true },
          { id: "define-name", label: "Define Name", opens: true },
          { id: "use-in-formula", label: "Use in Formula", menu: [
            { id: "name-total", label: "Q4Total" },
            { id: "name-budget", label: "BudgetRange" },
          ] },
        ] },
        { id: "auditing", label: "Formula Auditing", controls: [
          { id: "trace-precedents", label: "Trace Precedents" },
          { id: "trace-dependents", label: "Trace Dependents" },
          { id: "remove-arrows", label: "Remove Arrows", menu: [
            { id: "remove-arrows-all", label: "Remove All Arrows" },
            { id: "remove-arrows-precedents", label: "Remove Precedent Arrows" },
          ] },
          { id: "show-formulas", label: "Show Formulas" },
          { id: "error-checking", label: "Error Checking", menu: [
            { id: "error-check", label: "Error Checking…", opens: true },
            { id: "error-trace", label: "Trace Error" },
          ] },
          { id: "evaluate-formula", label: "Evaluate Formula", opens: true },
          { id: "watch-window", label: "Watch Window", opens: true },
        ] },
        { id: "calculation", label: "Calculation", controls: [
          { id: "calculation-options", label: "Calculation Options", menu: [
            { id: "calc-automatic", label: "Automatic" },
            { id: "calc-automatic-except", label: "Automatic Except for Data Tables" },
            { id: "calc-manual", label: "Manual" },
          ] },
          { id: "calculate-now", label: "Calculate Now", icon: RefreshCw },
          { id: "calculate-sheet", label: "Calculate Sheet" },
        ] },
      ],
    },
    {
      id: "data",
      label: "Data",
      groups: [
        { id: "get-transform", label: "Get & Transform Data", controls: [
          { id: "from-csv", label: "From Text/CSV" },
          { id: "from-web", label: "From Web" },
          { id: "from-table", label: "From Table/Range" },
          { id: "recent-sources", label: "Recent Sources" },
          { id: "existing-connections", label: "Existing Connections", opens: true },
        ] },
        { id: "queries", label: "Queries & Connections", controls: [
          { id: "refresh-all", label: "Refresh All", icon: RefreshCw, menu: [
            { id: "refresh", label: "Refresh" },
            { id: "refresh-all-connections", label: "Refresh All" },
            { id: "connections-pane", label: "Queries & Connections" },
          ] },
          { id: "properties", label: "Properties", opens: true },
        ] },
        { id: "sort-filter", label: "Sort & Filter", controls: [
          { id: "sort-az", label: "Sort A → Z", icon: ArrowUpDown },
          { id: "sort-za", label: "Sort Z → A", icon: ArrowUpDown },
          { id: "sort-dialog", label: "Sort", opens: true },
          { id: "filter", label: "Filter", icon: Filter },
          { id: "clear-filter", label: "Clear", menu: [
            { id: "clear-filter-this", label: "Clear Filter From Column" },
            { id: "clear-filter-all", label: "Clear All Filters" },
          ] },
          { id: "reapply", label: "Reapply" },
          { id: "advanced-filter", label: "Advanced", opens: true },
        ] },
        { id: "data-tools", label: "Data Tools", controls: [
          { id: "text-to-columns", label: "Text to Columns", opens: true },
          { id: "flash-fill", label: "Flash Fill" },
          { id: "remove-duplicates", label: "Remove Duplicates", opens: true },
          { id: "data-validation", label: "Data Validation", menu: [
            { id: "validation-open", label: "Data Validation…", opens: true },
            { id: "validation-circle", label: "Circle Invalid Data" },
            { id: "validation-clear", label: "Clear Validation Circles" },
          ] },
          { id: "consolidate", label: "Consolidate", opens: true },
          { id: "relationships", label: "Relationships", opens: true },
        ] },
        { id: "forecast", label: "Forecast", controls: [
          { id: "what-if", label: "What-If Analysis", menu: [
            { id: "what-if-scenario", label: "Scenario Manager…", opens: true },
            { id: "what-if-goal-seek", label: "Goal Seek…", opens: true },
            { id: "what-if-data-table", label: "Data Table…", opens: true },
          ] },
          { id: "forecast-sheet", label: "Forecast Sheet", opens: true },
        ] },
        { id: "outline", label: "Outline", controls: [
          { id: "group-rows", label: "Group", menu: [
            { id: "group-auto", label: "Auto Outline" },
            { id: "group-rows-group", label: "Group Rows" },
          ] },
          { id: "ungroup-rows", label: "Ungroup", menu: [
            { id: "ungroup-clear", label: "Clear Outline" },
            { id: "ungroup-rows-ungroup", label: "Ungroup Rows" },
          ] },
          { id: "subtotal", label: "Subtotal", opens: true },
        ] },
      ],
    },
    {
      id: "review",
      label: "Review",
      groups: [
        { id: "proofing", label: "Proofing", controls: [
          { id: "spelling", label: "Spelling" },
          { id: "thesaurus", label: "Thesaurus" },
          { id: "workbook-statistics", label: "Workbook Statistics", opens: true },
        ] },
        { id: "accessibility", label: "Accessibility", controls: [
          { id: "check-accessibility", label: "Check Accessibility" },
        ] },
        { id: "comments", label: "Comments", controls: [
          { id: "new-comment", label: "New Comment" },
          { id: "delete-comment", label: "Delete" },
          { id: "previous-comment", label: "Previous" },
          { id: "next-comment", label: "Next" },
          { id: "show-comments", label: "Show Comments" },
        ] },
        { id: "protect", label: "Protect", controls: [
          { id: "protect-sheet", label: "Protect Sheet" },
          { id: "protect-workbook", label: "Protect Workbook" },
          { id: "allow-edit-ranges", label: "Allow Edit Ranges", opens: true },
          { id: "unshare-workbook", label: "Unshare Workbook" },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "workbook-views", label: "Workbook Views", controls: [
          { id: "normal-view", label: "Normal" },
          { id: "page-break", label: "Page Break Preview" },
          { id: "page-layout-view", label: "Page Layout" },
        ] },
        { id: "show", label: "Show", controls: [
          { id: "show-ruler", label: "Ruler" },
          { id: "show-gridlines", label: "Gridlines" },
          { id: "show-formula-bar", label: "Formula Bar" },
          { id: "show-headings", label: "Headings" },
        ] },
        { id: "zoom", label: "Zoom", controls: [
          { id: "zoom", label: "Zoom", menu: [
            { id: "zoom-100", label: "100%" },
            { id: "zoom-125", label: "125%" },
            { id: "zoom-200", label: "200%" },
            { id: "zoom-custom", label: "Zoom…", opens: true },
          ] },
          { id: "zoom-100-btn", label: "100%" },
          { id: "zoom-selection", label: "Zoom to Selection" },
        ] },
        { id: "window", label: "Window", controls: [
          { id: "new-window", label: "New Window" },
          { id: "arrange-all", label: "Arrange All" },
          { id: "freeze", label: "Freeze Panes", menu: [
            { id: "freeze-top", label: "Freeze Top Row" },
            { id: "freeze-first", label: "Freeze First Column" },
            { id: "unfreeze", label: "Unfreeze Panes" },
          ] },
          { id: "split", label: "Split" },
          { id: "hide-window", label: "Hide" },
          { id: "unhide-window", label: "Unhide", opens: true },
          { id: "view-side-by-side", label: "View Side by Side" },
          { id: "switch-windows", label: "Switch Windows", menu: [
            { id: "window-budget", label: "Q4_Budget.xlsx" },
            { id: "window-new", label: "Q4_Budget.xlsx:2" },
          ] },
        ] },
        { id: "macros", label: "Macros", controls: [
          { id: "view-macros", label: "Macros", menu: [
            { id: "macros-view", label: "View Macros", opens: true },
            { id: "macros-record", label: "Record Macro…", opens: true },
          ] },
        ] },
      ],
    },
    {
      id: "automate",
      label: "Automate",
      groups: [
        { id: "scripts", label: "Scripting", controls: [
          { id: "automate-task", label: "Automate a Task", opens: true },
          { id: "record-actions", label: "Record Actions", opens: true },
          { id: "script-gallery", label: "Script Gallery", opens: true },
        ] },
      ],
    },
    {
      id: "help",
      label: "Help",
      groups: [
        { id: "support", label: "Help", controls: [
          { id: "excel-help", label: "Help" },
          { id: "contact-support", label: "Contact Support" },
          { id: "whats-new", label: "What's New" },
          { id: "feedback", label: "Feedback" },
          { id: "show-training", label: "Show Training" },
        ] },
      ],
    },
  ],
  questions: [
    {
      id: "excel-q1",
      /* Insert tab, Column gallery, Clustered Column. */
      minClicks: 3,
      task: "The quarterly totals need to be compared visually rather than as rows of numbers, so reviewers can see how the quarters rank against each other.",
      answers: [{ kind: "option", control: "column-chart", option: "cluster" }],
      verify: (state) => state.chart === "cluster",
      explanation:
        "Charts live on the Insert tab. The Column button opens the chart gallery, and Clustered Column inserts the chart.",
    },
    {
      id: "excel-q2",
      /* Right-click the Marketing row header, then Insert. */
      minClicks: 2,
      task: "A new department is joining the budget and needs its own line directly above Marketing, with the existing rows left intact.",
      answers: [{ kind: "menu", target: "excel-row-marketing", item: "insert-rows" }],
      verify: (state) => state.insertedRowAbove === "excel-row-marketing",
      explanation:
        "Right-clicking a row number opens the row context menu. Insert adds a blank row above the row you targeted.",
    },
    {
      id: "excel-q3",
      /* Select column E, Currency gallery (Home), $ English (US). */
      minClicks: 3,
      task: "The Q4 figures are still plain numbers and should read as US currency so finance can read the budget without converting anything.",
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
      task: "The department names disappear when the sheet is scrolled down and must stay in view, so every row stays readable further down the sheet.",
      answers: [{ kind: "option", control: "freeze", option: "freeze-top" }],
      verify: (state) => state.frozen === "freeze-top",
      explanation: "Freeze Panes sits on the View tab; Freeze Top Row pins the header row in place.",
    },
    {
      id: "excel-q5",
      /* Select the title cell, then Merge & Center (Home). */
      minClicks: 2,
      task: "The report title is squeezed into the first column and should sit across the full width of the table as one heading.",
      answers: [{ kind: "control", control: "merge", target: "excel-cell-a1" }],
      verify: (state) => state.merged === "excel-cell-a1",
      explanation:
        "Merge & Center joins the cells of the current selection into one centered cell, so the title cell is selected first.",
    },
    {
      id: "excel-q6",
      /* Select column D, Formulas tab, AutoSum. */
      minClicks: 3,
      task: "The Q3 column needs a total that stays correct if the figures above it change, rather than one typed in by hand.",
      answers: [{ kind: "control", control: "autosum", target: "excel-col-d" }],
      verify: (state) => state.autosumColumn === "excel-col-d",
      explanation:
        "AutoSum in the Function Library reads the selected column and writes the SUM formula below the range.",
    },
  ],
};