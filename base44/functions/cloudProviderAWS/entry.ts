import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { Buffer } from "node:buffer";

// ── Instance cost tier enforcement ──
const COST_TIERS = {
  standard:  { maxCpu: 2,  maxRamMB: 4096,  label: "Standard" },
  performance: { maxCpu: 4,  maxRamMB: 16384, label: "Performance" },
  enterprise: { maxCpu: 16, maxRamMB: 65536, label: "Enterprise", adminOnly: true },
  extreme:   { maxCpu: Infinity, maxRamMB: Infinity, label: "Extreme", adminOnly: true },
};

function getCostTier(cpu, ram) {
  if (cpu > 16 || ram > 65536) return "extreme";
  if (cpu > 4 || ram > 16384) return "enterprise";
  if (cpu > 2 || ram > 4096) return "performance";
  return "standard";
}

async function checkInstanceAllowed(base44, labId, cpu, ram, userId) {
  const tier = getCostTier(cpu, ram);
  const tierConfig = COST_TIERS[tier];
  if (!tierConfig.adminOnly) return { allowed: true, tier };

  // When called from orchestrator (no user context), skip admin check
  if (!userId) return { allowed: false, tier, reason: `${tierConfig.label} tier requires admin approval. Deploy via the UI to validate permissions.` };

  // Admin users can always deploy
  const user = await base44.asServiceRole.entities.User.filter({ id: userId }).then(r => r[0]);
  if (user?.role === "admin") return { allowed: true, tier };

  // Check if lab has admin approval for high-cost instances
  const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: labId }).then(r => r[0]);
  if (lab?.admin_approved_cost) return { allowed: true, tier };

  return {
    allowed: false,
    tier,
    reason: `${tierConfig.label} tier (${cpu} vCPU / ${(ram / 1024).toFixed(1)} GB RAM) requires admin approval. Max allowed: ${COST_TIERS.performance.maxCpu} vCPU / ${COST_TIERS.performance.maxRamMB / 1024} GB RAM.`,
  };
}

// ── AWS Signature V4 implementation (lightweight, no SDK needed) ──

// AWS Signature V4 requires percent-encoding of ALL characters except A-Z a-z 0-9 - _ . ~
// encodeURIComponent leaves * ! ' ( ) unencoded — we must encode * as %2A for AWS
function awsEncode(str) {
  return encodeURIComponent(str).replace(/\*/g, "%2A");
}

function sha256Hex(data) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", typeof data === "string" ? encoder.encode(data) : data)
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
}

async function hmacSha256(key, data) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", typeof key === "string" ? encoder.encode(key) : key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, typeof data === "string" ? encoder.encode(data) : data);
  return new Uint8Array(sig);
}

async function getSignatureKey(key, dateStamp, region, service) {
  let k = await hmacSha256(("AWS4" + key), dateStamp);
  k = await hmacSha256(k, region);
  k = await hmacSha256(k, service);
  k = await hmacSha256(k, "aws4_request");
  return k;
}

async function signRequest(method, host, region, service, canonicalUri, queryParams, payload, accessKey, secretKey) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  // Build canonical query string
  const sortedParams = Object.keys(queryParams).sort().map(k => `${awsEncode(k)}=${awsEncode(queryParams[k])}`).join("&");
  const canonicalQueryString = sortedParams ? sortedParams : "";

  const payloadHash = await sha256Hex(payload || "");
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-date";
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = Array.from(new Uint8Array(await hmacSha256(signingKey, stringToSign)))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    amzDate,
  };
}

function getEC2Host(region) {
  return `ec2.${region || "us-east-1"}.amazonaws.com`;
}

function flattenParams(obj, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(result, flattenParams(item, `${fullKey}.${i + 1}`));
        } else {
          result[`${fullKey}.${i + 1}`] = String(item);
        }
      });
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenParams(value, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

async function ec2Call(action, paramsObj, region) {
  const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const r = region || Deno.env.get("AWS_REGION") || "us-east-1";
  const host = getEC2Host(r);

  const queryParams = { Action: action, Version: "2016-11-15", ...flattenParams(paramsObj) };

  const { authorization, amzDate } = await signRequest(
    "GET", host, r, "ec2", "/", queryParams, "",
    accessKey, secretKey,
  );

  const qs = Object.entries(queryParams)
    .map(([k, v]) => `${awsEncode(k)}=${awsEncode(v)}`)
    .join("&");

  const resp = await fetch(`https://${host}/?${qs}`, {
    headers: { "Host": host, "X-Amz-Date": amzDate, "Authorization": authorization },
  });

  const text = await resp.text();

  // Parse XML response
  if (!resp.ok) {
    const codeMatch = text.match(/<Code>([^<]+)<\/Code>/);
    const msgMatch = text.match(/<Message>([^<]+)<\/Message>/);
    throw new Error(`${codeMatch?.[1] || resp.status}: ${msgMatch?.[1] || text.slice(0, 200)}`);
  }

  return text;
}

function extractTag(tags, key) {
  for (const m of (tags || []).matchAll(/<item>\s*<key>([^<]+)<\/key>\s*<value>([^<]*)<\/value>\s*<\/item>/g)) {
    if (m[1] === key) return m[2];
  }
  return null;
}

// Hardcoded default AMIs per region — used when DescribeImages isn't available
// These are Amazon Linux 2023 AMIs. Update periodically.
const DEFAULT_AMIS = {
  "us-east-1": "ami-0df8c184d5f6ae949",
  "us-east-2": "ami-0b8f5f2c5f9c3058f",
  "us-west-1": "ami-0ec5329b1b08b0bf6",
  "us-west-2": "ami-0cf2b4e0242b3d4c1",
  "eu-west-1": "ami-0c1c30571d2dae5c9",
  "eu-central-1": "ami-0e203247f3f3d418b",
  "ap-southeast-1": "ami-0c802847a0f4ca68c",
  "ap-northeast-1": "ami-0d9793a4b2e5d7ecb",
};

// Cache AMI per region to avoid repeated DescribeImages calls
const amiCache = {};

async function resolveAMI(region) {
  if (amiCache[region]) return amiCache[region];

  // Try DescribeImages first — will fail if IAM lacks ec2:DescribeImages
  try {
    const xml = await ec2Call("DescribeImages", {
      Owner: ["amazon"],
      Filter: [
        { Name: "name", Value: ["al2023-ami-2023*-x86_64"] },
        { Name: "state", Value: ["available"] },
        { Name: "architecture", Value: ["x86_64"] },
        { Name: "root-device-type", Value: ["ebs"] },
      ],
    }, region);

    const images = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const idMatch = block.match(/<imageId>([^<]+)<\/imageId>/);
      const dateMatch = block.match(/<creationDate>([^<]+)<\/creationDate>/);
      if (idMatch?.[1] && dateMatch?.[1]) {
        images.push({ imageId: idMatch[1], creationDate: dateMatch[1] });
      }
    }

    images.sort((a, b) => b.creationDate.localeCompare(a.creationDate));
    if (images[0]?.imageId) {
      amiCache[region] = images[0].imageId;
      return amiCache[region];
    }
  } catch (err) {
    console.log(`DescribeImages failed for ${region}: ${err.message}. Falling back to hardcoded AMI.`);
  }

  // Fallback to hardcoded AMI per region
  const defaultAmi = DEFAULT_AMIS[region] || DEFAULT_AMIS["us-east-1"];
  amiCache[region] = defaultAmi;
  return defaultAmi;
}

