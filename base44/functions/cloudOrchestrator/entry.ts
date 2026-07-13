import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

/**
 * Cloud Orchestration Engine
 * 
 * Provider abstraction layer for multi-cloud lab deployments.
 * Routes deployment requests to the appropriate cloud provider implementation.
 * 
 * Supported providers: aws (primary), azure (placeholder), gcp (placeholder)
 */

// Provider interface definition (documentation):
// Each provider must implement:
//   createVM(params)       → { instanceId, publicIp, privateIp, status }
//   deleteVM(instanceId)   → { success }
//   createNetwork(params)  → { vpcId, subnetId, securityGroupId, routeTableId }
//   deleteNetwork(vpcId)   → { success }
//   createStorage(params)  → { volumeId }
//   deleteStorage(volumeId)→ { success }
//   assignPublicIP(instanceId) → { publicIp }
//   removePublicIP(instanceId) → { success }

const PROVIDER_REGISTRY = {
  aws: "cloudProviderAWS",
  azure: "cloudProviderAzure",
  gcp: "cloudProviderGCP",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, provider = "aws", params = {} } = body;

    if (!action) {
      return Response.json({ error: "Missing action parameter" }, { status: 400 });
    }

    // Route to provider-specific function
    const providerFunction = PROVIDER_REGISTRY[provider];
    if (!providerFunction) {
      return Response.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    // For now, AWS is the only fully implemented provider
    // Azure and GCP delegate to the same orchestrator with provider flag
    switch (action) {
      case "deployLab": {
        // Deploy entire lab topology
        const { lab_id, topology_data } = params;

        // Fetch lab details
        const labs = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id });
        if (!labs.length) return Response.json({ error: "Lab not found" }, { status: 404 });
        const lab = labs[0];

        // Update lab status
        await base44.asServiceRole.entities.LiveFireLab.update(lab_id, { status: "deploying" });

        // Create deployment record
        const deployment = await base44.asServiceRole.entities.LiveFireDeployment.create({
          lab_id,
          provider,
          region: lab.region || "us-east-1",
          status: "provisioning",
          vpc_cidr: "10.0.0.0/16",
          estimated_cost_hourly: (topology_data?.devices?.length || 0) * 0.15,
        });

        // Create SSH key pair for student access
        let sshKeyMaterial = null;
        const keyPairName = `livefire-${lab_id}-${Date.now()}`;
        try {
          const keyResult = await base44.functions.invoke("cloudProviderAWS", {
            action: "createKeyPair",
            params: { key_name: keyPairName, region: lab.region || "us-east-1" },
          });
          const keyData = keyResult?.data || keyResult;
          sshKeyMaterial = keyData?.privateKey || null;
          console.log(`[deployLab] Key pair created: ${keyPairName}`);
        } catch (e) {
          console.error(`[deployLab] Key pair creation failed: ${e.message}`);
          // Continue without key pair — instances will still boot but SSH won't work
        }

        // Store key info on lab
        if (sshKeyMaterial) {
          await base44.asServiceRole.entities.LiveFireLab.update(lab_id, {
            ssh_key_name: keyPairName,
            ssh_private_key: sshKeyMaterial,
          });
        }

        // Deploy VPC and network infrastructure using topology's VPC config
        const vpcConfig = topology_data?.vpcConfig || {};
        const deployRegion = lab.region || "us-east-1";

        // Check if user chose an existing VPC to reuse
        const existingVpcId = vpcConfig.existingVpcId;
        let networkData = null;

        if (existingVpcId) {
          // Reuse existing VPC — look up its subnets from AWS
          console.log(`[deployLab] Using existing VPC: ${existingVpcId}`);
          try {
            const vpcListRes = await base44.functions.invoke("cloudProviderAWS", {
              action: "listAllVpcs",
              params: { region: deployRegion },
            });
            const vpcList = (vpcListRes?.data || vpcListRes)?.vpcs || [];
            const existingVpc = vpcList.find(v => v.vpcId === existingVpcId);
            if (!existingVpc || existingVpc.subnets.length === 0) {
              throw new Error(`Existing VPC ${existingVpcId} has no available subnets`);
            }

            // Build subnet list from existing VPC's subnets, matching topology selections
            const topologySubnets = vpcConfig.subnets || [];
            const matchedSubnets = existingVpc.subnets.filter(s =>
              topologySubnets.some(ts => ts.cidr === s.cidrBlock)
            ).map(s => ({
              id: s.subnetId,
              name: topologySubnets.find(ts => ts.cidr === s.cidrBlock)?.name || "subnet",
              cidr: s.cidrBlock,
              zone: s.availabilityZone,
              isPublic: true,
            }));

            if (matchedSubnets.length === 0 && existingVpc.subnets.length > 0) {
              // No matching subnets? Use all existing ones
              matchedSubnets.push(...existingVpc.subnets.map(s => ({
                id: s.subnetId,
                name: "existing",
                cidr: s.cidrBlock,
                zone: s.availabilityZone,
                isPublic: true,
              })));
            }

            // Find existing security groups for this VPC
            let securityGroupIds = [];
            try {
              const sgResult = await base44.functions.invoke("cloudProviderAWS", {
                action: "listSecurityGroups",
                params: { vpc_id: existingVpcId, region: deployRegion },
              });
              const sgData = sgResult?.data || sgResult;
              securityGroupIds = sgData?.securityGroupIds || [];
            } catch { /* will create new SG below */ }

            effectiveCidr = existingVpc.cidrBlock;
            networkData = {
              vpcId: existingVpcId,
              vpcCidr: existingVpc.cidrBlock,
              subnets: matchedSubnets,
              subnetId: matchedSubnets[0]?.id || "",
              securityGroupIds,
              securityGroupId: securityGroupIds[0] || "",
              region: deployRegion,
              state: "existing",
              _existing: true,
            };
            console.log(`[deployLab] Reusing VPC ${existingVpcId} with ${matchedSubnets.length} subnets`);
          } catch (e) {
            console.error(`[deployLab] Failed to reuse existing VPC: ${e.message}. Falling back to new VPC.`);
            existingVpcId = null; // Fall through to create new VPC
          }
        }

        let effectiveCidr = vpcConfig.cidr || "10.1.0.0/16";
        if (!networkData) {
          const deployCidr = effectiveCidr;

          // Pre-flight CIDR conflict check — auto-resolve if conflict
          console.log("[deployLab] Step 1: suggestCidr...");
          let cidrCheck;
          try {
            cidrCheck = await base44.functions.invoke("cloudProviderAWS", {
              action: "suggestCidr",
              params: { proposed_cidr: deployCidr, region: deployRegion },
            });
            console.log("[deployLab] Step 1 OK:", JSON.stringify(cidrCheck?.data || cidrCheck).slice(0, 200));
          } catch (e) {
            console.error("[deployLab] Step 1 FAILED:", e.message);
            throw e;
          }
          const cidrCheckData = cidrCheck?.data || cidrCheck;
          effectiveCidr = deployCidr;
          const cidrChanged = cidrCheckData?.check?.conflict;
          if (cidrChanged) {
            effectiveCidr = cidrCheckData.suggested_cidr || "10.100.0.0/16";
            console.log(`CIDR ${deployCidr} conflicts — auto-selected ${effectiveCidr}`);
          }

          // Build subnet configs
          let fixedSubnets = [];
          if (cidrChanged) {
            const parts = effectiveCidr.split("/")[0].split(".").map(Number);
            const prefix = `${parts[0]}.${parts[1]}`;
            const origSubnets = vpcConfig.subnets || [];
            fixedSubnets = origSubnets.length > 0
              ? origSubnets.map((s, i) => ({
                  name: s.name,
                  cidr: `${prefix}.${i + 1}.0/24`,
                  zone: `${deployRegion}${String.fromCharCode(97 + i)}`,
                }))
              : [
                  { name: "public", cidr: `${prefix}.1.0/24`, zone: `${deployRegion}a` },
                  { name: "private", cidr: `${prefix}.2.0/24`, zone: `${deployRegion}b` },
                ];
          } else {
            const rawSubnets = vpcConfig.subnets || [];
            fixedSubnets = rawSubnets.map(s => ({
              ...s,
              zone: s.zone?.replace(/^[a-z]+-[a-z]+-\d+/, deployRegion) || `${deployRegion}a`,
            }));
          }

          console.log("[deployLab] Step 2: createNetwork with cidr=" + effectiveCidr);
          let networkResult;
          try {
            networkResult = await base44.functions.invoke("cloudProviderAWS", {
              action: "createNetwork",
              params: {
                lab_id,
                vpc_cidr: effectiveCidr,
                subnet_configs: fixedSubnets,
                region: deployRegion,
                resource_tag_name: vpcConfig.resourceTagName || "",
              },
            });
            console.log("[deployLab] Step 2 OK");
          } catch (e) {
            console.error("[deployLab] Step 2 FAILED:", e.message);
            throw e;
          }

          networkData = networkResult?.data || networkResult;
        }

        // Deploy each device
        const devices = topology_data?.devices || [];
        const deployedDevices = [];
        const deviceErrors = [];
        console.log(`[deployLab] Step 3: Deploying ${devices.length} devices...`);
        for (const device of devices) {
          try {
            console.log(`[deployLab] Deploying device: ${device.name}`);
            // Pick the right subnet based on device's subnet assignment
            const deviceSubnet = device.subnet || "public";
            const targetSubnet = networkData?.subnets?.find(s => s.name === deviceSubnet) || networkData?.subnets?.[0];
            const subnetId = targetSubnet?.id || networkData?.subnetId;

            if (!subnetId) {
              deviceErrors.push({ device: device.name, error: "No valid subnet found for device deployment" });
              continue;
            }

            // Resolve AMI: if it's a LiveFireImage database ID, look up the actual AMI ID
            let resolvedAmiId = device.ami_image_id || null;
            if (resolvedAmiId && !resolvedAmiId.startsWith("ami-")) {
              try {
                const dbImage = await base44.asServiceRole.entities.LiveFireImage.filter({ id: resolvedAmiId }).then(r => r[0]);
                resolvedAmiId = dbImage?.ami_id || null;
              } catch { /* keep original — will fall back to auto-resolve */ }
            }

            const result = await base44.functions.invoke("cloudProviderAWS", {
              action: "createVM",
              params: {
                lab_id,
                device_name: device.name,
                device_type: device.type,
                cpu_cores: device.cpu_cores || 2,
                ram_mb: device.ram_mb || 4096,
                storage_gb: device.storage_gb || 20,
                subnet_id: subnetId,
                security_group_ids: networkData?.securityGroupIds || [],
                region: lab.region || "us-east-1",
                ami_image_id: resolvedAmiId,
                key_name: keyPairName,
              },
            });

            const responseData = result?.data || result;
            if (responseData?.error) {
              deviceErrors.push({ device: device.name, error: responseData.message || responseData.error });
              continue;
            }

            deployedDevices.push(responseData);

            // Update device record in database
            const defaultUser = device.default_username || (device.access_method === "rdp" ? "Administrator" : "ec2-user");
            await base44.asServiceRole.entities.LiveFireDevice.create({
              lab_id,
              name: device.name,
              device_type: device.type,
              instance_id: responseData?.instanceId || `i-pending-${device.id}`,
              public_ip: responseData?.publicIp || "",
              private_ip: responseData?.privateIp || "",
              status: "provisioning",
              cpu_cores: device.cpu_cores || 2,
              ram_mb: device.ram_mb || 4096,
              storage_gb: device.storage_gb || 20,
              position_x: device.position_x,
              position_y: device.position_y,
              connections: device.connections || [],
              access_method: device.access_method || "ssh",
              default_username: defaultUser,
              access_port: device.access_method === "rdp" ? 3389 : 22,
            });
          } catch (deviceError) {
            deviceErrors.push({ device: device.name, error: deviceError.message || String(deviceError) });
          }
        }

        // Wait for EC2 instances to boot and get public IPs (MapPublicIpOnLaunch takes 5-15s)
        const launchedDevices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });
        if (launchedDevices.length > 0) {
          console.log(`[deployLab] Waiting for public IPs on ${launchedDevices.length} devices...`);
          await new Promise(resolve => setTimeout(resolve, 12000));
          for (const device of launchedDevices) {
            if (!device.instance_id) continue;
            try {
              const statusResult = await base44.functions.invoke("cloudProviderAWS", {
                action: "getInstanceStatus",
                params: { instance_id: device.instance_id, region: lab.region || "us-east-1" },
              });
              const statusData = statusResult?.data || statusResult;
              const publicIp = statusData?.publicIp || null;
              const state = statusData?.state || device.status;
              await base44.asServiceRole.entities.LiveFireDevice.update(device.id, {
                public_ip: publicIp || "",
                status: state === "running" ? "running" : "provisioning",
              });
              console.log(`[deployLab] ${device.name}: state=${state}, publicIp=${publicIp || "none"}`);
            } catch (pollError) {
              console.log(`[deployLab] ${device.name}: IP poll failed — ${pollError.message}`);
            }
          }
        }

        // Determine overall status
        const allDevicesFailed = devices.length > 0 && deployedDevices.length === 0;
        const someDevicesFailed = deviceErrors.length > 0 && deployedDevices.length > 0;
        const deploymentStatus = allDevicesFailed ? "failed" : "running";
        const labStatus = allDevicesFailed ? "failed" : "running";

        // Update deployment record
        await base44.asServiceRole.entities.LiveFireDeployment.update(deployment.id, {
          status: deploymentStatus,
          instance_ids: deployedDevices.map(d => d.instanceId).filter(Boolean),
          vpc_id: networkData?.vpcId,
          subnet_ids: networkData?.subnets?.map(s => s.id) || [],
          security_group_ids: networkData?.securityGroupIds || [],
          error_message: allDevicesFailed ? deviceErrors.map(e => `${e.device}: ${e.error}`).join("; ") : (someDevicesFailed ? `Some devices failed: ${deviceErrors.map(e => e.device).join(", ")}` : null),
          completed_at: new Date().toISOString(),
        });

        // Update lab status
        await base44.asServiceRole.entities.LiveFireLab.update(lab_id, {
          status: labStatus,
          device_count: deployedDevices.length,
          estimated_cost_hourly: deployedDevices.length * 0.15,
          vpc_id: networkData?.vpcId,
          subnet_id: networkData?.subnets?.[0]?.id || null,
        });

        // Log audit
        await base44.asServiceRole.entities.LiveFireAuditLog.create({
          user_id: user.id,
          user_email: user.email,
          action: "lab_deployed",
          resource_type: "lab",
          resource_id: lab_id,
          details: { device_count: deployedDevices.length, provider },
        });

        // Log cost
        await base44.asServiceRole.entities.LiveFireCostRecord.create({
          lab_id,
          deployment_id: deployment.id,
          resource_type: "instance",
          provider,
          cost_amount: deployedDevices.length * 0.15,
          billing_period: new Date().toISOString().slice(0, 7),
          recorded_at: new Date().toISOString(),
          user_email: user.email,
        });

        if (allDevicesFailed) {
          return Response.json({
            status: "failed",
            error: "All device launches failed",
            message: deviceErrors.map(e => `${e.device}: ${e.error}`).join("; "),
            deployment_id: deployment.id,
            devices_deployed: 0,
            device_errors: deviceErrors,
            vpc_id: networkData?.vpcId,
            vpc_cidr: effectiveCidr,
          }, { status: 500 });
        }

        return Response.json({
          status: "success",
          deployment_id: deployment.id,
          devices_deployed: deployedDevices.length,
          vpc_id: networkData?.vpcId,
          vpc_cidr: effectiveCidr,
          cidr_auto_resolved: effectiveCidr !== (vpcConfig.cidr || "10.1.0.0/16"),
          subnet_ids: networkData?.subnets,
          security_group_id: networkData?.securityGroupId,
          estimated_cost_hourly: deployedDevices.length * 0.15,
          device_errors: deviceErrors.length > 0 ? deviceErrors : undefined,
        });
      }

      case "terminateLab": {
        const { lab_id } = params;
        const labs = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id });
        if (!labs.length) return Response.json({ error: "Lab not found" }, { status: 404 });

        // Get all devices
        const devices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });

        // Terminate each device
        for (const device of devices) {
          try {
            await base44.functions.invoke("cloudProviderAWS", {
              action: "deleteVM",
              params: { instance_id: device.instance_id, region: labs[0].region },
            });
            await base44.asServiceRole.entities.LiveFireDevice.update(device.id, { status: "terminated" });
          } catch (e) {
            console.error(`Failed to terminate device ${device.name}:`, e);
          }
        }

        // Get deployment and tear down network
        const deployments = await base44.asServiceRole.entities.LiveFireDeployment.filter({ lab_id });
        for (const dep of deployments) {
          if (dep.vpc_id) {
            try {
              await base44.functions.invoke("cloudProviderAWS", {
                action: "deleteNetwork",
                params: { vpc_id: dep.vpc_id, region: labs[0].region },
              });
            } catch (e) {
              console.error(`Failed to delete VPC ${dep.vpc_id}:`, e);
            }
          }
          await base44.asServiceRole.entities.LiveFireDeployment.update(dep.id, { status: "terminated" });
        }

        // Delete SSH key pair from AWS
        if (labs[0].ssh_key_name) {
          try {
            await base44.functions.invoke("cloudProviderAWS", {
              action: "deleteKeyPair",
              params: { key_name: labs[0].ssh_key_name, region: labs[0].region },
            });
          } catch (e) {
            console.error(`Failed to delete key pair ${labs[0].ssh_key_name}:`, e);
          }
        }

        await base44.asServiceRole.entities.LiveFireLab.update(lab_id, { status: "completed" });

        await base44.asServiceRole.entities.LiveFireAuditLog.create({
          user_id: user.id,
          user_email: user.email,
          action: "lab_terminated",
          resource_type: "lab",
          resource_id: lab_id,
          details: { device_count: devices.length },
        });

        return Response.json({ status: "success", terminated_devices: devices.length });
      }

      case "getLabStatus": {
        const { lab_id } = params;
        const [lab, devices, deployment] = await Promise.all([
          base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]),
          base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id }),
          base44.asServiceRole.entities.LiveFireDeployment.filter({ lab_id }).then(r => r[0]),
        ]);

        return Response.json({
          lab,
          devices,
          deployment,
        });
      }

      case "estimateCost": {
        const { topology_data } = params;
        const deviceCount = topology_data?.devices?.length || 0;
        const costPerDevice = 0.15; // $0.15/hr average per device
        return Response.json({
          devices: deviceCount,
          hourly: deviceCount * costPerDevice,
          daily: deviceCount * costPerDevice * 24,
          monthly: deviceCount * costPerDevice * 24 * 30,
        });
      }

      case "createSnapshot": {
        const { lab_id, name, description } = params;
        const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        if (!lab) return Response.json({ error: "Lab not found" }, { status: 404 });

        const devices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });

        const snapshot = await base44.asServiceRole.entities.LiveFireSnapshot.create({
          lab_id,
          name: name || `Snapshot ${new Date().toISOString()}`,
          description: description || "",
          snapshot_data: {
            lab: { name: lab.name, topology_data: lab.topology_data, status: lab.status },
            devices: devices.map(d => ({
              name: d.name, type: d.device_type, position_x: d.position_x,
              position_y: d.position_y, connections: d.connections,
            })),
          },
          is_auto: false,
          version: "1.0",
        });

        await base44.asServiceRole.entities.LiveFireAuditLog.create({
          user_id: user.id,
          user_email: user.email,
          action: "snapshot_created",
          resource_type: "snapshot",
          resource_id: snapshot.id,
          details: { lab_id },
        });

        return Response.json({ status: "success", snapshot_id: snapshot.id });
      }

      case "restoreSnapshot": {
        const { snapshot_id, lab_id } = params;
        const snapshots = await base44.asServiceRole.entities.LiveFireSnapshot.filter({ id: snapshot_id });
        if (!snapshots.length) return Response.json({ error: "Snapshot not found" }, { status: 404 });
        const snap = snapshots[0];

        const data = snap.snapshot_data;
        await base44.asServiceRole.entities.LiveFireLab.update(lab_id, {
          topology_data: data.lab?.topology_data,
          name: `${data.lab?.name || "Lab"} (restored)`,
        });

        // Remove existing devices and recreate from snapshot
        const existingDevices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });
        for (const d of existingDevices) {
          await base44.asServiceRole.entities.LiveFireDevice.delete(d.id);
        }

        for (const devData of (data.devices || [])) {
          await base44.asServiceRole.entities.LiveFireDevice.create({
            lab_id,
            ...devData,
            status: "pending",
          });
        }

        await base44.asServiceRole.entities.LiveFireAuditLog.create({
          user_id: user.id,
          user_email: user.email,
          action: "snapshot_restored",
          resource_type: "snapshot",
          resource_id: snapshot_id,
          details: { lab_id },
        });

        return Response.json({ status: "success" });
      }

      case "stopDevice": {
        const { lab_id, device_id } = params;
        const device = await base44.asServiceRole.entities.LiveFireDevice.filter({ id: device_id, lab_id }).then(r => r[0]);
        if (!device?.instance_id) return Response.json({ error: "Device not found or not deployed" }, { status: 404 });

        const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        const result = await base44.functions.invoke("cloudProviderAWS", {
          action: "stopVM",
          params: { instance_id: device.instance_id, region: lab?.region || "us-east-1" },
        });
        const data = result?.data || result;
        await base44.asServiceRole.entities.LiveFireDevice.update(device_id, { status: "stopped" });
        return Response.json({ success: true, device_id, instance_id: device.instance_id, previousState: data.previousState });
      }

      case "startDevice": {
        const { lab_id, device_id } = params;
        const device = await base44.asServiceRole.entities.LiveFireDevice.filter({ id: device_id, lab_id }).then(r => r[0]);
        if (!device?.instance_id) return Response.json({ error: "Device not found or not deployed" }, { status: 404 });

        const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        const result = await base44.functions.invoke("cloudProviderAWS", {
          action: "startVM",
          params: { instance_id: device.instance_id, region: lab?.region || "us-east-1" },
        });
        const data = result?.data || result;
        await base44.asServiceRole.entities.LiveFireDevice.update(device_id, { status: "provisioning" });
        return Response.json({ success: true, device_id, instance_id: device.instance_id, currentState: data.currentState });
      }

      case "stopAllDevices": {
        const { lab_id } = params;
        const devices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });
        const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        const region = lab?.region || "us-east-1";
        const results = [];

        for (const device of devices) {
          if (!device.instance_id || device.status === "terminated" || device.status === "stopped") continue;
          try {
            await base44.functions.invoke("cloudProviderAWS", {
              action: "stopVM",
              params: { instance_id: device.instance_id, region },
            });
            await base44.asServiceRole.entities.LiveFireDevice.update(device.id, { status: "stopped" });
            results.push({ device: device.name, status: "stopped" });
          } catch (e) {
            results.push({ device: device.name, error: e.message });
          }
        }
        return Response.json({ success: true, stopped: results.filter(r => r.status === "stopped").length, errors: results.filter(r => r.error).length, details: results });
      }

      case "startAllDevices": {
        const { lab_id } = params;
        const devices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });
        const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        const region = lab?.region || "us-east-1";
        const results = [];

        for (const device of devices) {
          if (!device.instance_id || device.status === "terminated" || device.status === "running" || device.status === "provisioning") continue;
          try {
            await base44.functions.invoke("cloudProviderAWS", {
              action: "startVM",
              params: { instance_id: device.instance_id, region },
            });
            await base44.asServiceRole.entities.LiveFireDevice.update(device.id, { status: "provisioning" });
            results.push({ device: device.name, status: "starting" });
          } catch (e) {
            results.push({ device: device.name, error: e.message });
          }
        }
        return Response.json({ success: true, started: results.filter(r => r.status === "starting").length, errors: results.filter(r => r.error).length, details: results });
      }

      case "deployAllDevices": {
        // Deploy all un-deployed topology devices at once — the topology devices are in topology_data.devices,
        // this action deploys any that don't have a matching LiveFireDevice record yet
        const { lab_id } = params;
        const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        if (!lab) return Response.json({ error: "Lab not found" }, { status: 404 });

        const topologyData = lab.topology_data || {};
        const topologyDevices = topologyData.devices || [];
        const deployedDevices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });
        const deployedNames = new Set(deployedDevices.map(d => d.name?.toLowerCase()));

        // Find devices not yet deployed
        const pendingDevices = topologyDevices.filter(d => !deployedNames.has(d.name?.toLowerCase()));
        if (pendingDevices.length === 0) {
          return Response.json({ success: true, deployed: 0, message: "All topology devices are already deployed" });
        }

        // Get existing network/deployment info
        const deployRegion = lab.region || "us-east-1";
        const deployments = await base44.asServiceRole.entities.LiveFireDeployment.filter({ lab_id });
        const dep = deployments[0];
        if (!dep?.subnet_ids?.length && !lab.subnet_id) {
          return Response.json({ error: "No network infrastructure found. Deploy the lab's VPC first." }, { status: 400 });
        }

        const subnetId = dep?.subnet_ids?.[0] || lab.subnet_id;
        const secGroupIds = dep?.security_group_ids || [];
        const keyName = lab.ssh_key_name;

        const results = [];
        const errors = [];

        for (const device of pendingDevices) {
          try {
            const createParams = {
              lab_id,
              device_name: device.name,
              device_type: device.type,
              cpu_cores: device.cpu_cores || 2,
              ram_mb: device.ram_mb || 4096,
              storage_gb: device.storage_gb || 20,
              subnet_id: subnetId,
              security_group_ids: secGroupIds,
              region: deployRegion,
              ami_image_id: device.ami_image_id || null,
              key_name: keyName,
            };

            // Resolve AMI if it's a database ID
            if (createParams.ami_image_id && !createParams.ami_image_id.startsWith("ami-")) {
              try {
                const dbImage = await base44.asServiceRole.entities.LiveFireImage.filter({ id: createParams.ami_image_id }).then(r => r[0]);
                createParams.ami_image_id = dbImage?.ami_id || null;
              } catch { createParams.ami_image_id = null; }
            }

            const vmResult = await base44.functions.invoke("cloudProviderAWS", {
              action: "createVM",
              params: createParams,
            });
            const vmData = vmResult?.data || vmResult;

            if (vmData?.error) {
              errors.push({ device: device.name, error: vmData.message || vmData.error });
              continue;
            }

            const defaultUser = device.access_method === "rdp" ? "Administrator" : "ec2-user";
            await base44.asServiceRole.entities.LiveFireDevice.create({
              lab_id,
              name: device.name,
              device_type: device.type,
              instance_id: vmData?.instanceId || `i-pending-${device.name}`,
              public_ip: vmData?.publicIp || "",
              private_ip: vmData?.privateIp || "",
              status: "provisioning",
              cpu_cores: device.cpu_cores || 2,
              ram_mb: device.ram_mb || 4096,
              storage_gb: device.storage_gb || 20,
              position_x: device.position_x,
              position_y: device.position_y,
              connections: device.connections || [],
              access_method: device.access_method || "ssh",
              default_username: defaultUser,
              access_port: device.access_method === "rdp" ? 3389 : 22,
            });

            results.push({ device: device.name, instanceId: vmData.instanceId, status: "provisioning" });
          } catch (deviceError) {
            errors.push({ device: device.name, error: deviceError.message || String(deviceError) });
          }
        }

        // Poll for public IPs after a short delay
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          const freshDevices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });
          for (const device of freshDevices) {
            if (!device.instance_id || device.status !== "provisioning") continue;
            try {
              const statusResult = await base44.functions.invoke("cloudProviderAWS", {
                action: "getInstanceStatus",
                params: { instance_id: device.instance_id, region: deployRegion },
              });
              const statusData = statusResult?.data || statusResult;
              const publicIp = statusData?.publicIp || null;
              const state = statusData?.state || device.status;
              await base44.asServiceRole.entities.LiveFireDevice.update(device.id, {
                public_ip: publicIp || "",
                status: state === "running" ? "running" : "provisioning",
              });
            } catch { /* poll may fail, not critical */ }
          }
        }

        const allFailed = pendingDevices.length > 0 && results.length === 0;
        return Response.json({
          success: results.length > 0,
          deployed: results.length,
          pending: pendingDevices.length,
          errors: errors.length > 0 ? errors : undefined,
          devices: results,
          message: allFailed ? "All device deployments failed" : undefined,
        }, { status: allFailed ? 500 : 200 });
      }

      case "deleteDevice": {
        // Delete a single device: terminate EC2 instance (if deployed), remove DB record, remove from topology
        const { lab_id, device_id } = params;
        let lab = null;
        try {
          lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        } catch { /* invalid id format */ }
        if (!lab) return Response.json({ error: "Lab not found" }, { status: 404 });

        let device = null;
        try {
          device = await base44.asServiceRole.entities.LiveFireDevice.filter({ id: device_id, lab_id }).then(r => r[0]);
        } catch { /* device may already be deleted */ }
        if (!device) return Response.json({ error: "Device not found" }, { status: 404 });

        const region = lab?.region || "us-east-1";

        // 1. Terminate the EC2 instance if it exists
        if (device?.instance_id) {
          try {
            await base44.functions.invoke("cloudProviderAWS", {
              action: "deleteVM",
              params: { instance_id: device.instance_id, region },
            });
          } catch (e) {
            console.log(`[deleteDevice] Instance termination failed for ${device.instance_id}: ${e.message}`);
            // Continue anyway — the instance may already be gone; we still clean up the DB record
          }
        }

        // 2. Delete the LiveFireDevice record
        if (device?.id) {
          await base44.asServiceRole.entities.LiveFireDevice.delete(device.id);
        }

        // 3. Remove the device from topology_data.devices
        const topologyData = lab.topology_data || {};
        const updatedDevices = (topologyData.devices || []).filter(d =>
          d.name?.toLowerCase() !== device?.name?.toLowerCase()
        );
        await base44.asServiceRole.entities.LiveFireLab.update(lab_id, {
          topology_data: { ...topologyData, devices: updatedDevices },
          device_count: updatedDevices.length,
        });

        // 4. Audit log
        await base44.asServiceRole.entities.LiveFireAuditLog.create({
          user_id: user.id,
          user_email: user.email,
          action: "device_removed",
          resource_type: "device",
          resource_id: device_id,
          details: { lab_id, device_name: device?.name, instance_id: device?.instance_id },
        });

        return Response.json({ success: true, device_name: device?.name });
      }

      case "refreshDeviceStatus": {
        // Poll AWS for all device statuses and IPs for a running lab, then update DB records
        const { lab_id } = params;
        const devices = await base44.asServiceRole.entities.LiveFireDevice.filter({ lab_id });
        const lab = await base44.asServiceRole.entities.LiveFireLab.filter({ id: lab_id }).then(r => r[0]);
        const region = lab?.region || "us-east-1";
        const updates = [];

        for (const device of devices) {
          if (!device.instance_id || device.status === "terminated") continue;
          try {
            const statusResult = await base44.functions.invoke("cloudProviderAWS", {
              action: "getInstanceStatus",
              params: { instance_id: device.instance_id, region },
            });
            const statusData = statusResult?.data || statusResult;
            const publicIp = statusData?.publicIp || null;
            const state = statusData?.state || device.status;

            let newStatus = device.status;
            if (state === "running") newStatus = "running";
            else if (state === "stopped" || state === "stopping") newStatus = "stopped";
            else if (state === "terminated" || state === "shutting-down") newStatus = "terminated";

            const needsUpdate = publicIp !== device.public_ip || newStatus !== device.status;
            if (needsUpdate) {
              await base44.asServiceRole.entities.LiveFireDevice.update(device.id, {
                public_ip: publicIp || device.public_ip || "",
                status: newStatus,
              });
              updates.push({ device: device.name, publicIp, status: newStatus });
            }
          } catch (e) {
            console.log(`[refreshDeviceStatus] ${device.name}: ${e.message}`);
          }
        }

        return Response.json({ success: true, updated: updates.length, details: updates });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    // Extract meaningful error from Axios errors (function invoke failures)
    const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || String(error);
    console.error("[cloudOrchestrator] Unhandled error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
});