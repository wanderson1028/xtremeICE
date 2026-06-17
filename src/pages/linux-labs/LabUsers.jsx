import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check existing users",
    explanation: "Before adding a new user, review who currently has interactive shell access on this system by checking /etc/passwd.",
    whyItMatters: "Understanding existing users prevents duplicate accounts and helps you spot unauthorized accounts during onboarding.",
    securityInsight: "Unauthorized accounts with /bin/bash shells in /etc/passwd are a common persistence technique (MITRE T1136 — Create Account). Regular user audits catch accounts added by attackers or forgotten service users.",
    prompt: "root@server:~#",
    command: "cat /etc/passwd | grep bash",
    output: [
      "root:x:0:0:root:/root:/bin/bash",
      "ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash",
      "sysadmin:x:1001:1001:SysAdmin User:/home/sysadmin:/bin/bash",
    ],
    nextStepDirections: "Three existing users with bash access. Now create the new developer account for 'devjane' with a proper home directory and bash shell.",
  },
  {
    stepLabel: "Create the user account",
    explanation: "Use useradd with -m (create home directory) and -s (set shell) to create devjane's account.",
    whyItMatters: "Without -m, no home directory is created and the user can't log in properly. Without -s, the default shell may not be bash.",
    securityInsight: "Always set an explicit shell when creating users. Accounts that don't need interactive access should get /usr/sbin/nologin as their shell — this blocks SSH logins and reduces the attack surface if credentials are ever compromised.",
    prompt: "root@server:~#",
    command: "sudo useradd -m -s /bin/bash devjane",
    output: [
      "# useradd: creating home directory '/home/devjane'",
      "# useradd: adding user 'devjane' to shadow group",
      "# useradd: user 'devjane' created successfully (uid=1002)",
    ],
    nextStepDirections: "Account created silently — no news is good news in Linux. Verify the account was created correctly with the id command.",
  },
  {
    stepLabel: "Verify the new account",
    explanation: "Use the id command to confirm devjane exists and see her UID, GID, and current group memberships.",
    whyItMatters: "Always verify user creation immediately. It's much easier to fix issues now than after the user has tried to log in.",
    securityInsight: "The id command is also used during privilege escalation reconnaissance. Attackers run it immediately after gaining a shell to understand what groups they belong to and what access they have (MITRE T1033 — System Owner/User Discovery).",
    prompt: "root@server:~#",
    command: "id devjane",
    output: [
      "uid=1002(devjane) gid=1002(devjane) groups=1002(devjane)",
    ],
    nextStepDirections: "devjane exists with uid=1002. She's only in her own private group right now. Create the 'developers' group so you can grant team access to shared resources.",
  },
  {
    stepLabel: "Create the developers group",
    explanation: "Create a 'developers' group that will be used to manage access to shared repositories, deploy directories, and tools.",
    whyItMatters: "Groups are the key to scalable access control on Linux. Granting permissions to a group is far safer than giving them to individual users.",
    securityInsight: "Group-based access control is foundational to least-privilege design. It prevents permission sprawl — when access is granted per-user, it's easy to lose track of who has access to what, especially after employees leave.",
    prompt: "root@server:~#",
    command: "sudo groupadd developers",
    output: [
      "# groupadd: group 'developers' created (gid=1003)",
    ],
    nextStepDirections: "Group created. Now add devjane to the developers group using usermod. The -aG flag appends to existing groups without removing her from others.",
  },
  {
    stepLabel: "Add user to developers group",
    explanation: "Use usermod -aG to append devjane to the developers group. The 'a' is critical — without it, she'd be removed from all other groups.",
    whyItMatters: "Using -aG vs -G is a critical distinction. Forgetting the 'a' flag has locked users out of systems in production many times.",
    securityInsight: "This is one of Linux's most common admin mistakes. Using usermod -G (without -a) replaces all supplementary groups — potentially revoking access to other shared resources silently. Always use -aG to append safely.",
    prompt: "root@server:~#",
    command: "sudo usermod -aG developers devjane",
    output: [
      "# usermod: adding 'devjane' to supplementary group 'developers'",
      "# usermod: group membership updated for devjane",
    ],
    nextStepDirections: "Group membership updated. Verify devjane now belongs to the developers group.",
  },
  {
    stepLabel: "Verify group membership",
    explanation: "Run the groups command to see all groups devjane belongs to.",
    whyItMatters: "Confirming group membership is part of the onboarding checklist — it proves the access was granted correctly.",
    securityInsight: "Group membership verification is a key step in access reviews required by SOC 2 and ISO 27001. Overprivileged group memberships are frequently found in audits — users added to admin or sudo groups during emergencies and never removed.",
    prompt: "root@server:~#",
    command: "groups devjane",
    output: [
      "devjane : devjane developers",
    ],
    nextStepDirections: "devjane is in both her primary group and the developers group. Last step — confirm her home directory was created and has correct ownership.",
  },
  {
    stepLabel: "Confirm home directory",
    explanation: "Verify that /home/devjane was created during account setup and is owned by the correct user.",
    whyItMatters: "If the home directory is missing or has wrong ownership, the user cannot log in or save files. This is the final onboarding checkpoint.",
    securityInsight: "Home directories owned by root instead of the user are a misconfiguration that blocks login. More critically, attackers who create accounts sometimes intentionally leave home directories with incorrect ownership to cause confusion during forensic analysis.",
    prompt: "root@server:~#",
    command: "ls -la /home/",
    output: [
      "total 24",
      "drwxr-xr-x  5 root     root     4096 Jun  9 09:00 .",
      "drwxr-xr-x 20 root     root     4096 Jun  1 09:00 ..",
      "drwxr-xr-x  3 devjane  devjane  4096 Jun  9 09:00 devjane",
      "drwxr-xr-x  5 sysadmin sysadmin 4096 Jun  5 10:00 sysadmin",
      "drwxr-xr-x  5 ubuntu   ubuntu   4096 Jun  1 09:00 ubuntu",
    ],
    nextStepDirections: "devjane's home directory exists and is owned by devjane:devjane. The account is fully configured and ready for use.",
    finalGoal: "New developer account created: devjane has a home directory, bash shell, and developers group membership.",
  },
];

export default function LabUsers() {
  return (
    <LabRunner
      labTitle="Linux User Management"
      chapterNum="1.4"
      difficulty="Beginner"
      tags={["users", "groups", "useradd"]}
      duration={25}
      terminalLabel="root@server:~"
      intro={{
        overview: "SCENARIO: A new developer named 'devjane' is joining the engineering team on Monday. You need to set up her Linux account before she arrives: create the user with a proper home directory, create the 'developers' group for team access control, and add her to that group.",
        outcomes: [
          "Create user accounts with proper shell and home directory",
          "Create and manage Linux groups",
          "Add users to groups safely",
          "Verify user and group configuration",
        ],
        prerequisites: ["Basic command line usage"],
        tools: ["useradd", "usermod", "groupadd", "id", "groups"],
      }}
      steps={steps}
    />
  );
}