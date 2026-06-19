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

        // Deploy VPC and network infrastructure using topology's VPC config
        const vpcConfig = topology_data?.vpcConfig || {};
        const deployRegion = lab.region || "us-east-1";
        const deployCidr = vpcConfig.cidr || "10.1.0.0/16";

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
        let effectiveCidr = deployCidr;
        if (cidrCheckData?.check?.conflict) {
          effectiveCidr = cidrCheckData.suggested_cidr || "10.100.0.0/16";
          console.log(`CIDR ${deployCidr} conflicts — auto-selected ${effectiveCidr}`);
        }

        // Fix subnet zones to match deployment region (topology may have different region zones)
        const rawSubnets = vpcConfig.subnets || [];
        const fixedSubnets = rawSubnets.map(s => ({
          ...s,
          zone: s.zone?.replace(/^[a-z]+-[a-z]+-\d+/, deployRegion) || `${deployRegion}a`,
        }));

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
            },
          });
          console.log("[deployLab] Step 2 OK");
        } catch (e) {
          console.error("[deployLab] Step 2 FAILED:", e.message);
          throw e;
        }

        const networkData = networkResult?.data || networkResult;

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
              },
            });

            const responseData = result?.data || result;
            if (responseData?.error) {
              deviceErrors.push({ device: device.name, error: responseData.message || responseData.error });
              continue;
            }

            deployedDevices.push(responseData);

            // Update device record in database
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
            });
          } catch (deviceError) {
            deviceErrors.push({ device: device.name, error: deviceError.message || String(deviceError) });
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
          cidr_auto_resolved: effectiveCidr !== deployCidr,
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