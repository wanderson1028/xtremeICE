import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import {
  EC2Client, STSClient, GetCallerIdentityCommand,
  CreateVpcCommand, CreateSubnetCommand, CreateSecurityGroupCommand,
  RevokeSecurityGroupEgressCommand, RunInstancesCommand, DescribeImagesCommand, DescribeInstanceTypeOfferingsCommand,
  DescribeInstancesCommand, GetConsoleOutputCommand, TerminateInstancesCommand,
  DeleteSecurityGroupCommand, DeleteSubnetCommand, DeleteVpcCommand,
  DescribeVpcsCommand, DescribeSubnetsCommand, DescribeSecurityGroupsCommand, DescribeVolumesCommand,
} from "./awsQuery.ts";

import { CHECKS, TASK_ID, VALIDATION_TITLE, validationTasks, isValidationTemplate, validValidationTasks, validationUserData, digest, readProbe } from "./validationProof.ts";

// Branch-only AWS proof: one isolated Amazon Linux VM. No IGW, NAT, public IP,
// inbound rule, SSH key, browser session, or existing Live Fire resource is used.
const REGION = "us-east-1";
const MAX_MINUTES = 110;
const AMI_OWNER = "137112412989";
const INSTANCE_TYPE = "t3.micro";
const VPC_CIDR = "10.253.0.0/24";
const SUBNET_CIDR = "10.253.0.0/28";
const MARKER = "DESIGN_STUDIO_POC_READY";
const ACTIVE = ["preparing", "provisioning", "running", "cleanup_pending"];
const now = () => new Date().toISOString();
const ec2 = new EC2Client();
const sts = new STSClient();

