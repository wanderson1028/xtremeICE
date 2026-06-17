import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "List All Local Users",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-LocalUser",
    explanation: "Get-LocalUser returns all local user accounts on the system, including built-in accounts like Administrator and Guest.",
    whyItMatters: "Auditing local user accounts is a critical first step in hardening. Unexpected accounts — especially those enabled — can indicate compromise.",
    output: [
      "",
      "Name               Enabled Description",
      "----               ------- -----------",
      "Administrator      False   Built-in administrator account",
      "analyst            True    SOC Analyst Account",
      "DefaultAccount     False   A user account managed by the system.",
      "Guest              False   Built-in account for guest access",
      "WDAGUtilityAccount False   A user account managed and used by Windows",
      "",
    ],
    nextStepDirections: "Good. Administrator is disabled (correct hardening). Now create a new user account for a team member.",
    securityInsight: {
      title: "Built-in Administrator Account",
      content: "MITRE ATT&CK T1078.003 — The built-in Administrator account is a high-value target for attackers. It should always be disabled and renamed. CIS Benchmark 2.3.1.1 requires renaming the Administrator account.",
    },
  },
  {
    stepLabel: "Create a New Local User",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'New-LocalUser -Name "jsmith" -FullName "John Smith" -Description "SOC Analyst" -NoPassword',
    explanation: "New-LocalUser creates a local account. In production, always use -Password with a SecureString. -NoPassword is only for lab/demo environments.",
    whyItMatters: "Creating accounts with the principle of least privilege means giving users only the access they need. Never create accounts with admin rights unless explicitly required.",
    output: [
      "",
      "Name   Enabled Description",
      "----   ------- -----------",
      "jsmith True    SOC Analyst",
      "",
    ],
    nextStepDirections: "Account created. Now add jsmith to the standard Users group.",
    securityInsight: {
      title: "Account Creation Auditing",
      content: "MITRE ATT&CK T1136.001 — Attackers create local accounts for persistence. Monitor Windows Event ID 4720 (user account created) and 4722 (account enabled) via Get-WinEvent to detect unauthorized account creation.",
    },
  },
  {
    stepLabel: "List Local Groups",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-LocalGroup",
    explanation: "Get-LocalGroup lists all local security groups. Groups control what resources and capabilities users have access to on the system.",
    whyItMatters: "Understanding group membership is key to access control reviews. The Administrators group is the most sensitive — any unexpected members are a critical finding.",
    output: [
      "",
      "Name                                Description",
      "----                                -----------",
      "Access Control Assistance Operators Members of this group can remotely query...",
      "Administrators                      Administrators have complete and unrestrict...",
      "Backup Operators                    Backup Operators can override security...",
      "Event Log Readers                   Members of this group can read event logs...",
      "Remote Desktop Users                Members in this group are granted the right...",
      "Users                               Users are prevented from making accidental...",
      "",
    ],
    nextStepDirections: "Groups listed. Now add jsmith to the Users group.",
    securityInsight: {
      title: "Sensitive Group Membership",
      content: "MITRE ATT&CK T1078 — Groups like 'Backup Operators' and 'Remote Desktop Users' provide privilege escalation paths. Backup Operators can read any file regardless of ACLs. Audit all sensitive group memberships regularly.",
    },
  },
  {
    stepLabel: "Add User to Group",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Add-LocalGroupMember -Group "Users" -Member "jsmith"',
    explanation: "Add-LocalGroupMember assigns a user to a local group. This controls what resources and capabilities the user has on the workstation.",
    whyItMatters: "Always assign users to the least privileged group needed. Adding users to 'Administrators' gives full system control — a common attacker privilege escalation technique.",
    output: [""],
    nextStepDirections: "jsmith added to Users. Now verify by checking the group's membership.",
    securityInsight: {
      title: "Privilege Escalation via Group Membership",
      content: "MITRE ATT&CK T1098 — Attackers add compromised accounts to privileged groups for persistence. Monitor Event ID 4732 (member added to security-enabled local group) to detect unauthorized privilege escalation.",
    },
  },
  {
    stepLabel: "Verify Group Membership",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Get-LocalGroupMember -Group "Users"',
    explanation: "Get-LocalGroupMember lists all members of a specified group. This is how you verify that your Add-LocalGroupMember command worked correctly.",
    whyItMatters: "Always verify access control changes took effect. In production, combine this with a change ticket number logged to your SIEM to create an auditable change trail.",
    output: [
      "",
      "ObjectClass Name                    PrincipalSource",
      "----------- ----                    ---------------",
      "User        ANALYST-WS01\\analyst    Local",
      "User        ANALYST-WS01\\jsmith     Local",
      "",
    ],
    finalGoal: "You've audited existing accounts, created a new user, reviewed local security groups, assigned group membership, and verified the change — a complete local user management workflow aligned with least-privilege principles.",
    nextStepDirections: "Lab complete! jsmith is now a standard user on the workstation.",
    securityInsight: {
      title: "Access Control Verification",
      content: "NIST SP 800-53 AC-2 — Account management controls require regular reviews of user accounts and group memberships. Automate this with a scheduled script that exports Get-LocalGroupMember for all sensitive groups and compares against a baseline.",
    },
  },
];

export default function LabPSUsers() {
  return (
    <LabRunner
      labTitle="Local User & Group Management"
      chapterNum={5}
      difficulty="Beginner"
      tags={["PowerShell", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={30}
      steps={steps}
      intro={{
        overview: "A new SOC analyst, John Smith, has joined the team and needs a workstation account. You also need to audit the existing accounts on ANALYST-WS01 to ensure it meets security baseline requirements. In this lab you'll manage local users and groups using PowerShell's LocalAccounts module.",
        objectives: [
          "Audit existing local user accounts with Get-LocalUser",
          "Create a new local user account",
          "List available local security groups",
          "Assign users to appropriate groups",
          "Verify group membership changes",
        ],
        tools: ["Get-LocalUser", "New-LocalUser", "Get-LocalGroup", "Add-LocalGroupMember"],
        prerequisites: ["PowerShell Basics & Navigation"],
      }}
    />
  );
}