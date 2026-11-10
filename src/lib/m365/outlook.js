/** Outlook — simulated ribbon and message list, scored tasks (fictitious data). */
import { Reply, Forward, Trash2, Settings } from "lucide-react";

export const MESSAGE_MENU = [
  { id: "reply", label: "Reply" },
  { id: "forward", label: "Forward" },
  { id: "move-to", label: "Move to…" },
  { id: "flag", label: "Flag" },
  { id: "mark-read", label: "Mark as read" },
  { id: "delete", label: "Delete" },
];

export const outlookApp = {
  id: "outlook",
  name: "Outlook",
  accent: "#0f6cbd",
  windowTitle: "Mail — Outlook",
  variant: "mail",
  titleActions: [
    { id: "settings", label: "Settings", icon: Settings, menu: [
      { id: "mail-settings", label: "Mail" },
      { id: "auto-replies", label: "Automatic replies" },
      { id: "calendar-settings", label: "Calendar" },
      { id: "connected-accounts", label: "Connected accounts" },
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
          { id: "reply", label: "Reply", icon: Reply, size: "lg" },
          { id: "reply-all", label: "Reply all" },
          { id: "forward", label: "Forward", icon: Forward },
        ] },
        { id: "delete-group", label: "Delete", controls: [
          { id: "delete", label: "Delete", icon: Trash2, size: "lg" },
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
    replying: "",
    moved: false,
    deleted: false,
    filter: "all",
    autoReplies: false,
    notice: "",
  },
  questions: [
    {
      id: "outlook-q1",
      task: "Answer Dana Whitfield's Q4 vendor renewal message so the conversation stays in one thread.",
      steps: [
        { do: "click", target: "ol-msg-vendor" },
        { do: "control", control: "reply" },
      ],
      effect: { replying: "reply", notice: "Reply draft open for “Q4 vendor renewal”" },
      explanation: "Reply answers the sender and keeps the thread, so the history stays with the conversation.",
    },
    {
      id: "outlook-q2",
      task: "File the vendor renewal message in the Vendors folder.",
      steps: [
        { do: "click", target: "ol-msg-vendor" },
        { do: "control", control: "move" },
        { do: "option", control: "move", option: "vendors" },
      ],
      effect: { moved: true, notice: "1 message moved to Vendors" },
      explanation:
        "Move relocates the selected message. The destination folder is chosen from the Move menu.",
    },
    {
      id: "outlook-q3",
      task: "Send the vendor renewal to your manager without editing it, using the message's own menu.",
      steps: [
        { do: "context", target: "ol-msg-vendor" },
        { do: "menu", target: "ol-msg-vendor", item: "forward" },
      ],
      effect: { replying: "forward", notice: "Forward draft open for “Q4 vendor renewal”" },
      explanation: "Forward from the message context menu sends the thread to a new recipient and keeps the original.",
    },
    {
      id: "outlook-q4",
      task: "The “Unusual sign-in attempt” message is a confirmed phishing lure. Remove it from the mailbox.",
      steps: [
        { do: "click", target: "ol-msg-phish" },
        { do: "control", control: "delete" },
      ],
      effect: { deleted: true, notice: "1 message deleted" },
      explanation: "Delete on the Home tab moves the selected message to Deleted Items.",
    },
    {
      id: "outlook-q5",
      task: "Cut the inbox down to messages you have not read yet.",
      steps: [
        { do: "control", control: "filter" },
        { do: "option", control: "filter", option: "unread" },
      ],
      effect: { filter: "unread", notice: "Filter applied: Unread" },
      explanation: "The Filter menu on the Home tab narrows the message list; Unread shows only unread mail.",
    },
    {
      id: "outlook-q6",
      task: "You are on call next week. Switch on an automatic out-of-office reply.",
      steps: [
        { do: "control", control: "settings" },
        { do: "option", control: "settings", option: "auto-replies" },
      ],
      effect: { autoReplies: true, notice: "Automatic replies: On for the on-call week" },
      explanation:
        "Outlook's Settings menu holds Automatic replies, where out-of-office messages are scheduled.",
    },
  ],
};