/**
 * NICE Cybersecurity Workforce Framework v2.2.0
 * Default seed dataset — exclusive source of truth for this workspace.
 */

export const NICE_VERSION = "2.2.0";

export const NICE_CATEGORIES = [
  {
    id: "SP",
    code: "Securely Provision",
    name: "Securely Provision",
    description: "Conceptualizes, designs, procures, and/or builds secure information technology (IT) systems, with responsibility for aspects of system development and/or acquisition.",
  },
  {
    id: "OM",
    code: "Operate and Maintain",
    name: "Operate and Maintain",
    description: "Provides the support, administration, and maintenance necessary to ensure effective and efficient information technology (IT) system performance and security.",
  },
  {
    id: "OV",
    code: "Oversee and Govern",
    name: "Oversee and Govern",
    description: "Provides leadership, management, direction, or development and advocacy so the organization may effectively conduct cybersecurity work.",
  },
  {
    id: "PD",
    code: "Protect and Defend",
    name: "Protect and Defend",
    description: "Identifies, analyzes, and mitigates threats to internal information technology (IT) systems and/or networks.",
  },
  {
    id: "AN",
    code: "Analyze",
    name: "Analyze",
    description: "Performs highly specialized review and evaluation of incoming cybersecurity information to determine its usefulness for intelligence.",
  },
  {
    id: "CO",
    code: "Collect and Operate",
    name: "Collect and Operate",
    description: "Collects, exploits, analyzes, and/or operates on specialized information systems and operations.",
  },
  {
    id: "IN",
    code: "Investigate",
    name: "Investigate",
    description: "Investigates, tracks, attributes, and dismantles cyber threats through the application of forensics, investigative techniques, and analytic methodologies.",
  },
];

