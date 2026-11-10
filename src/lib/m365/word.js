/** Word — simulated ribbon, document targets and scored tasks (fictitious data). */
import {
  Save, ClipboardPaste, Bold, Italic, List, ListOrdered, Table, Image,
  BookOpen, MessageSquarePlus, Check, X, ZoomIn,
} from "lucide-react";

/** Paragraph labels used by the document and the comment pane. */
export const WORD_PARAGRAPHS = {
  "word-title": "Title",
  "word-para-2": "2. Liability",
  "word-para-3": "3. Control list",
};

/** Page orientation as the document and its status bar render it. */
export const isLandscape = (state) => state.orientation === "landscape";

export const PARA_MENU = [
  { id: "new-comment", label: "New Comment" },
  { id: "reply-comment", label: "Reply to Comment" },
  { id: "track-changes", label: "Track Changes" },
  { id: "font", label: "Font…", opens: true },
  { id: "paragraph", label: "Paragraph…", opens: true },
];

/** Applies any committed operation to the document state. */
export function reduceWord(state, action) {
  const next = { ...state };
  const target = action.targetId || null;

  if (action.type === "control") {
    if (action.controlId === "heading1" && target) next.headingTarget = target;
    if (action.controlId === "bold" && target) next.boldParagraph = target;
    if (action.controlId === "accept" || action.controlId === "reject") next.changesAccepted = true;
  }
  if (action.type === "option") {
    if (action.controlId === "orientation") next.orientation = action.optionId;
    if (action.controlId === "margins") next.margin = action.optionId;
    if (action.controlId === "size") next.pageSize = action.optionId;
    if (action.controlId === "columns") next.columns = action.optionId;
    if (action.controlId === "track-changes") next.trackChanges = action.optionId === "track-on";
    if (action.controlId === "zoom") next.zoom = action.optionId;
    if (action.controlId === "table-of-contents") {
      if (action.optionId === "toc-custom") next.toc = "custom";
      else next.toc = action.optionId === "toc-auto2" ? "auto2" : "auto1";
    }
  }
  if (action.type === "menu") {
    if (action.itemId === "new-comment") next.commentTarget = target;
    if (action.itemId === "track-changes") next.trackChanges = true;
  }
  return next;
}

