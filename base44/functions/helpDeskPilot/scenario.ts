export const scenarioVersion = "help-desk-scheduling-app@1.0.0";

export const scenario = {
  version: scenarioVersion,
  title: "Scheduling app closes at launch",
  ticket: "The desktop scheduling app closes as soon as I open it. It worked yesterday. I need to update the afternoon schedule in 20 minutes.",
  durationMinutes: 30,
  roleId: "IO-WRL-007",
  roleName: "Technical Support",
  niceComponentsVersion: "2.2.0",
  statementIds: ["T0237", "T1427", "K0903", "S0478", "S0661"],
};

export const actions = {
  device: {
    label: "Inspect device record",
    tool: "Device",
    result: "Managed Windows laptop HD-104. The scheduling app updated from 4.7.2 to 4.8.0 at 02:14. The update completed successfully. Last known successful desktop launch was yesterday at 16:46.",
  },
  status: {
    label: "Check service status",
    tool: "Service status",
    result: "Scheduling web service and sign-in are operational. The status page does not monitor desktop client launches.",
  },
  reproduce: {
    label: "Reproduce the desktop failure",
    tool: "Device",
    result: "The desktop client closes immediately after launch with no visible error. The Windows event log records an application exit at 09:13 for client version 4.8.0.",
  },
  kb_launch: {
    label: "Read KB-204: Desktop client closes at launch",
    tool: "Knowledge base",
    result: "Use the approved Scheduling Web portal on a managed device. Verify the employee can open, save, and reopen a schedule. Escalate a repeatable desktop failure to Application Support with client version, symptom, reproduction details, and workaround status. Desktop package changes require Application Support approval.",
  },
  kb_permissions: {
    label: "Read KB-088: Schedule opens but editing is blocked",
    tool: "Knowledge base",
    result: "Use this article when the app opens and displays a read-only or access-denied message. Capture the affected schedule and route an access request through the normal approval process.",
  },
  web_open: {
    label: "Open the approved web app",
    tool: "Scheduling Web",
    result: "The employee’s simulated account signs in and opens the afternoon schedule. You can now check whether it accepts an edit.",
  },
  web_save: {
    label: "Save and reopen a sample schedule edit",
    tool: "Scheduling Web",
    result: "A sample entry was saved. Reopening the schedule shows the change under the employee’s simulated account. The desktop launch issue is still open.",
  },
} as const;

export type ActionKey = keyof typeof actions;

export const rubric = [
  { id: "triage", label: "Triage", anchor: "Recognizes the scheduling deadline and prioritizes restoring the employee’s ability to work." },
  { id: "evidence", label: "Troubleshooting logic", anchor: "Explains why each check matters, uses the evidence to narrow the issue, and treats the overnight update as a possible cause pending confirmation." },
  { id: "resolution", label: "Safe resolution", anchor: "Uses an approved workaround and verifies that the employee can save and reopen the update." },
  { id: "handoff", label: "Ticket handoff", anchor: "Records symptom, version or change, checks and results, workaround status, and a clear next owner or action." },
  { id: "communication", label: "Handling a frustrated employee", anchor: "Acknowledges frustration, uses plain language, and gives a realistic next action and follow-up expectation in the roleplay and written reply." },
] as const;
