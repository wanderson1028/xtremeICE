// Firewall Hardening Lab — Network Topology
// A 3-zone network: Management (10.10.10.0/24), DMZ (172.16.0.0/24), Internet (0.0.0.0/0)

export const ZONES = {
  mgmt:     { name: "Management",  subnet: "10.10.10.0/24",  color: "#22c55e" },
  dmz:      { name: "DMZ",         subnet: "172.16.0.0/24",  color: "#f59e0b" },
  internet: { name: "Internet",    subnet: "0.0.0.0/0",      color: "#ef4444" },
};

// The hardening objectives that all vendors share
export const HARDENING_OBJECTIVES = [
  {
    id: "block_telnet",
    label: "Block Telnet (port 23) from Internet",
    tier: 1,
    description: "Deny all TCP port 23 traffic originating from the Internet zone.",
  },
  {
    id: "allow_ssh_mgmt",
    label: "Allow SSH (port 22) from Management only",
    tier: 1,
    description: "Permit TCP port 22 from 10.10.10.0/24, deny from all other sources.",
  },
  {
    id: "allow_http_dmz",
    label: "Allow HTTP/HTTPS to DMZ web server",
    tier: 2,
    description: "Permit TCP 80 and 443 from Internet to 172.16.0.10.",
  },
  {
    id: "block_icmp_internet",
    label: "Block ICMP from Internet to Internal",
    tier: 2,
    description: "Deny ICMP echo-request from Internet zone to Management and DMZ.",
  },
  {
    id: "enable_stateful",
    label: "Enable stateful inspection",
    tier: 3,
    description: "Configure the firewall to track established/related connections.",
  },
  {
    id: "deny_all_implicit",
    label: "Implicit deny-all at end of policy",
    tier: 3,
    description: "Ensure a catch-all deny rule exists at the bottom of the policy.",
  },
];