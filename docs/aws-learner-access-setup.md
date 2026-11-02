# AWS learner access setup — user-owned account

## Current target

- AWS account: 935838375949, confirmed by the user.
- Region: us-east-1.
- Dedicated API-only app user: design-studio-learner-pilot.
- Dedicated app secret settings: AWS_LEARNER_ACCESS_KEY_ID and AWS_LEARNER_SECRET_ACCESS_KEY.
- Bootstrap file: docs/aws-learner-access-bootstrap.json. The local upload copy is AWS_Learner_Access_Bootstrap.json in the project workspace.

The older Base44 AWS identity identified account 699121763776. The user said that may be Jason's account. Its credentials and other app integrations have not been changed. The learner adapter has no fallback to those settings. Every learner AWS lifecycle action checks the expected account.

## One-time IAM setup

1. Sign into account 935838375949 as an authorized administrator and select us-east-1.
2. The earlier DesignStudioLearnerAccessSetup attempt is ROLLBACK_COMPLETE. Its Events explicitly say the old template's account assertion rejected account 935838375949. Keep that failed stack as evidence; use a fresh setup stack name: DesignStudioLearnerAccessSetupV3.
3. Create a standard CloudFormation stack using the corrected aws-learner-access-bootstrap.json file.
4. Review the named IAM resources and policy, acknowledge named IAM capabilities, then submit and wait for CREATE_COMPLETE.
5. Check Outputs: the execution role ARN must be in account 935838375949 and the AppUser must be design-studio-learner-pilot.

The template creates two roles, one instance profile, the dedicated IAM user, and its limited inline policy. It creates no access keys, console password, EC2 instance, VPC, or private endpoint. The app can use only the fixed learner stack and approved SSM document on learner-tagged instances. The execution role cannot create or modify IAM roles or policies.

## Secure credential entry

After the setup stack succeeds, an administrator must create an access key for design-studio-learner-pilot in IAM → Users → Security credentials → Access keys. Enter that pair directly into the Base44 app's secret settings:

- AWS_LEARNER_ACCESS_KEY_ID: that user's access key ID.
- AWS_LEARNER_SECRET_ACCESS_KEY: its matching secret access key.

Keep credential values out of chat, source code, project files, and screenshots. Existing app-wide AWS settings stay in place. This pilot uses a dedicated IAM user; no root credentials are needed. Live preflight must identify account 935838375949 before any learner stack is launched.

## Verified and pending

The corrected bootstrap and learner templates passed static CloudFormation lint. Account/no-fallback guards, task scripts, template snapshot flow, API orchestration and frontend builds passed their checks. Actual IAM authorization and a live learner run in account 935838375949 are not yet verified. Browser automation confirmed the old rollback reason, but the console file chooser did not open, so no corrected setup was submitted.

## Cleanup and rollback

Delete the disposable runtime stack ExtremeICE-DesignStudio-Learner-Pilot after each demo and verify removal in the app. The IAM setup is reusable and remains in place. For full decommissioning, first remove the runtime stack, then deactivate/delete the access key you created for the app user, then delete DesignStudioLearnerAccessSetupV3. Keep the execution role available until runtime cleanup finishes.

See [the demo runbook](aws-learner-demo-runbook.md).

References: [CloudFormation service roles](https://docs.aws.amazon.com/prescriptive-guidance/latest/least-privilege-cloudformation/service-roles-for-cloudformation.html), [IAM administrator key management](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-keys-admin-managed.html).


## November 2 retry: IAM policy size corrected

DesignStudioLearnerAccessSetupV2 reached ROLLBACK_COMPLETE because AppUserAccess used an IAM user inline policy of 2,264 characters, above the 2,048-character aggregate limit. The corrected AppUserAccess is AWS::IAM::ManagedPolicy attached to the same dedicated user, with the exact same PolicyDocument and permissions. It fits the 6,144-character managed-policy limit. All 14 focused tests and static CloudFormation lint pass; live deployment is still pending.

Create a fresh standard stack named DesignStudioLearnerAccessSetupV3 in account 935838375949, us-east-1, uploading the newly updated AWS_Learner_Access_Bootstrap.json. Acknowledge named IAM capabilities. Wait for CREATE_COMPLETE before creating the dedicated user's key. Preserve the failed V2 stack for its event history. If AWS reports a named resource already exists, inspect that resource and V2 Resources first rather than deleting it blindly.

