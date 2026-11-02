import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import {
  EC2Client, CreateVpcCommand, CreateSubnetCommand, CreateSecurityGroupCommand,
  RevokeSecurityGroupEgressCommand, RunInstancesCommand, DescribeImagesCommand,
  DescribeInstancesCommand, GetConsoleOutputCommand, TerminateInstancesCommand,
  DeleteSecurityGroupCommand, DeleteSubnetCommand, DeleteVpcCommand,
} from "npm:@aws-sdk/client-ec2";
import { STSClient, GetCallerIdentityCommand } from "npm:@aws-sdk/client-sts";

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
const ec2 = new EC2Client({ region: REGION, maxAttempts: 2 });
const sts = new STSClient({ region: REGION, maxAttempts: 2 });

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
    if (network && Array.isArray(resource.network_ids) && (resource.network_ids.length !== 1 || resource.network_ids[0] !== network.id)) errors.push("The resource must attach only to its isolated network.");
  }
  if (network && (network.isolated !== true || network.internet_access === true)) errors.push("The network must be isolated with no internet access.");
  if (policy.internet_access !== "none" || policy.isolation_required !== true || policy.allow_inbound_external === true || policy.allow_outbound_external === true) errors.push("Connectivity must require isolation and no external access.");
  if (Array.isArray(env?.connections) && env.connections.length) errors.push("Multi-resource connections are outside this proof.");
  if (env?.identity_requirements?.directory_required || env?.identity_requirements?.mfa_required || (env?.identity_requirements?.accounts_needed || []).length) errors.push("Identity provisioning is outside this proof.");
  if ((env?.initialization?.startup_scripts || []).length || env?.initialization?.seed_data_notes || env?.initialization?.snapshot_required) errors.push("Initialization and snapshots are outside this proof.");
  const tasks = template?.lab_content?.tasks || [];
  if (tasks.some((task: any) => Array.isArray(task.validation_criteria) && task.validation_criteria.length > 0)) errors.push("AWS runtime validators are not implemented; use manual criteria only.");
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
  const image = (result.Images || []).sort((a, b) => String(b.CreationDate).localeCompare(String(a.CreationDate)))[0];
  if (!image?.ImageId) throw new Error("NO_AMI");
  return image.ImageId;
}
async function observeInstance(instanceId: string) {
  try {
    const result = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    const instance = result.Reservations?.flatMap((reservation) => reservation.Instances || [])[0];
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
  if (state === "running" || state === "stopping" || state === "stopped") {
    try {
      const output = await ec2.send(new GetConsoleOutputCommand({ InstanceId: run.instance_id, Latest: true }));
      guestReady = String(output.Output || "").includes(`${MARKER}:${run.id}`);
    } catch { /* Console output can lag; EC2 state remains observable. */ }
  }
  const status = guestReady && state === "running" ? "running" : run.status;
  if (status !== run.status || state !== run.last_observed_state) {
    await base44.asServiceRole.entities.CloudPocRun.update(run.id, { status, last_observed_state: state });
    if (run.lab_instance_id && status === "running") {
      await base44.asServiceRole.entities.LabInstance.update(run.lab_instance_id, {
        status: "running", provider_status_message: "Isolated AWS guest boot marker observed.", provider_status_progress: 100,
      });
    }
  }
  return { run_id: run.id, lab_instance_id: run.lab_instance_id || null, region: REGION, instance_id: run.instance_id, state, guest_ready: guestReady, status, expires_at: run.expires_at };
}
async function cleanup(base44: any, run: any) {
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
    if (run.security_group_id) await ec2.send(new DeleteSecurityGroupCommand({ GroupId: run.security_group_id }));
    if (run.subnet_id) await ec2.send(new DeleteSubnetCommand({ SubnetId: run.subnet_id }));
    if (run.vpc_id) await ec2.send(new DeleteVpcCommand({ VpcId: run.vpc_id }));
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
    if (action === "preflight") {
      const template = await getTemplate(base44, input.template_id);
      if (!template) return reply({ error: "Template not found" }, 404);
      const assessment = assessTemplate(template);
      const identity = await sts.send(new GetCallerIdentityCommand({}));
      const amiId = await findAmi();
      return reply({
        template_id: template.id, template_title: template.title, assessment,
        aws: { account_id: identity.Account, region: REGION, ami_id: amiId, instance_type: INSTANCE_TYPE, max_minutes: MAX_MINUTES, vpc_cidr: VPC_CIDR, subnet_cidr: SUBNET_CIDR },
        scope: "One isolated VM, no public IP, internet route, inbound rule, SSH key, or learner session.",
      });
    }
    if (action === "launch") {
      if (input.ack !== "LAUNCH_ISOLATED_AWS_POC") return reply({ error: "Explicit launch acknowledgment required" }, 400);
      const template = await getTemplate(base44, input.template_id);
      if (!template) return reply({ error: "Template not found" }, 404);
      const assessment = assessTemplate(template);
      if (!assessment.ready) return reply({ error: "Template is not eligible", assessment }, 400);
      const existing = await base44.asServiceRole.entities.CloudPocRun.list("-created_date", 100);
      if (existing.some((run) => ACTIVE.includes(run.status))) return reply({ error: "A cloud proof is already active or needs cleanup." }, 409);
      const amiId = await findAmi();
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
      try {
        const vpc = await ec2.send(new CreateVpcCommand({ CidrBlock: VPC_CIDR, TagSpecifications: [{ ResourceType: "vpc", Tags: tags }] }));
        if (!vpc.Vpc?.VpcId) throw new Error("CREATE_VPC_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { vpc_id: vpc.Vpc.VpcId });
        const subnet = await ec2.send(new CreateSubnetCommand({ VpcId: vpc.Vpc.VpcId, CidrBlock: SUBNET_CIDR, TagSpecifications: [{ ResourceType: "subnet", Tags: tags }] }));
        if (!subnet.Subnet?.SubnetId) throw new Error("CREATE_SUBNET_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { subnet_id: subnet.Subnet.SubnetId });
        const sg = await ec2.send(new CreateSecurityGroupCommand({
          VpcId: vpc.Vpc.VpcId, GroupName: `ds-poc-${run.id}`, Description: "No inbound or outbound access for Design Studio boot proof",
          TagSpecifications: [{ ResourceType: "security-group", Tags: tags }],
        }));
        if (!sg.GroupId) throw new Error("CREATE_SECURITY_GROUP_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { security_group_id: sg.GroupId });
        await ec2.send(new RevokeSecurityGroupEgressCommand({
          GroupId: sg.GroupId, IpPermissions: [{ IpProtocol: "-1", IpRanges: [{ CidrIp: "0.0.0.0/0" }] }],
        }));
        const userData = `#!/bin/bash\nset -eu\nshutdown -h +105\necho "${MARKER}:${run.id}" > /dev/console\n`;
        const launched = await ec2.send(new RunInstancesCommand({
          ImageId: amiId, InstanceType: INSTANCE_TYPE, MinCount: 1, MaxCount: 1,
          ClientToken: run.id, InstanceInitiatedShutdownBehavior: "terminate",
          CreditSpecification: { CpuCredits: "standard" },
          MetadataOptions: { HttpTokens: "required", HttpEndpoint: "enabled" },
          NetworkInterfaces: [{ DeviceIndex: 0, SubnetId: subnet.Subnet.SubnetId, Groups: [sg.GroupId], AssociatePublicIpAddress: false }],
          BlockDeviceMappings: [{ DeviceName: "/dev/xvda", Ebs: { VolumeSize: 8, VolumeType: "gp3", DeleteOnTermination: true, Encrypted: true } }],
          UserData: btoa(userData), TagSpecifications: [{ ResourceType: "instance", Tags: tags }],
        }));
        const instanceId = launched.Instances?.[0]?.InstanceId;
        if (!instanceId) throw new Error("RUN_INSTANCE_INCOMPLETE");
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { instance_id: instanceId, status: "provisioning" });
        await base44.asServiceRole.entities.LabInstance.update(instance.id, { provider_session_id: instanceId, provider_status_message: "AWS instance launched; waiting for guest boot marker.", provider_status_progress: 50 });
        return reply({ run_id: run.id, lab_instance_id: instance.id, instance_id: instanceId, status: "provisioning", region: REGION, expires_at: expires });
      } catch (error) {
        await base44.asServiceRole.entities.CloudPocRun.update(run.id, { status: "cleanup_pending", last_error_code: code(error) });
        await base44.asServiceRole.entities.LabInstance.update(instance.id, { status: "failed", provider_status_message: `AWS launch failed: ${code(error)}` });
        return reply({ error: "AWS launch failed; cleanup may be needed.", error_code: code(error), run_id: run.id }, 502);
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
