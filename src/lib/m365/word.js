/** Word — simulated ribbon, document targets and scored tasks (fictitious data). */
import {
  Save, ClipboardPaste, Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Table, Image, BookOpen, MessageSquarePlus,
  Check, X, ZoomIn, Scissors, Copy, Search, FileText, Printer, Share2, Download,
  Mail, Columns, Ruler, PenTool, Shapes, Link2, Palette, Type,
} from "lucide-react";

/** Paragraph labels used by the document and the comment pane. */
export const WORD_PARAGRAPHS = {
  "word-title": "Title",
  "word-para-2": "2. Liability",
  "word-para-3": "3. Control list",
};

/** Page orientation as the document and its status bar render it. */
export const isLandscape = (state) => state.orientation === "landscape";

/** The document context menu, as Word presents it on right-click. */
export const PARA_MENU = [
  { id: "cut", label: "Cut" },
  { id: "copy", label: "Copy" },
  { id: "paste", label: "Paste Options" },
  { id: "new-comment", label: "New Comment" },
  { id: "reply-comment", label: "Reply to Comment" },
  { id: "track-changes", label: "Track Changes" },
  { id: "font", label: "Font…", opens: true },
  { id: "paragraph", label: "Paragraph…", opens: true },
  { id: "synonym", label: "Synonyms" },
  { id: "translate", label: "Translate" },
  { id: "hyperlink", label: "Link…", opens: true },
];

