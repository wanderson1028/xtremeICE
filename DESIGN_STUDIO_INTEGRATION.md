# Design Studio integration into Extreme ICE

Status: experimental branch `design-studio-integration` (2026-10-23). Do not merge to main until the gates below are met. Extreme ICE main remains the live demo. Capital Intelligence is outside this work.

## Ownership and boundaries

- Course lab authoring: `LabTemplate` and `LabInstance`. This is the target for Design Studio's provider-neutral task, snapshot, scoring, and validation model.
- Live Fire cloud construction: `LiveFireLab`, `LiveFireDevice`, and `LiveFireDeployment`, backed by `cloudProviderAWS` and `cloudOrchestrator`. Keep this AWS system intact; do not replace its data model with `LabTemplate` or blindly import Design Studio's older AWS functions.
- A bridge between a course lab and a Live Fire deployment must be explicit, ownership-checked, and idempotent. `LiveFireLab.template_id` is not by itself a proven lifecycle bridge.
- Kasm and Proxmox are separate providers. Proxmox pilot work is not learner-ready and is not ported here.

## Implemented in this branch

- Ported the pure Design Studio task/environment/snapshot/scoring/branching/Kasm-binding modules and their 151 focused tests. The current code has no provider side effects.
- Extended `LabTemplate` with runtime-relevant optional fields and structured task/criterion fields; extended `LabInstance` with optional frozen snapshot and provider handles. Existing required fields and Extreme ICE RLS were preserved. No records were migrated.
- Ported the advanced lab-task editor. It can author criteria, a path-existence or allowlisted file-mode validation definition, hints, and adaptive task flow. The editor explicitly says this does not execute a Kasm check in Extreme ICE.
- Normalize legacy task rows when opened and before saving; reject cyclic/invalid task dependencies at save time. No existing template was saved by this integration work.

## Gates before learner execution

1. Confirm Kasm credentials and callback reachability for this Extreme ICE app without exposing secret values. The Design Studio callback URL embeds its own app ID and cannot be copied unchanged.
2. Harden the Kasm backend interface. Design Studio's general `execCommand` action accepts a caller-provided command from any authenticated user; do not expose that surface in Extreme ICE. The runtime validator should dispatch only server-built, allowlisted probes from a frozen template snapshot.
3. Add a server-owned `RuntimeValidationAttempt` with admin-only entity access, hashed one-time callback tokens, expiry, ownership-checked sanitized inspection, and separate dispatch/probe/callback outcomes. Keep tokens and provider credentials out of browser responses, logs, and workspace traces.
4. Provision a disposable Kasm learner instance through a controlled branch-only flow, prove the frozen snapshot and owner checks, then prove pass, fail, callback timeout, and replay rejection end to end. Only then expose a learner runner.
5. Map course labs to Live Fire AWS deliberately, then test read-only AWS inventory and a cost-bounded disposable deployment. Reconcile actual AWS resources with records before any cleanup. Do not alter Capital Intelligence.
6. Treat Proxmox as a later provider gate; VM100 is the sole worker pilot, not proof of concurrent learner provisioning.

## AWS record inventory and cleanup hold

Read-only Base44 inventory on 2026-10-23: 5 `LiveFireLab` rows, 12 `LiveFireDeployment` rows, and 10 `LiveFireDevice` rows. Several old deployment rows still say `provisioning` with no instance IDs, but one deployment says `running` with two instance IDs and two corresponding running device rows. Database labels are not live AWS evidence. Do not delete or reset these rows until AWS read-only instance/VPC inventory confirms current state and the exact record/resource mapping. No records or AWS resources were changed during this integration slice.

## Verification

- `npm run build`: passed on branch.
- Focused ESLint for the editor and pure modules: passed.
- Design Studio runtime test harness ported to branch: 151 passed, 0 failed.
- Branch preview: Lab Builder and advanced criterion authoring rendered. No template was saved.
