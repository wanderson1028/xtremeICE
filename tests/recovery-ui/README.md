# Recovery screen tests

These deterministic DOM tests render the actual learner and instructor pages with an in-memory client, virtual clock and a network-denial stub. They do not authenticate real users or call AWS. They complement the real two-learner acceptance evidence retained in the project snapshot.

Prerequisites: the app's locked dependencies and Node 24. Run `npm install --prefix tests/recovery-ui --ignore-scripts --no-audit --no-fund`, then `node tests/recovery-ui/run.mjs`. Alternatively set RECOVERY_TEST_MODULES to an isolated node_modules folder containing jsdom. RECOVERY_TEST_REPORT optionally writes a JSON result file. No test package is added to production dependencies.

The tests cover automatic retry/backoff, independent operation warnings, retained command identity and locks, assignment revocation, cleanup intent, verified release presentation, diagnostics authorization, stale snapshots, and honest partial-result/provider-check wording. Faults and removal responses are simulated; these results are not a new live AWS rehearsal.