export const NICE_WORK_ROLES = [
  // Securely Provision
  { id: "SP-DEV-001", category: "Securely Provision", name: "Software Developer", description: "Develops, creates, maintains, and writes/codes new (or modifies existing) computer applications, software, or specialized utility programs." },
  { id: "SP-ARC-001", category: "Securely Provision", name: "Enterprise Architect", description: "Develops and maintains capability architecture artifacts and provides enterprise architecture support." },
  { id: "SP-SYS-001", category: "Securely Provision", name: "Systems Security Architect", description: "Designs, develops, and maintains secure systems and system components." },
  { id: "SP-RSK-001", category: "Securely Provision", name: "Security Control Assessor", description: "Conducts independent assessments of information systems to verify security controls are effective." },
  { id: "SP-TRN-001", category: "Securely Provision", name: "Research & Development Specialist", description: "Conducts research and development to create new or improved cyber capabilities." },
  { id: "SP-POL-001", category: "Securely Provision", name: "Cyber Policy and Strategy Planner", description: "Develops and maintains cyber strategy, policy, and governance frameworks." },
  { id: "SP-DEV-002", category: "Securely Provision", name: "Information Systems Security Developer", description: "Integrates security into information systems and develops security-enabled applications." },

  // Operate and Maintain
  { id: "OM-ADM-001", category: "Operate and Maintain", name: "System Administrator", description: "Administers, maintains, and supports information technology systems and infrastructure." },
  { id: "OM-NET-001", category: "Operate and Maintain", name: "Network Operations Specialist", description: "Plans, implements, and operates network systems and services." },
  { id: "OM-DBA-001", category: "Operate and Maintain", name: "Database Administrator", description: "Administers, maintains, and secures database management systems." },
  { id: "OM-PRJ-001", category: "Operate and Maintain", name: "IT Project Manager", description: "Plans, executes, and manages information technology projects and initiatives." },
  { id: "OM-KM-001", category: "Operate and Maintain", name: "Knowledge Manager", description: "Manages and disseminates organizational knowledge and information resources." },
  { id: "OM-TSS-001", category: "Operate and Maintain", name: "Technical Support Specialist", description: "Provides technical support, troubleshooting, and customer service for IT systems." },

  // Oversee and Govern
  { id: "OV-EXE-001", category: "Oversee and Govern", name: "Executive Cyber Leadership", description: "Executes decision-making authorities and provides strategic cyber leadership." },
  { id: "OV-MGT-001", category: "Oversee and Govern", name: "Program Manager", description: "Manages cybersecurity programs, budgets, and resource allocation." },
  { id: "OV-ISM-001", category: "Oversee and Govern", name: "Information Systems Security Manager", description: "Oversees the information security program for an organization or system." },
  { id: "OV-LEG-001", category: "Oversee and Govern", name: "Cyber Legal Advisor", description: "Provides legal counsel and guidance on cybersecurity legal matters." },
  { id: "OV-PRV-001", category: "Oversee and Govern", name: "Privacy Officer", description: "Ensures compliance with privacy regulations and manages privacy programs." },
  { id: "OV-RSK-001", category: "Oversee and Govern", name: "Risk Analyst", description: "Analyzes and manages cybersecurity risk to organizational operations." },
  { id: "OV-AO-001", category: "Oversee and Govern", name: "Authorizing Official", description: "Serves as the senior management official with authority to authorize system operation." },

  // Protect and Defend
  { id: "PD-CDA-001", category: "Protect and Defend", name: "Cyber Defense Analyst", description: "Uses defense-in-depth mechanisms, data collected from sensors, and network traffic to identify, analyze, and report events." },
  { id: "PD-INF-001", category: "Protect and Defend", name: "Cyber Defense Infrastructure Support Specialist", description: "Tests, implements, deploys, maintains, and administers cyber defense infrastructure." },
  { id: "PD-INC-001", category: "Protect and Defend", name: "Cyber Defense Incident Responder", description: "Investigates, analyzes, and responds to cyber defense incidents within the network." },
  { id: "PD-VUL-001", category: "Protect and Defend", name: "Vulnerability Assessment Analyst", description: "Performs assessments of systems and networks to identify vulnerabilities and recommend mitigations." },
  { id: "PD-FOR-001", category: "Protect and Defend", name: "Cyber Defense Forensics Analyst", description: "Analyzes digital evidence to investigate cyber incidents and support attribution." },

  // Analyze
  { id: "AN-ASR-001", category: "Analyze", name: "All-Source Analyst", description: "Analyzes data from multiple sources to produce intelligence assessments." },
  { id: "AN-EXP-001", category: "Analyze", name: "Exploitation Analyst", description: "Analyzes network and system data to identify exploitable vulnerabilities and targets." },
  { id: "AN-THR-001", category: "Analyze", name: "Threat/Warning Analyst", description: "Analyzes intelligence to identify threats and provide warnings to stakeholders." },
  { id: "AN-MAS-001", category: "Analyze", name: "Mission Assessment Specialist", description: "Assesses the effectiveness of cyber missions and operations." },
  { id: "AN-TGT-001", category: "Analyze", name: "Target Network Analyst", description: "Analyzes target networks and systems to support cyber operations." },

  // Collect and Operate
  { id: "CO-COL-001", category: "Collect and Operate", name: "All-Source Collection Manager", description: "Manages collection of intelligence from multiple sources to satisfy requirements." },
  { id: "CO-SIG-001", category: "Collect and Operate", name: "SIGINT Collector", description: "Collects and processes signals intelligence to support mission requirements." },
  { id: "CO-OPS-001", category: "Collect and Operate", name: "Cyber Operations Planner", description: "Plans cyber operations in support of organizational missions and objectives." },
  { id: "CO-OPR-001", category: "Collect and Operate", name: "Cyber Operator", description: "Conducts cyber operations in support of mission requirements and objectives." },
  { id: "CO-INT-001", category: "Collect and Operate", name: "Cyber Intelligence Planner", description: "Develops intelligence plans to support cyber operations and activities." },

  // Investigate
  { id: "INV-CR-001", category: "Investigate", name: "Cyber Crime Investigator", description: "Investigates cyber crimes and digital evidence to support law enforcement." },
  { id: "INV-FLA-001", category: "Investigate", name: "Law Enforcement Counterintelligence Forensics Analyst", description: "Performs forensic analysis to support counterintelligence investigations." },
  { id: "INV-MLA-001", category: "Investigate", name: "Multi-Disciplined Language Analyst", description: "Applies language expertise and analysis to support cyber investigations." },
];