function reply(body: unknown, status = 200) {
  return Response.json(body, { status });
}
function code(error: any) {
  const name = String(error?.name || error?.code || "AWS_OPERATION_FAILED");
  return /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(name) ? name : "AWS_OPERATION_FAILED";
}
function single(items: any) {
  return Array.isArray(items) && items.length === 1 ? items[0] : null;
}
function assessTemplate(template: any) {
  const errors = [];
  const env = template?.environment_definition;
  const resource = single(env?.resources);
  const network = single(env?.networks);
  const policy = env?.connectivity_policy || {};
  if (!resource) errors.push("Exactly one environment resource is required.");
  if (!network) errors.push("Exactly one isolated network is required.");
  if (resource) {
    if (!["workstation", "server"].includes(resource.resource_type)) errors.push("The resource must be a workstation or server.");
    if (!/linux|amazon/i.test(resource.os_type || "")) errors.push("The OS requirement must be Linux.");
    if (![resource.cpu_cores, resource.memory_mb, resource.storage_gb].every((value) => Number.isFinite(Number(value)) && Number(value) > 0) || Number(resource.cpu_cores) > 2 || Number(resource.memory_mb) > 1024 || Number(resource.storage_gb) > 8) errors.push("The proof is limited to 2 vCPU, 1 GiB memory, and 8 GiB storage.");
    if (!["none", "serial_console"].includes(resource.access_method)) errors.push("Learner access is outside this first cloud boot proof; use none or serial_console.");
    if (["tools", "services", "startup_scripts", "initial_files"].some((key) => Array.isArray(resource[key]) && resource[key].length)) errors.push("Software, services, scripts, and seed files are not provisioned by this proof.");
    if (network && (!Array.isArray(resource.network_ids) || resource.network_ids.length !== 1 || resource.network_ids[0] !== network.id)) errors.push("The resource must attach only to its isolated network.");
  }
  if (network && (network.isolated !== true || network.internet_access === true)) errors.push("The network must be isolated with no internet access.");
  if (policy.internet_access !== "none" || policy.isolation_required !== true || policy.allow_inbound_external === true || policy.allow_outbound_external === true) errors.push("Connectivity must require isolation and no external access.");
  if (Array.isArray(env?.connections) && env.connections.length) errors.push("Multi-resource connections are outside this proof.");
  if (env?.identity_requirements?.directory_required || env?.identity_requirements?.mfa_required || (env?.identity_requirements?.accounts_needed || []).length) errors.push("Identity provisioning is outside this proof.");
  if ((env?.initialization?.startup_scripts || []).length || env?.initialization?.seed_data_notes || env?.initialization?.snapshot_required) errors.push("Initialization and snapshots are outside this proof.");
  const tasks = template?.lab_content?.tasks || [];
  if (isValidationTemplate(template)) {
    if (!validValidationTasks(template)) errors.push("Validation self-test tasks must match the fixed server probe definitions.");
  } else if (tasks.some((task: any) => Array.isArray(task.validation_criteria) && task.validation_criteria.length > 0)) errors.push("Only the fixed AWS validation self-test supports automated criteria in this proof.");
  return { ready: errors.length === 0, errors, resource_id: resource?.id || null, network_id: network?.id || null };
}
function freeze(template: any) {
  const content = template.lab_content || {};
  return {
    title: template.title || "AWS cloud proof",
    description: template.description || "",
    difficulty: template.difficulty || "Beginner",
    passing_score: typeof template.passing_score === "number" ? template.passing_score : 70,
    estimated_duration_minutes: template.estimated_duration_minutes || 60,
    objectives: Array.isArray(template.objectives) ? template.objectives : [],
    prerequisites: Array.isArray(template.prerequisites) ? template.prerequisites : [],
    environment_definition: template.environment_definition,
    lab_content: {
      scenario: content.scenario || "",
      tasks: (content.tasks || []).map(({ expected_commands, reference_config, ...task }: any) => task),
      success_criteria: content.success_criteria || "",
    },
  };
}
async function getTemplate(base44: any, templateId: unknown) {
  if (typeof templateId !== "string" || !/^[a-f0-9]{16,32}$/i.test(templateId)) return null;
  return (await base44.asServiceRole.entities.LabTemplate.filter({ id: templateId }))[0] || null;
}
async function getRun(base44: any, runId: unknown) {
  if (typeof runId !== "string" || !/^[a-f0-9]{16,32}$/i.test(runId)) return null;
  return (await base44.asServiceRole.entities.CloudPocRun.filter({ id: runId }))[0] || null;
}
async function findAmi() {
  const result = await ec2.send(new DescribeImagesCommand({
    Owners: [AMI_OWNER],
    Filters: [
      { Name: "name", Values: ["al2023-ami-2023.*-x86_64"] },
      { Name: "state", Values: ["available"] },
      { Name: "architecture", Values: ["x86_64"] },
      { Name: "virtualization-type", Values: ["hvm"] },
    ],
  }));
  const image = (result.Images || []).sort((a: any, b: any) => String(b.CreationDate).localeCompare(String(a.CreationDate)))[0];
  if (!image?.ImageId) throw new Error("NO_AMI");
  return image.ImageId;
}
async function findZone() {
  const result = await ec2.send(new DescribeInstanceTypeOfferingsCommand({
    LocationType: "availability-zone",
    Filters: [{ Name: "instance-type", Values: [INSTANCE_TYPE] }],
  }));
  const zone = (result.Offerings || []).map((item: any) => item.Location).filter((item: any) => typeof item === "string" && item.startsWith(`${REGION}`)).sort()[0];
  if (!zone) throw new Error("NO_COMPATIBLE_ZONE");
  return zone;
}
async function observeInstance(instanceId: string) {
  try {
    const result = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    const instance = result.Reservations?.flatMap((reservation: any) => reservation.Instances || [])[0];
    return instance?.State?.Name || "unknown";
  } catch (error) {
    if (code(error) === "InvalidInstanceID.NotFound") return "not_found";
    throw error;
  }
}
async function inspectRun(base44: any, run: any) {
  if (!run.instance_id) return { state: run.status, guest_ready: false };
  const state = await observeInstance(run.instance_id);
  let guestReady = false;
  let consoleText = "";
  if (state === "running" || state === "stopping" || state === "stopped") {
    try {
      const output = await ec2.send(new GetConsoleOutputCommand({ InstanceId: run.instance_id, Latest: true }));
      const encoded = String(output.Output || "");
      const decoded = encoded ? atob(encoded) : "";
      consoleText = decoded;
      guestReady = decoded.includes(`${MARKER}:${run.id}`);
    } catch { /* Console output can lag; EC2 state remains observable. */ }
  }
  const lab = run.lab_instance_id ? await base44.asServiceRole.entities.LabInstance.get(run.lab_instance_id) : null;
  let validation: any = null;
  if (isValidationTemplate(lab?.template_snapshot)) {
    const attempts = await base44.asServiceRole.entities.RuntimeValidationAttempt.filter({ instance_id: run.lab_instance_id, task_id: TASK_ID });
    for (const attempt of attempts) {
      if (attempt.status !== "pending" || attempt.evidence?.run_id !== run.id) continue;
      const passed = consoleText && Date.now() <= Date.parse(attempt.expires_at) ? await readProbe(consoleText, run.id, attempt.token_hash, attempt.check_id) : null;
      if (passed !== null) {
        await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, {
          status: "completed", passed, observed: passed ? "file present" : "file absent",
          message: "Observed fixed path probe via AWS console output.",
        });
        attempt.status = "completed"; attempt.passed = passed;
      } else if (Date.now() > Date.parse(attempt.expires_at)) {
        await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, { status: "expired", message: "No correlated guest evidence before expiry." });
        attempt.status = "expired";
      }
    }
    validation = { checks: CHECKS.map(c => {
      const a = attempts.find((a: any) => a.check_id === c.check && a.evidence?.run_id === run.id);
      return { check: c.check, expected_pass: c.expected, status: a?.status || "missing", passed: a?.passed ?? null };
    }) };
    validation.verified = validation.checks.every((c: any) => c.status === "completed" && c.passed === c.expected_pass);
  }
  const status = guestReady && state === "running" && !["cleanup_pending", "terminated"].includes(run.status) ? "running" : run.status;
  if (status !== run.status || state !== run.last_observed_state) {
    await base44.asServiceRole.entities.CloudPocRun.update(run.id, { status, last_observed_state: state });
    if (run.lab_instance_id && status === "running") {
      await base44.asServiceRole.entities.LabInstance.update(run.lab_instance_id, {
        status: "running", provider_status_message: "Isolated AWS guest boot marker observed.", provider_status_progress: 100,
      });
    }
  }
  return { run_id: run.id, lab_instance_id: run.lab_instance_id || null, region: REGION, instance_id: run.instance_id, state, guest_ready: guestReady, validation, status, expires_at: run.expires_at };
}
function hasRunTag(tags: any, runId: string) {
  return Array.isArray(tags) && tags.some((tag) => tag.Key === "PocRunId" && tag.Value === runId) && tags.some((tag) => tag.Key === "ManagedBy" && tag.Value === "ExtremeICE-DesignStudio-POC");
}
async function assertOwned(run: any, kind: "instance" | "security_group" | "subnet" | "vpc", id: string) {
  try {
    let tags;
    if (kind === "instance") {
      const result = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [id] }));
      tags = result.Reservations?.flatMap((reservation: any) => reservation.Instances || [])[0]?.Tags;
    } else if (kind === "security_group") {
      tags = (await ec2.send(new DescribeSecurityGroupsCommand({ GroupIds: [id] }))).SecurityGroups?.[0]?.Tags;
    } else if (kind === "subnet") {
      tags = (await ec2.send(new DescribeSubnetsCommand({ SubnetIds: [id] }))).Subnets?.[0]?.Tags;
    } else {
      tags = (await ec2.send(new DescribeVpcsCommand({ VpcIds: [id] }))).Vpcs?.[0]?.Tags;
    }
    if (!hasRunTag(tags, run.id)) throw new Error("RESOURCE_TAG_MISMATCH");
    return true;
  } catch (error) {
    if (/NotFound$/.test(code(error))) return false;
    throw error;
  }
}
async function cleanup(base44: any, run: any) {
  if (run.instance_id) await assertOwned(run, "instance", run.instance_id);
  let state = run.instance_id ? await observeInstance(run.instance_id) : "not_created";
  if (run.instance_id && !["terminated", "not_found"].includes(state)) {
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: [run.instance_id] }));
    state = "shutting-down";
  }
  if (run.instance_id && !["terminated", "not_found"].includes(state)) {
    await base44.asServiceRole.entities.CloudPocRun.update(run.id, { status: "cleanup_pending", last_observed_state: state });
    return { status: "cleanup_pending", instance_state: state, run_id: run.id, message: "Instance termination requested. Retry cleanup after AWS reports terminated." };
  }
  // Only resource IDs stored on this run are touched. A later call completes
  // network cleanup after EC2 has released its ENI.
  try {
    if (run.security_group_id && await assertOwned(run, "security_group", run.security_group_id)) await ec2.send(new DeleteSecurityGroupCommand({ GroupId: run.security_group_id }));
    if (run.subnet_id && await assertOwned(run, "subnet", run.subnet_id)) await ec2.send(new DeleteSubnetCommand({ SubnetId: run.subnet_id }));
    if (run.vpc_id && await assertOwned(run, "vpc", run.vpc_id)) await ec2.send(new DeleteVpcCommand({ VpcId: run.vpc_id }));
  } catch (error) {
    await base44.asServiceRole.entities.CloudPocRun.update(run.id, { status: "cleanup_pending", last_error_code: code(error) });
    return { status: "cleanup_pending", instance_state: state, run_id: run.id, error_code: code(error), message: "Instance is terminated; retry network cleanup." };
  }
  await base44.asServiceRole.entities.CloudPocRun.update(run.id, { status: "terminated", terminated_at: now(), last_observed_state: state, last_error_code: "" });
  if (run.lab_instance_id) {
    await base44.asServiceRole.entities.LabInstance.update(run.lab_instance_id, { status: "terminated", completed_at: now(), provider_status_message: "AWS proof resources verified removed." });
  }
  return { status: "terminated", instance_state: state, run_id: run.id };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return reply({ error: "Unauthorized" }, 401);
  if (user.role !== "admin") return reply({ error: "Admin role required" }, 403);
  let input;
  try { input = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const action = input?.action;
  try {
    if (action === "prepareValidationTemplate") {
      const candidates = await base44.asServiceRole.entities.LabTemplate.filter({ title: VALIDATION_TITLE });
      if (candidates[0]) return reply({ template_id: candidates[0].id, created: false });
      const source = (await base44.asServiceRole.entities.LabTemplate.filter({ title: "AWS Isolated Boot Proof (Design Studio)" }))[0];
      if (!source?.environment_definition) return reply({ error: "Prepare the boot proof template first" }, 400);
      const template = await base44.asServiceRole.entities.LabTemplate.create({
        title: VALIDATION_TITLE, description: "Fixed guest validation self-test: one passing and one failing path check.",
        nice_category: "Operate and Maintain", difficulty: "Beginner", status: "draft", estimated_duration_minutes: 110, passing_score: 50,
        environment_definition: source.environment_definition,
        lab_content: { scenario: "Validate seeded guest fixtures through AWS console evidence.", tasks: validationTasks(), success_criteria: "Present file passes, missing file fails, then all resources are removed." },
      });
      return reply({ template_id: template.id, created: true });
    }
    if (action === "prepareTemplate") {
      const title = "AWS Isolated Boot Proof (Design Studio)";
      const candidates = await base44.asServiceRole.entities.LabTemplate.filter({ title });
      const existing = candidates.find((template: any) => template.title === title);
      if (existing) return reply({ template_id: existing.id, created: false, schema_ready: !!existing.environment_definition });
      const template = await base44.asServiceRole.entities.LabTemplate.create({
        title, description: "Disposable course-lab cloud boot proof; no learner access or task validation.",
        nice_category: "Operate and Maintain", difficulty: "Beginner", status: "draft",
        estimated_duration_minutes: 110, passing_score: 0,
        objectives: ["Verify a frozen course lab can create, observe, and remove one isolated AWS guest."],
        lab_content: { scenario: "Observe a disposable Linux guest boot in an isolated AWS VPC.", tasks: [], success_criteria: "AWS guest boot marker observed and all proof resources cleaned up." },
        environment_definition: {
          resources: [{ id: "res_aws_boot_poc", name: "Isolated Linux server", role: "proof_guest", resource_type: "server", os_type: "Amazon Linux 2023", cpu_cores: 2, memory_mb: 1024, storage_gb: 8, tools: [], services: [], access_method: "serial_console", network_ids: ["net_aws_poc"], startup_scripts: [], initial_files: [] }],
          networks: [{ id: "net_aws_poc", name: "AWS isolated proof network", purpose: "internal", isolated: true, internet_access: false }],
          connections: [],
          connectivity_policy: { internet_access: "none", isolation_required: true, allow_inbound_external: false, allow_outbound_external: false },
          identity_requirements: { accounts_needed: [], directory_required: false, mfa_required: false },
          initialization: { startup_scripts: [], seed_data_notes: "", snapshot_required: false },
          reset_policy: { reset_required: true, reset_mode: "recreate", preserve_learner_artifacts: false },
        },
      });
      return reply({ template_id: template.id, created: true });
    }
    if (action === "preflight") {
      const template = await getTemplate(base44, input.template_id);
      if (!template) return reply({ error: "Template not found" }, 404);
      const assessment = assessTemplate(template);
      if (isValidationTemplate(template)) {
        try { await base44.asServiceRole.entities.RuntimeValidationAttempt.list("-created_date", 1); }
        catch { assessment.errors.push("Shared RuntimeValidationAttempt schema is required before this self-test can launch."); assessment.ready = false; }
      }
      const identity = await sts.send(new GetCallerIdentityCommand({}));
      const amiId = await findAmi();
      const zone = await findZone();
      return reply({
        template_id: template.id, template_title: template.title, assessment,
        schema_gate: template.environment_definition ? null : "The shared LabTemplate schema has not applied environment_definition; AWS launch is blocked until the data model is updated.",
        aws: { account_id: identity.Account, region: REGION, ami_id: amiId, instance_type: INSTANCE_TYPE, availability_zone: zone, max_minutes: MAX_MINUTES, vpc_cidr: VPC_CIDR, subnet_cidr: SUBNET_CIDR },
        scope: "One isolated VM, no public IP, internet route, inbound rule, SSH key, or learner session.",
      });
    }
    if (action === "launch") {
      if (input.ack !== "LAUNCH_ISOLATED_AWS_POC") return reply({ error: "Explicit launch acknowledgment required" }, 400);
      const template = await getTemplate(base44, input.template_id);
      if (!template) return reply({ error: "Template not found" }, 404);
      const assessment = assessTemplate(template);
      if (isValidationTemplate(template)) {
        try { await base44.asServiceRole.entities.RuntimeValidationAttempt.list("-created_date", 1); }
        catch { assessment.errors.push("Shared RuntimeValidationAttempt schema is required before this self-test can launch."); assessment.ready = false; }
      }
      if (!assessment.ready) return reply({ error: "Template is not eligible", assessment }, 400);
      const existing = await base44.asServiceRole.entities.CloudPocRun.list("-created_date", 100);
      if (existing.some((run) => ACTIVE.includes(run.status))) return reply({ error: "A cloud proof is already active or needs cleanup." }, 409);
      const amiId = await findAmi();
      const zone = await findZone();
      const started = new Date();
      const expires = new Date(started.getTime() + MAX_MINUTES * 60000).toISOString();
      const run = await base44.asServiceRole.entities.CloudPocRun.create({
        template_id: template.id, provider: "aws", region: REGION, status: "preparing",
        ami_id: amiId, started_at: started.toISOString(), expires_at: expires,
      });
      const snapshot = freeze(template);
      const instance = await base44.asServiceRole.entities.LabInstance.create({
        template_id: template.id, user_email: user.email, provider: "aws", status: "provisioning",
        template_snapshot: snapshot, template_version: template.version || "",
        started_at: started.toISOString(), expires_at: expires,
        provider_status_message: "Creating isolated AWS proof resources.", provider_status_progress: 5,
      });
      await base44.asServiceRole.entities.CloudPocRun.update(run.id, { lab_instance_id: instance.id });
      const tags = [{ Key: "Name", Value: `ExtremeICE-DesignStudio-POC-${run.id}` }, { Key: "ManagedBy", Value: "ExtremeICE-DesignStudio-POC" }, { Key: "PocRunId", Value: run.id }];
      let stage = "prepare_validation";
      try {
        let probeUserData: string | null = null;
        if (isValidationTemplate(snapshot)) {
          const nonce = crypto.randomUUID().replaceAll("-", "");
          const hash = await digest(nonce);
          for (const c of CHECKS) await base44.asServiceRole.entities.RuntimeValidationAttempt.create({
            instance_id: instance.id, user_email: user.email, task_id: TASK_ID, check_id: c.check,
            validator_type: "path_exists", status: "pending", token_hash: hash, expires_at: expires,
            evidence: { run_id: run.id, path: c.path, expected_pass: c.expected, source: "aws_console_self_test" },
          });
          probeUserData = validationUserData(run.id, nonce);
        }
        stage = "create_vpc";
        const vpc = await ec2.send(new CreateVpcCommand({ CidrBlock: VPC_CIDR, TagSpecifications: [{ ResourceType: "vpc", Tags: tags }] }));
        if (!vpc.Vpc?.VpcId) throw new Error("CREATE_VPC_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { vpc_id: vpc.Vpc.VpcId });
        stage = "create_subnet";
        const subnet = await ec2.send(new CreateSubnetCommand({ VpcId: vpc.Vpc.VpcId, CidrBlock: SUBNET_CIDR, AvailabilityZone: zone, TagSpecifications: [{ ResourceType: "subnet", Tags: tags }] }));
        if (!subnet.Subnet?.SubnetId) throw new Error("CREATE_SUBNET_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { subnet_id: subnet.Subnet.SubnetId });
        stage = "create_security_group";
        const sg = await ec2.send(new CreateSecurityGroupCommand({
          VpcId: vpc.Vpc.VpcId, GroupName: `ds-poc-${run.id}`, GroupDescription: "No inbound or outbound access for Design Studio boot proof",
          TagSpecifications: [{ ResourceType: "security-group", Tags: tags }],
        }));
        if (!sg.GroupId) throw new Error("CREATE_SECURITY_GROUP_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { security_group_id: sg.GroupId });
        stage = "revoke_default_egress";
        await ec2.send(new RevokeSecurityGroupEgressCommand({
          GroupId: sg.GroupId, IpPermissions: [{ IpProtocol: "-1", IpRanges: [{ CidrIp: "0.0.0.0/0" }] }],
        }));
        const userData = probeUserData || `#!/bin/bash\nset -eu\nshutdown -h +105\necho "${MARKER}:${run.id}" > /dev/console\n`;
        stage = "run_instance";
        const launched = await ec2.send(new RunInstancesCommand({
          ImageId: amiId, InstanceType: INSTANCE_TYPE, MinCount: 1, MaxCount: 1,
          ClientToken: run.id, InstanceInitiatedShutdownBehavior: "terminate",
          CreditSpecification: { CpuCredits: "standard" },
          MetadataOptions: { HttpTokens: "required", HttpEndpoint: "enabled" },
          NetworkInterfaces: [{ DeviceIndex: 0, SubnetId: subnet.Subnet.SubnetId, Groups: [sg.GroupId], AssociatePublicIpAddress: false }],
          BlockDeviceMappings: [{ DeviceName: "/dev/xvda", Ebs: { VolumeSize: 8, VolumeType: "gp3", DeleteOnTermination: true, Encrypted: true } }],
          UserData: btoa(userData), TagSpecifications: [{ ResourceType: "instance", Tags: tags }, { ResourceType: "volume", Tags: tags }],
        }));
        const instanceId = launched.Instances?.[0]?.InstanceId;
        if (!instanceId) throw new Error("RUN_INSTANCE_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { instance_id: instanceId, status: "provisioning" });
        await base44.asServiceRole.entities.LabInstance.update(instance.id, { provider_session_id: instanceId, provider_status_message: "AWS instance launched; waiting for guest boot marker.", provider_status_progress: 50 });
        return reply({ run_id: run.id, lab_instance_id: instance.id, instance_id: instanceId, status: "provisioning", region: REGION, expires_at: expires });
      } catch (error) {
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { status: "cleanup_pending", last_error_code: `${stage}:${code(error)}` });
        await base44.asServiceRole.entities.LabInstance.update(instance.id, { status: "failed", provider_status_message: `AWS launch failed at ${stage}: ${code(error)}` });
        return reply({ error: "AWS launch failed; cleanup may be needed.", error_code: code(error), error_stage: stage, error_detail: String((error as any)?.message || "").slice(0, 300), run_id: run.id }, 502);
      }
    }
    if (action === "inspect") {
      const run = await getRun(base44, input.run_id);
      if (!run) return reply({ error: "Run not found" }, 404);
      return reply(await inspectRun(base44, run));
    }
    if (action === "cleanup") {
      const run = await getRun(base44, input.run_id);
      if (!run) return reply({ error: "Run not found" }, 404);
      if (run.status === "terminated") return reply({ status: "terminated", run_id: run.id });
      return reply(await cleanup(base44, run));
    }
    if (action === "verifyCleanup") {
      const run = await getRun(base44, input.run_id);
      if (!run) return reply({ error: "Run not found" }, 404);
      if (run.status !== "terminated") return reply({ error: "Cleanup is still in progress" }, 409);
      const state = run.instance_id ? await observeInstance(run.instance_id) : "not_created";
      const remaining = [];
      if (!["terminated", "not_found", "not_created"].includes(state)) remaining.push("instance");
      if (run.security_group_id && await assertOwned(run, "security_group", run.security_group_id)) remaining.push("security_group");
      if (run.subnet_id && await assertOwned(run, "subnet", run.subnet_id)) remaining.push("subnet");
      if (run.vpc_id && await assertOwned(run, "vpc", run.vpc_id)) remaining.push("vpc");
      const volumes = await ec2.send(new DescribeVolumesCommand({
        Filters: [{ Name: "tag:PocRunId", Values: [run.id] }, { Name: "tag:ManagedBy", Values: ["ExtremeICE-DesignStudio-POC"] }],
        MaxResults: 1000,
      }));
      if (volumes.NextToken) return reply({ error: "Volume inventory was incomplete" }, 502);
      if (volumes.Volumes?.some((volume: any) => volume.State !== "deleted")) remaining.push("volume");
      return reply({ run_id: run.id, verified: remaining.length === 0, instance_state: state, remaining });
    }
    if (action === "list") {
      const runs = await base44.asServiceRole.entities.CloudPocRun.list("-created_date", 20);
      return reply({ runs: runs.map((run) => ({
        id: run.id, template_id: run.template_id, lab_instance_id: run.lab_instance_id,
        status: run.status, region: run.region, instance_id: run.instance_id,
        started_at: run.started_at, expires_at: run.expires_at, last_observed_state: run.last_observed_state,
        last_error_code: run.last_error_code,
      })) });
    }
    return reply({ error: "Unknown action" }, 400);
  } catch (error) {
    return reply({ error: "AWS proof request failed", error_code: code(error) }, 502);
  }
});
