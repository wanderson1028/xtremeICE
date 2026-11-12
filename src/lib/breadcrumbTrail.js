/** App-wide breadcrumb map.
 *  Each entry is the ordered trail for a route: leading items are sections
 *  (plain text, or { label, to } when they have a page of their own) and the
 *  final item is the current page. Trails are resolved by exact path first,
 *  then by prefix, then by a prettified last segment.
 */

const DASHBOARD = { label: "Dashboard", to: "/EnvironmentHub" };
const CANDIDATE_ASSESSMENTS = { label: "Candidate Assessments", to: "/CandidateAssessments" };
const COURSE_LAB_BUILDER = { label: "Course Lab Builder", to: "/LabBuilderDashboard" };
const MSSP = { label: "MSSP SOC & SIEM", to: "/mssp-soc" };

// Routes that either render their own trail or are immersive and must stay chrome-free.
const SKIP = [/^\/cfrs(\/|$)/i, /^\/cci(\/|$)/i, /^\/labs\/microsoft-365$/i, /^\/candidate-assessment(\/|$)/i];

const TRAILS = {
  "/": ["Dashboard"],
  "/home": ["Dashboard"],
  "/environmenthub": ["Dashboard"],
  "/learnerworkspace": ["Assigned Labs"],
  "/about": ["About"],
  "/userguide": ["User Guide"],
  "/featureguide": ["Feature Guide"],
  "/adminpanel": ["Administration", "Admin Panel"],

  // Design
  "/networkwizard": ["Design", "New Design"],
  "/smartdesign": ["Design", "Smart Design"],
  "/reviewdesign": ["Design", "Review Design"],
  "/diagrampreview": ["Design", "Diagram Preview"],
  "/generatescript": ["Design", "Generate Script"],

  // Training
  "/virtuallabs": ["Training", "Virtual Labs"],
  "/interactivevirtuallabs": ["Training", "Active Labs"],
  "/training-catalog": ["Training", "Training Catalog"],
  "/labs": ["Training", "Labs"],
  "/labcourses": ["Training", "Lab Courses"],
  "/coursedashboard": ["Training", "Course Dashboard"],
  "/studentdashboard": ["Training", "Student Dashboard"],
  "/socsimulation": ["Training", "SOC Simulations", "SOC Simulation"],
  "/soc-training": ["Training", "SOC Simulations", "SOC Training"],
  "/real-attack-drills": ["Training", "SOC Simulations", "Real Attack Drills"],
  "/mssp-soc": ["Training", "SOC Simulations", "MSSP SOC & SIEM"],
  "/mssp-soc/session": ["Training", "SOC Simulations", MSSP, "Session"],
  "/tabletopexercises": ["Training", "TTX Tabletop Exercises"],
  "/ospflab": ["Training", "Training Simulations", "Cisco OSPF Lab"],
  "/eigrplab": ["Training", "Training Simulations", "Cisco EIGRP Lab"],
  "/firewalllab": ["Training", "Training Simulations", "Multi-Vendor Firewall Lab"],
  "/lab-leaderboard-detail": ["Training", "Leaderboard"],

  // Live Fire
  "/livefiredashboard": ["Live Fire", "Live Fire Dashboard"],
  "/livefire": ["Live Fire", "Cyber Range"],
  "/my-labs": ["Live Fire", "My Labs"],
  "/shared-labs": ["Live Fire", "Shared Labs"],
  "/running-labs": ["Live Fire", "Running Labs"],
  "/lf-templates": ["Live Fire", "Templates"],
  "/image-repository": ["Live Fire", "Image Repository"],
  "/marketplace": ["Live Fire", "Marketplace"],
  "/cloud-resources": ["Live Fire", "Cloud Resources"],
  "/lf-administration": ["Live Fire", "Administration"],
  "/operatoralerts": ["Live Fire", "Operator Alerts"],
  "/live-lab-topology": ["Live Fire", "Live Lab Topology"],
  "/lab-creation-wizard": ["Live Fire", "Lab Creation Wizard"],
  "/cybereventbuilder": ["Live Fire", "Red vs Blue", "Event Builder"],

  // Special features
  "/labbuilderdashboard": ["Special Features", "Course Lab Builder"],
  "/labtemplates": ["Special Features", COURSE_LAB_BUILDER, "Lab Templates"],
  "/labbuilder": ["Special Features", COURSE_LAB_BUILDER, "Lab Builder"],
  "/labinstances": ["Special Features", "Lab Instances"],
  "/labenvironments": ["Special Features", "Lab Environments"],
  "/labexports": ["Special Features", "Lab Exports"],
  "/labassignments": ["Special Features", "Lab Assignments"],
  "/nicemapping": ["Special Features", "NICE Mapping"],
  "/quickbuild": ["Special Features", "Quick Build"],
  "/networklabdesigner": ["Special Features", "Network Lab Designer"],
  "/visualdesigneditor": ["Special Features", "Visual Design Editor"],
  "/demo": ["Special Features", "Demo"],
  "/demomode": ["Special Features", "Demo"],
  "/lifecyclediagnostics": ["Special Features", "Lifecycle Diagnostics"],
  "/cloudlearnerpoc": ["Special Features", "Cloud Learner"],

  // Candidate assessments
  "/candidateassessments": ["Special Features", "Candidate Assessments"],
  "/candidate-dashboard": ["Special Features", CANDIDATE_ASSESSMENTS, "Candidate Dashboard"],
  "/create-assessment": ["Special Features", CANDIDATE_ASSESSMENTS, "New Assessment"],
  "/application-test-builder": ["Special Features", CANDIDATE_ASSESSMENTS, "Application Test Builder"],
  "/assessment-detail": ["Special Features", CANDIDATE_ASSESSMENTS, "Assessment"],
  "/invite-candidate": ["Special Features", CANDIDATE_ASSESSMENTS, "Invite Candidate"],
  "/bulk-invite": ["Special Features", CANDIDATE_ASSESSMENTS, "Bulk Invite"],
  "/scorecard": ["Special Features", CANDIDATE_ASSESSMENTS, "Scorecard"],
};

