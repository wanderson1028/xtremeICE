/** Power BI — report canvas, filters pane and scored tasks (fictitious data). */

export const VISUAL_MENU = [
  { id: "copy-visual", label: "Copy visual" },
  { id: "see-records", label: "See records" },
  { id: "spotlight", label: "Spotlight" },
  { id: "exclude", label: "Exclude" },
];

export const powerbiApp = {
  id: "powerbi",
  name: "Power BI",
  accent: "#f2c811",
  titleInk: "#201f1e",
  windowTitle: "Security Posture Report — Power BI Desktop",
  variant: "report",
  tabs: [
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "data", label: "Data", controls: [
          { id: "refresh", label: "Refresh", size: "lg" },
          { id: "get-data", label: "Get data", menu: [
            { id: "sql-server", label: "SQL Server" },
            { id: "excel-workbook", label: "Excel workbook" },
            { id: "sharepoint-folder", label: "SharePoint folder" },
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
          { id: "manage-relationships", label: "Manage relationships" },
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
          { id: "bookmarks", label: "Bookmarks" },
        ] },
        { id: "page", label: "Page", controls: [
          { id: "new-page", label: "New page" },
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
    published: false,
    refreshed: false,
    filtersPane: false,
    region: "all",
    page2: false,
    records: false,
    sqlConnected: false,
    notice: "",
  },
  questions: [
    {
      id: "powerbi-q1",
      task: "Publish the report to the Security Operations workspace so the team can open it.",
      steps: [
        { do: "control", control: "publish" },
        { do: "option", control: "publish", option: "security-workspace" },
      ],
      effect: { published: true, notice: "Published to Security Operations workspace" },
      explanation:
        "Publish opens the workspace picker; the destination workspace must be chosen before the report is sent.",
    },
    {
      id: "powerbi-q2",
      task: "The overnight data load has finished. Bring the newest figures into the report model.",
      steps: [{ do: "control", control: "refresh" }],
      effect: { refreshed: true, notice: "Model refreshed just now" },
      explanation: "Refresh re-runs the model queries and loads the latest data into the existing visuals.",
    },
    {
      id: "powerbi-q3",
      task: "Show the filters pane, then limit the report to the EMEA region only.",
      steps: [
        { do: "tab", tab: "view" },
        { do: "control", control: "filters-pane" },
        { do: "click", target: "pbi-filter-emea" },
      ],
      effect: { filtersPane: true, region: "EMEA", notice: "Report filtered to EMEA" },
      explanation:
        "The Filters pane is toggled from the View tab; the region checkbox inside the pane scopes every visual on the page.",
    },
    {
      id: "powerbi-q4",
      task: "Add a second page to the report for the regional breakdown.",
      steps: [
        { do: "tab", tab: "view" },
        { do: "control", control: "new-page" },
      ],
      effect: { page2: true, notice: "Page 2 added" },
      explanation: "New page on the View tab adds a blank report page after the current one.",
    },
    {
      id: "powerbi-q5",
      task: "An auditor asks which findings make up the tallest bar. Open the underlying rows of that chart.",
      steps: [
        { do: "context", target: "pbi-visual-1" },
        { do: "menu", target: "pbi-visual-1", item: "see-records" },
      ],
      effect: { records: true, notice: "Records view open for Findings by region" },
      explanation:
        "See records on a visual lists the rows behind it, which is how a number is traced back to its source.",
    },
    {
      id: "powerbi-q6",
      task: "The source moved to a new database server. Connect the report to a SQL Server source.",
      steps: [
        { do: "control", control: "get-data" },
        { do: "option", control: "get-data", option: "sql-server" },
      ],
      effect: { sqlConnected: true, notice: "SQL Server · NORTHWIND-SQL01 connected" },
      explanation:
        "Get data opens the connector list; SQL Server is the connector used to point the model at the new database.",
    },
  ],
};