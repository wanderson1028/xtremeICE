# Design Studio: AI → Builder → AWS learner demo

Prepared for the next demo session. App: Extreme ICE, branch design-studio-integration.
Preview: https://app.base44.com/apps/69a0a5a90473fac0aa3ea135/editor/preview?branch=design-studio-integration

## Readiness

Implemented and checked: the bounded AI-generation preset, Builder review/save, saved-template compatibility checks, stale-preflight rejection, frozen task snapshots, guided guest file editing, fresh validation with history, and CloudFormation cleanup/status polling.

The new account's live end-to-end proof is still pending. Before presenting, finish the [IAM setup and secure credential entry](aws-learner-access-setup.md). The prepared upload file is AWS_Learner_Access_Bootstrap.json, account 935838375949. No learner VM or endpoint is running.

## Presenter preparation

- Use the design-studio-integration preview, not the published main app.
- Complete DesignStudioLearnerAccessSetupV3 and enter the two dedicated learner secret settings in Base44.
- Allow 5–10 minutes for private AWS endpoint and guest provisioning, especially on the first run.
- Stay present for the live pilot. The scope remains one t3.micro, encrypted 8 GiB disk and two private SSM endpoints under the $10/two-hour limit. The guest requests termination after 105 minutes; endpoints keep accruing charges until stack deletion. A hard billing ceiling and automatic stack deletion are not implemented.
- Keep credentials and IAM security-credential screens out of the presentation.

## 1. Generate a lab with AI

Open Course Lab Builder → AI → AWS Demo.

The selected generation profile must be AWS guided file-permissions demo. Suggested prompt:

> Create a beginner lab about protecting a Linux configuration file. Use the guided file editor to demonstrate permissions changing from 644 to 600 and validate before and after.

Click Generate Lab Template. AI supplies the title, scenario, instructions and objectives. The supported profile supplies the resource definition and fixed validator. An incomplete AI response produces an error instead of silently claiming generation succeeded.

Click Save & Open in Builder.

## 2. Review in Lab Builder

Review Basics & Objectives, the private AWS environment, and Lab Content.

Expected:
- One Amazon Linux 2023 guest, 2 vCPU, 1 GiB RAM and 8 GiB storage.
- One protect_file task.
- A file_mode validator for /var/tmp/design-studio-learner/proof.txt, expected output 600.
- Deployment compatibility: Ready.

Edit the courseware if desired. Keep the profile's path, resource shape and validator for this first demo. Unsupported changes cause a compatibility error.

Click Save & open AWS learner task. This saves the reviewed template and passes its ID to deployment.

## 3. Preflight and create the AWS guest

Click Check AWS learner access. Verify:
- Account 935838375949.
- Region us-east-1.
- Current zone and AMI returned by AWS.
- Correct reviewed lab title.
- Shared schemas ready and eligibility yes.

The server fingerprints the saved runtime definition. Editing it after preflight requires a fresh check.

Click Launch private learner guest and review its scope dialog. The server freezes the reviewed instructions, environment and criterion into the run and LabInstance. The AI-generated content is not converted into shell commands.

The app polls stack and SSM status. Wait for ready. Runtime stack: ExtremeICE-DesignStudio-Learner-Pilot.

## 4. Show a genuine change and fresh validation

1. Click Validate guest permissions before changing anything. Expect Fail, observed mode 644.
2. Click Load file from guest.
3. Append a recognizable sentence, such as Demo change verified.
4. Select permissions 600 and click Save file to guest.
5. Click Load file from guest again. Confirm the changed text persisted in the guest.
6. Click Validate guest permissions. Expect Pass, observed mode 600.
7. Show Recorded validations: one failure and one pass.
8. Optional proof: save 644 again, then validate. Expect a new failure. Restore 600 and validate if you want to finish on a passing result.

Validation is a separate, fresh SSM command. The history is backed by RuntimeValidationAttempt records. Pending/failed command delivery is distinct from a successful probe that reports a failed learner criterion.

## 5. Cleanup

Click Terminate and clean up and confirm the dialog. The app polls deletion and checks removal. Wait for terminated and the AWS removal confirmation. The reusable IAM setup remains in place.

Check CloudLearnerRun and LabInstance are terminated. Preserve validation records for the demo evidence. Do not leave a runtime stack overnight.

## If a gate fails

- LEARNER_AWS_KEYS_MISSING: enter the dedicated learner settings; the old integration is deliberately not used as a fallback.
- AWS_ACCOUNT_MISMATCH: the key pair identifies the wrong account. Correct it directly in Base44; do not modify the account guard to bypass the error.
- AccessDenied: retain the exact action and resource from the error. The IAM bootstrap is statically checked but live permissions still need validation.
- Saved template changed: review/save in Builder and rerun preflight.
- Stack failed: open its CloudFormation Events and capture the earliest failure reason. Clean up that run before retrying.
- SSM still offline: check the instance role/profile and private endpoints; keep the guest inaccessible until SSM is ready.
- Guest action failed: that is not a successful validation. Inspect the command/status and retry after resolving readiness.
- Cleanup pending: use Refresh guest status. If AWS reports DELETE_FAILED, inspect Events and retain the run/resource mapping.

## Evidence completed before the live session

- 14 focused tests passed, including account/credential isolation, generated Bash fail-pass-fail operations, template normalization/freeze, and a full API rehearsal with mocked AWS and a real temporary file.
- Backend type checks, frontend build and focused lint passed.
- Both CloudFormation templates passed lint; the sample-zone warning reflects a zone selected dynamically by real preflight.
- A temporary real Base44 draft persisted the environment and validator correctly. It was archived and untagged after the platform's delete API returned an authorization error; record 6ae8a40cc95c1530a89fb55e is not offered in the learner selector.
- The API rehearsal does not prove live AI service generation, new-account IAM authorization, or a real new-account AWS guest. Those remain live gates.

## November 2 retry: IAM policy size corrected

DesignStudioLearnerAccessSetupV2 reached ROLLBACK_COMPLETE because AppUserAccess used an IAM user inline policy of 2,264 characters, above the 2,048-character aggregate limit. The corrected AppUserAccess is AWS::IAM::ManagedPolicy attached to the same dedicated user, with the exact same PolicyDocument and permissions. It fits the 6,144-character managed-policy limit. All 14 focused tests and static CloudFormation lint pass; live deployment is still pending.

Create a fresh standard stack named DesignStudioLearnerAccessSetupV3 in account 935838375949, us-east-1, uploading the newly updated AWS_Learner_Access_Bootstrap.json. Acknowledge named IAM capabilities. Wait for CREATE_COMPLETE before creating the dedicated user's key. Preserve the failed V2 stack for its event history. If AWS reports a named resource already exists, inspect that resource and V2 Resources first rather than deleting it blindly.