const COURSE_LAB_LABELS = {
  "social-engineering": "Social Engineering & Phishing",
  "digital-forensics": "Digital Forensics & IR",
  "cybersecurity-essentials": "Cybersecurity Essentials",
  cryptography: "Introduction to Cryptography",
  "password-attacks": "Password Attacks",
  "web-app-pentest": "Web App Penetration Testing",
  "network-traffic-analysis": "Network Traffic Analysis",
  "network-security-monitoring": "Network Security Monitoring",
  "vulnerability-assessment": "Vulnerability Assessment",
  siem: "SIEM Operations & Threat Hunting",
  "firewall-evasion": "Firewall Evasion",
  "endpoint-detection": "Endpoint Detection & Response",
  "cloud-incident-response": "Cloud Incident Response",
  "linux-hardening": "Linux Server Hardening",
  devsecops: "DevSecOps Pipeline Security",
  "wireless-exploitation": "Wireless Exploitation",
  "log-correlation": "Log Aggregation & Correlation",
  bgp: "BGP",
  "zero-trust": "Zero Trust Architecture",
  "aws-cloud-concepts": "AWS Cloud Concepts",
  "aws-security-compliance": "AWS Security & Compliance",
  "aws-cloud-services": "AWS Cloud Technology & Services",
  "aws-billing-pricing": "AWS Billing & Pricing",
  "aif-ml-fundamentals": "ML Fundamentals",
  "aif-gen-ml-fundamentals": "Generative ML Fundamentals",
  "aif-foundation-models": "Foundation Models",
  "aif-responsible-ml": "Responsible ML",
  "aif-security-governance": "Security & Governance for ML",
  "secplus-domain1": "Security+ D1: General Security Concepts",
  "secplus-domain2": "Security+ D2: Threats & Vulnerabilities",
  "secplus-domain3": "Security+ D3: Security Architecture",
  "secplus-domain4": "Security+ D4: Security Operations",
  "secplus-domain5": "Security+ D5: Program Management",
  "netplus-domain1": "Network+ D1: Networking Concepts",
  "netplus-domain2": "Network+ D2: Network Implementation",
  "netplus-domain3": "Network+ D3: Network Operations",
  "netplus-domain4": "Network+ D4: Network Security",
  "netplus-domain5": "Network+ D5: Troubleshooting",
  "az900-domain1": "AZ-900 D1: Cloud Concepts",
  "az900-domain2": "AZ-900 D2: Azure Core Services",
  "az900-domain3": "AZ-900 D3: Architecture & Solutions",
  "az900-domain4": "AZ-900 D4: Management & Governance",
  "az900-domain5": "AZ-900 D5: Security & Compliance",
};

const LINUX_LAB_LABELS = {
  filesystem: "File System Navigation",
  permissions: "File Permissions",
  packages: "Package Management",
  users: "User & Group Management",
  text: "Text Processing",
  networking: "Networking Essentials",
  services: "Service Management",
  scripting: "Bash Scripting",
  sysadmin: "System Administration",
  ssh: "SSH & Remote Access",
};

const POWERSHELL_LAB_LABELS = {
  "ps-basics": "Basics & Navigation",
  "ps-variables": "Variables & the Pipeline",
  "ps-files": "File & Directory Operations",
  "ps-processes": "Process & Service Management",
  "ps-users": "Local User & Group Management",
  "ps-scripting": "Scripting Fundamentals",
  "ps-registry": "Registry Operations",
  "ps-eventlogs": "Event Log Analysis",
  "ps-networking": "Network Configuration",
  "ps-remoting": "Remoting & WMI",
};

Object.entries(COURSE_LAB_LABELS).forEach(([slug, label]) => {
  TRAILS[`/labs/${slug}`] = ["Training", "Training Simulations", label];
});
Object.entries(LINUX_LAB_LABELS).forEach(([slug, label]) => {
  TRAILS[`/linux-labs/${slug}`] = ["Training", "Training Simulations", "Linux Labs", label];
});
Object.entries(POWERSHELL_LAB_LABELS).forEach(([slug, label]) => {
  TRAILS[`/windows-labs/${slug}`] = ["Training", "Training Simulations", "Windows PowerShell Labs", label];
});

const PREFIXED = {
  "/eventview": ["Live Fire", "Red vs Blue", "Event Detail"],
  "/az900-dashboard": ["Training", "Training Simulations", "AZ-900 Dashboard"],
};

function pretty(segment) {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Returns the ordered trail for a pathname: [{ label, to? }], last item is the current page. */
export function getBreadcrumbTrail(pathname) {
  const raw = pathname || "/";
  if (SKIP.some((pattern) => pattern.test(raw))) return [];

  const path = raw.replace(/\/+$/, "") || "/";
  const key = path.toLowerCase();

  const nodes = TRAILS[key] || PREFIXED[Object.keys(PREFIXED).find((prefix) => key.startsWith(prefix))];

  if (!nodes) {
    const segment = path.split("/").filter(Boolean).pop();
    return segment ? [DASHBOARD, { label: pretty(segment) }] : [DASHBOARD];
  }

  const trail = nodes.map((node) => (typeof node === "string" ? { label: node } : node));
  const first = trail[0]?.label?.toLowerCase();
  return first === "dashboard" ? trail : [DASHBOARD, ...trail];
}