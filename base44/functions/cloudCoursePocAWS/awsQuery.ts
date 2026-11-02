import { XMLParser } from "npm:fast-xml-parser";

const REGION = "us-east-1";
const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
const arrays = (value: any): any[] => value == null ? [] : Array.isArray(value) ? value : [value];
const tags = (item: any) => arrays(item?.tagSet?.item).map((tag) => ({ Key: tag.key, Value: tag.value }));

const names: Record<string, string> = {
  TagSpecifications: "TagSpecification", Tags: "Tag", Owners: "Owner",
  Filters: "Filter", Values: "Value", InstanceIds: "InstanceId",
  GroupIds: "GroupId", SubnetIds: "SubnetId", VpcIds: "VpcId",
  NetworkInterfaces: "NetworkInterface", Groups: "SecurityGroupId",
  BlockDeviceMappings: "BlockDeviceMapping",
};
function flatten(value: any, prefix = "", output: Record<string, string> = {}) {
  for (const [key, item] of Object.entries(value || {})) {
    if (item === undefined || item === null) continue;
    const path = prefix ? `${prefix}.${names[key] || key}` : names[key] || key;
    if (Array.isArray(item)) {
      item.forEach((entry, index) => {
        const itemPath = `${path}.${index + 1}`;
        if (entry && typeof entry === "object") flatten(entry, itemPath, output);
        else output[itemPath] = String(entry);
      });
    } else if (typeof item === "object") flatten(item, path, output);
    else output[path] = String(item);
  }
  return output;
}
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function hmac(key: string | Uint8Array, value: string) {
  const bytes = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const secret = await crypto.subtle.importKey("raw", bytes as unknown as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", secret, new TextEncoder().encode(value)));
}
async function signedQuery(service: "ec2" | "sts", action: string, input: any) {
  const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  if (!accessKey || !secretKey) throw Object.assign(new Error("AWS keys are not configured"), { name: "AWS_KEYS_MISSING" });
  const host = `${service}.${REGION}.amazonaws.com`;
  const query: Record<string, string> = { Action: action, Version: service === "ec2" ? "2016-11-15" : "2011-06-15", ...flatten(input) };
  const sorted = Object.keys(query).sort().map((key) => `${encode(key)}=${encode(query[key])}`).join("&");
  const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = stamp.slice(0, 8);
  const scope = `${date}/${REGION}/${service}/aws4_request`;
  const canonical = `GET\n/\n${sorted}\nhost:${host}\nx-amz-date:${stamp}\n\nhost;x-amz-date\n${await sha256("")}`;
  const toSign = `AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${await sha256(canonical)}`;
  let key = await hmac(`AWS4${secretKey}`, date);
  key = await hmac(key, REGION);
  key = await hmac(key, service);
  key = await hmac(key, "aws4_request");
  const signature = Array.from(await hmac(key, toSign)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const response = await fetch(`https://${host}/?${sorted}`, {
    headers: { "Host": host, "X-Amz-Date": stamp, "Authorization": `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=host;x-amz-date, Signature=${signature}` },
  });
  const raw = await response.text();
  if (!response.ok) {
    const parsed = parser.parse(raw);
    const detail = parsed.Response?.Errors?.Error || parsed.ErrorResponse?.Error || {};
    const name = String(detail.Code || `HTTP_${response.status}`);
    throw Object.assign(new Error(String(detail.Message || "AWS request failed").slice(0, 300)), { name });
  }
  return parser.parse(raw);
}
class QueryCommand {
  action: string;
  input: any;
  constructor(action: string, input: any) { this.action = action; this.input = input; }
}
export class CreateVpcCommand extends QueryCommand { constructor(input: any) { super("CreateVpc", input); } }
export class CreateSubnetCommand extends QueryCommand { constructor(input: any) { super("CreateSubnet", input); } }
export class CreateSecurityGroupCommand extends QueryCommand { constructor(input: any) { super("CreateSecurityGroup", input); } }
export class RevokeSecurityGroupEgressCommand extends QueryCommand { constructor(input: any) { super("RevokeSecurityGroupEgress", input); } }
export class RunInstancesCommand extends QueryCommand { constructor(input: any) { super("RunInstances", input); } }
export class DescribeImagesCommand extends QueryCommand { constructor(input: any) { super("DescribeImages", input); } }
export class DescribeInstanceTypeOfferingsCommand extends QueryCommand { constructor(input: any) { super("DescribeInstanceTypeOfferings", input); } }
export class DescribeInstancesCommand extends QueryCommand { constructor(input: any) { super("DescribeInstances", input); } }
export class GetConsoleOutputCommand extends QueryCommand { constructor(input: any) { super("GetConsoleOutput", input); } }
export class TerminateInstancesCommand extends QueryCommand { constructor(input: any) { super("TerminateInstances", input); } }
export class DeleteSecurityGroupCommand extends QueryCommand { constructor(input: any) { super("DeleteSecurityGroup", input); } }
export class DeleteSubnetCommand extends QueryCommand { constructor(input: any) { super("DeleteSubnet", input); } }
export class DeleteVpcCommand extends QueryCommand { constructor(input: any) { super("DeleteVpc", input); } }
export class DescribeVpcsCommand extends QueryCommand { constructor(input: any) { super("DescribeVpcs", input); } }
export class DescribeSubnetsCommand extends QueryCommand { constructor(input: any) { super("DescribeSubnets", input); } }
export class DescribeSecurityGroupsCommand extends QueryCommand { constructor(input: any) { super("DescribeSecurityGroups", input); } }
export class GetCallerIdentityCommand extends QueryCommand { constructor(input: any) { super("GetCallerIdentity", input); } }

export class EC2Client {
  async send(command: QueryCommand): Promise<any> {
    const parsed = await signedQuery("ec2", command.action, command.input);
    const root = parsed[`${command.action}Response`] || {};
    switch (command.action) {
      case "CreateVpc": return { Vpc: { VpcId: root.vpc?.vpcId } };
      case "CreateSubnet": return { Subnet: { SubnetId: root.subnet?.subnetId } };
      case "CreateSecurityGroup": return { GroupId: root.groupId };
      case "RunInstances": return { Instances: arrays(root.instancesSet?.item).map((item) => ({ InstanceId: item.instanceId })) };
      case "DescribeImages": return { Images: arrays(root.imagesSet?.item).map((item) => ({ ImageId: item.imageId, CreationDate: item.creationDate })) };
      case "DescribeInstanceTypeOfferings": return { Offerings: arrays(root.instanceTypeOfferingSet?.item).map((item) => ({ Location: item.location })) };
      case "DescribeInstances": return { Reservations: arrays(root.reservationSet?.item).map((reservation) => ({
        Instances: arrays(reservation.instancesSet?.item).map((item) => ({ State: { Name: item.instanceState?.name }, Tags: tags(item) })),
      })) };
      case "GetConsoleOutput": return { Output: root.output || "" };
      case "DescribeVpcs": return { Vpcs: arrays(root.vpcSet?.item).map((item) => ({ Tags: tags(item) })) };
      case "DescribeSubnets": return { Subnets: arrays(root.subnetSet?.item).map((item) => ({ Tags: tags(item) })) };
      case "DescribeSecurityGroups": return { SecurityGroups: arrays(root.securityGroupInfo?.item).map((item) => ({ Tags: tags(item) })) };
      default: return {};
    }
  }
}
export class STSClient {
  async send(command: QueryCommand): Promise<any> {
    const parsed = await signedQuery("sts", command.action, command.input);
    return { Account: parsed.GetCallerIdentityResponse?.GetCallerIdentityResult?.Account || null };
  }
}
