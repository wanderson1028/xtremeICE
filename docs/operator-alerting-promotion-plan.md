# Proposed next operator-alerting promotion

November 9 update: the shared admin-only heartbeat entity and main expiry-wrapper writer were implemented and live-verified after the user asked to continue the workflow-health fix. The branch alert reader now displays the saved sweep result. The plan below is historical for those completed steps. Durable incident storage, external delivery and frontend publication remain separate work; no AWS guest was launched or branch merged.

Historical November 5 proposal below. It did not itself authorize deployment, schema changes, AWS launches or notification activation.

## Problem to resolve

The integration branch has working read-only session alerts and browser-local acknowledgments. Its app-session workflow metadata read currently remains unverified and produces an honest warning. Polling stops when pages close. Base44's shared data/workflow model prevents isolated branch-only activation of a durable shared notification service.

## Smallest next approved block

1. Obtain explicit user approval for the exact main promotion, with no AWS launch included.
2. Back up main and shared definitions; compare branch/main so the promotion includes only reviewed dependencies.
3. Validate a supported workflow-health authentication path without exposing builder tokens or granting learners platform access. Prefer server-owned, sanitized expiry heartbeat telemetry over relying on browser access to builder metadata.
4. If approved, add an admin-only shared monitoring entity and minimal heartbeat writes in the main expiry wrapper: sweep attempted/completed time, bounded outcome/counts, and safe error code. Keep provider actions and cleanup ordering unchanged. A missing heartbeat must mean unknown/stale rather than success. Preserve the workflow's error propagation.
5. Add durable incident/acknowledgment storage with server authorization and stable rule/source keys. Specify concurrency, duplicate suppression, explicit resolution and recurrence behavior. Verify simultaneous observations do not create duplicate incidents; do not claim atomicity from client-side de-duplication.
6. Verify main telemetry with resource-free cases and recheck learner direct/API denials. Test read/write failure behavior, expired heartbeat, notification duplicates, retry limits and redaction. Do not launch a guest for telemetry validation unless separately approved.
7. If the user chooses email or another external channel, approve the destination and content first, then configure a minimal admin-only delivery worker with rate limits and retention. No credentials or notification recipients are needed for the current branch pass.
8. Update the authoritative snapshot and rollback record after final main-state verification.

## Preserve

One guest, 110-minute TTL, existing account/region and supervised budget/window. No automatic relaunch, cleanup bypass, broader learner permissions, frozen-contract changes, Kasm/Proxmox changes, public exposure, or new AWS resource is part of this proposal.

## Rollback and acceptance

Retain restore points for main and shared data/workflow configuration. Rollback must retain existing expiry cleanup and unresolved incident evidence. Acceptance requires demonstrated app-visible heartbeat freshness, honest unknown/failure handling, authorization and duplicate/recurrence tests, verified delivery only to an approved destination if enabled, and an updated snapshot. A branch build alone is insufficient.
