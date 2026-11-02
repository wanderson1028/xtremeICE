# Design Studio integration into Extreme ICE

Status: experimental branch `design-studio-integration` (updated 2026-11-01). AWS is now the first provider proof target. Do not merge to main until the gates below are met. Extreme ICE main remains the live demo. Capital Intelligence is outside this work.

## Ownership and boundaries

- Course lab authoring: `LabTemplate` and `LabInstance`. This is the target for Design Studio's provider-neutral task, snapshot, scoring, and validation model.
- Live Fire cloud construction: `LiveFireLab`, `LiveFireDevice`, and `LiveFireDeployment`, backed by `cloudProviderAWS` and `cloudOrchestrator`. Keep this AWS system intact; do not replace its data model with `LabTemplate` or blindly import Design Studio's older AWS functions.
- A bridge between a course lab and a Live Fire deployment must be explicit, ownership-checked, and idempotent. `LiveFireLab.template_id` is not by itself a proven lifecycle bridge.

| Course-lab source | Live Fire target | Contract |
| --- | --- | --- |
| `LabTemplate.id` | `LiveFireLab.template_id` | Link only after an explicit draft creation; keep authoring and deployment records separate. |
| `LabTemplate.environment_definition` | `LiveFireLab.topology_data` | Translate supported resources and networks into a reviewable draft; do not silently apply Live Fire's current internet-facing security-group defaults. |
| `LabInstance.template_snapshot` | `LiveFireDeployment` and `LiveFireDevice` | Freeze learner requirements first, then bind to server-owned deployment handles. Do not trust user-editable session or instance IDs for privileged actions. |
| `LabInstance.provider` | AWS/Kasm/Proxmox adapter | Provider selection is explicit; a Kasm callback cannot validate an AWS or Proxmox session. |
- Kasm and Proxmox are separate providers. Proxmox pilot work is not learner-ready and is not ported here.

## Implemented in this branch

- Ported the pure Design Studio task/environment/snapshot/scoring/branching/Kasm-binding modules and their 151 focused tests. The current code has no provider side effects.
- Extended `LabTemplate` with runtime-relevant optional fields and structured task/criterion fields; extended `LabInstance` with optional frozen snapshot and provider handles. Added the admin-only `RuntimeValidationAttempt` schema, but no execution function or attempts. Existing required fields and Extreme ICE RLS were preserved. No records were migrated.
- Ported the advanced lab-task editor. It can author criteria, a path-existence or allowlisted file-mode validation definition, hints, and adaptive task flow. The editor explicitly says this does not execute a Kasm check in Extreme ICE.
- Normalize legacy task rows when opened and before saving; reject cyclic/invalid task dependencies at save time. No existing template was saved by this integration work.

## AWS course-lab proof path (code staged; no AWS launch verified)

- New admin-only `CloudCoursePoc` page and `cloudCoursePocAWS` backend provide a narrow path: prepare a draft `LabTemplate`, check template compatibility and AWS identity/AMI, launch one isolated Amazon Linux 2023 `t3.micro`, observe its console boot marker, and request/verify cleanup. `CloudPocRun` records the branch pilot and links a frozen `LabInstance`; no Live Fire record is repurposed.
- The intended AWS scope is `us-east-1`, one new `10.253.0.0/24` VPC and `/28` subnet, one security group with default egress revoked and no ingress, one encrypted 8 GiB root disk, no IGW/NAT/public IP/SSH key, and no IAM role. The guest requests shutdown after 105 minutes with instance-initiated shutdown set to terminate. The user set a $10 / two-hour maximum; the code limits resource shape and duration but does not enforce an AWS billing ceiling. Manually inspect and clean up immediately after proof.
- This first proof targets cloud boot and provider state, not learner browser access or task validation. Readiness requires AWS state plus a run-specific console marker. The page's launch action is disabled until a read-only preflight passes and requires a confirmation dialog; the backend enforces admin role and an explicit launch acknowledgment.
- Focused frontend ESLint and `npm run build` passed. The first browser preflight attempt returned HTTP 500 because the new function failed to initialize the AWS SDK bundle (`TypeError: Ed is not a function`); no AWS request ran. The branch now uses a small signed AWS Query adapter aligned with Extreme ICE's existing provider, and `deno check --node-modules-dir=auto` passes. A fresh live preflight after this fix succeeded in reaching AWS and resolving an AMI, but the proof template was ineligible: the shared app schema omitted branch-only `environment_definition` on create. Base44 applies data structure changes on main and shares records across branches. One draft proof template was created in shared data; repeat preparation now reuses it. Launch remains blocked. AWS secret **names** are present in the app; no values were read. Live launch, guest marker, resource cleanup, and final cost have **not** been verified. Browser security policy blocked agent interaction with the branch preview.
- Before launch, verify the branch-only entity/function sync and read-only AWS preflight from the app page. Then launch one run, observe its EC2 state and console marker, terminate it promptly, repeat cleanup until the run is `terminated`, and confirm the tagged instance, security group, subnet, and VPC are gone. If any step fails, preserve its run ID and resource IDs for reconciliation. Do not use the old Live Fire deploy path for this proof: its network creator opens several inbound ports to the internet.

