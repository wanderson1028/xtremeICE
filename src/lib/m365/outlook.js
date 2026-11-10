/** Outlook — simulated ribbon, message list, dialogs and scored tasks (fictitious data). */
import {
  Reply, Forward, Trash2, Settings, Mail, Calendar, Users, Paperclip, Search,
  Filter, ArrowUpDown, Check,
} from "lucide-react";

/** The message list context menu, as Outlook presents it on right-click. */
export const MESSAGE_MENU = [
  { id: "open-message", label: "Open" },
  { id: "reply", label: "Reply" },
  { id: "reply-all", label: "Reply All" },
  { id: "forward", label: "Forward" },
  { id: "move-to", label: "Move to…", opens: true },
  { id: "flag", label: "Flag" },
  { id: "mark-read", label: "Mark as read" },
  { id: "categorize-message", label: "Categorize", opens: true },
  { id: "ignore-thread", label: "Ignore Conversation" },
  { id: "delete", label: "Delete" },
];

export const OUTLOOK_DIALOGS = {
  "ol-auto-replies": {
    title: "Automatic replies",
    description:
      "Outside my organization: “I am on call this week and monitoring the SOC queue.” Replies stay on until they are turned off.",
    confirm: "Turn on",
  },
};

/** Applies any committed operation to the mailbox state. */
export function reduceOutlook(state, action) {
  const next = { ...state };
  const target = action.targetId || null;

  if (action.type === "control") {
    if (action.controlId === "reply" || action.controlId === "reply-all") next.replyDraftFor = target;
    if (action.controlId === "forward") next.forwardOf = target;
    if (action.controlId === "delete") next.deletedMessage = target;
    if (action.controlId === "flag" || action.controlId === "flag-follow-up") next.flagMessage = target;
    if (action.controlId === "archive" && target) next.archivedMessage = target;
  }
  if (action.type === "option") {
    if (action.controlId === "move") next.movedMessage = target;
    if (action.controlId === "filter") next.filter = action.optionId;
    if (action.controlId === "sort") next.sorting = action.optionId;
    if (action.controlId === "reading-pane") next.readingPane = action.optionId;
    if (action.controlId === "message-preview") next.preview = action.optionId;
    if (action.controlId === "junk") next.junkAction = action.optionId;
  }
  if (action.type === "menu") {
    if (action.itemId === "reply") next.replyDraftFor = target;
    if (action.itemId === "reply-all") next.replyDraftFor = target;
    if (action.itemId === "forward") next.forwardOf = target;
    if (action.itemId === "delete") next.deletedMessage = target;
    if (action.itemId === "flag") next.flagMessage = target;
    if (action.itemId === "mark-read") next.readMessage = target;
    if (action.itemId === "ignore-thread") next.ignoredThread = target;
  }
  if (action.type === "confirm" && action.dialogId === "ol-auto-replies") {
    next.autoReplies = true;
  }
  return next;
}

