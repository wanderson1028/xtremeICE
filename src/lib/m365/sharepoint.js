/** SharePoint — document library command bar, dialogs, list targets and scored tasks. */

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

export const SHAREPOINT_DIALOGS = {
  "sp-upload": {
    title: "Upload files",
    description: "Choose a file on your computer to copy into Security Operations.",
    items: [
      { id: "Q4_Report.pdf", label: "Q4_Report.pdf", meta: "Local · 318 KB" },
      { id: "Vendor_Contract.pdf", label: "Vendor_Contract.pdf", meta: "Local · 96 KB" },
      { id: "Audit_Checklist.xlsx", label: "Audit_Checklist.xlsx", meta: "Local · 44 KB" },
    ],
    confirm: "Upload",
  },
  "sp-folder": {
    title: "Create folder",
    description: "Name the folder that will hold the evidence.",
    input: { label: "Folder name", placeholder: "Type a folder name" },
    confirm: "Create",
  },
  "sp-share": {
    title: "Manage access",
    description: "Choose who should be given access to the selected item.",
    items: [
      { id: "Audit Team", label: "Audit Team", meta: "Security group · 6 members" },
      { id: "Priya Raman", label: "Priya Raman", meta: "priya.raman@northwind.example" },
      { id: "All staff", label: "All staff", meta: "Organization-wide group" },
    ],
    confirm: "Send",
  },
};

/** Applies any committed operation to the library state. */
export function reduceSharePoint(state, action) {
  const next = { ...state };
  const target = action.targetId || null;

  if (action.type === "confirm") {
    if (action.dialogId === "sp-upload" && action.value) {
      next.uploadedFiles = state.uploadedFiles.includes(action.value)
        ? state.uploadedFiles
        : [...state.uploadedFiles, action.value];
    }
    if (action.dialogId === "sp-folder" && action.value) {
      next.folders = state.folders.includes(action.value)
        ? state.folders
        : [...state.folders, action.value];
    }
    if (action.dialogId === "sp-share" && action.value) {
      next.sharedItem = target;
      next.sharedWith = state.sharedWith.includes(action.value)
        ? state.sharedWith
        : [...state.sharedWith, action.value];
    }
  }
  if (action.type === "menu") {
    if (action.itemId === "sort-newest") next.sorting = "newest";
    if (action.itemId === "sort-oldest") next.sorting = "oldest";
    if (action.itemId === "sort-name") next.sorting = "name";
    if (action.itemId === "version-history") next.versionsFor = target;
    if (action.itemId === "pin") next.pinned = target;
    if (action.itemId === "delete") next.deletedItem = target;
  }
  if (action.type === "option") {
    if (action.controlId === "more" && action.optionId === "pin") next.pinned = target;
    if (action.controlId === "more" && action.optionId === "version-history") next.versionsFor = target;
    if (action.controlId === "more" && action.optionId === "delete-item") next.deletedItem = target;
    if (action.controlId === "new" && action.optionId === "new-docx") next.createdFile = "Document.docx";
    if (action.controlId === "new" && action.optionId === "new-xlsx") next.createdFile = "Workbook.xlsx";
    if (action.controlId === "sync") next.synced = true;
  }
  return next;
}

export const sharepointApp = {
  id: "sharepoint",
  name: "SharePoint",
  accent: "#036c70",
  windowTitle: "Security Operations — SharePoint",
  variant: "library",
  reduce: reduceSharePoint,
  tabs: [],
  dialogs: SHAREPOINT_DIALOGS,
  commandBar: [
    { id: "new", label: "New", menu: [
      { id: "new-folder", label: "Folder", opens: "sp-folder" },
      { id: "new-docx", label: "Word document" },
      { id: "new-xlsx", label: "Excel workbook" },
    ] },
    { id: "upload", label: "Upload", menu: [
      { id: "upload-files", label: "Files", opens: "sp-upload" },
      { id: "upload-folder", label: "Folder", opens: true },
    ] },
    { id: "share", label: "Share", menu: [
      { id: "manage-access", label: "Manage access", opens: "sp-share" },
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
    uploadedFiles: [],
    folders: [],
    sorting: "",
    sharedItem: null,
    sharedWith: [],
    versionsFor: null,
    pinned: null,
    deletedItem: null,
  },
  questions: [
    {
      id: "sharepoint-q1",
      /* Upload, Files, choose Q4_Report.pdf, Upload. */
      minClicks: 4,
      task: "Q4_Report.pdf is on your laptop. Copy that exact file into this library.",
      answers: [{ kind: "confirm", dialog: "sp-upload", value: "Q4_Report.pdf" }],
      verify: (state) => state.uploadedFiles.includes("Q4_Report.pdf"),
      explanation:
        "Upload offers a source, then the file picker lists what is on the machine: only the chosen file is copied into the library.",
    },
    {
      id: "sharepoint-q2",
      /* New, Folder, Create (the name is typed, which is not a click). */
      minClicks: 3,
      task: "Create a new folder named “Q4 Evidence” in this library to hold the evidence you are about to collect.",
      answers: [{ kind: "confirm", dialog: "sp-folder", value: "Q4 Evidence" }],
      verify: (state) => state.folders.includes("Q4 Evidence"),
      explanation:
        "New on the command bar opens the create dialog; the folder takes the name typed into it.",
    },
    {
      id: "sharepoint-q3",
      /* Select the document, Share, Manage access, Audit Team, Send. */
      minClicks: 5,
      task: "Give the audit team access to Q4_Security_Policy.docx: select that document, then grant Audit Team access.",
      answers: [
        { kind: "confirm", dialog: "sp-share", value: "Audit Team", target: "sp-row-policy" },
      ],
      verify: (state) => state.sharedItem === "sp-row-policy" && state.sharedWith.includes("Audit Team"),
      explanation:
        "Sharing acts on the selected item. The access dialog records who the permission is granted to.",
    },
    {
      id: "sharepoint-q4",
      /* Right-click the Modified header, then Sort newest first. */
      minClicks: 2,
      task: "Reorder the library so the most recently edited files appear first.",
      answers: [{ kind: "menu", target: "sp-col-modified", item: "sort-newest" }],
      verify: (state) => state.sorting === "newest",
      explanation:
        "The Modified column header opens the sort options; newest first reorders the whole library by edit date.",
    },
    {
      id: "sharepoint-q5",
      /* Right-click the plan, then Version history. */
      minClicks: 2,
      task: "You need the revision that existed before last week's edit. Open the version history of the incident response plan.",
      answers: [{ kind: "menu", target: "sp-row-ir-plan", item: "version-history" }],
      verify: (state) => state.versionsFor === "sp-row-ir-plan",
      explanation:
        "The item context menu exposes Version history, where earlier revisions can be reviewed and restored.",
    },
    {
      id: "sharepoint-q6",
      /* Right-click the tracker, then Pin to Quick access. */
      minClicks: 2,
      task: "Keep the vendor renewal tracker within one click by pinning it to Quick access.",
      answers: [
        { kind: "menu", target: "sp-row-vendor", item: "pin" },
        { kind: "option", control: "more", option: "pin", target: "sp-row-vendor" },
      ],
      verify: (state) => state.pinned === "sp-row-vendor",
      explanation:
        "Pinning acts on one item, from its context menu or the ⋯ command bar menu.",
    },
  ],
};