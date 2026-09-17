import React from "react";
import Icon from "@mdi/react";
import {
  mdiAccessPointNetwork,
  mdiCloudOutline,
  mdiConsoleLine,
  mdiCrosshairsGps,
  mdiDatabase,
  mdiDevices,
  mdiLaptop,
  mdiMonitor,
  mdiRouterNetwork,
  mdiSecurityNetwork,
  mdiServer,
  mdiShieldLockOutline,
  mdiSwitch,
  mdiWeb,
} from "@mdi/js";

const DEVICE_PATHS = {
  attacker: mdiCrosshairsGps,
  cloud: mdiCloudOutline,
  console: mdiConsoleLine,
  database: mdiDatabase,
  firewall: mdiShieldLockOutline,
  gateway: mdiSecurityNetwork,
  internet: mdiWeb,
  laptop: mdiLaptop,
  router: mdiRouterNetwork,
  server: mdiServer,
  siem: mdiConsoleLine,
  switch: mdiSwitch,
  wireless: mdiAccessPointNetwork,
  workstation: mdiMonitor,
};

export default function InfrastructureDeviceIcon({ type, className = "h-5 w-5", size = 1 }) {
  const path = DEVICE_PATHS[type] || mdiDevices;
  return <Icon path={path} size={size} className={className} aria-hidden="true" />;
}
