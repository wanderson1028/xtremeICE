/** Outlook — simulated ribbon, message list, dialogs and scored tasks (fictitious data). */
import { Reply, Forward, Trash2, Settings } from "lucide-react";

export const MESSAGE_MENU = [
  { id: "reply", label: "Reply" },
  { id: "forward", label: "Forward" },
  { id: "move-to", label: "Move to…", opens: true },
  { id: "flag", label: "Flag" },
  { id: "mark-read", label: "Mark as read" },
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
    if (action.controlId === "flag") next.flagMessage = target;
  }
  if (action.type === "option") {
    if (action.controlId === "move") next.movedMessage = target;
    if (action.controlId === "filter") next.filter = action.optionId;
    if (action.controlId === "sort") next.sorting = action.optionId;
    if (action.controlId === "reading-pane") next.readingPane = action.optionId;
  }
  if (action.type === "menu") {
    if (action.itemId === "reply") next.replyDraftFor = target;
    if (action.itemId === "forward") next.forwardOf = target;
    if (action.itemId === "delete") next.deletedMessage = target;
    if (action.itemId === "flag") next.flagMessage = target;
    if (action.itemId === "mark-read") next.readMessage = target;
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
  reduce: reduceOutlook,
  dialogs: OUTLOOK_DIALOGS,
  titleActions: [
    { id: "settings", label: "Settings", icon: Settings, menu: [
      { id: "mail-settings", label: "Mail", opens: true },
      { id: "auto-replies", label: "Automatic replies", opens: "ol-auto-replies" },
      { id: "calendar-settings", label: "Calendar", opens: true },
      { id: "connected-accounts", label: "Connected accounts", opens: true },
    ] },
  ],
  tabs: [
    {
      id: "home",
      label: "Home",
      groups: [
        { id: "new", label: "New", controls: [
          { id: "new-mail", label: "New mail" },
          { id: "new-event", label: "New event" },
        ] },
        { id: "respond", label: "Respond", controls: [
          { id: "reply", label: "Reply", icon: Reply, size: "lg", commits: true },
          { id: "reply-all", label: "Reply all" },
          { id: "forward", label: "Forward", icon: Forward },
        ] },
        { id: "delete-group", label: "Delete", controls: [
          { id: "delete", label: "Delete", icon: Trash2, size: "lg", commits: true },
        ] },
        { id: "move-group", label: "Move", controls: [
          { id: "move", label: "Move", menu: [
            { id: "vendors", label: "Vendors" },
            { id: "archive", label: "Archive" },
            { id: "junk", label: "Junk Email" },
          ] },
        ] },
        { id: "tags", label: "Tags", controls: [
          { id: "flag", label: "Flag" },
          { id: "categorize", label: "Categorize" },
        ] },
        { id: "find", label: "Find", controls: [
          { id: "filter", label: "Filter", menu: [
            { id: "all", label: "All mail" },
            { id: "unread", label: "Unread" },
            { id: "flagged", label: "Flagged" },
            { id: "mentions", label: "Mentions" },
          ] },
          { id: "search", label: "Search" },
        ] },
      ],
    },
    {
      id: "view",
      label: "View",
      groups: [
        { id: "layout", label: "Layout", controls: [
          { id: "reading-pane", label: "Reading pane", menu: [
            { id: "pane-right", label: "Right" },
            { id: "pane-bottom", label: "Bottom" },
            { id: "pane-off", label: "Off" },
          ] },
        ] },
        { id: "arrange", label: "Messages", controls: [
          { id: "sort", label: "Sort", menu: [
            { id: "sort-newest", label: "Newest first" },
            { id: "sort-oldest", label: "Oldest first" },
          ] },
        ] },
      ],
    },
    {
      id: "help",
      label: "Help",
      groups: [
        { id: "support", label: "Help", controls: [
          { id: "help-center", label: "Help" },
          { id: "contact-support", label: "Contact support" },
        ] },
      ],
    },
  ],
  defaults: {
    replyDraftFor: null,
    forwardOf: null,
    movedMessage: null,
    deletedMessage: null,
    filter: "all",
    autoReplies: false,
  },
  questions: [
    {
      id: "outlook-q1",
      task: "Answer Dana Whitfield's Q4 vendor renewal message so the conversation stays in one thread.",
      answers: [{ kind: "control", control: "reply", target: "ol-msg-vendor" }],
      verify: (state) => state.replyDraftFor === "ol-msg-vendor",
      explanation:
        "Reply acts on the selected message and answers the sender inside the existing thread.",
    },
    {
      id: "outlook-q2",
      task: "File the vendor renewal message in the Vendors folder.",
      answers: [{ kind: "option", control: "move", option: "vendors", target: "ol-msg-vendor" }],
      verify: (state) => state.movedMessage === "ol-msg-vendor",
      explanation:
        "Move relocates the selected message. The destination folder is chosen from the Move menu.",
    },
    {
      id: "outlook-q3",
      task: "Send the vendor renewal to your manager without editing it, using the message's own menu.",
      answers: [{ kind: "menu", target: "ol-msg-vendor", item: "forward" }],
      verify: (state) => state.forwardOf === "ol-msg-vendor",
      explanation:
        "Forward from the message context menu sends the thread to a new recipient and keeps the original.",
    },
    {
      id: "outlook-q4",
      task: "The “Unusual sign-in attempt” message is a confirmed phishing lure. Remove that message from the mailbox.",
      answers: [{ kind: "control", control: "delete", target: "ol-msg-phish" }],
      verify: (state) => state.deletedMessage === "ol-msg-phish",
      explanation: "Delete on the Home tab moves the selected message to Deleted Items.",
    },
    {
      id: "outlook-q5",
      task: "Cut the inbox down to messages you have not read yet.",
      answers: [{ kind: "option", control: "filter", option: "unread" }],
      verify: (state) => state.filter === "unread",
      explanation: "The Filter menu on the Home tab narrows the message list; Unread shows only unread mail.",
    },
    {
      id: "outlook-q6",
      task: "You are on call next week. Switch on an automatic out-of-office reply.",
      answers: [{ kind: "confirm", dialog: "ol-auto-replies" }],
      verify: (state) => state.autoReplies === true,
      explanation:
        "Outlook's Settings menu opens Automatic replies, and the setting changes only once it is turned on there.",
    },
  ],
};