function selectInstanceType(cpu, ram) {
  if (cpu >= 8 || ram >= 32768) return "c5.2xlarge";
  if (cpu >= 4 || ram >= 16384) return "t3.xlarge";
  if (cpu >= 2 || ram >= 8192) return "t3.large";
  return "t3.medium";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Try to get user — when called from another backend function via functions.invoke(),
    // auth context may not always forward. This is non-fatal; the orchestrator already validates.
    let user = null;
    try { user = await base44.auth.me(); } catch { /* no direct user context */ }

    const body = await req.json();
    const { action, params = {} } = body;
    const region = params.region || Deno.env.get("AWS_REGION") || "us-east-1";

    switch (action) {

      case "createVM": {
        const { lab_id, device_name, device_type, cpu_cores = 2, ram_mb = 4096, storage_gb = 20, subnet_id, security_group_ids = [], ami_image_id, key_name } = params;

        // Enforce cost tier limits — skip admin check when no user context (called from orchestrator)
        const tierCheck = await checkInstanceAllowed(base44, lab_id, cpu_cores, ram_mb, user?.id || null);
        if (!tierCheck.allowed) {
          return Response.json({
            error: "INSTANCE_TIER_BLOCKED",
            message: tierCheck.reason,
            tier: tierCheck.tier,
          }, { status: 403 });
        }

        // Resolve AMI dynamically for the target region
        let amiId = ami_image_id;
        if (!amiId) {
          amiId = await resolveAMI(region);
        }
        if (!amiId) {
          return Response.json({
            error: "NO_AMI_FOUND",
            message: `Could not find a suitable Amazon Linux AMI in ${region}. Try a different region or provide an ami_image_id.`,
          }, { status: 400 });
        }
        const instanceType = selectInstanceType(cpu_cores, ram_mb);

        const runParams = {
          ImageId: amiId,
          InstanceType: instanceType,
          MinCount: "1",
          MaxCount: "1",
          SubnetId: subnet_id,
          SecurityGroupId: security_group_ids,
          BlockDeviceMapping: [
            { DeviceName: "/dev/xvda", Ebs: { VolumeSize: String(storage_gb), VolumeType: "gp3", DeleteOnTermination: "true" } },
          ],
          TagSpecification: [
            { ResourceType: "instance", Tag: [
              { Key: "Name", Value: device_name || `lab-${lab_id}` },
              { Key: "LabId", Value: lab_id || "" },
              { Key: "ManagedBy", Value: "XtremeICE-LiveFire" },
            ]},
          ],
        };
        if (key_name) runParams.KeyName = key_name;

        const xml = await ec2Call("RunInstances", runParams, region);

        const instId = xml.match(/<instanceId>([^<]+)<\/instanceId>/)?.[1] || "unknown";
        const privIp = xml.match(/<privateIpAddress>([^<]+)<\/privateIpAddress>/)?.[1] || null;

        return Response.json({
          instanceId: instId,
          publicIp: null,
          privateIp: privIp,
          status: "provisioning",
          region,
          instanceType,
          amiId,
          launchTime: new Date().toISOString(),
          accessUrl: null,
        });
      }

      case "deleteVM": {
        const { instance_id } = params;
        await ec2Call("TerminateInstances", { InstanceId: [instance_id] }, region);
        return Response.json({ success: true, instanceId: instance_id, currentState: "shutting-down" });
      }

      case "createNetwork": {
        const { lab_id, vpc_cidr = "10.0.0.0/16", subnet_configs = [] } = params;

        // Step 1: Create VPC
        let xml = await ec2Call("CreateVpc", {
          CidrBlock: vpc_cidr,
          TagSpecification: [{ ResourceType: "vpc", Tag: [{ Key: "Name", Value: `livefire-${lab_id}` }, { Key: "LabId", Value: lab_id || "" }, { Key: "ManagedBy", Value: "XtremeICE" }] }],
        }, region);
        const vpcId = xml.match(/<vpcId>([^<]+)<\/vpcId>/)?.[1] || "";

        // Step 2: Create Internet Gateway
        xml = await ec2Call("CreateInternetGateway", {}, region);
        const igwId = xml.match(/<internetGatewayId>([^<]+)<\/internetGatewayId>/)?.[1] || "";
        await ec2Call("AttachInternetGateway", { InternetGatewayId: igwId, VpcId: vpcId }, region);

        // Step 3: Create Subnets — derive subnet CIDRs from VPC CIDR
        const deriveSubnets = (vpcCidr) => {
          const parts = vpcCidr.split("/");
          const ipParts = parts[0].split(".").map(Number);
          // Replace the 3rd octet for /16 VPCs, 3rd-4th for others
          const prefix = `${ipParts[0]}.${ipParts[1]}`;
          return [
            { name: "public", cidr: `${prefix}.1.0/24`, zone: `${region}a` },
            { name: "private", cidr: `${prefix}.2.0/24`, zone: `${region}b` },
          ];
        };
        const subs = subnet_configs.length > 0 ? subnet_configs : deriveSubnets(vpc_cidr);
        const createdSubnets = [];
        for (const s of subs) {
          try {
            xml = await ec2Call("CreateSubnet", { VpcId: vpcId, CidrBlock: s.cidr, AvailabilityZone: s.zone }, region);
          } catch (err) {
            const awsMsg = err.message || String(err);
            // Improve AWS error messages for common subnet failures
            if (awsMsg.includes("InvalidSubnet.Range")) {
              throw new Error(`Subnet CIDR ${s.cidr} is not within the VPC range ${vpc_cidr}. This can happen when the topology subnet CIDRs don't match the deployed VPC range. Rebuild the topology or try with a different VPC CIDR.`);
            }
            if (awsMsg.includes("InvalidSubnet.Conflict")) {
              throw new Error(`Subnet CIDR ${s.cidr} conflicts with an existing subnet in VPC ${vpcId}. Choose a different CIDR range for this lab.`);
            }
            throw err;
          }
          const sid = xml.match(/<subnetId>([^<]+)<\/subnetId>/)?.[1] || "";
          if (s.name === "public") {
            await ec2Call("ModifySubnetAttribute", { SubnetId: sid, MapPublicIpOnLaunch: { Value: "true" } }, region);
          }
          createdSubnets.push({ id: sid, name: s.name, cidr: s.cidr, zone: s.zone, isPublic: s.name === "public" });
        }

        // Step 4: Create Route Table + route to IGW
        xml = await ec2Call("CreateRouteTable", { VpcId: vpcId }, region);
        const rtId = xml.match(/<routeTableId>([^<]+)<\/routeTableId>/)?.[1] || "";
        await ec2Call("CreateRoute", { RouteTableId: rtId, DestinationCidrBlock: "0.0.0.0/0", GatewayId: igwId }, region);

        // Associate public subnets with route table
        for (const s of createdSubnets) {
          if (s.isPublic) {
            await ec2Call("AssociateRouteTable", { RouteTableId: rtId, SubnetId: s.id }, region);
          }
        }

        // Step 5: Create Security Group
        xml = await ec2Call("CreateSecurityGroup", {
          GroupName: `livefire-sg-${lab_id}-${Date.now()}`,
          GroupDescription: `Live Fire lab ${lab_id}`,
          VpcId: vpcId,
        }, region);
        const sgId = xml.match(/<groupId>([^<]+)<\/groupId>/)?.[1] || "";

        await ec2Call("AuthorizeSecurityGroupIngress", {
          GroupId: sgId,
          IpPermissions: [
            { IpProtocol: "tcp", FromPort: "22", ToPort: "22", IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "SSH" }] },
            { IpProtocol: "tcp", FromPort: "443", ToPort: "443", IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "HTTPS" }] },
            { IpProtocol: "tcp", FromPort: "80", ToPort: "80", IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "HTTP" }] },
            { IpProtocol: "tcp", FromPort: "3389", ToPort: "3389", IpRanges: [{ CidrIp: "0.0.0.0/0", Description: "RDP" }] },
          ],
        }, region);

        const publicSub = createdSubnets.find(s => s.isPublic);
        return Response.json({
          vpcId,
          vpcCidr: vpc_cidr,
          subnetId: publicSub?.id || createdSubnets[0]?.id,
          privateSubnetId: createdSubnets.find(s => !s.isPublic)?.id || null,
          subnets: createdSubnets,
          securityGroupId: sgId,
          securityGroupIds: [sgId],
          routeTableId: rtId,
          internetGatewayId: igwId,
          region,
          state: "available",
        });
      }

      case "deleteNetwork": {
        const { vpc_id } = params;
        try {
          // Find and delete IGWs
          let xml = await ec2Call("DescribeInternetGateways", { Filter: [{ Name: "attachment.vpc-id", Value: [vpc_id] }] }, region);
          const igwMatches = [...xml.matchAll(/<internetGatewayId>([^<]+)<\/internetGatewayId>/g)];
          for (const m of igwMatches) {
            await ec2Call("DetachInternetGateway", { InternetGatewayId: m[1], VpcId: vpc_id }, region).catch(() => {});
            await ec2Call("DeleteInternetGateway", { InternetGatewayId: m[1] }, region).catch(() => {});
          }

          // Delete subnets
          xml = await ec2Call("DescribeSubnets", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
          for (const m of xml.matchAll(/<subnetId>([^<]+)<\/subnetId>/g)) {
            await ec2Call("DeleteSubnet", { SubnetId: m[1] }, region).catch(() => {});
          }

          // Delete non-default security groups
          xml = await ec2Call("DescribeSecurityGroups", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
          for (const m of xml.matchAll(/<groupId>([^<]+)<\/groupId>/g)) {
            await ec2Call("DeleteSecurityGroup", { GroupId: m[1] }, region).catch(() => {});
          }

          // Delete non-main route tables
          xml = await ec2Call("DescribeRouteTables", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
          for (const m of xml.matchAll(/<routeTableId>([^<]+)<\/routeTableId>/g)) {
            await ec2Call("DeleteRouteTable", { RouteTableId: m[1] }, region).catch(() => {});
          }

          await ec2Call("DeleteVpc", { VpcId: vpc_id }, region);
          return Response.json({ success: true, vpcId: vpc_id, status: "deleted" });
        } catch (err) {
          return Response.json({ success: false, vpcId: vpc_id, error: err.message }, { status: 500 });
        }
      }

      case "getInstanceStatus": {
        const { instance_id } = params;
        const xml = await ec2Call("DescribeInstances", { InstanceId: [instance_id] }, region);

        // Extract the <instancesSet>/<item> block for accurate parsing
        const instBlock = xml.match(/<instancesSet>\s*<item>([\s\S]*?)<\/item>/);
        const block = instBlock?.[1] || xml;

        // State name lives inside <instanceState>
        const stateMatch = block.match(/<instanceState>[\s\S]*?<name>([^<]+)<\/name>/);
        // public IP is top-level <ipAddress> inside instance item
        const ipMatch = block.match(/<ipAddress>([^<]+)<\/ipAddress>/);
        // private IP
        const privIpMatch = block.match(/<privateIpAddress>([^<]+)<\/privateIpAddress>/);

        return Response.json({
          instanceId: instance_id,
          state: stateMatch?.[1] || "unknown",
          publicIp: ipMatch?.[1] || null,
          privateIp: privIpMatch?.[1] || null,
          region,
        });
      }

      case "suggestCidr": {
        // List all VPCs in region and suggest a non-conflicting CIDR
        const xml = await ec2Call("DescribeVpcs", {}, region);
        const existingCidrs = [];
        for (const m of xml.matchAll(/<cidrBlock>([^<]+)<\/cidrBlock>/g)) {
          existingCidrs.push(m[1]);
        }

        // Pool of candidate /16 CIDRs sorted by preference
        const candidates = [
          "10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16", "10.3.0.0/16",
          "10.10.0.0/16", "10.20.0.0/16", "10.30.0.0/16",
          "172.16.0.0/16", "172.17.0.0/16", "172.18.0.0/16",
          "172.20.0.0/16", "172.21.0.0/16", "172.22.0.0/16",
          "192.168.0.0/16", "192.168.1.0/16", "192.168.10.0/16",
          "172.31.0.0/16",
        ];

        // Simple CIDR overlap check: compare network prefix
        const conflicts = (cidr) => existingCidrs.some(existing => {
          const [a, maskA] = cidr.split("/");
          const [b, maskB] = existing.split("/");
          const aParts = a.split(".").map(Number);
          const bParts = b.split(".").map(Number);
          const minMask = Math.min(parseInt(maskA), parseInt(maskB));
          const shiftBits = 32 - minMask;
          const aNet = ((aParts[0] << 24) | (aParts[1] << 16) | (aParts[2] << 8) | aParts[3]) >>> shiftBits;
          const bNet = ((bParts[0] << 24) | (bParts[1] << 16) | (bParts[2] << 8) | bParts[3]) >>> shiftBits;
          return aNet === bNet;
        });

        const { proposed_cidr } = params;
        const checkResult = proposed_cidr
          ? { proposed_cidr, conflict: conflicts(proposed_cidr) }
          : null;

        const suggested = candidates.find(c => !conflicts(c)) || "10.100.0.0/16";

        return Response.json({
          region,
          suggested_cidr: suggested,
          existing_vpcs: existingCidrs.map(c => ({ cidr: c })),
          check: checkResult,
        });
      }

      case "listNetworks": {
        // List VPCs tagged by XtremeICE
        const xml = await ec2Call("DescribeVpcs", {
          Filter: [{ Name: "tag:ManagedBy", Value: ["XtremeICE"] }],
        }, region);
        const vpcs = [];
        for (const m of xml.matchAll(/<item>\s*<vpcId>([^<]+)<\/vpcId>[\s\S]*?<cidrBlock>([^<]+)<\/cidrBlock>[\s\S]*?<state>([^<]+)<\/state>[\s\S]*?<tagSet>([\s\S]*?)<\/tagSet>/g)) {
          vpcs.push({
            vpcId: m[1],
            cidrBlock: m[2],
            state: m[3],
            name: extractTag(m[4], "Name") || m[1],
            labId: extractTag(m[4], "LabId") || null,
          });
        }
        return Response.json({ region, vpcs, totalCount: vpcs.length });
      }

      case "listAllVpcs": {
        // List all VPCs in region with full details: subnets, instances, lab linkage
        const vpcXml = await ec2Call("DescribeVpcs", {}, region);

        // Parse all VPCs
        const vpcs = [];
        const vpcRegex = /<item>\s*<vpcId>([^<]+)<\/vpcId>[\s\S]*?<cidrBlock>([^<]+)<\/cidrBlock>[\s\S]*?<state>([^<]+)<\/state>[\s\S]*?<isDefault>([^<]+)<\/isDefault>[\s\S]*?<tagSet>([\s\S]*?)<\/tagSet>[\s\S]*?(?=<\/item>)/g;
        for (const m of vpcXml.matchAll(vpcRegex)) {
          vpcs.push({
            vpcId: m[1],
            cidrBlock: m[2],
            state: m[3],
            isDefault: m[4] === "true",
            name: extractTag(m[5], "Name") || m[1],
            labId: extractTag(m[5], "LabId") || null,
            managedBy: extractTag(m[5], "ManagedBy") || null,
          });
        }

        // Get subnets for all VPCs (single call)
        let subnetsByVpc = {};
        try {
          const subXml = await ec2Call("DescribeSubnets", {}, region);
          for (const m of subXml.matchAll(/<item>\s*<subnetId>([^<]+)<\/subnetId>[\s\S]*?<vpcId>([^<]+)<\/vpcId>[\s\S]*?<cidrBlock>([^<]+)<\/cidrBlock>[\s\S]*?<availabilityZone>([^<]+)<\/availabilityZone>[\s\S]*?<availableIpAddressCount>(\d+)<\/availableIpAddressCount>/g)) {
            const vpcId = m[2];
            if (!subnetsByVpc[vpcId]) subnetsByVpc[vpcId] = [];
            subnetsByVpc[vpcId].push({
              subnetId: m[1],
              cidrBlock: m[3],
              availabilityZone: m[4],
              availableIps: parseInt(m[5]),
            });
          }
        } catch (e) { console.error("Failed to fetch subnets:", e.message); }

        // Get instances for all VPCs (single call)
        let instancesByVpc = {};
        try {
          const instXml = await ec2Call("DescribeInstances", {}, region);
          const instBlocks = instXml.split("</reservationSet>")[0]?.split("<item>") || [];
          for (let i = 1; i < instBlocks.length; i++) {
            const block = instBlocks[i];
            const vpcMatch = block.match(/<vpcId>([^<]+)<\/vpcId>/);
            const stateMatch = block.match(/<name>([^<]+)<\/name>/);
            if (vpcMatch && stateMatch?.[1] !== "terminated" && stateMatch?.[1] !== "shutting-down") {
              const vpcId = vpcMatch[1];
              if (!instancesByVpc[vpcId]) instancesByVpc[vpcId] = 0;
              instancesByVpc[vpcId]++;
            }
          }
        } catch (e) { console.error("Failed to fetch instances:", e.message); }

        // Cross-reference with labs to determine usage (check both vpc_id and tag)
        let labsByVpc = {};
        try {
          const allLabs = await base44.asServiceRole.entities.LiveFireLab.filter({});
          for (const lab of allLabs) {
            if (lab.vpc_id) labsByVpc[lab.vpc_id] = lab;
          }
        } catch (e) { console.error("Failed to fetch labs:", e.message); }

        // Also try to match by labId tag — some labs may have been deleted but VPCs remain tagged
        const tagLabs = {};
        try {
          const allLabs = await base44.asServiceRole.entities.LiveFireLab.filter({});
          for (const lab of allLabs) {
            tagLabs[lab.id] = lab;
          }
        } catch (e) { /* ignore */ }

        // Assemble final response
        const enrichedVpcs = vpcs.map(vpc => {
          const subs = subnetsByVpc[vpc.vpcId] || [];
          const instanceCount = instancesByVpc[vpc.vpcId] || 0;
          const linkedLab = labsByVpc[vpc.vpcId] || (vpc.labId ? tagLabs[vpc.labId] : null) || null;
          const isOrphaned = !vpc.isDefault && instanceCount === 0 && !linkedLab;
          return {
            ...vpc,
            subnets: subs,
            instanceCount,
            linkedLab: linkedLab ? { id: linkedLab.id, name: linkedLab.name, status: linkedLab.status } : null,
            isOrphaned,
          };
        });

        // Sort: default VPC first, then orphaned, then in-use
        enrichedVpcs.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          if (a.isOrphaned && !b.isOrphaned) return 1;
          if (!a.isOrphaned && b.isOrphaned) return -1;
          return a.cidrBlock.localeCompare(b.cidrBlock);
        });

        return Response.json({ region, vpcs: enrichedVpcs, totalCount: enrichedVpcs.length });
      }

      case "suggestSubnets": {
        // Given a VPC CIDR, return all possible /24 subnets and mark which are taken
        const { vpc_cidr, vpc_id } = params;
        if (!vpc_cidr && !vpc_id) {
          return Response.json({ error: "Provide vpc_cidr or vpc_id" }, { status: 400 });
        }

        let cidr = vpc_cidr;
        if (!cidr && vpc_id) {
          // Fetch VPC CIDR from AWS
          const xml = await ec2Call("DescribeVpcs", { VpcId: [vpc_id] }, region);
          cidr = xml.match(/<cidrBlock>([^<]+)<\/cidrBlock>/)?.[1] || "";
        }
        if (!cidr) {
          return Response.json({ error: "Could not determine VPC CIDR" }, { status: 400 });
        }

        // Parse CIDR to compute available /24 subnets
        const [ip, mask] = cidr.split("/");
        const maskBits = parseInt(mask);
        const ipParts = ip.split(".").map(Number);

        // For masks <= 24, we can derive /24 subnets
        if (maskBits > 24) {
          return Response.json({ error: "VPC CIDR is smaller than /24 — cannot split into /24 subnets" }, { status: 400 });
        }

        // How many /24 subnets fit?
        const subnetBits = 24 - maskBits;
        const subnetCount = 1 << subnetBits;
        const subnetOctetStart = maskBits <= 8 ? 1 : maskBits <= 16 ? 2 : 3;

        let existingSubnets = [];
        if (vpc_id) {
          try {
            const subXml = await ec2Call("DescribeSubnets", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
            for (const m of subXml.matchAll(/<cidrBlock>([^<]+)<\/cidrBlock>/g)) {
              existingSubnets.push(m[1]);
            }
          } catch (e) { console.error("Failed to fetch existing subnets:", e.message); }
        }

        const subnetOptions = [];
        const baseIp = [...ipParts];

        // For a /16, subnetOctetStart = 2 (third octet changes)
        // For a /8, subnetOctetStart = 1 (second octet changes)
        for (let i = 0; i < subnetCount && i < 256; i++) {
          const octet = [...baseIp];
          if (subnetOctetStart === 1) octet[1] = i;
          else if (subnetOctetStart === 2) octet[2] = i;
          else octet[3] = i;

          const subnetCidr = `${octet.join(".")}/24`;
          const isTaken = existingSubnets.includes(subnetCidr);
          subnetOptions.push({ cidr: subnetCidr, isTaken, label: `${subnetCidr}${isTaken ? " ⬤" : ""}` });
        }

        return Response.json({
          vpcCidr: cidr,
          subnetCount: subnetOptions.length,
          availableCount: subnetOptions.filter(s => !s.isTaken).length,
          usedCount: subnetOptions.filter(s => s.isTaken).length,
          subnets: subnetOptions,
        });
      }

      case "deleteVpc": {
        // Force-delete a VPC — cleans up dependent resources first
        const { vpc_id, force = false } = params;
        if (!vpc_id) return Response.json({ error: "vpc_id required" }, { status: 400 });

        const result = { vpcId: vpc_id, steps: [], error: null };
        const runStep = (name, fn) => fn().then(r => { result.steps.push(`${name}: ok`); return r; }).catch(e => { result.steps.push(`${name}: ${e.message}`); throw e; });

        try {
          // 1. Check for running instances
          const instXml = await ec2Call("DescribeInstances", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
          const runningIds = [];
          for (const m of instXml.matchAll(/<instanceId>([^<]+)<\/instanceId>/g)) {
            const block = instXml.slice(Math.max(0, instXml.indexOf(m[1]) - 200), instXml.indexOf(m[1]) + 300);
            const stateMatch = block.match(/<name>([^<]+)<\/name>/);
            if (stateMatch && !["terminated", "shutting-down"].includes(stateMatch[1])) {
              runningIds.push(m[1]);
            }
          }

          if (runningIds.length > 0 && !force) {
            return Response.json({
              error: `VPC has ${runningIds.length} running instance(s). Use force=true to terminate them.`,
              runningInstanceIds: runningIds,
              vpcId: vpc_id,
            }, { status: 409 });
          }

          // Terminate running instances if force=true
          if (runningIds.length > 0 && force) {
            await runStep("terminateInstances", () => ec2Call("TerminateInstances", { InstanceId: runningIds }, region));
            // Short wait for instances to start shutting down
            await new Promise(r => setTimeout(r, 3000));
          }

          // 2. Detach and delete IGWs
          try {
            const igwXml = await ec2Call("DescribeInternetGateways", { Filter: [{ Name: "attachment.vpc-id", Value: [vpc_id] }] }, region);
            for (const m of igwXml.matchAll(/<internetGatewayId>([^<]+)<\/internetGatewayId>/g)) {
              await runStep(`detachIGW_${m[1]}`, () => ec2Call("DetachInternetGateway", { InternetGatewayId: m[1], VpcId: vpc_id }, region));
              await runStep(`deleteIGW_${m[1]}`, () => ec2Call("DeleteInternetGateway", { InternetGatewayId: m[1] }, region));
            }
          } catch (e) { result.steps.push(`igw: ${e.message}`); }

          // 3. Delete subnets
          const subXml = await ec2Call("DescribeSubnets", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
          for (const m of subXml.matchAll(/<subnetId>([^<]+)<\/subnetId>/g)) {
            await runStep(`deleteSubnet_${m[1]}`, () => ec2Call("DeleteSubnet", { SubnetId: m[1] }, region));
          }

          // 4. Delete non-default security groups
          try {
            const sgXml = await ec2Call("DescribeSecurityGroups", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
            for (const m of sgXml.matchAll(/<groupId>([^<]+)<\/groupId>/g)) {
              const groupId = m[1];
              const block = sgXml.slice(sgXml.indexOf(groupId) - 100, sgXml.indexOf(groupId) + 200);
              if (!block.includes("<groupName>default<")) {
                await runStep(`deleteSG_${groupId}`, () => ec2Call("DeleteSecurityGroup", { GroupId: groupId }, region));
              }
            }
          } catch (e) { result.steps.push(`sg: ${e.message}`); }

          // 5. Delete non-main route tables
          try {
            const rtXml = await ec2Call("DescribeRouteTables", { Filter: [{ Name: "vpc-id", Value: [vpc_id] }] }, region);
            for (const m of rtXml.matchAll(/<routeTableId>([^<]+)<\/routeTableId>/g)) {
              const rtId = m[1];
              const block = rtXml.slice(rtXml.indexOf(rtId) - 100, rtXml.indexOf(rtId) + 200);
              if (!block.includes("<main>true<")) {
                await runStep(`deleteRT_${rtId}`, () => ec2Call("DeleteRouteTable", { RouteTableId: rtId }, region));
              }
            }
          } catch (e) { result.steps.push(`rt: ${e.message}`); }

          // 6. Delete the VPC
          await runStep("deleteVpc", () => ec2Call("DeleteVpc", { VpcId: vpc_id }, region));

          result.success = true;
          return Response.json(result);
        } catch (e) {
          result.error = e.message;
          return Response.json(result, { status: 500 });
        }
      }

      case "listAMIs": {
        // Return AMIs organized by AWS-standard categories
        const categories = params.categories || [
          // ── Quick Start AMIs ──
          {
            category: "Quick Start AMIs",
            icon: "zap",
            groups: [
              { name: "Amazon Linux 2023", owner: "amazon", description: "Amazon's cloud-native Linux distribution", filter: [
                { Name: "name", Value: ["al2023-ami-2023*-x86_64"] }, { Name: "state", Value: ["available"] }, { Name: "architecture", Value: ["x86_64"] },
              ]},
              { name: "Amazon Linux 2", owner: "amazon", description: "Legacy Amazon Linux 2 (LTS)", filter: [
                { Name: "name", Value: ["amzn2-ami-hvm-*-x86_64-gp2"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Ubuntu 24.04 LTS", owner: "099720109477", description: "Canonical Ubuntu Noble Numbat", filter: [
                { Name: "name", Value: ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Ubuntu 22.04 LTS", owner: "099720109477", description: "Canonical Ubuntu Jammy Jellyfish", filter: [
                { Name: "name", Value: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Windows Server 2025", owner: "amazon", description: "Microsoft Windows Server 2025 Full Base", filter: [
                { Name: "name", Value: ["Windows_Server-2025-English-Full-Base-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Windows Server 2022", owner: "amazon", description: "Microsoft Windows Server 2022 Full Base", filter: [
                { Name: "name", Value: ["Windows_Server-2022-English-Full-Base-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Debian 12", owner: "136693071363", description: "Debian Bookworm", filter: [
                { Name: "name", Value: ["debian-12-amd64-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Red Hat Enterprise Linux 9", owner: "309956199498", description: "RHEL 9 with hourly billing", filter: [
                { Name: "name", Value: ["RHEL-9.*-x86_64-*-Hourly2-GP3"] }, { Name: "state", Value: ["available"] },
              ]},
            ],
          },
          // ── My AMIs ──
          {
            category: "My AMIs",
            icon: "user",
            groups: [
              { name: "Owned by me", owner: "self", description: "AMIs you created or uploaded", filter: [
                { Name: "state", Value: ["available"] },
              ]},
            ],
          },
          // ── AWS Marketplace AMIs ──
          {
            category: "AWS Marketplace AMIs",
            icon: "shopping-cart",
            groups: [
              { name: "Ubuntu Pro 24.04", owner: "099720109477", description: "Ubuntu Pro with extended security", filter: [
                { Name: "name", Value: ["ubuntu-pro-server/images/hvm-ssd/ubuntu-noble-24.04-amd64-pro-server-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Cisco CSR 1000V", owner: "679593333241", description: "Cisco Cloud Services Router", filter: [
                { Name: "name", Value: ["cisco-csr-1kv-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Fortinet FortiGate", owner: "679593333241", description: "Fortinet Next-Gen Firewall", filter: [
                { Name: "name", Value: ["fortinet-fortigate-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Palo Alto VM-Series", owner: "679593333241", description: "Palo Alto Networks VM-Series", filter: [
                { Name: "name", Value: ["PA-VM-AWS-*"] }, { Name: "state", Value: ["available"] },
              ]},
            ],
          },
          // ── Community AMIs ──
          {
            category: "Community AMIs",
            icon: "users",
            groups: [
              { name: "Kali Linux", owner: "679593333241", description: "Offensive Security Kali Linux", filter: [
                { Name: "name", Value: ["kali-linux-*-amd64-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "CentOS Stream 9", owner: "125523088429", description: "CentOS Stream 9", filter: [
                { Name: "name", Value: ["CentOS-Stream-9-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "Rocky Linux 9", owner: "792107900819", description: "Rocky Linux 9 (RHEL-compatible)", filter: [
                { Name: "name", Value: ["Rocky-9-EC2-Base-*"] }, { Name: "state", Value: ["available"] },
              ]},
              { name: "AlmaLinux 9", owner: "764336703387", description: "AlmaLinux OS 9", filter: [
                { Name: "name", Value: ["AlmaLinux-OS-9-*-x86_64-*"] }, { Name: "state", Value: ["available"] },
              ]},
            ],
          },
        ];

        const categorizedResults = [];
        let describeImagesAvailable = true;

        for (const category of categories) {
          const catGroups = [];
          for (const group of (category.groups || [])) {
            if (!describeImagesAvailable) {
              catGroups.push({
                group: group.name,
                owner: group.owner,
                description: group.description,
                images: [{ imageId: DEFAULT_AMIS[region] || DEFAULT_AMIS["us-east-1"], description: "Default (DescribeImages unavailable)", architecture: "x86_64", creationDate: "N/A" }],
                _fallback: true,
              });
              continue;
            }
            try {
              const xml = await ec2Call("DescribeImages", {
                Owner: [group.owner],
                Filter: group.filter,
              }, region);
              const itemRegex = /<item>([\s\S]*?)<\/item>/g;
              let match;
              const images = [];
              while ((match = itemRegex.exec(xml)) !== null) {
                const block = match[1];
                const idMatch = block.match(/<imageId>([^<]+)<\/imageId>/);
                const dateMatch = block.match(/<creationDate>([^<]+)<\/creationDate>/);
                const descMatch = block.match(/<description>([^<]*)<\/description>/);
                const archMatch = block.match(/<architecture>([^<]+)<\/architecture>/);
                if (idMatch?.[1] && dateMatch?.[1]) {
                  images.push({ imageId: idMatch[1], creationDate: dateMatch[1], description: descMatch?.[1] || "", architecture: archMatch?.[1] || "x86_64" });
                }
              }
              images.sort((a, b) => b.creationDate.localeCompare(a.creationDate));
              if (images.length > 0) {
                catGroups.push({
                  group: group.name,
                  owner: group.owner,
                  description: group.description,
                  images: images.slice(0, 5).map(i => ({ imageId: i.imageId, description: i.description, architecture: i.architecture, creationDate: i.creationDate })),
                });
              }
            } catch (e) {
              console.error(`Failed to list AMIs for ${group.name}:`, e.message);
              if (e.message.includes("AuthFailure") || e.message.includes("UnauthorizedOperation")) {
                describeImagesAvailable = false;
                catGroups.push({
                  group: group.name,
                  owner: group.owner,
                  description: group.description,
                  images: [{ imageId: DEFAULT_AMIS[region] || DEFAULT_AMIS["us-east-1"], description: `Default (${e.message.slice(0, 30)}…)`, architecture: "x86_64", creationDate: "N/A" }],
                  _fallback: true,
                });
              } else {
                catGroups.push({ group: group.name, error: e.message });
              }
            }
          }
          if (catGroups.length > 0) {
            categorizedResults.push({
              category: category.category,
              icon: category.icon,
              groups: catGroups,
            });
          }
        }
        return Response.json({ region, categories: categorizedResults });
      }

      case "listInstances": {
        const { lab_id } = params;
        const filters = lab_id
          ? [{ Name: "tag:LabId", Value: [lab_id] }]
          : [{ Name: "tag:ManagedBy", Value: ["XtremeICE-LiveFire"] }];

        const xml = await ec2Call("DescribeInstances", { Filter: filters }, region);
        const instances = [];
        const reservationBlocks = xml.split("</reservationSet>")[0]?.split("<item>") || [];
        for (let i = 1; i < reservationBlocks.length; i++) {
          const block = reservationBlocks[i];
          const idMatch = block.match(/<instanceId>([^<]+)<\/instanceId>/);
          const stateMatch = block.match(/<name>([^<]+)<\/name>/);
          const ipMatch = block.match(/<ipAddress>([^<]+)<\/ipAddress>/);
          const privMatch = block.match(/<privateIpAddress>([^<]+)<\/privateIpAddress>/);
          if (idMatch && stateMatch?.[1] !== "terminated") {
            instances.push({
              instanceId: idMatch[1],
              state: stateMatch[1],
              publicIp: ipMatch?.[1] || null,
              privateIp: privMatch?.[1] || null,
            });
          }
        }
        return Response.json({ region, instances, totalCount: instances.length });
      }

      case "createKeyPair": {
        const { key_name } = params;
        const xml = await ec2Call("CreateKeyPair", { KeyName: key_name }, region);

        // AWS returns the private key material — this is the ONLY time it's available
        const keyMaterial = xml.match(/<keyMaterial>([\s\S]*?)<\/keyMaterial>/)?.[1] || "";
        const keyFingerprint = xml.match(/<keyFingerprint>([^<]+)<\/keyFingerprint>/)?.[1] || "";
        const keyPairId = xml.match(/<keyPairId>([^<]+)<\/keyPairId>/)?.[1] || "";

        return Response.json({
          keyName: key_name,
          keyPairId,
          keyFingerprint,
          privateKey: keyMaterial.replace(/\\n/g, "\n"),  // Demarcate PEM newlines
          region,
        });
      }

      case "startVM": {
        const { instance_id } = params;
        const xml = await ec2Call("StartInstances", { InstanceId: [instance_id] }, region);
        const currentState = xml.match(/<currentState>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] || "pending";
        const prevState = xml.match(/<previousState>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] || "stopped";
        return Response.json({ instanceId: instance_id, previousState: prevState, currentState, success: true });
      }

      case "stopVM": {
        const { instance_id } = params;
        const xml = await ec2Call("StopInstances", { InstanceId: [instance_id] }, region);
        const currentState = xml.match(/<currentState>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] || "stopping";
        const prevState = xml.match(/<previousState>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] || "running";
        return Response.json({ instanceId: instance_id, previousState: prevState, currentState, success: true });
      }

      case "decryptWindowsPassword": {
        // Server-side decrypt of Windows admin password using the lab's PEM key
        // This replicates what AWS console does when you upload a .pem key for RDP
        const { instance_id, private_key_pem, lab_id } = params;

        // 1. Get encrypted password from AWS
        const xml = await ec2Call("GetPasswordData", { InstanceId: instance_id }, region);
        const encryptedBase64 = xml.match(/<passwordData>([^<]*)<\/passwordData>/)?.[1] || "";
        const timestamp = xml.match(/<timestamp>([^<]*)<\/timestamp>/)?.[1] || "";

        if (!encryptedBase64 || encryptedBase64.trim() === "") {
          return Response.json({
            success: false,
            error: "Password not ready",
            message: "Windows instance has not generated the admin password yet. It takes 4-8 minutes after first launch. The instance may also need to pass status checks first.",
            timestamp: timestamp || null,
          });
        }

        // 2. Get the private key
        let pemKey = private_key_pem;
        if (!pemKey && lab_id) {
          const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
          pemKey = lab?.ssh_private_key;
        }
        if (!pemKey) {
          return Response.json({
            success: false,
            error: "No private key",
            message: "No PEM key available to decrypt the password. Provide a private_key_pem or ensure the lab has an ssh_private_key.",
            passwordData: encryptedBase64,
            timestamp: timestamp || null,
          });
        }

        // Normalize PEM: ensure proper line breaks and no trailing garbage
        const rawLen = pemKey.length;
        const hasRealNewlines = pemKey.includes("\n");
        const hasEscapedN = pemKey.includes("\\n");
        console.log(`[decrypt] Raw key: ${rawLen} chars, real_newlines=${hasRealNewlines}, escaped_n=${hasEscapedN}`);
        console.log(`[decrypt] Key head (first 100): ${JSON.stringify(pemKey.slice(0, 100))}`);
        console.log(`[decrypt] Encrypted data: ${encryptedBase64.length} chars`);

        // Dedicated normalization: convert ALL forms of newline encoding to real \n
        pemKey = pemKey
          .replace(/\\\\n/g, "\n")    // double-escaped \\n → real newline
          .replace(/\\n/g, "\n")      // JSON-escaped \n → real newline
          .replace(/\r\n/g, "\n")     // CRLF → LF
          .replace(/\r/g, "\n")       // bare CR → LF
          .trim();

        // Verify key boundaries are intact after normalization
        const startsOk = pemKey.startsWith("-----BEGIN");
        const endsOk = pemKey.endsWith("-----");
        console.log(`[decrypt] After normalize: ${pemKey.length} chars, starts=${startsOk}, ends=${endsOk}`);
        console.log(`[decrypt] Key head (first 100): ${JSON.stringify(pemKey.slice(0, 100))}`);

        const encryptedBuf = Buffer.from(encryptedBase64, "base64");
        console.log(`[decrypt] Encrypted buffer: ${encryptedBuf.length} bytes`);

        // Approach: Use node:crypto createPrivateKey to extract RSA JWK, then Web Crypto to decrypt.
        // Deno's node:crypto privateDecrypt has known issues — Web Crypto is native and reliable.
        let password = null;
        let lastError = null;

        const { createPrivateKey } = await import("node:crypto");

        try {
          // Step 1: Parse PEM and extract JWK via node:crypto
          const keyObj = createPrivateKey(pemKey);
          const jwk = keyObj.export({ format: "jwk" });
          console.log(`[decrypt] JWK exported: alg=${jwk.alg}, kty=${jwk.kty}, n_len=${jwk.n?.length}, e=${jwk.e}`);

          // Step 2: Import JWK into Web Crypto
          const cryptoKey = await crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["decrypt"],
          );
          console.log("[decrypt] Web Crypto importKey: SUCCESS");

          // Step 3: Decrypt OAEP-SHA256 (modern AWS)
          try {
            const decrypted = await crypto.subtle.decrypt(
              { name: "RSA-OAEP" },
              cryptoKey,
              encryptedBuf,
            );
            password = new TextDecoder().decode(decrypted);
            console.log("[decrypt] Web Crypto OAEP-SHA256: SUCCESS");
          } catch (e) {
            lastError = e.message;
            console.error(`[decrypt] Web Crypto OAEP-SHA256 failed: ${e.message}`);

            // Try OAEP-SHA1
            try {
              const sha1Key = await crypto.subtle.importKey(
                "jwk", jwk,
                { name: "RSA-OAEP", hash: "SHA-1" },
                false, ["decrypt"],
              );
              const decrypted = await crypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                sha1Key,
                encryptedBuf,
              );
              password = new TextDecoder().decode(decrypted);
              console.log("[decrypt] Web Crypto OAEP-SHA1: SUCCESS");
            } catch (e2) {
              if (!lastError) lastError = e2.message;
              console.error(`[decrypt] Web Crypto OAEP-SHA1 failed: ${e2.message}`);
            }
          }
        } catch (e) {
          lastError = e.message;
          console.error(`[decrypt] Web Crypto setup failed: ${e.message}`);

          // Fallback: try node:crypto privateDecrypt with raw PEM string directly
          const { privateDecrypt, constants: c } = await import("node:crypto");
          try {
            password = privateDecrypt(
              { key: pemKey, padding: c.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
              encryptedBuf,
            ).toString("utf8");
            console.log("[decrypt] Fallback OAEP-SHA256: SUCCESS");
          } catch (e2) {
            console.error(`[decrypt] Fallback OAEP-SHA256 failed: ${e2.message}`);
            try {
              password = privateDecrypt(
                { key: pemKey, padding: c.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha1" },
                encryptedBuf,
              ).toString("utf8");
              console.log("[decrypt] Fallback OAEP-SHA1: SUCCESS");
            } catch (e3) {
              console.error(`[decrypt] Fallback OAEP-SHA1 failed: ${e3.message}`);
              try {
                password = privateDecrypt(
                  { key: pemKey, padding: c.RSA_PKCS1_PADDING },
                  encryptedBuf,
                ).toString("utf8");
                console.log("[decrypt] Fallback PKCS1-v1.5: SUCCESS");
              } catch (e4) {
                console.error(`[decrypt] Fallback PKCS1-v1.5 failed: ${e4.message}`);
                if (!lastError) lastError = e4.message;
              }
            }
          }
        }

        if (password) {
          return Response.json({
            success: true,
            instanceId: instance_id,
            password,
            timestamp: timestamp || null,
          });
        }

        return Response.json({
          success: false,
          error: `Decryption failed: ${lastError || "unknown"}`,
          message: "Could not decrypt the password. The PEM key may not match the key pair used when launching this instance.",
          debug: {
            keyLen: rawLen,
            hasRealNewlines,
            hasEscapedN,
            startsWithBegin: startsOk,
            endsWithEnd: endsOk,
            encryptedLength: encryptedBase64.length,
            method: "WebCrypto-OAEP-SHA256 + fallbacks",
          },
          passwordData: encryptedBase64.slice(0, 100) + "...",
          timestamp: timestamp || null,
          manualDecryptCmd: `openssl pkeyutl -decrypt -inkey <key>.pem -in <(echo "${encryptedBase64.slice(0, 50)}..." | base64 -d) -pkeyopt rsa_padding_mode:oaep`,
        });
      }

      case "getPasswordData": {
        // Retrieve Windows Administrator password from AWS (encrypted with key pair)
        const { instance_id } = params;
        const xml = await ec2Call("GetPasswordData", { InstanceId: instance_id }, region);

        const passwordData = xml.match(/<passwordData>([^<]*)<\/passwordData>/)?.[1] || "";
        const timestamp = xml.match(/<timestamp>([^<]*)<\/timestamp>/)?.[1] || "";

        const isEmpty = !passwordData || passwordData.trim() === "";

        return Response.json({
          instanceId: instance_id,
          passwordData,
          isEmpty,
          timestamp: timestamp || null,
          region,
        });
      }

      case "getConsoleOutput": {
        const { instance_id } = params;
        const xml = await ec2Call("GetConsoleOutput", { InstanceId: instance_id }, region);

        const output = xml.match(/<output>([^<]*)<\/output>/)?.[1] || "";
        const timestamp = xml.match(/<timestamp>([^<]*)<\/timestamp>/)?.[1] || "";

        return Response.json({
          instanceId: instance_id,
          output,  // Base64-encoded console output
          timestamp,
          region,
        });
      }

      case "listSecurityGroups": {
        // List security groups for a given VPC
        const { vpc_id } = params;
        const ids = [];
        if (vpc_id) {
          const xml = await ec2Call("DescribeSecurityGroups", {
            Filter: [{ Name: "vpc-id", Value: [vpc_id] }],
          }, region);
          for (const m of xml.matchAll(/<groupId>([^<]+)<\/groupId>/g)) {
            ids.push(m[1]);
          }
        }
        return Response.json({ securityGroupIds: ids, vpcId: vpc_id, region });
      }

      case "deleteKeyPair": {
        const { key_name } = params;
        await ec2Call("DeleteKeyPair", { KeyName: key_name }, region);
        return Response.json({ success: true, keyName: key_name });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("AWS Provider Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});