export const wordApp = {
  id: "word",
  name: "Word",
  accent: "#2b579a",
  windowTitle: "Q4_Security_Policy.docx — Word",
  variant: "word",
  defaultTab: "home",
  reduce: reduceWord,
  defaults: {
    orientation: "portrait",
    margin: "margin-normal",
    pageSize: "size-letter",
    headingTarget: null,
    boldParagraph: null,
    trackChanges: false,
    toc: null,
    commentTarget: null,
  },
  tabs: [
    {
      id: "file",
      label: "File",
      groups: [
        { id: "file-actions", label: "File", controls: [
          { id: "save", label: "Save", icon: Save, size: "lg" },
          { id: "save-as", label: "Save As" },
        ] },
      ],
    },
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "clipboard", label: "Clipboard", controls: [{ id: "paste", label: "Paste", icon: ClipboardPaste, size: "lg" }] },
        { id: "font", label: "Font", controls: [
          { id: "bold", label: "Bold", icon: Bold, commits: true },
          { id: "italic", label: "Italic", icon: Italic },
        ] },
        { id: "paragraph", label: "Paragraph", controls: [
          { id: "bullets", label: "Bullets", icon: List },
          { id: "numbering", label: "Numbering", icon: ListOrdered },
        ] },
        { id: "styles", label: "Styles", controls: [
          { id: "heading1", label: "Heading 1", gallery: true, commits: true },
          { id: "normal", label: "Normal", gallery: true, commits: true },
          { id: "quote", label: "Quote", gallery: true, commits: true },
        ] },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      groups: [
        { id: "pages", label: "Pages", controls: [{ id: "blank-page", label: "Blank Page" }] },
        { id: "tables", label: "Tables", controls: [{ id: "table", label: "Table", icon: Table, size: "lg" }] },
        { id: "illustrations", label: "Illustrations", controls: [{ id: "picture", label: "Pictures", icon: Image, size: "lg" }] },
        { id: "links", label: "Links", controls: [{ id: "link", label: "Link" }] },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      groups: [
        { id: "page-setup", label: "Page Setup", controls: [
          { id: "orientation", label: "Orientation", menu: [
            { id: "portrait", label: "Portrait" },
            { id: "landscape", label: "Landscape" },
          ] },
          { id: "margins", label: "Margins", menu: [
            { id: "margin-normal", label: "Normal" },
            { id: "margin-narrow", label: "Narrow" },
            { id: "margin-wide", label: "Wide" },
          ] },
          { id: "size", label: "Size", menu: [
            { id: "size-letter", label: "Letter" },
            { id: "size-legal", label: "Legal" },
          ] },
          { id: "columns", label: "Columns", menu: [
            { id: "col-one", label: "One" },
            { id: "col-two", label: "Two" },
          ] },
        ] },
        { id: "paragraph-layout", label: "Paragraph", controls: [
          { id: "indent", label: "Indent" },
          { id: "spacing", label: "Spacing" },
        ] },
      ],
    },
    {
      id: "references",
      label: "References",
      groups: [
        { id: "toc", label: "Table of Contents", controls: [
          { id: "table-of-contents", label: "Table of Contents", icon: BookOpen, menu: [
            { id: "toc-auto1", label: "Automatic Table 1" },
            { id: "toc-auto2", label: "Automatic Table 2" },
            { id: "toc-custom", label: "Custom Table of Contents…", opens: true },
          ] },
          { id: "footnote", label: "Insert Footnote" },
        ] },
        { id: "citations", label: "Citations", controls: [
          { id: "citation", label: "Insert Citation" },
          { id: "bibliography", label: "Bibliography" },
        ] },
      ],
    },
    {
      id: "review",
      label: "Review",
      groups: [
        { id: "comments", label: "Comments", controls: [
          { id: "ribbon-comment", label: "New Comment", icon: MessageSquarePlus, size: "lg" },
          { id: "delete-comment", label: "Delete" },
        ] },
        { id: "tracking", label: "Tracking", controls: [
          { id: "track-changes", label: "Track Changes", menu: [
            { id: "track-on", label: "All Markup: On" },
            { id: "track-off", label: "Off" },
          ] },
          { id: "reviewing-pane", label: "Reviewing Pane" },
        ] },
        { id: "changes", label: "Changes", controls: [
          { id: "accept", label: "Accept", icon: Check },
          { id: "reject", label: "Reject", icon: X },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "views", label: "Views", controls: [
          { id: "print-layout", label: "Print Layout" },
          { id: "read-mode", label: "Read Mode" },
          { id: "web-layout", label: "Web Layout" },
        ] },
        { id: "zoom", label: "Zoom", controls: [
          { id: "zoom", label: "Zoom", icon: ZoomIn, menu: [
            { id: "zoom-100", label: "100%" },
            { id: "zoom-125", label: "125%" },
          ] },
        ] },
      ],
    },
  ],
  questions: [
    {
      id: "word-q1",
      /* Minimum physical clicks: Layout tab, Orientation menu, Landscape. */
      minClicks: 3,
      task: "Make sure the policy prints in landscape rather than portrait orientation.",
      answers: [{ kind: "option", control: "orientation", option: "landscape" }],
      verify: (state) => isLandscape(state),
      explanation:
        "Orientation is a Page Setup command on the Layout tab. The option inside the Orientation menu is what applies the page size.",
    },
    {
      id: "word-q2",
      /* References tab, Table of Contents menu, Automatic Table 1. */
      minClicks: 3,
      task: "Add a generated table of contents at the start of the document.",
      answers: [
        { kind: "option", control: "table-of-contents", option: "toc-auto1" },
        { kind: "option", control: "table-of-contents", option: "toc-auto2" },
      ],
      verify: (state) => state.toc === "auto1" || state.toc === "auto2",
      explanation:
        "The Table of Contents menu on the References tab inserts a generated, automatically updating outline.",
    },
    {
      id: "word-q3",
      /* Review tab, Track Changes menu, All Markup: On. */
      minClicks: 3,
      task: "Legal must see every edit before it is accepted. Turn change tracking on.",
      answers: [
        { kind: "option", control: "track-changes", option: "track-on" },
        { kind: "menu", item: "track-changes" },
      ],
      verify: (state) => state.trackChanges === true,
      explanation: "Change tracking is switched on from the Track Changes command on the Review tab.",
    },
    {
      id: "word-q4",
      /* Select the title, then Heading 1 (Home is already open). */
      minClicks: 2,
      task: "Select the document title, then restyle it with the built-in Heading 1 style so the table of contents can find it.",
      answers: [{ kind: "control", control: "heading1", target: "word-title" }],
      verify: (state) => state.headingTarget === "word-title",
      explanation:
        "The Styles gallery on the Home tab restyles the paragraph you are working in, so the title must be selected first.",
    },
    {
      id: "word-q5",
      /* Right-click the paragraph, then New Comment. */
      minClicks: 2,
      task: "Ask Legal a question about the liability paragraph: anchor a new comment to that paragraph.",
      answers: [{ kind: "menu", target: "word-para-2", item: "new-comment" }],
      verify: (state) => state.commentTarget === "word-para-2",
      explanation:
        "Right-clicking text opens the document context menu, where New Comment anchors a review comment to that paragraph.",
    },
    {
      id: "word-q6",
      /* Select the paragraph, then Bold (Home is already open). */
      minClicks: 2,
      task: "Emphasise the three control statements by making that paragraph bold.",
      answers: [{ kind: "control", control: "bold", target: "word-para-3" }],
      verify: (state) => state.boldParagraph === "word-para-3",
      explanation:
        "Formatting applies to the selected text, so the control-list paragraph is selected before Bold is used on Home.",
    },
  ],
};