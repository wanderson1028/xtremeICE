# Xtreme I.C.E. — User administration and feature assignment

Date: 2026-11-17
Status: Initial alpha pass completed; NOT ready for beta sign-off.

## Evidence and method

Tests run the actual TypeScript request handlers after transpilation, with isolated in-memory SDK entities and synthetic platform-admin, tenant-admin, member, and second-tenant identities. No live identities, customer records, invitation emails, or credentials were changed. This proves handler behavior under the tested inputs; it does not prove hosted RLS enforcement or live session behavior.

Command: `npm run test:access`. Initial: 7 passed, 5 failed. After fixes and additional cases: 16 passed, 0 failed. `npm run build` exited 0. Browserslist data warning remains, unrelated to access tests.

## Access matrix from implementation

| Action | Platform admin | Tenant admin | Standard member |
|---|---|---|---|
| Manage feature assignments | All tenants | Own non-platform-admin members | Denied |
| Set tenant admin/member role | All tenants | Own non-platform-admin members | Denied |
| Transfer between organizations | Allowed | Denied | Denied |
| Remove own organization member | Allowed | Allowed by existing policy | Denied |
| Feature access | Editor bypass | Editor within organization | Assigned viewer/editor |
| Direct assignment entity writes | Admin RLS | Backend authorization required | Denied by configured RLS |
| Invite users | Existing SDK flow; live verification pending | Platform capability unverified | Not exposed by management UI |

Feature registry: Network Design Wizard, Visual Design Editor, Cyber Range, SOC Response Drills, SOC Assessments, Real Attack Drills, Training Designer, Active Labs, Course Lab Builder, CFRS, Demo, Tabletop Exercises; enabled custom feature flags may add choices.

## Confirmed defects repaired

1. Tenant admins could move another tenant's user into their own organization (handler returned 200); now 403 with no write.
2. Tenant admins could move platform administrators; now denied.
3. Transferring a tenant admin retained org_admin in the destination; transfers now reset to member. Reapplying the same organization preserves the existing role.
4. Revocation deleted only the first duplicate assignment; now removes every returned match.
5. Downgrade updated only one duplicate assignment; now updates every returned match.
6. Directory failures were converted into successful empty results; now surfaced as errors.
7. User list displayed only one organization-less platform admin; now renders all and labels them platform administrators rather than assuming ownership.
8. Invitation failure could leave the form stuck Sending; added try/catch/finally and actionable errors. No invitation sent in testing.
9. Organization transfer pending state used an unrelated mutation flag; corrected. Role and move failures now surface.
10. Assignment changes did not invalidate the effective feature-access cache; added invalidation and 30-second foreground refresh of identity/assignments.
11. FeatureGate only checked the global flag; it now additionally checks effective user assignment and fails closed on assignment errors. This is UI gating, not a substitute for backend authorization.
12. Custom authority fields lacked consistent field write restrictions. Added documented admin-only field write rules to role, org_role, organization_id, is_individual. Hosted enforcement remains to be tested.

## Automated results

| ID | Scenario | Result |
|---|---|---|
| A01 | Anonymous assignment administration | PASS: 401 |
| A02 | Member self-elevation through admin function | PASS: 403 |
| A03 | Tenant admin changes other tenant feature | PASS: 403 |
| A04 | Tenant admin imports other tenant user | PASS: 403, no write |
| A05 | Tenant admin moves platform admin | PASS: 403, no write |
| A06 | Platform transfer of tenant admin | PASS: role resets to member |
| A07 | Same-tenant placement | PASS: role preserved |
| A08 | Revoke duplicate feature grants | PASS: all returned matches removed |
| A09 | Downgrade duplicate feature grants | PASS: all returned matches viewer |
| A10 | Own member receives viewer grant | PASS |
| A11 | Invalid access level | PASS: 400, no write |
| A12 | Forged tenant selector on list | PASS: only caller tenant returned |
| A13 | User directory fails | PASS: 500, no false empty success |
| A14 | Revocation storage failure | PASS: 500, no false success |
| A15 | Tenant role modification of platform admin | PASS: 403 |
| A16 | Missing role target | PASS: 404 |

## Open alpha gates

- High: independently verify direct User profile updates cannot change protected fields with a real member session. Source configuration is not hosted security proof.
- High: complete backend/entity access matrix for every assignable module. Shared canEditFeature is used by saveAssessment and sendCandidateInvite; other endpoints may use their own checks and require separate inspection. Do not claim universal viewer enforcement.
- High: live cross-tenant directory and data access tests. UserManager still invokes User.list; actual platform RLS behavior was not exercised.
- Medium: last tenant administrator can still be demoted/removed through existing flows; define and enforce recovery policy, including concurrent requests, before beta sign-off. No platform-role demotion endpoint was exercised.
- Medium: assignment writes do not have an established uniqueness/transaction constraint; concurrent create/revoke races and high-volume pagination remain untested.
- Medium: permissions are cached and refreshed on foreground intervals/focus, not guaranteed instant UI revocation. Backend enforcement and session deactivation require live validation.
- Medium: user invitation-to-organization binding, duplicate/expired invite, first login, disable/reactivate/delete behavior remain unverified. No lifecycle actions added or run against real accounts.
- Medium: user administration audit records are not written by the two inspected handlers. Actor, target, before/after, tenant, and event time need an approved audit path.
- UI: browser/mobile rendering, failed password reset feedback, and role-change state transitions require interactive tests.

## Beta acceptance runbook — not executed

Use dedicated test accounts for platform admin, tenant A admin/member, tenant B admin/member. Use a controlled invitation inbox; do not use customer accounts.

| ID | Task | Expected outcome |
|---|---|---|
| B01 | Invite test user; first login and assignment | Correct identity and organization; no unintended admin access |
| B02 | Tenant A admin opens users and direct tenant B links | Only authorized tenant A information visible; B denied |
| B03 | Grant SOC Assessment viewer; refresh and sign in again | Assignment persists; viewing allowed; mutation denied server-side |
| B04 | Change viewer to editor | Authorized creation/edit works only in correct tenant |
| B05 | Revoke feature while member session is open | Backend access denied; UI updates within documented refresh behavior |
| B06 | Member changes role/org fields via direct SDK requests | Request denied; persisted values unchanged |
| B07 | Platform admin transfers user A to B | Membership changes; tenant-admin authority not carried over; old data inaccessible |
| B08 | Disable/reactivate test account | Disabled account cannot continue via existing sessions; reactivation restores intended access only |
| B09 | Repeat on mobile and keyboard navigation | Controls readable, labels clear, feedback actionable |
| B10 | Review audit trail | Correct actor, target, tenant, timestamp and before/after; no secrets |

Feedback record: test ID, tester role, tenant, task completed yes/no, expected/actual behavior, timestamp, redacted screenshot, clarity rating 1–5, defect severity, comments, retest result.

Exit criteria: no critical/high access defects; live authorization and hosted RLS tests pass; audit/lifecycle gaps resolved or explicitly accepted; actual testers complete beta scenarios. Current result is an initial alpha report, not full security certification or completed beta testing.
