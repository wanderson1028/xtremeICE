// EIGRP Topology Data — 6-router star/ring hybrid

export const TOPOLOGY = {
  links: [
    { a: "R1", b: "R2", subnet: "10.1.12.0/30", aIface: "G0/0", bIface: "G0/0", aIp: "10.1.12.1", bIp: "10.1.12.2" },
    { a: "R1", b: "R3", subnet: "10.1.13.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.1.13.1", bIp: "10.1.13.2" },
    { a: "R1", b: "R4", subnet: "10.1.14.0/30", aIface: "G0/2", bIface: "G0/0", aIp: "10.1.14.1", bIp: "10.1.14.2" },
    { a: "R2", b: "R5", subnet: "10.1.25.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.1.25.1", bIp: "10.1.25.2" },
    { a: "R3", b: "R5", subnet: "10.1.35.0/30", aIface: "G0/1", bIface: "G0/1", aIp: "10.1.35.1", bIp: "10.1.35.2" },
    { a: "R4", b: "R6", subnet: "10.1.46.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.1.46.1", bIp: "10.1.46.2" },
    { a: "R5", b: "R6", subnet: "10.1.56.0/30", aIface: "G0/2", bIface: "G0/1", aIp: "10.1.56.1", bIp: "10.1.56.2" },
  ],
};

export const ROUTER_POSITIONS = {
  R1: { x: 300, y: 200 },
  R2: { x: 150, y: 100 },
  R3: { x: 150, y: 300 },
  R4: { x: 450, y: 100 },
  R5: { x: 160, y: 410 },
  R6: { x: 450, y: 380 },
};

export const ROUTER_INTERFACES = {
  R1: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.1.12.1", mask: "255.255.255.252", neighbor: "R2" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.1.13.1", mask: "255.255.255.252", neighbor: "R3" },
    { iface: "GigabitEthernet0/2", short: "G0/2", ip: "10.1.14.1", mask: "255.255.255.252", neighbor: "R4" },
    { iface: "Loopback0", short: "Lo0", ip: "1.1.1.1", mask: "255.255.255.255", neighbor: null },
  ],
  R2: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.1.12.2", mask: "255.255.255.252", neighbor: "R1" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.1.25.1", mask: "255.255.255.252", neighbor: "R5" },
    { iface: "Loopback0", short: "Lo0", ip: "2.2.2.2", mask: "255.255.255.255", neighbor: null },
  ],
  R3: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.1.13.2", mask: "255.255.255.252", neighbor: "R1" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.1.35.1", mask: "255.255.255.252", neighbor: "R5" },
    { iface: "Loopback0", short: "Lo0", ip: "3.3.3.3", mask: "255.255.255.255", neighbor: null },
  ],
  R4: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.1.14.2", mask: "255.255.255.252", neighbor: "R1" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.1.46.1", mask: "255.255.255.252", neighbor: "R6" },
    { iface: "Loopback0", short: "Lo0", ip: "4.4.4.4", mask: "255.255.255.255", neighbor: null },
  ],
  R5: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.1.25.2", mask: "255.255.255.252", neighbor: "R2" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.1.35.2", mask: "255.255.255.252", neighbor: "R3" },
    { iface: "GigabitEthernet0/2", short: "G0/2", ip: "10.1.56.1", mask: "255.255.255.252", neighbor: "R6" },
    { iface: "Loopback0", short: "Lo0", ip: "5.5.5.5", mask: "255.255.255.255", neighbor: null },
  ],
  R6: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.1.46.2", mask: "255.255.255.252", neighbor: "R4" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.1.56.2", mask: "255.255.255.252", neighbor: "R5" },
    { iface: "Loopback0", short: "Lo0", ip: "6.6.6.6", mask: "255.255.255.255", neighbor: null },
  ],
};

export const LOOPBACKS = {
  R1: "1.1.1.1", R2: "2.2.2.2", R3: "3.3.3.3",
  R4: "4.4.4.4", R5: "5.5.5.5", R6: "6.6.6.6",
};

export const NEIGHBORS = {
  R1: ["R2", "R3", "R4"],
  R2: ["R1", "R5"],
  R3: ["R1", "R5"],
  R4: ["R1", "R6"],
  R5: ["R2", "R3", "R6"],
  R6: ["R4", "R5"],
};