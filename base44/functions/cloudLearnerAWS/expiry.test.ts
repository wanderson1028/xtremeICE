import { sweepExpiredLearners } from "./expiry.ts";
import { handleLearnerRequest } from "./handler.ts";

const assert = (value: unknown, label: string) => { if (!value) throw new Error(label); };
const RUN_ID = "0123456789abcdef01234567";
const STACK_ID = "arn:aws:cloudformation:us-east-1:935838375949:stack/ExtremeICE-DesignStudio-Learner-Pilot/example";
const run = () => ({ id: RUN_ID, status: "ready", region: "us-east-1", stack_name: "ExtremeICE-DesignStudio-Learner-Pilot", stack_id: STACK_ID, contract: { account_id: "935838375949", learning: { completed_at: "2026-01-01T00:00:00Z" } }, lab_instance_id: "lab-id", expires_at: "2026-01-02T00:00:00Z" });
Deno.test("expiry sweep deletes only an owned expired stack and preserves completion", async () => {
  const row: any = run(), lab: any = { id: "lab-id", status: "running" };
  const calls: string[] = [];
  let stackStatus = "CREATE_COMPLETE";
  const db: any = { asServiceRole: { entities: {
    CloudLearnerRun: {
      filter: async (query: any) => { assert(query.expires_at.$lte === "2026-01-03T00:00:00.000Z", "server clock cutoff"); return row.status === "terminated" ? [] : [row]; },
      update: async (_id: string, changes: any) => Object.assign(row, changes),
    },
    LabInstance: { update: async (_id: string, changes: any) => Object.assign(lab, changes) },
  } } };
  const deps: any = {
    clock: () => Date.parse("2026-01-03T00:00:00Z"),
    sts: { send: async () => ({ Account: "935838375949" }) },
    aws: async (_service: string, action: string, input: any) => {
      calls.push(action);
      if (action === "DescribeStacks") return { Stacks: { member: { StackId: STACK_ID, StackStatus: stackStatus, Tags: { member: [{ Key: "ManagedBy", Value: "ExtremeICE-DesignStudio-Learner" }, { Key: "LearnerRunId", Value: RUN_ID }] } } } };
      assert(action === "DeleteStack" && input.StackName === STACK_ID && input.ClientRequestToken === "expiry-" + RUN_ID, "bounded idempotent deletion");
      stackStatus = "DELETE_IN_PROGRESS";
      return {};
    },
    ec2: { send: async (command: any) => {
      calls.push(command.action);
      if (command.action === "DescribeVolumes") return { Volumes: [] };
      return command.action === "DescribeVpcs" ? { Vpcs: [] } : { Reservations: [] };
    } },
  };
  const first = await sweepExpiredLearners(db, deps);
  assert(first.cleanup_requested === 1 && row.status === "cleanup_pending" && lab.status === "running", "delete requested while history retained");
  const second = await sweepExpiredLearners(db, deps);
  assert(second.cleanup_requested === 0 && second.pending === 1, "delete not repeated in progress");
  stackStatus = "DELETE_COMPLETE";
  const third = await sweepExpiredLearners(db, deps);
  assert(third.verified_terminated === 1 && row.status === "terminated" && lab.status === "terminated", "termination after removal verification");
  assert(row.contract.learning.completed_at === "2026-01-01T00:00:00Z", "completion preserved");
  assert(calls.filter((name) => name === "DeleteStack").length === 1, "single delete call");
});
Deno.test("expiry sweep refuses another run's stack", async () => {
  const row: any = run();
  let deletes = 0;
  const db: any = { asServiceRole: { entities: {
    CloudLearnerRun: { filter: async () => [row], update: async (_id: string, changes: any) => Object.assign(row, changes) },
    LabInstance: { update: async () => { throw new Error("should not update"); } },
  } } };
  const result = await sweepExpiredLearners(db, {
    clock: () => Date.parse("2026-01-03T00:00:00Z"),
    sts: { send: async () => ({ Account: "935838375949" }) },
    aws: async (_service: string, action: string) => {
      if (action === "DeleteStack") deletes++;
      return { Stacks: { member: { StackId: STACK_ID, StackStatus: "CREATE_COMPLETE", Tags: { member: [{ Key: "ManagedBy", Value: "ExtremeICE-DesignStudio-Learner" }, { Key: "LearnerRunId", Value: "different" }] } } } };
    },
    ec2: { send: async () => { throw new Error("should not inspect"); } },
  });
  assert(deletes === 0 && result.errors[0].error_code === "STACK_OWNERSHIP_MISMATCH" && row.status === "ready", "foreign stack protected");
});
Deno.test("expiry sweep with no expired runs makes no AWS request", async () => {
  const result = await sweepExpiredLearners({ asServiceRole: { entities: { CloudLearnerRun: { filter: async () => [] } } } }, {
    sts: { send: async () => { throw new Error("should not contact AWS"); } },
  });
  assert(result.scanned === 0 && result.cleanup_requested === 0, "empty sweep");
});
Deno.test("wrong AWS account stops the whole sweep before provider action", async () => {
  let providerCalls = 0, updates = 0;
  const db: any = { asServiceRole: { entities: { CloudLearnerRun: {
    filter: async () => [run()], update: async () => { updates++; },
  } } } };
  try {
    await sweepExpiredLearners(db, {
      sts: { send: async () => ({ Account: "699121763776" }) },
      aws: async () => { providerCalls++; return {}; },
    });
    throw new Error("wrong account accepted");
  } catch (error: any) {
    assert(error.name === "AWS_ACCOUNT_MISMATCH", "account mismatch signaled");
    assert(providerCalls === 0 && updates === 0, "no provider action or record change");
  }
});
Deno.test("remaining AWS resources defer termination until independent inventory is clear", async () => {
  const row: any = { ...run(), status: "cleanup_pending", vpc_id: "vpc-owned", instance_id: "i-owned" };
  const lab: any = { status: "running" };
  let vpcExists = true;
  const db: any = { asServiceRole: { entities: {
    CloudLearnerRun: { filter: async () => [row], update: async (_id: string, changes: any) => Object.assign(row, changes) },
    LabInstance: { update: async (_id: string, changes: any) => Object.assign(lab, changes) },
  } } };
  const deps: any = {
    clock: () => Date.parse("2026-01-03T00:00:00Z"),
    sts: { send: async () => ({ Account: "935838375949" }) },
    aws: async () => ({ Stacks: { member: { StackId: STACK_ID, StackStatus: "DELETE_COMPLETE", Tags: { member: [{ Key: "ManagedBy", Value: "ExtremeICE-DesignStudio-Learner" }, { Key: "LearnerRunId", Value: RUN_ID }] } } } }),
    ec2: { send: async (command: any) => command.action === "DescribeVpcs" ? { Vpcs: vpcExists ? [{}] : [] } : command.action === "DescribeInstances" ? { Reservations: [{ Instances: [{ State: { Name: "terminated" } }] }] } : { Volumes: [] } },
  };
  const pending = await sweepExpiredLearners(db, deps);
  assert(pending.pending === 1 && row.status === "cleanup_pending" && lab.status === "running", "resource blocks completion");
  vpcExists = false;
  const complete = await sweepExpiredLearners(db, deps);
  assert(complete.verified_terminated === 1 && row.status === "terminated" && lab.status === "terminated", "termination follows inventory");
});
Deno.test("non-admin cannot trigger expiry sweep", async () => {
  const req = new Request("https://example.invalid/learner", { method: "POST", body: JSON.stringify({ action: "sweepExpired" }) });
  const db: any = { auth: { me: async () => ({ id: "learner", role: "user" }) }, asServiceRole: { entities: {} } };
  const response = await handleLearnerRequest(req, db);
  assert(response.status === 403, "learner denied before AWS or entity access");
});
Deno.test("unsettled initial launch gets a five-minute cleanup grace", async () => {
  const row: any = { ...run(), status: "preparing", stack_id: null, started_at: "2026-01-03T00:00:00Z" };
  let providerCalls = 0, updates = 0;
  const db: any = { asServiceRole: { entities: { CloudLearnerRun: {
    filter: async () => [row], update: async () => { updates++; },
  } } } };
  const result = await sweepExpiredLearners(db, {
    clock: () => Date.parse("2026-01-03T00:03:00Z"),
    sts: { send: async () => ({ Account: "935838375949" }) },
    aws: async () => { providerCalls++; throw new Error("should not inspect stack"); },
    ec2: { send: async () => { providerCalls++; throw new Error("should not inspect resources"); } },
  });
  assert(result.pending === 1 && result.cleanup_requested === 0, "initial launch held pending");
  assert(providerCalls === 0 && updates === 0 && row.status === "preparing", "no cleanup or record mutation during grace");
});
