import { aws as awsRequest, list } from "./awsControl.ts";
import { EXECUTION_ROLE_ARN } from "./accessConfig.ts";
import { ACCOUNT, MANAGED_BY, REGION, requireAccount } from "./model.ts";
import { EC2Client, STSClient, GetCallerIdentityCommand, DescribeInstancesCommand, DescribeVolumesCommand, DescribeVpcsCommand } from "./awsQuery.ts";

const STACK_NAME = "ExtremeICE-DesignStudio-Learner-Pilot";
const ACTIVE = ["preparing", "provisioning", "ready", "failed", "cleanup_pending"];
const START_GRACE_MS = 5 * 60 * 1000;
const BATCH = 50;
const safe = (error: any) => String(error?.name || "EXPIRY_CLEANUP_FAILED").slice(0, 80);
const missing = (error: any) => error?.name === "ValidationError" && /does not exist/i.test(String(error.message));

export async function sweepExpiredLearners(
  b: any,
  deps: any = {},
) {
  const clock = deps.clock || (() => Date.now());
  const callAws = deps.aws || awsRequest;
  const ec2 = deps.ec2 || new EC2Client();
  const sts = deps.sts || new STSClient();
  const cutoff = new Date(clock()).toISOString();
  const rows = await b.asServiceRole.entities.CloudLearnerRun.filter(
    { status: { $in: ACTIVE }, expires_at: { $lte: cutoff } }, "expires_at", BATCH,
  );
  const result: any = { checked_at: cutoff, scanned: rows.length, cleanup_requested: 0, pending: 0, verified_terminated: 0, errors: [], has_more: rows.length === BATCH };
  if (!rows.length) return result;
  // Check the dedicated AWS account before any provider action, including a read.
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  requireAccount(identity.Account);
  for (const row of rows) {
    try {
      if (row.region !== REGION || row.stack_name !== STACK_NAME || row.contract?.account_id !== ACCOUNT) throw Object.assign(new Error("Stored run binding differs from the pilot"), { name: "RUN_BINDING_MISMATCH" });
      if (row.status === "preparing" && !row.stack_id && clock() - Date.parse(row.started_at) < START_GRACE_MS) { result.pending++; continue; }
      let stack: any = null;
      try {
        const response = await callAws("cloudformation", "DescribeStacks", { StackName: row.stack_id || row.stack_name });
        stack = list(response.Stacks?.member)[0] || null;
      } catch (error) { if (!missing(error)) throw error; }
      if (stack) {
        const tags = list(stack.Tags?.member);
        if (!tags.some((tag: any) => tag.Key === "ManagedBy" && tag.Value === MANAGED_BY) ||
            !tags.some((tag: any) => tag.Key === "LearnerRunId" && tag.Value === row.id)) throw Object.assign(new Error("Stack ownership tags differ"), { name: "STACK_OWNERSHIP_MISMATCH" });
        if (stack.StackStatus !== "DELETE_COMPLETE") {
          if (stack.StackStatus !== "DELETE_IN_PROGRESS") {
            await callAws("cloudformation", "DeleteStack", { StackName: stack.StackId, RoleARN: EXECUTION_ROLE_ARN, ClientRequestToken: "expiry-" + row.id });
            result.cleanup_requested++;
          }
          await b.asServiceRole.entities.CloudLearnerRun.update(row.id, { status: "cleanup_pending", stack_id: stack.StackId, stack_status: stack.StackStatus === "DELETE_IN_PROGRESS" ? stack.StackStatus : "DELETE_REQUESTED", last_error_code: null });
          result.pending++;
          continue;
        }
      }
      const remaining: string[] = [];
      if (row.vpc_id) {
        try { const response = await ec2.send(new DescribeVpcsCommand({ VpcIds: [row.vpc_id] })); if (response.Vpcs?.length) remaining.push("vpc"); }
        catch (error: any) { if (error.name !== "InvalidVpcID.NotFound") throw error; }
      }
      if (row.instance_id) {
        try { const response = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [row.instance_id] })); const state = response.Reservations?.flatMap((item: any) => item.Instances || [])[0]?.State?.Name; if (state && state !== "terminated") remaining.push("instance"); }
        catch (error: any) { if (error.name !== "InvalidInstanceID.NotFound") throw error; }
      }
      const volumes = await ec2.send(new DescribeVolumesCommand({ Filters: [{ Name: "tag:LearnerRunId", Values: [row.id] }, { Name: "tag:ManagedBy", Values: [MANAGED_BY] }], MaxResults: 1000 }));
      if (volumes.NextToken || volumes.Volumes?.some((volume: any) => volume.State !== "deleted")) remaining.push("volume");
      if (remaining.length) { result.pending++; continue; }
      const terminated_at = row.terminated_at || new Date(clock()).toISOString();
      await b.asServiceRole.entities.CloudLearnerRun.update(row.id, { status: "terminated", stack_status: "DELETE_COMPLETE", terminated_at, last_error_code: null });
      if (row.lab_instance_id) await b.asServiceRole.entities.LabInstance.update(row.lab_instance_id, { status: "terminated", provider_status_message: "Expired learner stack removed and AWS resources verified." });
      result.verified_terminated++;
    } catch (error: any) {
      const code = safe(error);
      await b.asServiceRole.entities.CloudLearnerRun.update(row.id, { last_error_code: code });
      result.errors.push({ run_id: row.id, error_code: code });
    }
  }
  return result;
}