export const NICE_TASKS = [
  // Securely Provision tasks
  { id: "T0023", category: "Securely Provision", description: "Apply secure system design principles during development." },
  { id: "T0024", category: "Securely Provision", description: "Conduct code reviews and vulnerability testing." },
  { id: "T0025", category: "Securely Provision", description: "Develop security architecture artifacts." },
  { id: "T0026", category: "Securely Provision", description: "Perform security control assessments." },
  { id: "T0027", category: "Securely Provision", description: "Integrate security controls into system components." },
  { id: "T0028", category: "Securely Provision", description: "Document security requirements and specifications." },

  // Operate and Maintain tasks
  { id: "T0049", category: "Operate and Maintain", description: "Administer and maintain system accounts and access controls." },
  { id: "T0050", category: "Operate and Maintain", description: "Monitor system performance and availability." },
  { id: "T0051", category: "Operate and Maintain", description: "Implement and manage network configurations." },
  { id: "T0052", category: "Operate and Maintain", description: "Perform system backups and recovery operations." },
  { id: "T0053", category: "Operate and Maintain", description: "Manage database security and access controls." },
  { id: "T0054", category: "Operate and Maintain", description: "Provide technical support and troubleshooting." },

  // Oversee and Govern tasks
  { id: "T0091", category: "Oversee and Govern", description: "Develop cybersecurity strategy and policy." },
  { id: "T0092", category: "Oversee and Govern", description: "Manage cybersecurity program budgets and resources." },
  { id: "T0093", category: "Oversee and Govern", description: "Oversee information security program implementation." },
  { id: "T0094", category: "Oversee and Govern", description: "Conduct risk assessments and risk management activities." },
  { id: "T0095", category: "Oversee and Govern", description: "Authorize system operation based on risk determinations." },
  { id: "T0096", category: "Oversee and Govern", description: "Ensure compliance with legal and regulatory requirements." },

  // Protect and Defend tasks
  { id: "T0163", category: "Protect and Defend", description: "Monitor network traffic for anomalous activity." },
  { id: "T0164", category: "Protect and Defend", description: "Analyze security events and alerts." },
  { id: "T0165", category: "Protect and Defend", description: "Respond to cybersecurity incidents." },
  { id: "T0166", category: "Protect and Defend", description: "Conduct vulnerability scans and assessments." },
  { id: "T0167", category: "Protect and Defend", description: "Perform digital forensics analysis on compromised systems." },
  { id: "T0168", category: "Protect and Defend", description: "Implement and maintain cyber defense infrastructure." },

  // Analyze tasks
  { id: "T0193", category: "Analyze", description: "Analyze intelligence from multiple sources." },
  { id: "T0194", category: "Analyze", description: "Identify and assess threats to organizational systems." },
  { id: "T0195", category: "Analyze", description: "Produce intelligence reports and assessments." },
  { id: "T0196", category: "Analyze", description: "Conduct mission assessment and effectiveness analysis." },
  { id: "T0197", category: "Analyze", description: "Analyze target networks and system architectures." },

  // Collect and Operate tasks
  { id: "T0243", category: "Collect and Operate", description: "Plan and coordinate intelligence collection operations." },
  { id: "T0244", category: "Collect and Operate", description: "Collect and process signals intelligence." },
  { id: "T0245", category: "Collect and Operate", description: "Develop cyber operations plans." },
  { id: "T0246", category: "Collect and Operate", description: "Execute cyber operations in support of missions." },
  { id: "T0247", category: "Collect and Operate", description: "Develop cyber intelligence plans and collection requirements." },

  // Investigate tasks
  { id: "T0278", category: "Investigate", description: "Investigate cyber crimes and digital incidents." },
  { id: "T0279", category: "Investigate", description: "Collect and preserve digital evidence." },
  { id: "T0280", category: "Investigate", description: "Perform forensic analysis on seized media and devices." },
  { id: "T0281", category: "Investigate", description: "Apply language expertise to support investigations." },
  { id: "T0282", category: "Investigate", description: "Support counterintelligence forensic investigations." },
];

