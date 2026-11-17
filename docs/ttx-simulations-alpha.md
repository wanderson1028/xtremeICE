# TTX and training simulations alpha — 2026-11-17

App: Xtreme I.C.E. (69a0a5a90473fac0aa3ea135).
Disposition: NOT a clean alpha sign-off. Automated checks pass; persistence defects remain open. Beta deferred.

## Executed validation
- 12 new simulation-action regression tests exercise the actual page handlers extracted with the TypeScript parser: SOCTraining, SOCSimulation, RealAttackDrills. All 12 failed before the fixes and pass afterward.
- One existing distributed TTX integration script passes using a mocked SDK and AI responses. It covers organization isolation, feature access, custom systems, AI retry, hidden answer scores, routing, duplicate answers, handoff, parallel requests, pause/resume, category completion, weighted scores, report release, membership revocation, separate approval authority, adaptive follow-ups, and department URL scoping.
- 43 prior access-management/dashboard/training-designer checks pass as regression coverage.
- Total runner result: 56 passed, 0 failed.
- npm run build exits successfully. Browserslist reports stale browser metadata.

## Changes made
- Added a per-run synchronous action-ID guard in all three simulation pages so duplicate ordinary and challenge actions cannot repeatedly increase scores.
- Blocked action handling after terminal state and preserved an explicit zero penalty override.
- Added synchronous duplicate-decision and completion guards to consolidated TTX; failed completion saves release the lock for retry.
- TTX completion metadata uses the generated run's setup snapshot.
- Unassessed TTX history categories display Not assessed instead of zero.
- Added missing esbuild development dependency needed to run the existing TTX integration script.

The consolidated TTX changes were source reviewed and build checked; the distributed TTX integration test does not directly exercise that page's UI handlers.

## Open defects and sign-off blockers
1. High: SOCTraining and RealAttackDrills swallow SOCSession.create failures while keeping sessionSavedRef true. A completed drill can appear finished without a saved result. Needs visible save state and an explicit retry using a stable result payload, with duplicate prevention.
2. High: SOCSimulation resets its saved flag on failure but provides no visible failure/retry control in the summary flow.
3. Medium, suspected by source inspection: RealAttackDrills uses a ref for the created session ID. A product result arriving while session creation is pending may miss its later update because changing the ref does not retrigger the effect. Needs a delayed-response regression and reconciliation fix.

## Limits
No real learner/admin browser walkthrough, live AI-provider call, deployed row-level security verification, cross-browser/responsive check, or real multi-user concurrency test was performed in this pass. Mocks establish application logic behavior, not production service availability. Client-side simulation scoring is not evidence of tamper resistance. The npm install audit summary reported 21 dependency vulnerabilities; they were not triaged or changed in this pass.

## Reproduce
node --test tests/access-management.test.mjs tests/dashboard-designer.test.mjs tests/training-designer-ui.test.mjs tests/training-assignments.test.mjs tests/training-generation.test.mjs tests/simulation-actions.test.mjs tests/ttx-command.test.mjs
npm run build
