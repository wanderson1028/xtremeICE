/** Microsoft 365 point-and-click assessment: realistic app screens plus 24 hotspot questions. */
import {
  Save, Sigma, DollarSign, Upload, Share2, FolderPlus, Search, Reply,
  FolderInput, Calendar, Settings, Video, Paperclip, RefreshCw, Filter, Plus, Share,
  ClipboardPaste, Bold, List, Mail, Trash2, Database, Type,
} from "lucide-react";

export const TAB_W = 7.4;
export const TAB_H = 5.4;
export const TAB_Y = 7.7;
export const TAB_X0 = 6.2;
export const TAB_GAP = 0.25;

export const tabRect = (i) => ({ x: TAB_X0 + i * (TAB_W + TAB_GAP), y: TAB_Y, w: TAB_W, h: TAB_H });

export const M365_APPS = [
  {
    id: "word",
    name: "Word",
    accent: "#2b579a",
    windowTitle: "Q4_Security_Policy.docx - Word",
    variant: "document",
    tabs: ["File", "Home", "Insert", "Draw", "Design", "Layout", "References", "Review", "View"],
    extraTargets: [
      { id: "word-save", label: "Save", icon: Save, kind: "titlebar", x: 2, y: 1.8, w: 4.4, h: 3.6 },
      { id: "word-paste", label: "Paste", icon: ClipboardPaste, kind: "ribbon", x: 6.2, y: 14.4, w: 8.2, h: 10 },
      { id: "word-bold", label: "Bold", icon: Bold, kind: "ribbon", x: 15, y: 14.4, w: 8.2, h: 10 },
      { id: "word-bullets", label: "Bullets", icon: List, kind: "ribbon", x: 23.8, y: 14.4, w: 8.2, h: 10 },
    ],
    questions: [
      {
        id: "word-q1",
        text: "You have finished editing the security policy and want to save it to OneDrive. Where do you click?",
        targetId: "word-save",
        explanation: "Save sits in the Quick Access Toolbar at the top-left of the window, so it is always one click away.",
      },
      {
        id: "word-q2",
        text: "The policy must print in landscape orientation. Where do you click to change it?",
        targetId: "word-tab-5",
        explanation: "Orientation lives on the Layout tab, in the Page Setup group.",
      },
      {
        id: "word-q3",
        text: "You need to insert a table of contents at the start of the document. Where do you click?",
        targetId: "word-tab-6",
        explanation: "Table of Contents is on the References tab.",
      },
      {
        id: "word-q4",
        text: "Legal wants to review every edit before it is accepted. Where do you click to turn on Track Changes?",
        targetId: "word-tab-7",
        explanation: "Track Changes and all review comments live on the Review tab.",
      },
    ],
  },
  {
    id: "excel",
    name: "Excel",
    accent: "#217346",
    windowTitle: "Q4_Budget.xlsx - Excel",
    variant: "sheet",
    tabs: ["File", "Home", "Insert", "Draw", "Page Layout", "Formulas", "Data", "Review", "View"],
    extraTargets: [
      { id: "excel-autosum", label: "AutoSum", icon: Sigma, kind: "ribbon", x: 6.2, y: 14.4, w: 8.2, h: 10 },
      { id: "excel-currency", label: "Currency", icon: DollarSign, kind: "ribbon", x: 15, y: 14.4, w: 8.2, h: 10 },
      { id: "excel-paste", label: "Paste", icon: ClipboardPaste, kind: "ribbon", x: 23.8, y: 14.4, w: 8.2, h: 10 },
      { id: "excel-bold", label: "Bold", icon: Bold, kind: "ribbon", x: 32.6, y: 14.4, w: 8.2, h: 10 },
    ],
    questions: [
      {
        id: "excel-q1",
        text: "You selected the Q4 figures and want to add a column chart. Where do you click?",
        targetId: "excel-tab-2",
        explanation: "Every chart type is on the Insert tab, in the Charts group.",
      },
      {
        id: "excel-q2",
        text: "You need the total of the selected column without typing a formula. Where do you click?",
        targetId: "excel-autosum",
        explanation: "AutoSum inserts the SUM formula for the selected range automatically.",
      },
      {
        id: "excel-q3",
        text: "The header row should stay visible while you scroll down. Where do you click?",
        targetId: "excel-tab-8",
        explanation: "Freeze Panes is found on the View tab, in the Window group.",
      },
      {
        id: "excel-q4",
        text: "The revenue column must display as US dollars. Where do you click?",
        targetId: "excel-currency",
        explanation: "The Currency button in the Home tab Number group applies the $ format.",
      },
    ],
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    accent: "#036c70",
    windowTitle: "Security Operations - SharePoint",
    variant: "library",
    ribbon: false,
    tabs: ["Browse", "Documents"],
    extraTargets: [
      { id: "sp-new", label: "New", icon: FolderPlus, kind: "tool", x: 6.2, y: 14.2, w: 6.6, h: 5.6 },
      { id: "sp-upload", label: "Upload", icon: Upload, kind: "tool", x: 13.4, y: 14.2, w: 8.4, h: 5.6 },
      { id: "sp-share", label: "Share", icon: Share2, kind: "tool", x: 22.4, y: 14.2, w: 7.4, h: 5.6 },
      { id: "sp-sync", label: "Sync", icon: RefreshCw, kind: "tool", x: 30.4, y: 14.2, w: 7, h: 5.6 },
      { id: "sp-search", label: "Search this site", icon: Search, kind: "field", x: 71, y: 8.4, w: 25, h: 4.2 },
    ],
    questions: [
      {
        id: "sharepoint-q1",
        text: "You have a report on your laptop and need it in this document library. Where do you click?",
        targetId: "sp-upload",
        explanation: "Upload copies a file from your computer into the library.",
      },
      {
        id: "sharepoint-q2",
        text: "You want to organise the library by creating a new folder. Where do you click?",
        targetId: "sp-new",
        explanation: "New creates a folder, document, or list item directly in the library.",
      },
      {
        id: "sharepoint-q3",
        text: "A colleague needs access to this library. Where do you click?",
        targetId: "sp-share",
        explanation: "Share grants people or groups permission to the selected item or library.",
      },
      {
        id: "sharepoint-q4",
        text: "You need to find a document by name anywhere on the site. Where do you click?",
        targetId: "sp-search",
        explanation: "The site search box queries everything you have access to on the site.",
      },
    ],
  },
  {
    id: "outlook",
    name: "Outlook",
    accent: "#0f6cbd",
    windowTitle: "Inbox - Outlook",
    variant: "mail",
    tabs: ["File", "Home", "Send / Receive", "Folder", "View", "Help"],
    extraTargets: [
      { id: "ol-reply", label: "Reply", icon: Reply, kind: "ribbon", x: 6.2, y: 14.4, w: 7, h: 9.8 },
      { id: "ol-move", label: "Move", icon: FolderInput, kind: "ribbon", x: 13.8, y: 14.4, w: 7, h: 9.8 },
      { id: "ol-new", label: "New mail", icon: Mail, kind: "ribbon", x: 21.4, y: 14.4, w: 7, h: 9.8 },
      { id: "ol-delete", label: "Delete", icon: Trash2, kind: "ribbon", x: 29, y: 14.4, w: 7, h: 9.8 },
      { id: "ol-calendar", label: "Calendar", icon: Calendar, kind: "tool", x: 0.6, y: 28, w: 4.8, h: 5.4 },
      { id: "ol-settings", label: "Settings", icon: Settings, kind: "titlebar", x: 84, y: 1.8, w: 3.6, h: 3.4 },
    ],
    questions: [
      {
        id: "outlook-q1",
        text: "You need to answer the selected message and keep the thread. Where do you click?",
        targetId: "ol-reply",
        explanation: "Reply answers the sender and keeps the conversation history in the thread.",
      },
      {
        id: "outlook-q2",
        text: "You want to schedule a meeting with the team. Where do you click?",
        targetId: "ol-calendar",
        explanation: "The Calendar module in the navigation bar is where meetings are created and scheduled.",
      },
      {
        id: "outlook-q3",
        text: "This message belongs in the Vendors folder. Where do you click?",
        targetId: "ol-move",
        explanation: "Move relocates the selected message to another folder.",
      },
      {
        id: "outlook-q4",
        text: "You will be out of office next week and need an automatic reply. Where do you click?",
        targetId: "ol-settings",
        explanation: "Automatic Replies is configured from Settings (or File > Automatic Replies).",
      },
    ],
  },
  {
    id: "teams",
    name: "Teams",
    accent: "#4b53bc",
    windowTitle: "Microsoft Teams",
    variant: "chat",
    ribbon: false,
    tabs: [],
    extraTargets: [
      { id: "teams-search", label: "Search", icon: Search, kind: "field", x: 34, y: 1.9, w: 34, h: 3.6 },
      { id: "teams-meet", label: "Meet", icon: Video, kind: "titlebar", x: 72, y: 1.8, w: 8, h: 3.7 },
      { id: "teams-calendar", label: "Calendar", icon: Calendar, kind: "tool", x: 0.8, y: 27, w: 4.4, h: 5.2 },
      { id: "teams-attach", label: "Attach", icon: Paperclip, kind: "tool", x: 28.4, y: 90.6, w: 4.4, h: 4.8 },
    ],
    questions: [
      {
        id: "teams-q1",
        text: "You want to start a video call with this channel. Where do you click?",
        targetId: "teams-meet",
        explanation: "Meet starts an instant meeting with the channel, with video and audio.",
      },
      {
        id: "teams-q2",
        text: "You need to share a spreadsheet in the conversation. Where do you click?",
        targetId: "teams-attach",
        explanation: "The paperclip in the compose box attaches a file to the message.",
      },
      {
        id: "teams-q3",
        text: "You want to check the meetings scheduled for this week. Where do you click?",
        targetId: "teams-calendar",
        explanation: "The Calendar app in the left rail shows every meeting you are invited to.",
      },
      {
        id: "teams-q4",
        text: "A message from last week mentioned a change you need to find. Where do you click?",
        targetId: "teams-search",
        explanation: "The search bar at the top searches messages, people, files, and channels.",
      },
    ],
  },
  {
    id: "powerbi",
    name: "Power BI",
    accent: "#f2c811",
    titleInk: "#201f1e",
    windowTitle: "Security Posture Report - Power BI Desktop",
    variant: "report",
    tabs: ["File", "Home", "Insert", "Modeling", "View", "Help"],
    extraTargets: [
      { id: "pbi-publish", label: "Publish", icon: Share, kind: "ribbon", x: 6.2, y: 14.4, w: 8.4, h: 9.8 },
      { id: "pbi-refresh", label: "Refresh", icon: RefreshCw, kind: "ribbon", x: 15.4, y: 14.4, w: 8.4, h: 9.8 },
      { id: "pbi-getdata", label: "Get data", icon: Database, kind: "ribbon", x: 24.6, y: 14.4, w: 8.4, h: 9.8 },
      { id: "pbi-textbox", label: "Text box", icon: Type, kind: "ribbon", x: 33.8, y: 14.4, w: 8.4, h: 9.8 },
      { id: "pbi-newpage", label: "New page", icon: Plus, kind: "tool", x: 9, y: 93.2, w: 4.4, h: 4.4 },
      { id: "pbi-filters", label: "Filters", icon: Filter, kind: "pane", x: 80.5, y: 26.5, w: 18, h: 34 },
    ],
    questions: [
      {
        id: "powerbi-q1",
        text: "The report is ready and must be published so the team can open it. Where do you click?",
        targetId: "pbi-publish",
        explanation: "Publish sends the report to a workspace in the Power BI service.",
      },
      {
        id: "powerbi-q2",
        text: "The source data changed overnight and your visuals are stale. Where do you click?",
        targetId: "pbi-refresh",
        explanation: "Refresh re-runs the queries and loads the latest data into the model.",
      },
      {
        id: "powerbi-q3",
        text: "You want to add a second page of visuals to the report. Where do you click?",
        targetId: "pbi-newpage",
        explanation: "The plus button on the page tab strip adds a new report page.",
      },
      {
        id: "powerbi-q4",
        text: "You need every visual narrowed to a single region. Where do you click?",
        targetId: "pbi-filters",
        explanation: "The Filters pane scopes visuals to the values you choose, such as one region.",
      },
    ],
  },
];

export function appTargets(app) {
  return [
    ...app.tabs.map((label, i) => ({ id: `${app.id}-tab-${i}`, label, kind: "tab", ...tabRect(i) })),
    ...(app.extraTargets || []),
  ];
}

export function targetLabel(app, id) {
  const target = appTargets(app).find((t) => t.id === id);
  return target ? target.label : "another control";
}

export const M365_QUESTIONS = M365_APPS.flatMap((app) =>
  app.questions.map((q) => ({ ...q, appId: app.id, appName: app.name, accent: app.accent }))
);

export const TOTAL_QUESTIONS = M365_QUESTIONS.length;
export const LAB_TITLE = "Microsoft 365 Point & Click Assessment";