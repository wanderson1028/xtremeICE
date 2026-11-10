/** Microsoft Teams — channel chrome, compose box, dialogs and scored tasks (fictitious data). */

export const CHANNEL_MENU = [
  { id: "pin", label: "Pin channel" },
  { id: "hide", label: "Hide channel" },
  { id: "mute", label: "Mute channel" },
  { id: "manage", label: "Manage channel", opens: true },
  { id: "leave", label: "Leave channel" },
];

export const TEAM_MENU = [
  { id: "add-channel", label: "Add channel", opens: "teams-add-channel" },
  { id: "manage-team", label: "Manage team", opens: true },
  { id: "leave-team", label: "Leave team" },
];

export const MEET_MENU = [
  { id: "meet-now", label: "Meet now" },
  { id: "schedule-meeting", label: "Schedule meeting", opens: true },
];

export const ATTACH_MENU = [
  { id: "attach-files", label: "Files", opens: "teams-attach" },
  { id: "attach-loop", label: "Loop component" },
  { id: "attach-approval", label: "Approval" },
];

/** Documents shared in the channel's Files tab. */
export const TEAMS_FILES = [
  { id: "teams-file-policy", name: "Q4_Security_Policy.docx", by: "Dana Whitfield", when: "Nov 8" },
  { id: "teams-file-ir-plan", name: "Incident_Response_Plan.pptx", by: "Marcus Lee", when: "Nov 6" },
  { id: "teams-file-q4-evidence", name: "Q4_Evidence_Log.xlsx", by: "Priya Raman", when: "Nov 5" },
];

/** Body elements whose click performs an operation — the only clicks that can score. */
export const TEAMS_CLICK_COMMITS = ["teams-send", ...TEAMS_FILES.map((file) => file.id)];

export const TEAMS_DIALOGS = {
  "teams-attach": {
    title: "Share a file",
    description: "Choose a file from your OneDrive to attach to the message.",
    items: [
      { id: "Q4_Evidence_Log.xlsx", label: "Q4_Evidence_Log.xlsx", meta: "OneDrive · 48 KB" },
      { id: "Shift_Handover.docx", label: "Shift_Handover.docx", meta: "OneDrive · 22 KB" },
      { id: "SOC_Runbook.pdf", label: "SOC_Runbook.pdf", meta: "OneDrive · 1.2 MB" },
    ],
    confirm: "Attach",
  },
  "teams-add-channel": {
    title: "Create a channel",
    description: "A channel keeps the work for one topic together.",
    input: { label: "Channel name", placeholder: "Name this channel" },
    confirm: "Create",
  },
};

/** Applies any committed operation to the Teams state. */
export function reduceTeams(state, action) {
  const next = { ...state };
  const target = action.targetId || null;

  if (action.type === "option") {
    if (action.controlId === "meet" && action.optionId === "meet-now") next.meeting = true;
    if (action.controlId === "more" && action.optionId === "leave-team") next.leftTeam = true;
  }
  if (action.type === "menu" && action.itemId === "mute") next.muted = target;
  if (action.type === "confirm" && action.dialogId === "teams-attach" && action.value) {
    next.attachment = action.value;
  }
  if (action.type === "confirm" && action.dialogId === "teams-add-channel" && action.value) {
    next.channels = state.channels.includes(action.value)
      ? state.channels
      : [...state.channels, action.value];
  }
  if (action.type === "click") {
    if (target === "teams-send") next.postedChannel = "General";
    if (target && target.startsWith("teams-file-")) next.openedFile = target;
  }
  return next;
}

export const teamsApp = {
  id: "teams",
  name: "Teams",
  accent: "#4b53bc",
  windowTitle: "Microsoft Teams",
  variant: "chat",
  reduce: reduceTeams,
  tabs: [],
  dialogs: TEAMS_DIALOGS,
  /* Channel header and compose-box controls, rendered by the Teams body. */
  controls: [
    { id: "meet", label: "Meet", menu: MEET_MENU },
    { id: "more", label: "More options", menu: TEAM_MENU },
    { id: "attach", label: "Attach", menu: ATTACH_MENU },
  ],
  defaults: {
    meeting: false,
    attachment: null,
    muted: null,
    postedChannel: null,
    channels: [],
    openedFile: null,
  },
  questions: [
    {
      id: "teams-q1",
      task: "The channel needs an unscheduled face-to-face call right now. Start it from the channel header.",
      answers: [{ kind: "option", control: "meet", option: "meet-now" }],
      verify: (state) => state.meeting === true,
      explanation:
        "Meet in the channel header opens the meeting options; Meet now starts an instant call with the channel.",
    },
    {
      id: "teams-q2",
      task: "Share the Q4 evidence spreadsheet in your reply: attach Q4_Evidence_Log.xlsx before you post it.",
      answers: [{ kind: "confirm", dialog: "teams-attach", value: "Q4_Evidence_Log.xlsx" }],
      verify: (state) => state.attachment === "Q4_Evidence_Log.xlsx",
      explanation:
        "The attach button under the compose box opens its own menu; Files opens the picker, and the chosen file is what gets attached.",
    },
    {
      id: "teams-q3",
      task: "The Threat Intel channel is posting too often. Stop its notifications without leaving it.",
      answers: [{ kind: "menu", target: "teams-channel-threat-intel", item: "mute" }],
      verify: (state) => state.muted === "teams-channel-threat-intel",
      explanation:
        "The channel context menu controls its notifications. Mute keeps the channel in the list but silences it.",
    },
    {
      id: "teams-q4",
      task: "Post the update already typed in the compose box to the channel conversation.",
      answers: [{ kind: "click", target: "teams-send" }],
      verify: (state) => state.postedChannel === "General",
      explanation: "The send arrow at the right of the compose box posts the message to the channel.",
    },
    {
      id: "teams-q5",
      task: "Create a new channel named “Incident 2026-11” so this month's work has its own thread.",
      answers: [{ kind: "confirm", dialog: "teams-add-channel", value: "Incident 2026-11" }],
      verify: (state) => state.channels.includes("Incident 2026-11"),
      explanation:
        "Adding a channel is done from the team's ⋯ more menu, and the channel takes the name typed into the create dialog.",
    },
    {
      id: "teams-q6",
      task: "Open the evidence log that is shared in this channel: go to the channel's files and open Q4_Evidence_Log.xlsx.",
      answers: [{ kind: "click", target: "teams-file-q4-evidence" }],
      verify: (state) => state.openedFile === "teams-file-q4-evidence",
      explanation:
        "Each channel has tabs; the Files tab lists the documents shared in that channel, and a document opens from there.",
    },
  ],
};