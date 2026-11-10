/** Power BI — report canvas, filters pane, dialogs and scored tasks (fictitious data). */

export const VISUAL_MENU = [
  { id: "copy-visual", label: "Copy visual" },
  { id: "see-records", label: "See records" },
  { id: "spotlight", label: "Spotlight" },
  { id: "exclude", label: "Exclude" },
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
  reduce: reducePowerBi,
  dialogs: POWERBI_DIALOGS,
  tabs: [
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "data", label: "Data", controls: [
          { id: "refresh", label: "Refresh", size: "lg", commits: true },
          { id: "get-data", label: "Get data", menu: [
            { id: "sql-server", label: "SQL Server", opens: "pbi-sql" },
            { id: "excel-workbook", label: "Excel workbook", opens: true },
            { id: "sharepoint-folder", label: "SharePoint folder", opens: true },
          ] },
        ] },
        { id: "insert-group", label: "Insert", controls: [
          { id: "new-visual", label: "New visual" },
          { id: "text-box", label: "Text box" },
        ] },
        { id: "share-group", label: "Share", controls: [
          { id: "publish", label: "Publish", size: "lg", menu: [
            { id: "my-workspace", label: "My workspace" },
            { id: "security-workspace", label: "Security Operations (workspace)" },
          ] },
        ] },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      groups: [
        { id: "visualizations", label: "Visualizations", controls: [
          { id: "column-visual", label: "Column chart" },
          { id: "line-visual", label: "Line chart" },
          { id: "card-visual", label: "Card" },
        ] },
        { id: "elements", label: "Elements", controls: [
          { id: "shape", label: "Shape" },
          { id: "image-element", label: "Image" },
        ] },
      ],
    },
    {
      id: "modeling",
      label: "Modeling",
      groups: [
        { id: "relationships", label: "Relationships", controls: [
          { id: "manage-relationships", label: "Manage relationships", opens: true },
        ] },
        { id: "calculations", label: "Calculations", controls: [
          { id: "new-measure", label: "New measure" },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "show", label: "Show", controls: [
          { id: "filters-pane", label: "Filters", ui: "filtersPane" },
          { id: "bookmarks", label: "Bookmarks", ui: "bookmarks" },
        ] },
        { id: "page", label: "Page", controls: [
          { id: "new-page", label: "New page", commits: true },
        ] },
        { id: "themes", label: "Themes", controls: [
          { id: "switch-theme", label: "Switch theme" },
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
      task: "Publish the report to the Security Operations workspace so the team can open it.",
      answers: [{ kind: "option", control: "publish", option: "security-workspace" }],
      verify: (state) => state.published === "security-workspace",
      explanation:
        "Publish opens the workspace picker; the destination workspace must be chosen before the report is sent.",
    },
    {
      id: "powerbi-q2",
      task: "The overnight data load has finished. Bring the newest figures into the report model.",
      answers: [{ kind: "control", control: "refresh" }],
      verify: (state) => state.refreshed === true,
      explanation: "Refresh re-runs the model queries and loads the latest data into the existing visuals.",
    },
    {
      id: "powerbi-q3",
      task: "Show the filters pane, then limit the report to the EMEA region only.",
      answers: [{ kind: "click", target: "pbi-filter-emea" }],
      verify: (state) => state.region === "EMEA",
      explanation:
        "The Filters pane is toggled from the View tab; the region checkbox inside the pane scopes every visual on the page.",
    },
    {
      id: "powerbi-q4",
      task: "Add a second page to the report for the regional breakdown.",
      answers: [{ kind: "control", control: "new-page" }],
      verify: (state) => state.pages === 2,
      explanation: "New page on the View tab adds a blank report page after the current one.",
    },
    {
      id: "powerbi-q5",
      task: "An auditor asks which findings make up the tallest bar. Open the underlying rows of that chart.",
      answers: [{ kind: "menu", target: "pbi-visual-1", item: "see-records" }],
      verify: (state) => state.recordsFor === "pbi-visual-1",
      explanation:
        "See records on a visual lists the rows behind it, which is how a number is traced back to its source.",
    },
    {
      id: "powerbi-q6",
      task: "The source moved to a new database server. Connect the report to the SQL Server source NORTHWIND-SQL01.",
      answers: [{ kind: "confirm", dialog: "pbi-sql", value: "NORTHWIND-SQL01" }],
      verify: (state) => state.connectedServer === "NORTHWIND-SQL01",
      explanation:
        "Get data opens the connector list, and the connection is made inside the connector dialog with the server name.",
    },
  ],
};