/** Applies any committed operation to the document state. */
export function reduceWord(state, action) {
  const next = { ...state };
  const target = action.targetId || null;

  if (action.type === "control") {
    if (action.controlId === "heading1" && target) next.headingTarget = target;
    if (action.controlId === "heading2" && target) next.headingTarget = target;
    if (action.controlId === "bold" && target) next.boldParagraph = target;
    if (action.controlId === "italic" && target) next.italicParagraph = target;
    if (action.controlId === "underline" && target) next.underlineParagraph = target;
    if (action.controlId === "accept" || action.controlId === "reject") next.changesAccepted = true;
  }
  if (action.type === "option") {
    if (action.controlId === "orientation") next.orientation = action.optionId;
    if (action.controlId === "margins") next.margin = action.optionId;
    if (action.controlId === "size") next.pageSize = action.optionId;
    if (action.controlId === "columns") next.columns = action.optionId;
    if (action.controlId === "track-changes") next.trackChanges = action.optionId === "track-on";
    if (action.controlId === "zoom") next.zoom = action.optionId;
    if (action.controlId === "font-size" && target) next.fontSize = action.optionId;
    if (action.controlId === "table-of-contents") {
      if (action.optionId === "toc-auto1") next.toc = "auto1";
      if (action.optionId === "toc-auto2") next.toc = "auto2";
      if (action.optionId === "toc-custom") next.toc = "custom";
      if (action.optionId === "toc-remove") next.toc = null;
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
    italicParagraph: null,
    underlineParagraph: null,
    trackChanges: false,
    toc: null,
    commentTarget: null,
    columns: "col-one",
    zoom: "zoom-100",
  },
  tabs: [
    {
      id: "file",
      label: "File",
      groups: [
        { id: "file-actions", label: "File", controls: [
          { id: "save", label: "Save", icon: Save, size: "lg" },
          { id: "save-as", label: "Save As" },
          { id: "print-file", label: "Print", icon: Printer, menu: [
            { id: "print-quick", label: "Print" },
            { id: "print-preview", label: "Print Preview" },
            { id: "print-page-setup", label: "Page Setup…", opens: true },
          ] },
          { id: "export-pdf", label: "Export", icon: Download, menu: [
            { id: "export-pdf-doc", label: "Create PDF/XPS Document" },
            { id: "export-change-file", label: "Change File Type" },
          ] },
        ] },
        { id: "file-info", label: "Info", controls: [
          { id: "protect-document", label: "Protect Document", menu: [
            { id: "protect-encrypt", label: "Encrypt with Password", opens: true },
            { id: "protect-restrict", label: "Restrict Editing" },
            { id: "protect-final", label: "Mark as Final" },
          ] },
          { id: "file-share", label: "Share", icon: Share2 },
          { id: "file-options", label: "Options", opens: true },
        ] },
      ],
    },
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "clipboard", label: "Clipboard", controls: [
          { id: "paste", label: "Paste", icon: ClipboardPaste, size: "lg", menu: [
            { id: "paste-keep-source", label: "Keep Source Formatting" },
            { id: "paste-merge", label: "Merge Formatting" },
            { id: "paste-text", label: "Keep Text Only" },
            { id: "paste-special", label: "Paste Special…", opens: true },
          ] },
          { id: "cut", label: "Cut", icon: Scissors },
          { id: "copy", label: "Copy", icon: Copy },
          { id: "format-painter", label: "Format Painter" },
        ] },
        { id: "font", label: "Font", controls: [
          { id: "bold", label: "Bold", icon: Bold, commits: true },
          { id: "italic", label: "Italic", icon: Italic },
          { id: "underline", label: "Underline", icon: Underline, menu: [
            { id: "underline-single", label: "Underline" },
            { id: "underline-double", label: "Double Underline" },
            { id: "underline-none", label: "None" },
          ] },
          { id: "strikethrough", label: "Strikethrough", icon: Strikethrough },
          { id: "font-size", label: "Font Size", icon: Type, menu: [
            { id: "font-size-9", label: "9" },
            { id: "font-size-10", label: "10" },
            { id: "font-size-11", label: "11" },
            { id: "font-size-12", label: "12" },
            { id: "font-size-14", label: "14" },
            { id: "font-size-18", label: "18" },
            { id: "font-size-24", label: "24" },
          ] },
          { id: "font-color", label: "Font Color", icon: Palette, menu: [
            { id: "color-red", label: "Dark Red" },
            { id: "color-black", label: "Black" },
            { id: "color-blue", label: "Blue" },
            { id: "color-more", label: "More Colors…", opens: true },
          ] },
          { id: "change-case", label: "Change Case", menu: [
            { id: "case-sentence", label: "Sentence case." },
            { id: "case-lower", label: "lowercase" },
            { id: "case-upper", label: "UPPERCASE" },
            { id: "case-capitalize", label: "Capitalize Each Word" },
            { id: "case-toggle", label: "tOGGLE cASE" },
          ] },
          { id: "clear-format", label: "Clear All Formatting" },
        ] },
        { id: "paragraph", label: "Paragraph", controls: [
          { id: "bullets", label: "Bullets", icon: List, menu: [
            { id: "bullet-default", label: "Standard Bullets" },
            { id: "bullet-hollow", label: "Hollow Bullets" },
            { id: "bullet-arrow", label: "Arrow Bullets" },
            { id: "bullet-define", label: "Define New Bullet…", opens: true },
          ] },
          { id: "numbering", label: "Numbering", icon: ListOrdered, menu: [
            { id: "number-default", label: "1. 2. 3." },
            { id: "number-roman", label: "I. II. III." },
            { id: "number-letters", label: "A. B. C." },
            { id: "number-define", label: "Define New Number Format…", opens: true },
          ] },
          { id: "multilevel", label: "Multilevel List", menu: [
            { id: "multilevel-default", label: "1 / 1.1 / 1.1.1" },
            { id: "multilevel-articles", label: "Article I / Section 1.01" },
            { id: "multilevel-define", label: "Define New Multilevel List…", opens: true },
          ] },
          { id: "align-left", label: "Align Left", icon: AlignLeft },
          { id: "align-center", label: "Center", icon: AlignCenter },
          { id: "align-right", label: "Align Right", icon: AlignRight },
          { id: "line-spacing", label: "Line Spacing", menu: [
            { id: "spacing-1", label: "1.0" },
            { id: "spacing-1-15", label: "1.15" },
            { id: "spacing-1-5", label: "1.5" },
            { id: "spacing-2", label: "2.0" },
            { id: "spacing-options", label: "Line Spacing Options…", opens: true },
          ] },
          { id: "shading", label: "Shading", menu: [
            { id: "shading-none", label: "No Color" },
            { id: "shading-grey", label: "Light Grey" },
            { id: "shading-blue", label: "Light Blue" },
          ] },
        ] },
        { id: "styles", label: "Styles", controls: [
          { id: "normal", label: "Normal", gallery: true, commits: true },
          { id: "no-spacing", label: "No Spacing", gallery: true, commits: true },
          { id: "heading1", label: "Heading 1", gallery: true, commits: true },
          { id: "heading2", label: "Heading 2", gallery: true, commits: true },
          { id: "title-style", label: "Title", gallery: true, commits: true },
          { id: "quote", label: "Quote", gallery: true, commits: true },
          { id: "subtle-emphasis", label: "Subtle Emphasis", gallery: true, commits: true },
          { id: "styles-pane", label: "Styles Pane", opens: true },
        ] },
        { id: "editing", label: "Editing", controls: [
          { id: "find", label: "Find", icon: Search, menu: [
            { id: "find-basic", label: "Find…", opens: true },
            { id: "find-advanced", label: "Advanced Find…", opens: true },
            { id: "find-goto", label: "Go To…", opens: true },
          ] },
          { id: "replace", label: "Replace", opens: true },
          { id: "select", label: "Select", menu: [
            { id: "select-all", label: "Select All" },
            { id: "select-objects", label: "Select Objects" },
            { id: "select-pane", label: "Selection Pane…", opens: true },
          ] },
        ] },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      groups: [
        { id: "pages", label: "Pages", controls: [
          { id: "cover-page", label: "Cover Page", icon: FileText, menu: [
            { id: "cover-banded", label: "Banded" },
            { id: "cover-annual", label: "Annual" },
            { id: "cover-remove", label: "Remove Current Cover Page" },
          ] },
          { id: "blank-page", label: "Blank Page" },
          { id: "page-break", label: "Page Break" },
        ] },
        { id: "tables", label: "Tables", controls: [
          { id: "table", label: "Table", icon: Table, size: "lg", menu: [
            { id: "table-3x3", label: "Insert Table 3×3" },
            { id: "table-dialog", label: "Insert Table…", opens: true },
            { id: "table-draw", label: "Draw Table" },
          ] },
          { id: "convert-text", label: "Convert Text to Table" },
          { id: "excel-sheet", label: "Excel Spreadsheet" },
        ] },
        { id: "illustrations", label: "Illustrations", controls: [
          { id: "picture", label: "Pictures", icon: Image, size: "lg", menu: [
            { id: "picture-this-device", label: "This Device…", opens: true },
            { id: "picture-stock", label: "Stock Images…", opens: true },
            { id: "picture-online", label: "Online Pictures…", opens: true },
          ] },
          { id: "shapes", label: "Shapes", icon: Shapes, menu: [
            { id: "shape-rectangle", label: "Rectangle" },
            { id: "shape-arrow", label: "Arrow" },
            { id: "shape-callout", label: "Callout" },
          ] },
          { id: "icons-insert", label: "Icons" },
          { id: "chart-insert", label: "Chart", menu: [
            { id: "chart-column", label: "Column" },
            { id: "chart-line", label: "Line" },
            { id: "chart-pie", label: "Pie" },
          ] },
          { id: "smartart", label: "SmartArt" },
        ] },
        { id: "links", label: "Links", controls: [
          { id: "link", label: "Link", icon: Link2, menu: [
            { id: "link-web", label: "Insert Link…", opens: true },
            { id: "link-bookmark", label: "Insert Bookmark…", opens: true },
          ] },
          { id: "cross-reference", label: "Cross-reference" },
        ] },
        { id: "comments-insert", label: "Comments", controls: [
          { id: "insert-comment", label: "Comment", icon: MessageSquarePlus },
        ] },
        { id: "header-footer", label: "Header & Footer", controls: [
          { id: "header", label: "Header", menu: [
            { id: "header-blank", label: "Blank" },
            { id: "header-document", label: "Document" },
            { id: "header-remove", label: "Remove Header" },
          ] },
          { id: "footer", label: "Footer", menu: [
            { id: "footer-blank", label: "Blank" },
            { id: "footer-document", label: "Document" },
            { id: "footer-remove", label: "Remove Footer" },
          ] },
          { id: "page-number", label: "Page Number", menu: [
            { id: "page-number-top", label: "Top of Page" },
            { id: "page-number-bottom", label: "Bottom of Page" },
            { id: "page-number-format", label: "Format Page Numbers…", opens: true },
          ] },
        ] },
        { id: "text", label: "Text", controls: [
          { id: "text-box", label: "Text Box", menu: [
            { id: "text-box-simple", label: "Simple Text Box" },
            { id: "text-box-draw", label: "Draw Text Box" },
          ] },
          { id: "quick-parts", label: "Quick Parts", menu: [
            { id: "quick-autotext", label: "AutoText" },
            { id: "quick-document-property", label: "Document Property" },
            { id: "quick-field", label: "Field…", opens: true },
          ] },
          { id: "wordart", label: "WordArt" },
          { id: "drop-cap", label: "Drop Cap", menu: [
            { id: "drop-cap-dropped", label: "Dropped" },
            { id: "drop-cap-margin", label: "In Margin" },
            { id: "drop-cap-none", label: "None" },
          ] },
          { id: "date-time", label: "Date & Time", opens: true },
          { id: "symbol", label: "Symbol", opens: true },
        ] },
      ],
    },
    {
      id: "draw",
      label: "Draw",
      groups: [
        { id: "pens", label: "Pens", controls: [
          { id: "draw-touch", label: "Draw with Touch", icon: PenTool },
          { id: "pen-black", label: "Black Pen" },
          { id: "pen-red", label: "Red Pen" },
          { id: "eraser", label: "Eraser" },
        ] },
        { id: "convert-ink", label: "Convert", controls: [
          { id: "ink-shape", label: "Ink to Shape" },
          { id: "ink-math", label: "Ink to Math" },
        ] },
      ],
    },
    {
      id: "design",
      label: "Design",
      groups: [
        { id: "document-formatting", label: "Document Formatting", controls: [
          { id: "themes", label: "Themes", menu: [
            { id: "theme-office", label: "Office" },
            { id: "theme-berlin", label: "Berlin" },
            { id: "theme-banded", label: "Banded" },
            { id: "theme-save", label: "Save Current Theme…", opens: true },
          ] },
          { id: "theme-colors", label: "Colors", menu: [
            { id: "colors-office", label: "Office" },
            { id: "colors-blue-warm", label: "Blue Warm" },
            { id: "colors-greyscale", label: "Grayscale" },
          ] },
          { id: "theme-fonts", label: "Fonts", menu: [
            { id: "fonts-calibri", label: "Calibri" },
            { id: "fonts-aptos", label: "Aptos" },
            { id: "fonts-georgia", label: "Georgia" },
          ] },
          { id: "paragraph-spacing", label: "Paragraph Spacing", menu: [
            { id: "paragraph-spacing-compact", label: "Compact" },
            { id: "paragraph-spacing-open", label: "Open" },
            { id: "paragraph-spacing-relaxed", label: "Relaxed" },
          ] },
        ] },
        { id: "page-background", label: "Page Background", controls: [
          { id: "watermark", label: "Watermark", menu: [
            { id: "watermark-confidential", label: "CONFIDENTIAL" },
            { id: "watermark-draft", label: "DRAFT" },
            { id: "watermark-remove", label: "Remove Watermark" },
          ] },
          { id: "page-color", label: "Page Color", menu: [
            { id: "page-color-white", label: "White" },
            { id: "page-color-cream", label: "Cream" },
            { id: "page-color-grey", label: "Light Grey" },
          ] },
          { id: "page-borders", label: "Page Borders", opens: true },
        ] },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      groups: [
        { id: "page-setup", label: "Page Setup", controls: [
          { id: "margins", label: "Margins", icon: Ruler, menu: [
            { id: "margin-normal", label: "Normal" },
            { id: "margin-narrow", label: "Narrow" },
            { id: "margin-moderate", label: "Moderate" },
            { id: "margin-wide", label: "Wide" },
            { id: "margin-mirrored", label: "Mirrored" },
            { id: "margin-custom", label: "Custom Margins…", opens: true },
          ] },
          { id: "orientation", label: "Orientation", menu: [
            { id: "portrait", label: "Portrait" },
            { id: "landscape", label: "Landscape" },
          ] },
          { id: "size", label: "Size", menu: [
            { id: "size-letter", label: "Letter 8.5\" × 11\"" },
            { id: "size-legal", label: "Legal 8.5\" × 14\"" },
            { id: "size-executive", label: "Executive 7.25\" × 10.5\"" },
            { id: "size-a4", label: "A4 210 × 297 mm" },
            { id: "size-a5", label: "A5 148 × 210 mm" },
            { id: "size-custom", label: "More Paper Sizes…", opens: true },
          ] },
          { id: "columns", label: "Columns", icon: Columns, menu: [
            { id: "col-one", label: "One" },
            { id: "col-two", label: "Two" },
            { id: "col-three", label: "Three" },
            { id: "col-left", label: "Left" },
            { id: "col-right", label: "Right" },
            { id: "col-more", label: "More Columns…", opens: true },
          ] },
          { id: "breaks", label: "Breaks", menu: [
            { id: "break-page", label: "Page" },
            { id: "break-column", label: "Column" },
            { id: "break-section-next", label: "Next Page (Section Break)" },
            { id: "break-section-continuous", label: "Continuous (Section Break)" },
          ] },
          { id: "line-numbers", label: "Line Numbers", menu: [
            { id: "line-numbers-none", label: "None" },
            { id: "line-numbers-continuous", label: "Continuous" },
            { id: "line-numbers-restart", label: "Restart Each Page" },
          ] },
          { id: "hyphenation", label: "Hyphenation", menu: [
            { id: "hyphenation-none", label: "None" },
            { id: "hyphenation-auto", label: "Automatic" },
            { id: "hyphenation-manual", label: "Manual" },
          ] },
        ] },
        { id: "paragraph-layout", label: "Paragraph", controls: [
          { id: "indent", label: "Indent", menu: [
            { id: "indent-increase", label: "Increase Indent" },
            { id: "indent-decrease", label: "Decrease Indent" },
          ] },
          { id: "spacing", label: "Spacing", menu: [
            { id: "spacing-before-0", label: "Remove Space Before Paragraph" },
            { id: "spacing-after-0", label: "Remove Space After Paragraph" },
            { id: "spacing-add-before", label: "Add Space Before Paragraph" },
            { id: "spacing-add-after", label: "Add Space After Paragraph" },
          ] },
        ] },
        { id: "arrange", label: "Arrange", controls: [
          { id: "position", label: "Position", menu: [
            { id: "position-inline", label: "In Line with Text" },
            { id: "position-wrap-square", label: "With Text Wrapping" },
          ] },
          { id: "wrap-text", label: "Wrap Text", menu: [
            { id: "wrap-square", label: "Square" },
            { id: "wrap-tight", label: "Tight" },
            { id: "wrap-behind", label: "Behind Text" },
            { id: "wrap-front", label: "In Front of Text" },
          ] },
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
          { id: "rotate", label: "Rotate", menu: [
            { id: "rotate-right", label: "Rotate Right 90°" },
            { id: "rotate-left", label: "Rotate Left 90°" },
            { id: "rotate-flip", label: "Flip Vertical" },
          ] },
        ] },
      ],
    },
    {
      id: "references",
      label: "References",
      groups: [
        { id: "toc", label: "Table of Contents", controls: [
          { id: "table-of-contents", label: "Table of Contents", icon: BookOpen, menu: [
            { id: "toc-add-text", label: "Add Text", opens: true },
            { id: "toc-update", label: "Update Table…", opens: true },
            { id: "toc-auto1", label: "Automatic Table 1" },
            { id: "toc-auto2", label: "Automatic Table 2" },
            { id: "toc-custom", label: "Custom Table of Contents…", opens: true },
            { id: "toc-remove", label: "Remove Table of Contents" },
          ] },
          { id: "footnote", label: "Insert Footnote" },
          { id: "endnote", label: "Insert Endnote" },
          { id: "next-footnote", label: "Next Footnote", menu: [
            { id: "next-footnote-next", label: "Next Footnote" },
            { id: "next-footnote-previous", label: "Previous Footnote" },
          ] },
        ] },
        { id: "citations", label: "Citations & Bibliography", controls: [
          { id: "citation", label: "Insert Citation", menu: [
            { id: "citation-add", label: "Add New Source…", opens: true },
            { id: "citation-reuse", label: "Add New Placeholder…", opens: true },
          ] },
          { id: "manage-sources", label: "Manage Sources", opens: true },
          { id: "bibliography-style", label: "Style", menu: [
            { id: "style-apa", label: "APA" },
            { id: "style-mla", label: "MLA" },
            { id: "style-chicago", label: "Chicago" },
          ] },
          { id: "bibliography", label: "Bibliography", menu: [
            { id: "bibliography-works-cited", label: "Works Cited" },
            { id: "bibliography-references", label: "References" },
            { id: "bibliography-insert", label: "Insert Bibliography" },
          ] },
        ] },
        { id: "captions", label: "Captions", controls: [
          { id: "insert-caption", label: "Insert Caption", opens: true },
          { id: "cross-ref-table", label: "Cross-reference" },
          { id: "table-of-figures", label: "Insert Table of Figures" },
        ] },
        { id: "index", label: "Index", controls: [
          { id: "mark-entry", label: "Mark Entry" },
          { id: "insert-index", label: "Insert Index" },
        ] },
      ],
    },
    {
      id: "mailings",
      label: "Mailings",
      groups: [
        { id: "create", label: "Create", controls: [
          { id: "envelopes", label: "Envelopes", opens: true },
          { id: "labels", label: "Labels", opens: true },
        ] },
        { id: "start-merge", label: "Start Mail Merge", controls: [
          { id: "start-mail-merge", label: "Start Mail Merge", icon: Mail, menu: [
            { id: "merge-letters", label: "Letters" },
            { id: "merge-email", label: "E-mail Messages" },
            { id: "merge-envelopes", label: "Envelopes" },
            { id: "merge-labels", label: "Labels" },
            { id: "merge-directory", label: "Directory" },
          ] },
          { id: "select-recipients", label: "Select Recipients", menu: [
            { id: "recipients-type", label: "Type a New List…", opens: true },
            { id: "recipients-existing", label: "Use an Existing List…", opens: true },
            { id: "recipients-outlook", label: "Choose from Outlook Contacts" },
          ] },
          { id: "edit-recipients", label: "Edit Recipient List", opens: true },
        ] },
        { id: "write-fields", label: "Write & Insert Fields", controls: [
          { id: "highlight-merge", label: "Highlight Merge Fields" },
          { id: "address-block", label: "Address Block", opens: true },
          { id: "greeting-line", label: "Greeting Line", opens: true },
          { id: "merge-field", label: "Insert Merge Field", menu: [
            { id: "merge-field-name", label: "Full Name" },
            { id: "merge-field-company", label: "Company" },
            { id: "merge-field-email", label: "E-mail Address" },
          ] },
        ] },
        { id: "preview", label: "Preview Results", controls: [
          { id: "preview-results", label: "Preview Results" },
          { id: "find-recipient", label: "Find Recipient" },
        ] },
        { id: "finish", label: "Finish", controls: [
          { id: "finish-merge", label: "Finish & Merge", menu: [
            { id: "finish-edit", label: "Edit Individual Documents…", opens: true },
            { id: "finish-print", label: "Print Documents…", opens: true },
            { id: "finish-email", label: "Send E-mail Messages…", opens: true },
          ] },
        ] },
      ],
    },
    {
      id: "review",
      label: "Review",
      groups: [
        { id: "proofing", label: "Proofing", controls: [
          { id: "spelling", label: "Spelling & Grammar" },
          { id: "thesaurus", label: "Thesaurus" },
          { id: "word-count", label: "Word Count", opens: true },
          { id: "translate", label: "Translate", menu: [
            { id: "translate-doc", label: "Translate Document" },
            { id: "translate-selection", label: "Translate Selection" },
          ] },
        ] },
        { id: "accessibility", label: "Accessibility", controls: [
          { id: "check-accessibility", label: "Check Accessibility" },
        ] },
        { id: "comments", label: "Comments", controls: [
          { id: "ribbon-comment", label: "New Comment", icon: MessageSquarePlus, size: "lg" },
          { id: "delete-comment", label: "Delete" },
          { id: "previous-comment", label: "Previous" },
          { id: "next-comment", label: "Next" },
          { id: "show-comments", label: "Show Comments" },
        ] },
        { id: "tracking", label: "Tracking", controls: [
          { id: "track-changes", label: "Track Changes", menu: [
            { id: "track-on", label: "All Markup: On" },
            { id: "track-simple", label: "Simple Markup" },
            { id: "track-none", label: "No Markup" },
            { id: "track-original", label: "Original" },
            { id: "track-off", label: "Off" },
            { id: "track-options", label: "Change Tracking Options…", opens: true },
          ] },
          { id: "reviewing-pane", label: "Reviewing Pane", menu: [
            { id: "pane-vertical", label: "Vertical" },
            { id: "pane-horizontal", label: "Horizontal" },
          ] },
          { id: "markup-options", label: "Markup Options", menu: [
            { id: "markup-comments", label: "Comments" },
            { id: "markup-insertions", label: "Insertions and Deletions" },
            { id: "markup-formatting", label: "Formatting" },
          ] },
        ] },
        { id: "changes", label: "Changes", controls: [
          { id: "accept", label: "Accept", icon: Check, menu: [
            { id: "accept-move-next", label: "Accept and Move to Next" },
            { id: "accept-this", label: "Accept This Change" },
            { id: "accept-all", label: "Accept All Changes" },
            { id: "accept-stop", label: "Accept All Changes and Stop Tracking" },
          ] },
          { id: "reject", label: "Reject", icon: X, menu: [
            { id: "reject-move-next", label: "Reject and Move to Next" },
            { id: "reject-this", label: "Reject This Change" },
            { id: "reject-all", label: "Reject All Changes" },
          ] },
          { id: "previous-change", label: "Previous" },
          { id: "next-change", label: "Next" },
        ] },
        { id: "protect", label: "Protect", controls: [
          { id: "restrict-editing", label: "Restrict Editing", opens: true },
          { id: "compare-documents", label: "Compare", menu: [
            { id: "compare-doc", label: "Compare…", opens: true },
            { id: "combine-doc", label: "Combine…", opens: true },
          ] },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "views", label: "Views", controls: [
          { id: "read-mode", label: "Read Mode" },
          { id: "print-layout", label: "Print Layout" },
          { id: "web-layout", label: "Web Layout" },
          { id: "draft-view", label: "Draft" },
        ] },
        { id: "show", label: "Show", controls: [
          { id: "ruler", label: "Ruler" },
          { id: "gridlines", label: "Gridlines" },
          { id: "navigation-pane", label: "Navigation Pane" },
        ] },
        { id: "zoom", label: "Zoom", controls: [
          { id: "zoom", label: "Zoom", icon: ZoomIn, menu: [
            { id: "zoom-page-width", label: "Page Width" },
            { id: "zoom-whole-page", label: "Whole Page" },
            { id: "zoom-100", label: "100%" },
            { id: "zoom-125", label: "125%" },
            { id: "zoom-150", label: "150%" },
            { id: "zoom-200", label: "200%" },
            { id: "zoom-custom", label: "Zoom…", opens: true },
          ] },
          { id: "zoom-selection", label: "Zoom to Selection" },
        ] },
        { id: "window", label: "Window", controls: [
          { id: "new-window", label: "New Window" },
          { id: "arrange-all", label: "Arrange All" },
          { id: "split-window", label: "Split" },
          { id: "view-side-by-side", label: "View Side by Side" },
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
      id: "help",
      label: "Help",
      groups: [
        { id: "support", label: "Help", controls: [
          { id: "word-help", label: "Help" },
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
      id: "word-q1",
      /* Minimum physical clicks: Layout tab, Orientation menu, Landscape. */
      minClicks: 3,
      task: "This policy has to print side-on so the control tables fit on the page when the document is sent to a printer.",
      answers: [{ kind: "option", control: "orientation", option: "landscape" }],
      verify: (state) => isLandscape(state),
      explanation:
        "Orientation is a Page Setup command on the Layout tab. The option inside the Orientation menu is what applies the page size.",
    },
    {
      id: "word-q2",
      /* References tab, Table of Contents menu, Automatic Table 1. */
      minClicks: 3,
      task: "Readers need a navigable outline of the sections at the front of the policy, so any section can be jumped to directly.",
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
      task: "Legal must be able to see every edit before anyone accepts it, and nothing should be applied on their behalf.",
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
      task: "The document title is still ordinary body text and never appears in the outline, so it has to be treated as a heading.",
      answers: [{ kind: "control", control: "heading1", target: "word-title" }],
      verify: (state) => state.headingTarget === "word-title",
      explanation:
        "The Styles gallery on the Home tab restyles the paragraph you are working in, so the title must be selected first.",
    },
    {
      id: "word-q5",
      /* Right-click the paragraph, then New Comment. */
      minClicks: 2,
      task: "You have a question for Legal about the liability clause, and it must stay attached to that clause wherever the text moves.",
      answers: [{ kind: "menu", target: "word-para-2", item: "new-comment" }],
      verify: (state) => state.commentTarget === "word-para-2",
      explanation:
        "Right-clicking text opens the document context menu, where New Comment anchors a review comment to that paragraph.",
    },
    {
      id: "word-q6",
      /* Select the paragraph, then Bold (Home is already open). */
      minClicks: 2,
      task: "The three control statements need to stand out from the surrounding policy text so they are not skimmed past.",
      answers: [{ kind: "control", control: "bold", target: "word-para-3" }],
      verify: (state) => state.boldParagraph === "word-para-3",
      explanation:
        "Formatting applies to the selected text, so the control-list paragraph is selected before the style is applied on Home.",
    },
  ],
};