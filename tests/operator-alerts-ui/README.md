# Operator alerting tests

Run with the app dependencies installed and the existing isolated jsdom test tools:
`RECOVERY_TEST_MODULES=/absolute/path/to/node_modules node tests/operator-alerts-ui/run.mjs`.
The same jsdom 30.1.3 test dependency as tests/recovery-ui is used; no production dependency is added. RECOVERY_TEST_REPORT optionally writes a JSON report.

The suite renders the actual operator alert page, banner and hook with an in-memory authenticated client and a virtual clock. All real network requests are denied. It covers browser-local acknowledgment, recurrence, conservative resolution, stale reads, identity changes, cache privacy, storage failure, deduplication, polling and role restrictions. Recovery UI tests remain in tests/recovery-ui/run.mjs.

These deterministic tests do not simulate a real AWS outage and never invoke launch, cleanup, workflow run or notification delivery actions.