export const NICE_KNOWLEDGE = [
  { id: "K0001", name: "Knowledge of computer networking concepts and protocols", category: "general" },
  { id: "K0002", name: "Knowledge of information security principles and practices", category: "general" },
  { id: "K0003", name: "Knowledge of operating systems theory and concepts", category: "general" },
  { id: "K0004", name: "Knowledge of cybersecurity concepts", category: "general" },
  { id: "K0051", name: "Knowledge of malware analysis and reverse engineering", category: "technical" },
  { id: "K0061", name: "Knowledge of incident response methodologies", category: "technical" },
  { id: "K0101", name: "Knowledge of penetration testing methodologies", category: "technical" },
  { id: "K0110", name: "Knowledge of vulnerability assessment and management", category: "technical" },
  { id: "K0161", name: "Knowledge of digital forensics and evidence handling", category: "technical" },
  { id: "K0212", name: "Knowledge of network security monitoring tools", category: "technical" },
  { id: "K0234", name: "Knowledge of security engineering and system design", category: "technical" },
  { id: "K0301", name: "Knowledge of security risk management processes", category: "governance" },
  { id: "K0312", name: "Knowledge of cybersecurity policy and strategy", category: "governance" },
  { id: "K0340", name: "Knowledge of cloud security architecture", category: "technical" },
  { id: "K0439", name: "Knowledge of cryptographic principles and algorithms", category: "technical" },
  { id: "K0471", name: "Knowledge of threat intelligence and analysis", category: "technical" },
];

export const NICE_SKILLS = [
  { id: "S0001", name: "Skill in conducting vulnerability assessments", category: "technical" },
  { id: "S0002", name: "Skill in using network analysis tools", category: "technical" },
  { id: "S0003", name: "Skill in analyzing network traffic for anomalies", category: "technical" },
  { id: "S0004", name: "Skill in applying security controls and countermeasures", category: "technical" },
  { id: "S0005", name: "Skill in performing digital forensic analysis", category: "technical" },
  { id: "S0006", name: "Skill in reverse engineering software and malware", category: "technical" },
  { id: "S0007", name: "Skill in conducting penetration testing", category: "technical" },
  { id: "S0008", name: "Skill in scripting and automation", category: "technical" },
  { id: "S0009", name: "Skill in configuring security monitoring tools", category: "technical" },
  { id: "S0010", name: "Skill in incident response and containment", category: "technical" },
  { id: "S0011", name: "Skill in threat intelligence analysis", category: "analytic" },
  { id: "S0012", name: "Skill in security architecture design", category: "technical" },
  { id: "S0013", name: "Skill in risk assessment and management", category: "analytic" },
  { id: "S0014", name: "Skill in security program management", category: "management" },
  { id: "S0015", name: "Skill in technical writing and documentation", category: "communication" },
];

export const NICE_ABILITIES = [
  { id: "A0001", name: "Ability to analyze and interpret security event data", category: "analytic" },
  { id: "A0002", name: "Ability to identify system vulnerabilities and risks", category: "analytic" },
  { id: "A0003", name: "Ability to respond to cybersecurity incidents", category: "operational" },
  { id: "A0004", name: "Ability to design secure network architectures", category: "technical" },
  { id: "A0005", name: "Ability to conduct forensic analysis on digital evidence", category: "technical" },
  { id: "A0006", name: "Ability to develop security policies and procedures", category: "governance" },
  { id: "A0007", name: "Ability to evaluate security control effectiveness", category: "analytic" },
  { id: "A0008", name: "Ability to communicate technical information to non-technical audiences", category: "communication" },
  { id: "A0009", name: "Ability to manage multiple competing priorities under pressure", category: "operational" },
  { id: "A0010", name: "Ability to conduct research and apply findings to problems", category: "analytic" },
  { id: "A0011", name: "Ability to perform penetration testing and exploitation", category: "technical" },
  { id: "A0012", name: "Ability to analyze threat actor tactics, techniques, and procedures", category: "analytic" },
];

/**
 * Complete dataset bundle for seeding.
 */
export const NICE_DATASET = {
  version: NICE_VERSION,
  label: "NICE Cybersecurity Workforce Framework v2.2.0",
  categories: NICE_CATEGORIES,
  work_roles: NICE_WORK_ROLES,
  tasks: NICE_TASKS,
  knowledge: NICE_KNOWLEDGE,
  skills: NICE_SKILLS,
  abilities: NICE_ABILITIES,
};