# SOC simulations and candidate assessments — alpha, November 17, 2026

App: Xtreme I.C.E. (69a0a5a90473fac0aa3ea135).
Status: automated alpha pass completed; not a production or beta sign-off.

## Results
`node --test tests/*.test.mjs`: 135 passing, 0 failing.
`npm run build`: successful exit; existing stale Browserslist metadata warning.
New coverage: 13 candidate backend checks and 3 SOC persistence checks. Existing 12 SOC action checks also pass. Other tests include prior access, dashboard, designer, TTX, M365, and network-import regressions.

Candidate functions are bundled and exercised with an in-memory SDK, synthetic identities, and a mocked grading response. SOC persistence tests execute the shared retry implementation. No real candidate invitations, emails, learner results, or customer records were created by these tests.

## Confirmed defects fixed
- Resuming a not-started candidate session now returns the updated status and start timestamp. The portal retains the server start timestamp instead of restarting the displayed timer.
- Resetting a candidate attempt now returns failure if scorecard/session deletion fails; it does not continue to reopen the invitation and report success.
- Candidate elapsed time uses server session timestamps rather than a browser-supplied duration.
- Interrupted written-assessment scoring uses already-submitted answers instead of permitting replacement answers during a retry.
- SOCTraining, SOCSimulation, and RealAttackDrills now use a shared result saver. Failure displays a persistent error toast and Retry save action. Retries retain a snapshot of the original result, concurrent clicks share one pending operation, and successful saves are reused within that saver instance.

The resume-state, reset-failure, forged-duration, and changed-answer retry tests were observed failing before fixes and passing afterward.

## Validated behaviors
Malformed/expired invitation start denial; open-session reuse; cross-invitation session denial; submitted-answer update denial; repeat-submit scorecard reuse; completed-candidate question suppression; server-key objective scoring; objective answer-key removal; immutable save retries; coalesced concurrent saves; no second create after acknowledged success.

## Open findings / limits
- High: lab assessments still trust browser-reported question correctness. Server calculation of the percentage does not prove that lab operations occurred. Server-validated lab evidence is required for trustworthy hiring assessment scores.
- High: distributed simultaneous candidate starts/submissions and ambiguous network failure after a successful database commit need backend uniqueness/idempotency. The new SOC guard is per saver instance, not a database uniqueness guarantee.
- Medium: RealAttackDrills can miss product-remediation updates that arrive while the initial session save is pending. The ref/effect race identified previously remains open.
- SOC retry availability is page-memory based. Leaving/reloading the page or dismissing/replacing the toast can lose that retry opportunity. Durable recovery and a result-level save-status panel remain follow-up work.
- Candidate resets are not transactional: an error is now visible, but earlier successful deletions may already have occurred. Retry/reconciliation needs live validation.
- Live browser flows, retry-toast rendering, deployed tenant/RLS enforcement, live grading quality, email delivery, and real multi-user concurrency were not tested. Passing mocked access tests is not deployed security certification.

Beta remains deferred. Resolve scoring-integrity and durability findings, then perform live learner/admin walkthroughs before sign-off.
