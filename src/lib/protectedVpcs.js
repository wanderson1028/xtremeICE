// VPCs that must never be modified or deleted unless an admin explicitly acknowledges.
// Each entry: { vpcId, region, reason }
export const PROTECTED_VPCS = [
  { vpcId: "vpc-01a9967b30a72ffa6", region: "us-west-2", reason: "Production VPC — admin acknowledgment required" },
  { vpcId: "vpc-0f54ea2e61b429034", region: "us-west-2", reason: "Production VPC — admin acknowledgment required" },
  { vpcId: "vpc-046420cc1460d218f", region: "us-west-2", reason: "Production VPC — admin acknowledgment required" },
];

export const PROTECTED_VPC_IDS = PROTECTED_VPCS.map(v => v.vpcId);

export function isVpcProtected(vpcId, region) {
  return PROTECTED_VPCS.some(v => v.vpcId === vpcId && (!region || v.region === region));
}

export function getProtectedVpcReason(vpcId) {
  const entry = PROTECTED_VPCS.find(v => v.vpcId === vpcId);
  return entry?.reason || null;
}