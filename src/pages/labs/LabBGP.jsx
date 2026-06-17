import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    label: "Configure BGP on Router 1 (AS 65001)",
    command: "router bgp 65001\n bgp router-id 1.1.1.1\n neighbor 10.0.12.2 remote-as 65002\n network 192.168.1.0 mask 255.255.255.0",
    expectedOutput: "BGP router 65001 configured | Neighbor 10.0.12.2 remote-as 65002 | Network 192.168.1.0 advertised",
    hint: "Enter BGP configuration mode and define the AS number, router ID, peer, and network to advertise.",
    securityInsight: "BGP uses AS numbers to identify routing domains. The router-id uniquely identifies this BGP speaker. Without authentication, BGP sessions are vulnerable to hijacking (BGP prefix hijack).",
  },
  {
    label: "Configure BGP on Router 2 (AS 65002)",
    command: "router bgp 65002\n bgp router-id 2.2.2.2\n neighbor 10.0.12.1 remote-as 65001\n network 192.168.2.0 mask 255.255.255.0",
    expectedOutput: "BGP router 65002 configured | Neighbor 10.0.12.1 remote-as 65001 | Network 192.168.2.0 advertised",
    hint: "Mirror the BGP configuration on Router 2, referencing Router 1 as the peer.",
    securityInsight: "Both peers must reference each other with matching remote-as values. A mismatch in AS numbers is the most common BGP peering failure cause.",
  },
  {
    label: "Verify BGP Peering",
    command: "show bgp neighbors 10.0.12.2 | include BGP state",
    expectedOutput: "BGP state = Established, up for 00:02:41 | Prefixes received: 1",
    hint: "Confirm the BGP session has moved from Active/Connect to the Established state.",
    securityInsight: "The BGP Established state means the TCP session is up and OPEN/KEEPALIVE messages have been exchanged. Sessions stuck in Active state indicate a reachability or authentication problem.",
  },
  {
    label: "Apply Route Policy with Prefix List",
    command: "ip prefix-list FILTER-OUT seq 5 deny 10.0.0.0/8 le 32\nip prefix-list FILTER-OUT seq 10 permit 0.0.0.0/0 le 32\nrouter bgp 65001\n neighbor 10.0.12.2 prefix-list FILTER-OUT out",
    expectedOutput: "Prefix-list FILTER-OUT applied outbound to neighbor 10.0.12.2 | Private RFC1918 routes suppressed",
    hint: "Create a prefix list to block advertisement of RFC 1918 private routes to the BGP peer.",
    securityInsight: "Advertising private address space to external BGP peers is a misconfiguration that wastes table space and can cause routing loops. Prefix lists are the standard enforcement mechanism.",
  },
  {
    label: "Enable BGP MD5 Authentication",
    command: "router bgp 65001\n neighbor 10.0.12.2 password Str0ng$ecret!\nrouter bgp 65002\n neighbor 10.0.12.1 password Str0ng$ecret!",
    expectedOutput: "MD5 authentication enabled | Neighbor 10.0.12.2 session remains Established | TCP MD5 signature applied",
    hint: "Enable MD5 authentication on the BGP session to protect against session hijacking.",
    securityInsight: "BGP MD5 authentication (RFC 2385) adds a cryptographic signature to each TCP segment. While not perfect, it prevents simple session injection attacks. Modern deployments should also use RPKI for route origin validation.",
  },
];

export default function LabBGP() {
  return (
    <LabRunner
      title="BGP Border Gateway Protocol"
      difficulty="Advanced"
      duration={70}
      category="Routing"
      tags={["BGP", "Cisco IOS", "AS", "Prefix List", "Route Policy", "MD5"]}
      objectives={[
        "Establish an eBGP peering session between two autonomous systems",
        "Verify BGP session state and prefix advertisement",
        "Apply outbound route policies using prefix lists",
        "Enable MD5 session authentication to prevent BGP hijacking",
      ]}
      prerequisites={["Cisco IOS CLI basics", "Understanding of IP routing and subnetting", "Completion of OSPF or EIGRP lab recommended"]}
      steps={steps}
    />
  );
}