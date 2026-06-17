// OSPF Topology Data

export const TOPOLOGY = {
  links: [
    { a: "R1", b: "R2", subnet: "10.0.12.0/30", aIface: "G0/0", bIface: "G0/0", aIp: "10.0.12.1", bIp: "10.0.12.2" },
    { a: "R1", b: "R3", subnet: "10.0.13.0/30", aIface: "G0/1", bIface: "G0/1", aIp: "10.0.13.1", bIp: "10.0.13.2" },
    { a: "R1", b: "R8", subnet: "10.0.18.0/30", aIface: "G0/2", bIface: "G0/1", aIp: "10.0.18.2", bIp: "10.0.18.1" },
    { a: "R2", b: "R3", subnet: "10.0.23.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.0.23.1", bIp: "10.0.23.2" },
    { a: "R3", b: "R4", subnet: "10.0.34.0/30", aIface: "G0/2", bIface: "G0/0", aIp: "10.0.34.1", bIp: "10.0.34.2" },
    { a: "R4", b: "R5", subnet: "10.0.45.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.0.45.1", bIp: "10.0.45.2" },
    { a: "R5", b: "R6", subnet: "10.0.56.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.0.56.1", bIp: "10.0.56.2" },
    { a: "R6", b: "R7", subnet: "10.0.67.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.0.67.1", bIp: "10.0.67.2" },
    { a: "R7", b: "R8", subnet: "10.0.78.0/30", aIface: "G0/1", bIface: "G0/0", aIp: "10.0.78.1", bIp: "10.0.78.2" },
  ],
};

// Router positions for SVG diagram (cx, cy)
export const ROUTER_POSITIONS = {
  R1: { x: 300, y: 150 },
  R2: { x: 160, y: 80 },
  R3: { x: 160, y: 220 },
  R4: { x: 80,  y: 320 },
  R5: { x: 160, y: 420 },
  R6: { x: 300, y: 480 },
  R7: { x: 440, y: 420 },
  R8: { x: 520, y: 220 },
};

// Per-router interface config
export const ROUTER_INTERFACES = {
  R1: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.12.1", mask: "255.255.255.252", neighbor: "R2" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.13.1", mask: "255.255.255.252", neighbor: "R3" },
    { iface: "GigabitEthernet0/2", short: "G0/2", ip: "10.0.18.2", mask: "255.255.255.252", neighbor: "R8" },
    { iface: "Loopback0",          short: "Lo0",  ip: "1.1.1.1",   mask: "255.255.255.255", neighbor: null },
  ],
  R2: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.12.2", mask: "255.255.255.252", neighbor: "R1" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.23.1", mask: "255.255.255.252", neighbor: "R3" },
    { iface: "Loopback0",          short: "Lo0",  ip: "2.2.2.2",   mask: "255.255.255.255", neighbor: null },
  ],
  R3: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.23.2", mask: "255.255.255.252", neighbor: "R2" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.13.2", mask: "255.255.255.252", neighbor: "R1" },
    { iface: "GigabitEthernet0/2", short: "G0/2", ip: "10.0.34.1", mask: "255.255.255.252", neighbor: "R4" },
    { iface: "Loopback0",          short: "Lo0",  ip: "3.3.3.3",   mask: "255.255.255.255", neighbor: null },
  ],
  R4: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.34.2", mask: "255.255.255.252", neighbor: "R3" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.45.1", mask: "255.255.255.252", neighbor: "R5" },
    { iface: "Loopback0",          short: "Lo0",  ip: "4.4.4.4",   mask: "255.255.255.255", neighbor: null },
  ],
  R5: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.45.2", mask: "255.255.255.252", neighbor: "R4" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.56.1", mask: "255.255.255.252", neighbor: "R6" },
    { iface: "Loopback0",          short: "Lo0",  ip: "5.5.5.5",   mask: "255.255.255.255", neighbor: null },
  ],
  R6: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.56.2", mask: "255.255.255.252", neighbor: "R5" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.67.1", mask: "255.255.255.252", neighbor: "R7" },
    { iface: "Loopback0",          short: "Lo0",  ip: "6.6.6.6",   mask: "255.255.255.255", neighbor: null },
  ],
  R7: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.67.2", mask: "255.255.255.252", neighbor: "R6" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.78.1", mask: "255.255.255.252", neighbor: "R8" },
    { iface: "Loopback0",          short: "Lo0",  ip: "7.7.7.7",   mask: "255.255.255.255", neighbor: null },
  ],
  R8: [
    { iface: "GigabitEthernet0/0", short: "G0/0", ip: "10.0.78.2", mask: "255.255.255.252", neighbor: "R7" },
    { iface: "GigabitEthernet0/1", short: "G0/1", ip: "10.0.18.1", mask: "255.255.255.252", neighbor: "R1" },
    { iface: "Loopback0",          short: "Lo0",  ip: "8.8.8.8",   mask: "255.255.255.255", neighbor: null },
  ],
};

export const LOOPBACKS = {
  R1: "1.1.1.1", R2: "2.2.2.2", R3: "3.3.3.3", R4: "4.4.4.4",
  R5: "5.5.5.5", R6: "6.6.6.6", R7: "7.7.7.7", R8: "8.8.8.8",
};

export const NEIGHBORS = {
  R1: ["R2", "R3", "R8"],
  R2: ["R1", "R3"],
  R3: ["R1", "R2", "R4"],
  R4: ["R3", "R5"],
  R5: ["R4", "R6"],
  R6: ["R5", "R7"],
  R7: ["R6", "R8"],
  R8: ["R7", "R1"],
};