export const outlookApp = {
  id: "outlook",
  name: "Outlook",
  accent: "#0f6cbd",
  windowTitle: "Mail — Outlook",
  variant: "mail",
  defaultTab: "home",
  reduce: reduceOutlook,
  dialogs: OUTLOOK_DIALOGS,
  titleActions: [
    { id: "settings", label: "Settings", icon: Settings, menu: [
      { id: "mail-settings", label: "Mail", opens: true },
      { id: "auto-replies", label: "Automatic replies", opens: "ol-auto-replies" },
      { id: "calendar-settings", label: "Calendar", opens: true },
      { id: "connected-accounts", label: "Connected accounts", opens: true },
      { id: "outlook-rules", label: "Rules", opens: true },
      { id: "outlook-signatures", label: "Signatures", opens: true },
      { id: "outlook-offline", label: "Offline", opens: true },
    ] },
  ],
  tabs: [
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "new", label: "New", controls: [
          { id: "new-mail", label: "New mail", icon: Mail, size: "lg" },
          { id: "new-items", label: "New items", menu: [
            { id: "new-event", label: "Meeting" },
            { id: "new-contact", label: "Contact" },
            { id: "new-task", label: "Task" },
            { id: "new-note", label: "Note" },
          ] },
          { id: "new-event-ribbon", label: "New event", icon: Calendar },
        ] },
        { id: "delete-group", label: "Delete", controls: [
          { id: "delete", label: "Delete", icon: Trash2, size: "lg", commits: true },
          { id: "archive", label: "Archive" },
          { id: "junk", label: "Junk", menu: [
            { id: "junk-block", label: "Block Sender" },
            { id: "junk-never-block", label: "Never Block Sender" },
            { id: "junk-report", label: "Report as Phishing" },
            { id: "junk-options", label: "Junk Email Options…", opens: true },
          ] },
          { id: "clean-up", label: "Clean Up", menu: [
            { id: "clean-up-folder", label: "Clean Up Folder" },
            { id: "clean-up-conversation", label: "Clean Up Conversation" },
          ] },
        ] },
        { id: "respond", label: "Respond", controls: [
          { id: "reply", label: "Reply", icon: Reply, size: "lg", commits: true },
          { id: "reply-all", label: "Reply all" },
          { id: "forward", label: "Forward", icon: Forward },
          { id: "meeting-reply", label: "Meeting", menu: [
            { id: "reply-with-meeting", label: "Reply with Meeting" },
            { id: "reply-all-meeting", label: "Reply All with Meeting" },
          ] },
        ] },
        { id: "move-group", label: "Move", controls: [
          { id: "move", label: "Move", menu: [
            { id: "vendors", label: "Vendors" },
            { id: "archive", label: "Archive" },
            { id: "junk", label: "Junk Email" },
            { id: "inbox", label: "Inbox" },
            { id: "sent-items", label: "Sent Items" },
            { id: "move-other-folder", label: "Move to Other Folder…", opens: true },
            { id: "move-new-folder", label: "Create New Folder…", opens: true },
          ] },
          { id: "rules", label: "Rules", menu: [
            { id: "rules-always-move", label: "Always Move Messages From…", opens: true },
            { id: "rules-manage", label: "Manage Rules & Alerts…", opens: true },
          ] },
        ] },
        { id: "tags", label: "Tags", controls: [
          { id: "flag", label: "Flag" },
          { id: "categorize", label: "Categorize", menu: [
            { id: "category-red", label: "Red Category" },
            { id: "category-blue", label: "Blue Category" },
            { id: "category-green", label: "Green Category" },
            { id: "category-clear", label: "Clear All Categories" },
          ] },
          { id: "follow-up", label: "Follow Up", menu: [
            { id: "follow-up-today", label: "Today" },
            { id: "follow-up-tomorrow", label: "Tomorrow" },
            { id: "follow-up-week", label: "Next Week" },
            { id: "follow-up-custom", label: "Custom…", opens: true },
          ] },
        ] },
        { id: "find", label: "Find", controls: [
          { id: "search", label: "Search", icon: Search },
          { id: "filter", label: "Filter Email", icon: Filter, menu: [
            { id: "all", label: "All mail" },
            { id: "unread", label: "Unread" },
            { id: "flagged", label: "Flagged" },
            { id: "mentions", label: "Mentions" },
            { id: "attachments", label: "Has Attachments" },
            { id: "filter-this-week", label: "This Week" },
            { id: "filter-sent-to-me", label: "Sent to Me" },
          ] },
          { id: "find-related", label: "Find Related", menu: [
            { id: "related-from", label: "Messages from Sender" },
            { id: "related-thread", label: "Messages in This Conversation" },
          ] },
        ] },
      ],
    },
    {
      id: "send-receive",
      label: "Send / Receive",
      groups: [
        { id: "send-receive-group", label: "Send & Receive", controls: [
          { id: "send-all", label: "Send/Receive All Folders" },
          { id: "update-folder", label: "Update Folder" },
          { id: "work-offline", label: "Work Offline" },
        ] },
        { id: "download", label: "Download", controls: [
          { id: "download-headers", label: "Download Headers" },
          { id: "download-items", label: "Download All Items" },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "current-view", label: "Current View", controls: [
          { id: "change-view", label: "Change View", menu: [
            { id: "view-compact", label: "Compact" },
            { id: "view-single", label: "Single" },
            { id: "view-preview", label: "Preview" },
          ] },
          { id: "view-settings", label: "View Settings", opens: true },
          { id: "reset-view", label: "Reset View" },
        ] },
        { id: "layout", label: "Layout", controls: [
          { id: "reading-pane", label: "Reading pane", menu: [
            { id: "pane-right", label: "Right" },
            { id: "pane-bottom", label: "Bottom" },
            { id: "pane-off", label: "Off" },
          ] },
          { id: "message-preview", label: "Message Preview", menu: [
            { id: "preview-off", label: "Off" },
            { id: "preview-1", label: "1 line" },
            { id: "preview-2", label: "2 lines" },
            { id: "preview-3", label: "3 lines" },
          ] },
          { id: "conversation-settings", label: "Conversations", menu: [
            { id: "conversations-on", label: "Show as Conversations" },
            { id: "conversations-off", label: "Show as Individual Messages" },
          ] },
        ] },
        { id: "arrange", label: "Messages", controls: [
          { id: "sort", label: "Sort", icon: ArrowUpDown, menu: [
            { id: "sort-newest", label: "Newest first" },
            { id: "sort-oldest", label: "Oldest first" },
            { id: "sort-from", label: "From" },
            { id: "sort-subject", label: "Subject" },
          ] },
          { id: "arrange-by", label: "Arrange By", menu: [
            { id: "arrange-date", label: "Date" },
            { id: "arrange-from", label: "From" },
            { id: "arrange-size", label: "Size" },
          ] },
        ] },
        { id: "window", label: "Window", controls: [
          { id: "new-window", label: "New Window" },
          { id: "reminder-window", label: "Reminders", opens: true },
        ] },
      ],
    },
    {
      id: "help",
      label: "Help",
      groups: [
        { id: "support", label: "Help", controls: [
          { id: "help-center", label: "Help" },
          { id: "contact-support", label: "Contact Support" },
          { id: "whats-new", label: "What's New" },
          { id: "trainings", label: "Show Training" },
          { id: "feedback", label: "Feedback" },
        ] },
      ],
    },
  ],
  defaults: {
    replyDraftFor: null,
    forwardOf: null,
    movedMessage: null,
    deletedMessage: null,
    flagMessage: null,
    filter: "all",
    sorting: "sort-newest",
    readingPane: "pane-right",
    autoReplies: false,
  },
  questions: [
    {
      id: "outlook-q1",
      /* Select the message, then Reply (Home is already open). */
      minClicks: 2,
      task: "Dana Whitfield needs an answer to her Q4 vendor renewal message, and the conversation must stay together as one thread rather than splitting off into a new one.",
      answers: [{ kind: "control", control: "reply", target: "ol-msg-vendor" }],
      verify: (state) => state.replyDraftFor === "ol-msg-vendor",
      explanation:
        "Reply acts on the selected message and answers the sender inside the existing thread.",
    },
    {
      id: "outlook-q2",
      /* Select the message, Move menu, Vendors. */
      minClicks: 3,
      task: "The vendor renewal message does not belong in the inbox; it should sit with the rest of the vendor correspondence so the inbox stays focused on new work.",
      answers: [{ kind: "option", control: "move", option: "vendors", target: "ol-msg-vendor" }],
      verify: (state) => state.movedMessage === "ol-msg-vendor",
      explanation:
        "Move relocates the selected message. The destination folder is chosen from the Move menu.",
    },
    {
      id: "outlook-q3",
      /* Right-click the message, then Forward. */
      minClicks: 2,
      task: "Your manager wants the original vendor renewal message passed on unchanged, with its content and attachments intact.",
      answers: [{ kind: "menu", target: "ol-msg-vendor", item: "forward" }],
      verify: (state) => state.forwardOf === "ol-msg-vendor",
      explanation:
        "Forward from the message context menu sends the thread to a new recipient and keeps the original.",
    },
    {
      id: "outlook-q4",
      /* Select the message, then Delete (Home is already open). */
      minClicks: 2,
      task: "The “Unusual sign-in attempt” message is a confirmed phishing lure and must leave the mailbox for good, not just be hidden from view.",
      answers: [{ kind: "control", control: "delete", target: "ol-msg-phish" }],
      verify: (state) => state.deletedMessage === "ol-msg-phish",
      explanation: "Delete on the Home tab moves the selected message to Deleted Items.",
    },
    {
      id: "outlook-q5",
      /* Filter menu (Home), then Unread. */
      minClicks: 2,
      task: "The inbox should show only the messages you have not read yet, so outstanding items are obvious at a glance.",
      answers: [{ kind: "option", control: "filter", option: "unread" }],
      verify: (state) => state.filter === "unread",
      explanation: "The Filter menu on the Home tab narrows the message list; Unread shows only unread mail.",
    },
    {
      id: "outlook-q6",
      /* Title-bar Settings, Automatic replies, Turn on. */
      minClicks: 3,
      task: "You are on call next week and people outside the team need to know before they write, without having to check with you first.",
      answers: [{ kind: "confirm", dialog: "ol-auto-replies" }],
      verify: (state) => state.autoReplies === true,
      explanation:
        "Outlook's Settings menu opens Automatic replies, and the setting changes only once it is turned on there.",
    },
  ],
};