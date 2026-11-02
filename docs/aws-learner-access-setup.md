# AWS learner access IAM setup

The first live preflight failed because base-64-user1 lacks cloudformation:ValidateTemplate. No learner resources were launched.

## Install with an AWS IAM administrator

1. Select account 699121763776 and region us-east-1 in AWS CloudFormation.
2. Create a standard stack from docs/aws-learner-access-bootstrap.json, using stack name DesignStudioLearnerAccessSetup.
3. Review the IAM changes and acknowledge creation of named IAM resources. Create the stack and wait for CREATE_COMPLETE.
4. Reload the Design Studio integration branch, open AWS learner file task, and run Check AWS learner access again. Keep Launch untouched until the preflight result has been reviewed.

The setup creates DesignStudioLearnerCloudFormationRole, DesignStudioLearnerGuestRole, DesignStudioLearnerGuestProfile, and an inline DesignStudioLearnerPilot policy on the existing base-64-user1. It creates no EC2 instance, endpoint, VPC, or credential. Existing user policies are retained.

The app can validate a template, operate the fixed ExtremeICE-DesignStudio-Learner-Pilot stack using the exact execution role, read AWS status, and run AWS-RunShellScript on learner-tagged EC2 instances. The execution role has specific regional EC2 lifecycle permissions with tag restrictions and can pass only the guest role to EC2. Neither added role nor app policy has IAM role/policy creation or modification actions. The guest role uses AWS's AmazonSSMManagedInstanceCore policy.

These are additional permissions; existing user permissions are not removed. Static CloudFormation lint passed for both setup and learner templates. Actual IAM authorization and provisioning are pending live verification.

## Cleanup and rollback

Delete and verify the disposable learner stack after each proof. Its VM, disk, VPC, subnet, security groups, and private endpoints are disposable. The IAM setup stack is reusable and remains in place. To remove the added permissions and roles, first delete every learner pilot stack, then delete DesignStudioLearnerAccessSetup. Keep its execution role available until learner stack cleanup finishes.

References: [CloudFormation service roles](https://docs.aws.amazon.com/prescriptive-guidance/latest/least-privilege-cloudformation/service-roles-for-cloudformation.html), [SSM command restrictions](https://docs.aws.amazon.com/launchwizard/latest/userguide/launch-wizard-sap-service-catalog-errors.html).
