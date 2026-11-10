/** Microsoft Teams — channel chrome, compose box and scored tasks (fictitious data). */

export const CHANNEL_MENU = [
  { id: "pin", label: "Pin channel" },
  { id: "hide", label: "Hide channel" },
  { id: "mute", label: "Mute channel" },
  { id: "manage", label: "Manage channel" },
  { id: "leave", label: "Leave channel" },
];

export const TEAM_MENU = [
  { id: "add-channel", label: "Add channel" },
  { id: "manage-team", label: "Manage team" },
  { id: "leave-team", label: "Leave team" },
];

export const MEET_MENU = [
  { id: "meet-now", label: "Meet now" },
  { id: "schedule-meeting", label: "Schedule meeting" },
];

export const ATTACH_MENU = [
  { id: "attach-files", label: "Files" },
  { id: "attach-loop", label: "Loop component" },
  { id: "attach-approval", label: "Approval" },
];

export const teamsApp = {
  id: "teams",
  name: "Teams",
  accent: "#4b53bc",
  windowTitle: "Microsoft Teams",
  variant: "chat",
  tabs: [],
  /* Channel header and compose-box controls, rendered by the Teams body. */
  controls: [
    { id: "meet", label: "Meet", menu: MEET_MENU },
    { id: "more", label: "More options", menu: TEAM_MENU },
    { id: "attach", label: "Attach", menu: ATTACH_MENU },
  ],
  defaults: {
    meeting: false,
    attachment: false,
    muted: false,
    sent: false,
    addedChannel: false,
    filesTab: false,
    notice: "",
  },
  questions: [
    {
      id: "teams-q1",
      task: "The channel needs an unscheduled face-to-face call right now. Start it from the channel header.",
      steps: [
        { do: "control", control: "meet" },
        { do: "option", control: "meet", option: "meet-now" },
      ],
      effect: { meeting: true, notice: "Meeting started in SOC Operations / General" },
      explanation:
        "Meet in the channel header opens the meeting options; Meet now starts an instant audio and video call with the channel.",
    },
    {
      id: "teams-q2",
      task: "Share the evidence spreadsheet in your reply before you post it.",
      steps: [
        { do: "control", control: "attach" },
        { do: "option", control: "attach", option: "attach-files" },
      ],
      effect: { attachment: true, notice: "Attachment added to the compose box" },
      explanation:
        "The attach button under the compose box opens its own menu; Files picks a document from OneDrive or the channel's files.",
    },
    {
      id: "teams-q3",
      task: "The Threat Intel channel is posting too often. Stop its notifications without leaving it.",
      steps: [
        { do: "context", target: "teams-channel-threat-intel" },
        { do: "menu", target: "teams-channel-threat-intel", item: "mute" },
      ],
      effect: { muted: true, notice: "Threat Intel muted" },
      explanation:
        "The channel context menu controls its notifications. Mute keeps the channel in the list but silences it.",
    },
    {
      id: "teams-q4",
      task: "Post the update already typed in the compose box to the channel conversation.",
      steps: [{ do: "click", target: "teams-send" }],
      effect: { sent: true, notice: "Message posted to General" },
      explanation: "The send arrow at the right of the compose box posts the message to the channel.",
    },
    {
      id: "teams-q5",
      task: "Create a new channel for this month's incident so the work has its own thread.",
      steps: [
        { do: "control", control: "more" },
        { do: "option", control: "more", option: "add-channel" },
      ],
      effect: { addedChannel: true, notice: "Channel “Incident 2026-11” created" },
      explanation:
        "Adding a channel is done from the team's ⋯ more menu, which holds the channel and team management commands.",
    },
    {
      id: "teams-q6",
      task: "Open the documents that are shared in this channel instead of the conversation.",
      steps: [{ do: "click", target: "teams-tab-files" }],
      effect: { filesTab: true, notice: "Files tab open for General" },
      explanation: "Each channel has tabs; the Files tab lists the documents shared in that channel.",
    },
  ],
};