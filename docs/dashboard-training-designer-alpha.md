# Dashboard and Training Designer alpha — 2026-11-17

Scope: EnvironmentHub personal dashboard, Training Designer loading and generation flow, learner assignment, and interactive scoring. Beta testing is deferred by the owner.

## Results

27 new automated tests pass: dashboard metrics 7, Designer component state 4, assignment handlers 7, generation authorization and scoring 9. The prior 16 access-management tests also pass (43 total across the executed suites). Build exits 0. Targeted ESLint passes for dashboardStats, TrainingDesigner, and AssignmentDialog. A nonblocking Browserslist age warning remains.

Dashboard calculation tests were first run against extracted, unchanged production calculations: 4 failures and 1 pass. Fixes resolve all four reproductions. Tests use synthetic data, not customer account mutations.

## Fixed

- Invalid date values crashed dashboard calculations; invalid dates are now skipped for charts and omitted from relative-time display.
- Recent-score chart favored the first source, hiding newer attempts. It now merges and sorts both sources by date before taking ten results.
- Missing scores lowered averages as zero. Only available numeric scores contribute.
- Month/day-only chart keys counted events from previous years. Aggregation now uses full dates.
- Active/paused SOC sessions were displayed as completed. Status is now preserved.
- Dashboard loading and source errors appeared as zero activity. Explicit loading/error states now replace misleading metrics.
- Training Designer, AssignmentDialog, and runner passed unsupported object-style list options and consumed .items instead of SDK arrays. Corrected positional sort/limit and array handling.
- Saved-list failures were unhandled. Error and Retry UI added; deletion errors are surfaced.
- Older organization/assessment responses could overwrite newer selections. Request version guards discard stale responses and invalidate pending findings on organization changes.
- Generated draft inputs could drift before save. Input changes clear the draft; authoring controls are locked during generation/save. Duration is validated at 15–480 minutes; selections exceeding server limits (12 findings/5 roles) are rejected rather than silently truncated. Empty generated task results are rejected.
- Empty organization learner lists fell back to all learners. That fallback is removed.
- Assignment backend now requires an app-organization mapping and filters targets to the exercise organization, including platform-admin requests. A creator who moved to another tenant cannot distribute their old tenant's exercise.
- Assignment lookup failures no longer masquerade as empty lists and create duplicates.
- Generation now checks Training Designer editor permission server-side before invoking AI; unassigned users and viewers are denied.
- Designer route now uses the existing feature gate. Assigned learner runner links remain separate so an exercise assignment does not require authoring access.

## Test coverage

Dashboard: empty data, invalid dates, merge chronology, absent scores, previous-year exclusion, active SOC and paused SOC.
Designer component harness: actual JSX with deterministic React hook/SDK stubs; saved arrays and SDK arguments, saved-list error, out-of-order assessments, out-of-order findings.
Assignment handler: wrong-tenant learner, transferred creator, missing mapping, scoped whole-organization operation and repeated assignment, failed duplicate lookup, unrelated member, anonymous caller.
Generation handler/shared policy: anonymous, unassigned member, viewer, editor with missing roles, administrator with missing findings; no AI requests made.
Scoring: unanswered, incorrect, correct MCQ/hotspot/matching, partial score rounding.

## Limits and follow-up

This is code/component/handler alpha validation, not live end-to-end or beta acceptance. No real learner accounts, pentests, invitations, customer exercises, or results were modified by tests. Visual/mobile/browser checks, hosted RLS behavior, actual vPenTest import and AI-generation quality were not exercised.

Remaining concerns found during inspection:
- Dashboard login events are recorded on dashboard mount, not verified authentication events; usage captures dashboard lifetime and is limited by fetched history. Counts should not be interpreted as audited lifetime logins or total platform use.
- Entity lists remain bounded (100–200 rows); pagination/high-volume totals require a separate pass.
- Viewer enforcement for direct TrainingExercise entity writes and hosted RLS needs authenticated API validation; UI disabling is not a security guarantee.
- Learner exercise payloads include answer keys and attempt scores are computed client-side. Current workflow supports practice, but tamper-resistant assessment needs server-side grading and answer-key separation before certification use.
- Assignment create and exercise ACL update are separate operations; transactional failure/concurrency handling remains unverified.
- Platform/app feature flag precedence and global tenant policies were preserved; full cross-module security audit is outside this pass.

## Reproduce

Run: node --test tests/dashboard-designer.test.mjs tests/training-designer-ui.test.mjs tests/training-assignments.test.mjs tests/training-generation.test.mjs tests/access-management.test.mjs
Run: npm run build