## Gates before learner execution

Complete the AWS cloud boot proof above first. After that, decide whether the next cloud slice is a server-mediated learner session or a manual AWS validation probe. The Kasm and Proxmox gates below remain later work.

1. Confirm Kasm credentials and callback reachability for this Extreme ICE app without exposing secret values. The Design Studio callback URL embeds its own app ID and cannot be copied unchanged.
2. Harden the Kasm backend interface. Design Studio's general `execCommand` action accepts a caller-provided command from any authenticated user; do not expose that surface in Extreme ICE. The runtime validator should dispatch only server-built, allowlisted probes from a frozen template snapshot.
3. Implement a server-owned validator using the new admin-only `RuntimeValidationAttempt` entity: hashed one-time callback tokens, expiry, ownership-checked sanitized inspection, and separate dispatch/probe/callback outcomes. Keep tokens and provider credentials out of browser responses, logs, and workspace traces. The schema alone is not an execution path.
4. Provision a disposable Kasm learner instance through a controlled branch-only flow, prove the frozen snapshot and owner checks, then prove pass, fail, callback timeout, and replay rejection end to end. Only then expose a learner runner.
5. Map course labs to Live Fire AWS deliberately, then test read-only AWS inventory and a cost-bounded disposable deployment. Reconcile actual AWS resources with records before any cleanup. Do not alter Capital Intelligence.
6. Treat Proxmox as a later provider gate; VM100 is the sole worker pilot, not proof of concurrent learner provisioning.

## AWS record inventory and cleanup hold

Read-only Base44 inventory on 2026-10-23: 5 `LiveFireLab` rows, 12 `LiveFireDeployment` rows, and 10 `LiveFireDevice` rows. Several old deployment rows still say `provisioning` with no instance IDs, but one deployment says `running` with two instance IDs and two corresponding running device rows. The branch Cloud Resources scan returned no `XtremeICE-LiveFire`-tagged instances across its 16 queried regions; that filter does **not** cover every AWS instance. Its VPC view showed a protected Corporate VPC with eight instances and a separate orphaned, view-only VPC in `us-west-2`. The page now labels the tagged-instance scope, warns if region scans are incomplete, and flags one active-labeled deployment record whose VPC is absent from the scanned account for manual reconciliation; it does not mutate that record. Database labels are not live AWS evidence, and the tagged-instance result is not enough to declare the old deployment IDs gone. Do not delete or reset rows until the exact instance IDs are checked against unfiltered AWS inventory and the record/resource mapping is confirmed. No records or AWS resources were changed during this integration slice.

## Verification

- `npm run build`: passed on branch.
- Focused ESLint for the editor and pure modules: passed.
- Design Studio runtime test harness ported to branch: 151 passed, 0 failed.
- Branch preview: Lab Builder and advanced criterion authoring rendered. No template was saved.
