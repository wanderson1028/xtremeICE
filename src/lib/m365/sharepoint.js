/** SharePoint — document library command bar, list targets and scored tasks (fictitious data). */

export const ITEM_MENU = [
  { id: "open", label: "Open in app" },
  { id: "download", label: "Download" },
  { id: "copy-link", label: "Copy link" },
  { id: "version-history", label: "Version history" },
  { id: "pin", label: "Pin to Quick access" },
  { id: "delete", label: "Delete" },
];

export const SORT_MENU = [
  { id: "sort-newest", label: "Sort newest first" },
  { id: "sort-oldest", label: "Sort oldest first" },
  { id: "sort-name", label: "Sort by name (A → Z)" },
];

export const sharepointApp = {
  id: "sharepoint",
  name: "SharePoint",
  accent: "#036c70",
  windowTitle: "Security Operations — SharePoint",
  variant: "library",
  tabs: [],
  commandBar: [
    { id: "new", label: "New", menu: [
      { id: "new-folder", label: "Folder" },
      { id: "new-docx", label: "Word document" },
      { id: "new-xlsx", label: "Excel workbook" },
    ] },
    { id: "upload", label: "Upload", menu: [
      { id: "upload-files", label: "Files" },
      { id: "upload-folder", label: "Folder" },
    ] },
    { id: "share", label: "Share", menu: [
      { id: "manage-access", label: "Manage access" },
      { id: "copy-link", label: "Copy link" },
      { id: "email-link", label: "Email link" },
    ] },
    { id: "sync", label: "Sync" },
    { id: "more", label: "⋯", menu: [
      { id: "pin", label: "Pin to Quick access" },
      { id: "version-history", label: "Version history" },
      { id: "delete-item", label: "Delete" },
    ] },
  ],
  defaults: {
    uploaded: false,
    folder: false,
    sorting: "",
    sharing: false,
    versions: false,
    pinned: false,
    notice: "",
  },
  questions: [
    {
      id: "sharepoint-q1",
      task: "Q4_Report.pdf is on your laptop. Copy it into this library using the upload command.",
      steps: [
        { do: "control", control: "upload" },
        { do: "option", control: "upload", option: "upload-files" },
      ],
      effect: { uploaded: true, notice: "Q4_Report.pdf uploaded to Security Operations" },
      explanation:
        "Upload opens a choice between files and a folder; Files copies documents from the local machine into the library.",
    },
    {
      id: "sharepoint-q2",
      task: "Create a new folder in this library to hold the evidence you are about to collect.",
      steps: [
        { do: "control", control: "new" },
        { do: "option", control: "new", option: "new-folder" },
      ],
      effect: { folder: true, notice: "Folder “Q4 Evidence” created" },
      explanation: "New on the command bar creates library items, including folders.",
    },
    {
      id: "sharepoint-q3",
      task: "Grant the audit team access to the Q4 security policy document.",
      steps: [
        { do: "click", target: "sp-row-policy" },
        { do: "control", control: "share" },
        { do: "option", control: "share", option: "manage-access" },
      ],
      effect: { sharing: true, notice: "Access panel opened for Q4_Security_Policy.docx" },
      explanation:
        "Sharing acts on the selected item. Manage access opens the permission panel where people and groups are added.",
    },
    {
      id: "sharepoint-q4",
      task: "Reorder the library so the most recently edited files appear first.",
      steps: [
        { do: "click", target: "sp-col-modified" },
        { do: "menu", target: "sp-col-modified", item: "sort-newest" },
      ],
      effect: { sorting: "newest", notice: "Library sorted by Modified, newest first" },
      explanation:
        "The Modified column header opens the sort options; newest first reorders the whole library by edit date.",
    },
    {
      id: "sharepoint-q5",
      task: "You need the revision that existed before last week's edit. Open the version history of the incident response plan.",
      steps: [
        { do: "context", target: "sp-row-ir-plan" },
        { do: "menu", target: "sp-row-ir-plan", item: "version-history" },
      ],
      effect: { versions: true, notice: "Version history open for Incident_Response_Plan.pptx" },
      explanation:
        "The item context menu exposes Version history, where earlier revisions can be reviewed and restored.",
    },
    {
      id: "sharepoint-q6",
      task: "Keep the vendor renewal tracker within one click by pinning it to Quick access.",
      steps: [
        { do: "click", target: "sp-row-vendor" },
        { do: "control", control: "more" },
        { do: "option", control: "more", option: "pin" },
      ],
      effect: { pinned: true, notice: "Vendor_Renewal_Tracker.xlsx pinned to Quick access" },
      explanation:
        "The selected item is acted on by the command bar. The ⋯ more menu holds Pin to Quick access.",
    },
  ],
};