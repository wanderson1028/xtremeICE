/** Word — simulated ribbon, document targets and scored tasks (fictitious data). */
import {
  Save, ClipboardPaste, Bold, Italic, List, ListOrdered, Table, Image,
  BookOpen, MessageSquarePlus, Check, X, ZoomIn,
} from "lucide-react";

export const wordApp = {
  id: "word",
  name: "Word",
  accent: "#2b579a",
  windowTitle: "Q4_Security_Policy.docx — Word",
  variant: "word",
  defaultTab: "home",
  defaults: {
    orientation: "portrait",
    heading1: false,
    trackChanges: false,
    toc: false,
    comment: false,
    bold: false,
    notice: "",
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
          { id: "bold", label: "Bold", icon: Bold },
          { id: "italic", label: "Italic", icon: Italic },
        ] },
        { id: "paragraph", label: "Paragraph", controls: [
          { id: "bullets", label: "Bullets", icon: List },
          { id: "numbering", label: "Numbering", icon: ListOrdered },
        ] },
        { id: "styles", label: "Styles", controls: [
          { id: "heading1", label: "Heading 1", gallery: true },
          { id: "normal", label: "Normal", gallery: true },
          { id: "quote", label: "Quote", gallery: true },
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
            { id: "toc-custom", label: "Custom Table of Contents…" },
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
      task: "Make sure the policy prints in landscape rather than portrait orientation.",
      steps: [
        { do: "tab", tab: "layout" },
        { do: "control", control: "orientation" },
        { do: "option", control: "orientation", option: "landscape" },
      ],
      effect: { orientation: "landscape", notice: "Page setup applied: Landscape 11 × 8.5 in" },
      explanation:
        "Orientation is a Page Setup command on the Layout tab. Choosing Layout alone does nothing; the option inside the Orientation menu is what applies the page size.",
    },
    {
      id: "word-q2",
      task: "Add a generated table of contents at the start of the document.",
      steps: [
        { do: "tab", tab: "references" },
        { do: "control", control: "table-of-contents" },
        { do: "option", control: "table-of-contents", option: "toc-auto1" },
      ],
      effect: { toc: true, notice: "Table of Contents inserted with 3 entries" },
      explanation:
        "The Table of Contents menu on the References tab inserts a generated, automatically updating outline.",
    },
    {
      id: "word-q3",
      task: "Legal must see every edit before it is accepted. Turn change tracking on.",
      steps: [
        { do: "tab", tab: "review" },
        { do: "control", control: "track-changes" },
        { do: "option", control: "track-changes", option: "track-on" },
      ],
      effect: { trackChanges: true, notice: "Track Changes: All Markup on" },
      explanation: "Change tracking is switched on from the Track Changes menu on the Review tab.",
    },
    {
      id: "word-q4",
      task: "The document title must use the built-in Heading 1 style so the table of contents can find it.",
      steps: [{ do: "control", control: "heading1" }],
      effect: { heading1: true, notice: "Title styled with Heading 1" },
      explanation: "The Styles gallery on the Home tab applies built-in styles such as Heading 1.",
    },
    {
      id: "word-q5",
      task: "Ask Legal a question about the liability paragraph: start a comment thread attached to that paragraph.",
      steps: [
        { do: "context", target: "word-para-2" },
        { do: "menu", target: "word-para-2", item: "new-comment" },
      ],
      effect: { comment: true, notice: "Comment thread added to the liability paragraph" },
      explanation:
        "Right-clicking text opens the document context menu, where New Comment anchors a review comment to that paragraph.",
    },
    {
      id: "word-q6",
      task: "Emphasise the three control statements by making that paragraph bold.",
      steps: [
        { do: "click", target: "word-para-3" },
        { do: "control", control: "bold" },
      ],
      effect: { bold: true, notice: "Control list paragraph formatted bold" },
      explanation: "Formatting applies to the selected text, so the paragraph is selected first, then Bold is used on Home.",
    },
  ],
};