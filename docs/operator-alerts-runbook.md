# Operator alerts: integration-branch pilot

## November 9 workflow-health update

The old app-session read of Base44 workflow metadata is superseded by a server-owned CloudLearnerExpiryHealth heartbeat. Main's five-minute expiry wrapper records the latest sanitized sweep result in one admin-only entity row; the integration-branch instructor page reads it. A missing, invalid, unreadable or stale heartbeat remains an alert. The page shows sweep evidence, not platform workflow configuration or fresh AWS resource absence. A heartbeat write failure does not change the cleanup result. Live scheduled runs wrote and then updated the same row at 20:35:32 and 20:40:50 UTC on November 9; a separate platform read confirmed the workflow active and successful. The branch alert page displayed the current heartbeat and zero current warnings. No guest was launched or frontend published. The November 5 observations below are historical.

Verified November 5, 2026. App Extreme ICE (69a0a5a90473fac0aa3ea135), branch design-studio-integration (6adc042dc1759e6183863750). This is an in-app instructor alerting pass, not an unattended notification service.

## Open and review

Open Lab Builder > Operator alerts, or /OperatorAlerts. Instructor banners also appear in Lab assignments, AWS pilot and the Session recovery overview. The cloudLearnerAWS operatorAlerts action authorizes the actual app user as admin before privileged reads. Learners cannot use this action.

The page checks immediately and every 60 seconds while mounted. Failed refreshes retain earlier alerts, mark the information stale and back off to a maximum 120 seconds. Refresh alerts requests a new read; it cannot launch, terminate or repair a lab. Browser timer suspension and a closed page stop reliable polling. Several open instructor pages can poll independently.

Review the alert's next step and the linked Session recovery overview. Confirm the actual session/provider state before recovery actions. A record count does not prove the number of AWS guests, and a terminated record does not prove fresh provider absence.

Acknowledge records that this instructor has seen the warning. It does not resolve the condition, release capacity, change cleanup, or silence another instructor/browser. A later explicit healthy observation resolves the incident. A recurrence reopens it with a new acknowledgment required. Unavailable/truncated checks leave previous warnings unresolved.

## Thresholds

| Condition | Alert threshold |
| --- | --- |
| Failed start, saved error, unknown state or malformed timing | On observation |
| Preparing | At least 5 minutes after started_at |
| Provisioning | At least 20 minutes after started_at |
| Cleanup intent | At least 15 minutes after cleanup_requested_at |
| Expired capacity hold | At least 10 minutes after expires_at |
| Pending action | Deadline reached or invalid deadline |
| Uncertain dispatch | Pending/expired DISPATCH_UNCERTAIN until recorded release |
| Pilot capacity conflict | More than one capacity-holding record, including older AWS proof records |
| Workflow disabled or failed | On verified metadata observation |
| Workflow stale | Last verified run at least 15 minutes old |
| Unknown workflow health / incomplete results | Explicit monitoring warning |

These thresholds affect alerts only; expiry/lifecycle behavior is unchanged. Reads are bounded to 50 active and 20 recent released records per run type, and 200 relevant pending/uncertain operations. Overflow raises an incomplete-results warning; omitted records cannot silently resolve old warnings.

## Privacy and persistence

Acknowledgments and generic history are saved per instructor in this browser origin's local storage. The saved value contains only opaque source/rule keys, generic rule codes, states, counts and timestamps. Run IDs and alert details are fetched into memory for the current authorized view; identities, command data, frozen content, bindings, credentials and provider handles are excluded. History retains up to 100 generic entries (the screen shows 20 resolved entries). Storage failure displays a warning and falls back to in-memory state; closing the page can lose acknowledgments.

There is no shared incident entity, server-side acknowledgment, new workflow, email, SMS, webhook, or notification subscription. Data structures and workflows are shared/main concerns in Base44's branch model: https://base44.com/blog/news/introducing-branches. No such resource was created in this pass.

## Live verification and known limit

The real admin branch preview read saved session records and displayed the genuine warning "Expiry workflow status could not be verified". Acknowledge changed the incident to acknowledged with occurrence count 1; preview reload retained it. The app-session metadata GET could not be verified. Do not describe the app's scheduler check as healthy or operationally accepted.

Separately, the authorized Base44 connector read the unchanged Expire AWS Learner Labs workflow: active, */5 * * * *, version 93b55fca9d32f966d853c25d017447df2f8450041e01986e78ce8691023b12c6, last_run_at 2026-11-05T07:03:05.413Z, last_run_status success, consecutive_failures 0. This connector observation is not proof that an app login can read the same metadata, nor a new AWS removal check.

## Pilot and actions

Preserve LabTemplate -> frozen LabInstance -> execution provider; account 935838375949 in us-east-1; one guest maximum; 110-minute TTL; supervised USD 10/two-hour pilot. The previous special USD 1 offline rehearsal authorization was consumed by that one completed run.

Ask the user before any additional AWS launch or main deployment. This pass launched nothing, changed no AWS/IAM resources, schemas/RLS/workflows or main code, and did not merge or publish. Acknowledging an alert never grants launch permission.

## Validation

80 backend tests, 21 operator DOM/hook tests and 12 learner/recovery DOM tests pass (113 total). UI tests render the actual components with virtual time, mocked clients and network denied. They cover role/revocation/account-switch gates, de-duplication, persistence, recurrence, stale/out-of-order checks, incomplete clearance, polling/backoff, storage failure and bounded private caches. Backend tests cover admin gating, read-only limits/redaction, state thresholds, uncertainty, workflow states and bounded caller-authorized metadata reads. These are simulated fault tests, not live AWS outage injection or a repeat of two-learner AWS acceptance.

Build, focused ESLint, both deployed-entry type checks and whitespace checks pass. The existing stale Browserslist-data advisory remains. The current local evidence is Design_Studio_Operator_Alerting_2026-11-05.json and operator-alerting-2026-11-05/.
