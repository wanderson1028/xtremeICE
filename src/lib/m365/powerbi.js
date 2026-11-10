/** Power BI — report canvas, filters pane, dialogs and scored tasks (fictitious data). */
import {
  RefreshCw, Database, LineChart, PieChart, BarChart3, Table, Share2, Settings,
  Image, LayoutGrid, Filter, Calculator,
} from "lucide-react";

export const VISUAL_MENU = [
  { id: "copy-visual", label: "Copy visual" },
  { id: "see-records", label: "See records" },
  { id: "see-data", label: "See data" },
  { id: "spotlight", label: "Spotlight" },
  { id: "exclude", label: "Exclude" },
  { id: "export-data", label: "Export data" },
];

/** Region filter values rendered inside the filters pane. */
export const PBI_REGIONS = [
  { id: "pbi-filter-amer", label: "AMER", value: 38 },
  { id: "pbi-filter-emea", label: "EMEA", value: 24 },
  { id: "pbi-filter-apac", label: "APAC", value: 17 },
];

/** Filter checkboxes whose click applies a filter — the only clicks that can score. */
export const PBI_FILTER_TARGETS = PBI_REGIONS.map((region) => region.id);

export const POWERBI_DIALOGS = {
  "pbi-sql": {
    title: "SQL Server database",
    description: "Connect the report model to the database server shown below.",
    input: { label: "Server", value: "NORTHWIND-SQL01" },
    confirm: "Connect",
  },
};

/** Applies any committed operation to the report state. */
export function reducePowerBi(state, action) {
  const next = { ...state };
  const target = action.targetId || null;

  if (action.type === "option") {
    if (action.controlId === "publish") next.published = action.optionId;
    if (action.controlId === "get-data") next.connector = action.optionId;
  }
  if (action.type === "control") {
    if (action.controlId === "refresh") next.refreshed = true;
    if (action.controlId === "new-page") next.pages = state.pages + 1;
    if (action.controlId === "text-box") next.textBox = true;
    if (action.controlId === "new-visual") next.newVisual = true;
    if (action.controlId === "switch-theme") next.theme = true;
  }
  if (action.type === "click") {
    if (target === "pbi-filter-emea") next.region = "EMEA";
    if (target === "pbi-filter-amer") next.region = "AMER";
    if (target === "pbi-filter-apac") next.region = "APAC";
    if (target === "pbi-filter-all") next.region = "all";
  }
  if (action.type === "menu" && action.itemId === "see-records") next.recordsFor = target;
  if (action.type === "confirm" && action.dialogId === "pbi-sql" && action.value) {
    next.connectedServer = action.value;
  }
  return next;
}

