import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    label: "Review CloudTrail Logs",
    command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=CreateUser --max-results 5",
    expectedOutput: "EventName: CreateUser | UserName: backdoor-admin | Time: 2024-03-15T02:14:33Z",
    hint: "Query CloudTrail to identify unauthorized IAM user creation events.",
    securityInsight: "CloudTrail is the authoritative audit log for AWS API activity. Unauthorized CreateUser calls at odd hours are a strong indicator of account compromise (MITRE T1136.003).",
  },
  {
    label: "Identify Compromised Credentials",
    command: "aws iam list-access-keys --user-name backdoor-admin && aws iam get-user --user-name backdoor-admin",
    expectedOutput: "AccessKeyId: AKIAIOSFODNN7EXAMPLE | Status: Active | CreateDate: 2024-03-15T02:14:40Z",
    hint: "List and inspect the access keys tied to the suspicious account.",
    securityInsight: "Attackers create persistent access keys immediately after gaining IAM access. Key creation timestamp matching account creation is a high-confidence IoC.",
  },
  {
    label: "Revoke Malicious Access",
    command: "aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive && aws iam delete-user --user-name backdoor-admin",
    expectedOutput: "AccessKey updated: Inactive | User backdoor-admin deleted successfully",
    hint: "Disable the access key first, then delete the unauthorized user account.",
    securityInsight: "Always disable before deleting — immediate deletion can trigger automated processes that obscure the attack timeline. Preserving logs is critical for the post-incident review.",
  },
  {
    label: "Audit Affected Resources",
    command: "aws s3api list-buckets --query 'Buckets[?contains(Name, `data`)]' && aws ec2 describe-instances --filters 'Name=tag:CreatedBy,Values=backdoor-admin'",
    expectedOutput: "Bucket: sensitive-data-exfil | EC2 Instance: i-0abc123 | State: running",
    hint: "Search for S3 buckets and EC2 instances created or accessed by the attacker.",
    securityInsight: "Blast radius analysis determines the full scope of a breach. Attackers often spin up EC2 instances for crypto mining or spin up S3 buckets for data staging (T1537).",
  },
  {
    label: "Apply Preventive Controls",
    command: "aws iam put-account-password-policy --minimum-password-length 14 --require-uppercase-characters --require-mfa && aws guardduty create-detector --enable",
    expectedOutput: "PasswordPolicy updated | GuardDuty Detector created: abc123detector",
    hint: "Enforce a strong password policy and enable GuardDuty for ongoing threat detection.",
    securityInsight: "Post-incident hardening closes the gap that was exploited. GuardDuty uses ML and threat intelligence to detect future anomalies, including credential exfiltration and unusual API calls.",
  },
];

export default function LabCloudIncidentResponse() {
  return (
    <LabRunner
      title="Cloud Incident Response"
      difficulty="Advanced"
      duration={70}
      category="Investigate"
      tags={["AWS", "CloudTrail", "IAM", "GuardDuty", "DFIR"]}
      objectives={[
        "Analyze CloudTrail logs to identify unauthorized API activity",
        "Trace and revoke compromised IAM credentials",
        "Perform blast radius analysis across affected cloud resources",
        "Implement preventive security controls post-incident",
      ]}
      prerequisites={["AWS CLI familiarity", "Understanding of IAM roles and policies"]}
      steps={steps}
    />
  );
}