export const powerbiApp = {
  id: "powerbi",
  name: "Power BI",
  accent: "#f2c811",
  titleInk: "#201f1e",
  windowTitle: "Security Posture Report — Power BI Desktop",
  variant: "report",
  defaultTab: "home",
  reduce: reducePowerBi,
  dialogs: POWERBI_DIALOGS,
  tabs: [
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "clipboard", label: "Clipboard", controls: [
          { id: "paste-visual", label: "Paste" },
          { id: "copy-visual-clip", label: "Copy" },
          { id: "format-painter", label: "Format painter" },
        ] },
        { id: "data", label: "Data", controls: [
          { id: "get-data", label: "Get data", icon: Database, size: "lg", menu: [
            { id: "sql-server", label: "SQL Server", opens: "pbi-sql" },
            { id: "excel-workbook", label: "Excel workbook", opens: true },
            { id: "sharepoint-folder", label: "SharePoint folder", opens: true },
            { id: "azure-sql", label: "Azure SQL database", opens: true },
            { id: "web-source", label: "Web", opens: true },
            { id: "more-connectors", label: "More…", opens: true },
          ] },
          { id: "recent-sources", label: "Recent sources", opens: true },
          { id: "enter-data", label: "Enter data", opens: true },
          { id: "refresh", label: "Refresh", icon: RefreshCw, size: "lg", commits: true },
        ] },
        { id: "queries", label: "Queries", controls: [
          { id: "transform-data", label: "Transform data", opens: true },
          { id: "edit-parameters", label: "Edit parameters", opens: true },
          { id: "data-source-settings", label: "Data source settings", opens: true },
        ] },
        { id: "insert-group", label: "Insert", controls: [
          { id: "new-visual", label: "New visual" },
          { id: "text-box", label: "Text box" },
          { id: "button", label: "Buttons", menu: [
            { id: "button-blank", label: "Blank" },
            { id: "button-back", label: "Back" },
            { id: "button-navigator", label: "Navigator" },
          ] },
          { id: "shapes", label: "Shapes" },
          { id: "image-insert", label: "Image", icon: Image },
        ] },
        { id: "share-group", label: "Share", controls: [
          { id: "publish", label: "Publish", icon: Share2, size: "lg", menu: [
            { id: "my-workspace", label: "My workspace" },
            { id: "security-workspace", label: "Security Operations (workspace)" },
            { id: "select-workspace", label: "Select a destination…", opens: true },
          ] },
          { id: "export-report", label: "Export", menu: [
            { id: "export-pdf-report", label: "PDF" },
            { id: "export-pptx", label: "PowerPoint" },
          ] },
        ] },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      groups: [
        { id: "visualizations", label: "Visualizations", controls: [
          { id: "column-visual", label: "Column chart", icon: BarChart3 },
          { id: "line-visual", label: "Line chart", icon: LineChart },
          { id: "pie-visual", label: "Pie chart", icon: PieChart },
          { id: "table-visual", label: "Table", icon: Table },
          { id: "card-visual", label: "Card" },
          { id: "map-visual", label: "Map" },
          { id: "gauge-visual", label: "Gauge" },
        ] },
        { id: "elements", label: "Elements", controls: [
          { id: "shape", label: "Shape", menu: [
            { id: "shape-rectangle", label: "Rectangle" },
            { id: "shape-oval", label: "Oval" },
            { id: "shape-line", label: "Line" },
          ] },
          { id: "image-element", label: "Image", icon: Image },
          { id: "page-navigator", label: "Page navigator" },
        ] },
      ],
    },
    {
      id: "modeling",
      label: "Modeling",
      groups: [
        { id: "relationships", label: "Relationships", controls: [
          { id: "manage-relationships", label: "Manage relationships", opens: true },
          { id: "new-relationship", label: "New relationship", opens: true },
        ] },
        { id: "calculations", label: "Calculations", controls: [
          { id: "new-measure", label: "New measure", icon: Calculator },
          { id: "new-column", label: "New column" },
          { id: "new-table", label: "New table", opens: true },
          { id: "quick-measure", label: "Quick measure", opens: true },
        ] },
        { id: "security", label: "Security", controls: [
          { id: "manage-roles", label: "Manage roles", opens: true },
          { id: "view-as-roles", label: "View as roles", opens: true },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "show", label: "Show", controls: [
          { id: "filters-pane", label: "Filters", icon: Filter, ui: "filtersPane" },
          { id: "bookmarks", label: "Bookmarks", ui: "bookmarks" },
          { id: "selection-pane", label: "Selection", ui: "selection" },
          { id: "sync-slicers", label: "Sync slicers", opens: true },
        ] },
        { id: "page", label: "Page", controls: [
          { id: "new-page", label: "New page", commits: true },
          { id: "page-view", label: "Page view", menu: [
            { id: "page-fit", label: "Fit to page" },
            { id: "page-actual", label: "Actual size" },
            { id: "page-width", label: "Fit to width" },
          ] },
        ] },
        { id: "themes", label: "Themes", controls: [
          { id: "switch-theme", label: "Switch theme", menu: [
            { id: "theme-default", label: "Default theme" },
            { id: "theme-dark", label: "Dark theme" },
            { id: "theme-high-contrast", label: "High contrast" },
          ] },
          { id: "custom-theme", label: "Customize current theme", opens: true },
        ] },
        { id: "layout-options", label: "Layout", controls: [
          { id: "gridlines-toggle", label: "Gridlines" },
          { id: "snap-to-grid", label: "Snap to grid" },
          { id: "lock-objects", label: "Lock objects" },
        ] },
      ],
    },
    {
      id: "help",
      label: "Help",
      groups: [
        { id: "support", label: "Help", controls: [
          { id: "help-doc", label: "Documentation" },
          { id: "community", label: "Community" },
          { id: "contact-support", label: "Support" },
          { id: "whats-new", label: "What's new" },
          { id: "submit-idea", label: "Submit an idea" },
        ] },
      ],
    },
  ],
  defaults: {
    published: null,
    refreshed: false,
    filtersPane: false,
    region: "all",
    pages: 1,
    recordsFor: null,
    connector: null,
    connectedServer: null,
  },
  questions: [
    {
      id: "powerbi-q1",
      /* Publish (Home), then the Security Operations workspace. */
      minClicks: 2,
      task: "The report has to reach the team, who work in the Security Operations workspace.",
      answers: [{ kind: "option", control: "publish", option: "security-workspace" }],
      verify: (state) => state.published === "security-workspace",
      explanation:
        "Publish opens the workspace picker; the destination workspace must be chosen before the report is sent.",
    },
    {
      id: "powerbi-q2",
      /* Refresh, already on the Home tab. */
      minClicks: 1,
      task: "The overnight data load has finished and the visuals still show yesterday's figures.",
      answers: [{ kind: "control", control: "refresh" }],
      verify: (state) => state.refreshed === true,
      explanation: "Refresh re-runs the model queries and loads the latest data into the existing visuals.",
    },
    {
      id: "powerbi-q3",
      /* View tab, Filters toggle, then the EMEA checkbox in the pane. */
      prep: [{ tab: "view" }, { control: "filters-pane" }],
      minClicks: 3,
      task: "Only the EMEA region's numbers should be left on this page.",
      answers: [{ kind: "click", target: "pbi-filter-emea" }],
      verify: (state) => state.region === "EMEA",
      explanation:
        "The Filters pane is toggled from the View tab; the region checkbox inside the pane scopes every visual on the page.",
    },
    {
      id: "powerbi-q4",
      /* View tab, then New page. */
      minClicks: 2,
      task: "The regional breakdown needs a page of its own instead of sharing this one.",
      answers: [{ kind: "control", control: "new-page" }],
      verify: (state) => state.pages === 2,
      explanation: "New page on the View tab adds a blank report page after the current one.",
    },
    {
      id: "powerbi-q5",
      /* Right-click the visual, then See records. */
      minClicks: 2,
      task: "An auditor asks which findings make up the tallest bar of the chart.",
      answers: [{ kind: "menu", target: "pbi-visual-1", item: "see-records" }],
      verify: (state) => state.recordsFor === "pbi-visual-1",
      explanation:
        "See records on a visual lists the rows behind it, which is how a number is traced back to its source.",
    },
    {
      id: "powerbi-q6",
      /* Get data, SQL Server, Connect (the server is pre-filled). */
      minClicks: 3,
      task: "The source moved to a new database server. Point the report at NORTHWIND-SQL01 again.",
      answers: [{ kind: "confirm", dialog: "pbi-sql", value: "NORTHWIND-SQL01" }],
      verify: (state) => state.connectedServer === "NORTHWIND-SQL01",
      explanation:
        "Get data opens the connector list, and the connection is made inside the connector dialog with the server name.",
    },
  ],
};