import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2, ChevronRight, CircleDollarSign,
  Clock3, Database, Pause, Play, RefreshCcw, ShieldAlert, SkipForward, Target,
  TrendingUp, Zap
} from "lucide-react";

const money = (value) => {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
};

const ADVERSARIES = [
  { id: "unattributed", name: "Unattributed", alias: "Opportunistic actor", origin: "Global", motive: "Financial", bias: 1.0, accent: "slate" },
  { id: "scattered-spider", name: "Scattered Spider", alias: "UNC3944 / Octo Tempest", origin: "US / UK", motive: "Financial & extortion", bias: 1.12, accent: "violet" },
  { id: "lockbit", name: "LockBit", alias: "Bitwise Spider", origin: "RU-nexus", motive: "Ransomware", bias: 1.18, accent: "red" },
  { id: "volt-typhoon", name: "Volt Typhoon", alias: "Vanguard Panda", origin: "PRC-nexus", motive: "Espionage & disruption", bias: 1.08, accent: "cyan" },
  { id: "lazarus", name: "Lazarus Group", alias: "APT38 / Hidden Cobra", origin: "DPRK-nexus", motive: "State revenue", bias: 1.15, accent: "amber" },
  { id: "fin7", name: "FIN7", alias: "Carbanak / Sangria Tempest", origin: "RU-nexus", motive: "Financial", bias: 1.1, accent: "orange" },
];

const SCENARIOS = [
  {
    id: "ransomware", name: "Ransomware — Double Extortion", tag: "High disruption", base: 8_480_000,
    compatible: ["unattributed", "scattered-spider", "lockbit", "lazarus", "fin7"],
    summary: "Credential compromise, lateral movement, data theft, encryption and extortion pressure.",
    phases: [
      ["Initial Access", "TA0001", "Spearphishing Link · T1566.002", "A user account is compromised through a targeted lure.", 90_000, 240_000, "Investigation, account response and initial containment"],
      ["Execution", "TA0002", "PowerShell · T1059.001", "A staged payload executes inside the environment.", 140_000, 310_000, "Endpoint response and malicious workload interruption"],
      ["Persistence", "TA0003", "Create Account · T1136", "A secondary access path is established.", 190_000, 520_000, "Broader identity review and extended attacker access"],
      ["Credential Access", "TA0006", "OS Credential Dumping · T1003", "Privileged credentials are captured.", 425_000, 900_000, "Privileged identity exposure and enterprise credential reset"],
      ["Lateral Movement", "TA0008", "Remote Services · T1021", "The intrusion expands to critical workloads.", 780_000, 1_400_000, "Expanded restoration scope and operational interruption"],
      ["Collection", "TA0009", "Data Staged · T1074", "Sensitive information is assembled for theft.", 950_000, 1_650_000, "Forensics, data review and potential notification scope"],
      ["Exfiltration", "TA0010", "Exfiltration Over C2 · T1041", "Regulated and commercial data leaves the network.", 2_205_000, 1_900_000, "Legal, notification, regulatory and customer exposure"],
      ["Impact", "TA0040", "Data Encrypted for Impact · T1486", "Operations are interrupted by widespread encryption.", 3_700_000, 0, "Downtime, recovery, lost revenue and crisis operations"],
    ]
  },
  {
    id: "bec", name: "Business Email Compromise", tag: "Financial fraud", base: 2_740_000,
    compatible: ["unattributed", "scattered-spider", "lazarus", "fin7"],
    summary: "Mailbox takeover, session persistence, payment diversion and executive impersonation.",
    phases: [
      ["Initial Access", "TA0001", "Spearphishing Link · T1566.002", "An employee enters credentials into a counterfeit sign-in page.", 55_000, 150_000, "Triage, mailbox review and user response"],
      ["Credential Access", "TA0006", "Credentials from Password Stores · T1555", "The attacker captures reusable credentials and tokens.", 175_000, 420_000, "Identity exposure and session revocation"],
      ["Persistence", "TA0003", "Account Manipulation · T1098", "Mailbox rules and delegated access preserve control.", 210_000, 510_000, "Tenant-wide review and communications exposure"],
      ["Discovery", "TA0007", "Email Account Discovery · T1087", "Invoices, vendors and executive relationships are mapped.", 120_000, 760_000, "Fraud opportunity and confidential correspondence exposure"],
      ["Collection", "TA0009", "Email Collection · T1114", "Payment threads and supporting documents are collected.", 330_000, 920_000, "Legal review and sensitive information handling"],
      ["Impact", "TA0040", "Financial Theft", "A fraudulent payment instruction is executed.", 1_850_000, 0, "Direct fraud, recovery effort, legal cost and vendor disruption"],
    ]
  },
  {
    id: "supply-chain", name: "Software Supply-Chain Compromise", tag: "Systemic exposure", base: 12_600_000,
    compatible: ["unattributed", "lazarus", "volt-typhoon"],
    summary: "Trusted software or vendor access is weaponized to reach multiple critical systems.",
    phases: [
      ["Resource Development", "TA0042", "Compromise Client Software Binary · T1584.004", "A trusted delivery mechanism is prepared for abuse.", 180_000, 600_000, "Vendor investigation and emergency assurance activity"],
      ["Initial Access", "TA0001", "Supply Chain Compromise · T1195", "Malicious code enters through a trusted dependency.", 420_000, 1_500_000, "Enterprise-wide exposure assessment"],
      ["Execution", "TA0002", "Software Deployment Tools · T1072", "The trusted update channel executes the payload.", 780_000, 2_300_000, "Widespread endpoint and server response"],
      ["Defense Evasion", "TA0005", "Masquerading · T1036", "Malicious activity blends with approved software behavior.", 660_000, 1_900_000, "Longer dwell time and complex forensic reconstruction"],
      ["Discovery", "TA0007", "Network Service Scanning · T1046", "Connected environments and privileged paths are mapped.", 540_000, 2_100_000, "Expanded third-party and critical-service exposure"],
      ["Collection", "TA0009", "Archive Collected Data · T1560", "Sensitive data is consolidated across affected environments.", 2_100_000, 2_800_000, "Multi-party legal, contractual and notification exposure"],
      ["Exfiltration", "TA0010", "Exfiltration Over Web Service · T1567", "Data is removed through an allowed cloud channel.", 3_200_000, 2_600_000, "Regulatory, customer and intellectual-property loss"],
      ["Impact", "TA0040", "Service Stop · T1489", "Critical services are suspended for containment and rebuild.", 4_720_000, 0, "Extended interruption, rebuild and vendor replacement"],
    ]
  },
  {
    id: "ot", name: "OT / ICS Operational Disruption", tag: "Safety & production", base: 18_900_000,
    compatible: ["unattributed", "volt-typhoon", "lazarus"],
    summary: "Enterprise access crosses into operational systems and interrupts physical production.",
    phases: [
      ["Initial Access", "TA0001", "External Remote Services · T1133", "Remote access is abused to enter the enterprise environment.", 130_000, 480_000, "Access review and emergency containment"],
      ["Credential Access", "TA0006", "Brute Force · T1110", "Operational credentials are obtained.", 280_000, 1_100_000, "Credential rotation and privileged access interruption"],
      ["Lateral Movement", "TA0008", "Remote Services · T1021", "The intrusion crosses from IT into an OT management zone.", 1_450_000, 4_500_000, "Production risk and broad isolation requirements"],
      ["Discovery", "TA0007", "System Network Configuration Discovery · T1016", "Control assets and production dependencies are identified.", 920_000, 3_200_000, "Safety review and emergency operating procedures"],
      ["Inhibit Response", "TA0107", "Impair Defenses · T1562", "Monitoring and recovery mechanisms are degraded.", 2_100_000, 4_900_000, "Longer containment and manual operations"],
      ["Impact", "TA0040", "Inhibit Process Response Function · T0804", "Physical operations are stopped to protect people and equipment.", 14_020_000, 0, "Production loss, safety response, restoration and contractual penalties"],
    ]
  },
  {
    id: "web-breach", name: "Public Web Application Breach", tag: "Data exposure", base: 5_350_000,
    compatible: ["unattributed", "scattered-spider", "fin7"],
    summary: "A public application flaw enables access, collection and theft of customer data.",
    phases: [
      ["Reconnaissance", "TA0043", "Active Scanning · T1595", "The public application and exposed services are mapped.", 18_000, 85_000, "Validation and threat-hunting activity"],
      ["Initial Access", "TA0001", "Exploit Public-Facing Application · T1190", "A vulnerable application component is exploited.", 165_000, 470_000, "Emergency remediation and application isolation"],
      ["Execution", "TA0002", "Server Software Component · T1505", "Attacker-controlled code runs on the application tier.", 310_000, 760_000, "Application rebuild and forensic analysis"],
      ["Credential Access", "TA0006", "Unsecured Credentials · T1552", "Application and database secrets are exposed.", 520_000, 1_100_000, "Secret rotation and connected-system review"],
      ["Discovery", "TA0007", "Database Discovery · T1087", "High-value tables and connected services are identified.", 285_000, 1_350_000, "Expanded breach scope and legal analysis"],
      ["Collection", "TA0009", "Data from Information Repositories · T1213", "Customer records are assembled for removal.", 1_050_000, 1_200_000, "Record analysis and notification preparation"],
      ["Exfiltration", "TA0010", "Exfiltration Over Web Service · T1567", "Customer data is transferred outside the environment.", 3_002_000, 0, "Notification, regulatory, customer and legal costs"],
    ]
  },
  {
    id: "ddos", name: "DDoS with Extortion", tag: "Availability", base: 1_950_000,
    compatible: ["unattributed", "lockbit", "fin7"],
    summary: "A sustained availability attack disrupts customer access and applies extortion pressure.",
    phases: [
      ["Reconnaissance", "TA0043", "Network Service Scanning · T1046", "Public services and capacity limits are profiled.", 20_000, 90_000, "Validation and protective capacity review"],
      ["Resource Development", "TA0042", "Develop Capabilities · T1587", "Distributed attack infrastructure is assembled.", 15_000, 160_000, "Threat monitoring and provider coordination"],
      ["Command and Control", "TA0011", "Application Layer Protocol · T1071", "Attack nodes coordinate traffic against the service.", 115_000, 430_000, "Traffic engineering and mitigation activation"],
      ["Impact", "TA0040", "Network Denial of Service · T1498", "Customer-facing services become unavailable.", 1_800_000, 0, "Lost transactions, SLA penalties, response and customer impact"],
    ]
  },
];

const phaseColors = ["#22d3ee", "#60a5fa", "#a78bfa", "#f59e0b", "#fb7185", "#ef4444"];

function Stat({ icon: Icon, label, value, sub, tone = "text-amber-300" }) {
  return <div className="rounded-xl border border-slate-700/70 bg-slate-900/75 p-4">
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</div>
    <div className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</div>
    <div className="mt-1 text-xs text-slate-500">{sub}</div>
  </div>;
}

export default function CCI() {
  const [adversaryId, setAdversaryId] = useState("lazarus");
  const available = useMemo(() => SCENARIOS.filter(s => s.compatible.includes(adversaryId)), [adversaryId]);
  const [scenarioId, setScenarioId] = useState("ransomware");
  const scenario = available.find(s => s.id === scenarioId) || available[0];
  const adversary = ADVERSARIES.find(a => a.id === adversaryId);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(-1);
  const [speed, setSpeed] = useState(1800);

  useEffect(() => {
    if (!available.some(s => s.id === scenarioId)) setScenarioId(available[0]?.id);
  }, [adversaryId, available, scenarioId]);

  useEffect(() => {
    if (!running || !scenario) return;
    if (active >= scenario.phases.length - 1) {
      const t = setTimeout(() => setRunning(false), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive(v => v + 1), speed);
    return () => clearTimeout(t);
  }, [running, active, speed, scenario]);

  const factor = adversary?.bias || 1;
  const completed = Math.max(0, active + 1);
  const phaseCost = active >= 0 ? scenario.phases[active][4] * factor : 0;
  const cumulative = scenario.phases.slice(0, completed).reduce((sum, p) => sum + p[4] * factor, 0);
  const exposure = active >= 0 ? scenario.phases[active][5] * factor : 0;
  const expectedTotal = scenario.base * factor;
  const progress = scenario.phases.length ? completed / scenario.phases.length * 100 : 0;

  const reset = () => { setRunning(false); setActive(-1); };
  const run = () => {
    if (active >= scenario.phases.length - 1) setActive(-1);
    setRunning(true);
  };

  return <div className="min-h-screen bg-[#070c18] text-slate-100">
    <div className="mx-auto max-w-[1500px] px-4 py-7 lg:px-7">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-amber-500/20 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-400">
            <CircleDollarSign className="h-4 w-4" /> Cyber Capital Intelligence
          </div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Economic Cyber Twin Simulation</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">Automated adversary emulation translating MITRE ATT&CK progression into phase-level business impact.</p>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-200">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          External CCI engine interface ready
        </div>
      </header>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">1 · Adversary emulation</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">MITRE ATT&CK · tactic-weighted visualization</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ADVERSARIES.map(a => <button key={a.id} onClick={() => { setAdversaryId(a.id); reset(); }}
            className={`rounded-xl border px-4 py-3 text-left transition ${adversaryId === a.id ? "border-amber-400/80 bg-amber-400/10 shadow-[0_0_22px_rgba(251,191,36,.08)]" : "border-slate-700 bg-slate-900/65 hover:border-slate-500"}`}>
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">{a.name}</span>{adversaryId === a.id && <Target className="h-4 w-4 text-amber-400" />}</div>
            <div className="mt-1 text-[11px] text-slate-400">{a.alias} · {a.origin}</div>
          </button>)}
        </div>
        <div className="mt-3 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 md:grid-cols-3">
          <div><div className="text-[9px] uppercase tracking-widest text-slate-500">Motive</div><div className="mt-1 text-sm">{adversary.motive}</div></div>
          <div><div className="text-[9px] uppercase tracking-widest text-slate-500">Severity weighting</div><div className="mt-1 text-sm text-amber-300">×{factor.toFixed(2)}</div></div>
          <div><div className="text-[9px] uppercase tracking-widest text-slate-500">Available scenarios</div><div className="mt-1 text-sm">{available.length} emulations</div></div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">2 · Scenario library</div>
          <div className="space-y-2">
            {available.map(s => <button key={s.id} onClick={() => { setScenarioId(s.id); reset(); }}
              className={`w-full rounded-xl border p-3 text-left transition ${scenario?.id === s.id ? "border-amber-400/70 bg-amber-400/10" : "border-slate-800 bg-slate-900/60 hover:border-slate-600"}`}>
              <div className="flex items-start justify-between gap-2"><span className="text-sm font-medium">{s.name}</span><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /></div>
              <div className="mt-2 flex items-center justify-between text-[10px]"><span className="rounded bg-slate-800 px-2 py-1 text-slate-400">{s.tag}</span><span className="text-amber-300">{money(s.base * factor)}</span></div>
            </button>)}
          </div>
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-slate-400">
            <AlertTriangle className="mb-2 h-4 w-4 text-amber-400" />
            Costs shown are modeled benchmark estimates for visualization—not official MITRE values. Organization-specific inputs will be supplied by the external CCI engine.
          </div>
        </aside>

        <main className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/45">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Selected emulation</div>
                <h2 className="mt-1 text-lg font-semibold">{scenario.name}</h2>
                <p className="mt-1 max-w-3xl text-xs text-slate-400">{scenario.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-300">
                  <option value={2800}>Presentation</option><option value={1800}>Standard</option><option value={850}>Fast</option>
                </select>
                <button onClick={reset} className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800"><RefreshCcw className="h-3.5 w-3.5" />Reset</button>
                <button onClick={() => running ? setRunning(false) : run()} className="flex h-9 items-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-semibold text-slate-950 hover:bg-amber-300">
                  {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? "Pause" : active >= 0 && active < scenario.phases.length - 1 ? "Resume" : "Run simulation"}
                </button>
                <button onClick={() => { setRunning(false); setActive(v => Math.min(v + 1, scenario.phases.length - 1)); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800" title="Advance one phase"><SkipForward className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-4">
              <Stat icon={CircleDollarSign} label="Phase cost" value={money(phaseCost)} sub={active >= 0 ? scenario.phases[active][0] : "Run to begin"} tone="text-cyan-300" />
              <Stat icon={TrendingUp} label="Exposure added" value={money(exposure)} sub="Potential future loss" tone="text-orange-300" />
              <Stat icon={BarChart3} label="Cumulative cost" value={money(cumulative)} sub={`${completed} of ${scenario.phases.length} phases`} tone="text-amber-300" />
              <Stat icon={ShieldAlert} label="Expected scenario" value={money(expectedTotal)} sub="Adversary-adjusted benchmark" tone="text-red-300" />
            </div>

            <div className="px-5 pb-5">
              <div className="mb-2 flex justify-between text-[10px] uppercase tracking-widest text-slate-500"><span>Automated attack progression</span><span>{Math.round(progress)}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-red-500 transition-all duration-700" style={{width: `${progress}%`}} /></div>
            </div>

            <div className="border-t border-slate-800 p-5">
              <div className="relative grid gap-3">
                <div className="absolute bottom-4 left-[17px] top-4 w-px bg-slate-800" />
                {scenario.phases.map((p, i) => {
                  const done = i <= active;
                  const current = i === active;
                  return <div key={p[0]} className={`relative grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-xl border p-3 transition-all duration-500 ${current ? "border-amber-400/60 bg-amber-400/8 shadow-[0_0_25px_rgba(251,191,36,.08)]" : done ? "border-cyan-500/25 bg-cyan-950/10" : "border-slate-800 bg-slate-900/35 opacity-65"}`}>
                    <div className={`z-10 flex h-9 w-9 items-center justify-center rounded-full border ${current ? "border-amber-300 bg-amber-400 text-slate-950 animate-pulse" : done ? "border-cyan-400/60 bg-cyan-950 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-600"}`}>
                      {done && !current ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[1.1fr_1.4fr_.75fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{p[0]}</span><span className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400">{p[1]}</span></div>
                        <div className="mt-1 text-[11px] text-cyan-300">{p[2]}</div>
                      </div>
                      <div><div className="text-xs text-slate-300">{p[3]}</div><div className="mt-1 text-[10px] text-slate-500">{p[6]}</div></div>
                      <div className="flex items-center justify-between gap-3 lg:justify-end">
                        <div className="text-right"><div className="text-[9px] uppercase tracking-widest text-slate-500">Phase impact</div><div className={`mt-1 text-sm font-semibold ${done ? "text-amber-300" : "text-slate-600"}`}>{done ? money(p[4] * factor) : "Pending"}</div></div>
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </section>

          {active >= scenario.phases.length - 1 && !running && <section className="grid gap-4 rounded-2xl border border-red-500/25 bg-gradient-to-r from-red-950/30 to-slate-950 p-5 md:grid-cols-[1fr_auto]">
            <div><div className="flex items-center gap-2 text-sm font-semibold text-red-200"><Zap className="h-4 w-4 text-red-400" />Scenario impact established</div><p className="mt-2 text-xs text-slate-400">The automated run completed all applicable MITRE ATT&CK tactics. The external CCI service can replace these benchmark values with organization-specific economic results without changing this visualization.</p></div>
            <div className="grid grid-cols-3 gap-5 text-center"><div><div className="text-[9px] uppercase text-slate-500">Low</div><div className="mt-1 text-sm text-amber-200">{money(expectedTotal * .48)}</div></div><div><div className="text-[9px] uppercase text-slate-500">Expected</div><div className="mt-1 text-sm font-semibold text-red-300">{money(expectedTotal)}</div></div><div><div className="text-[9px] uppercase text-slate-500">Severe</div><div className="mt-1 text-sm text-red-200">{money(expectedTotal * 1.95)}</div></div></div>
          </section>}

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/45 px-4 py-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-2"><Database className="h-3.5 w-3.5" />Benchmark visualization dataset · model CCI-DEMO-1.0</span>
            <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />External organization profile: not connected</span>
            <span className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-cyan-400" />MITRE mappings displayed for attribution; cost values are CCI-modeled</span>
          </section>
        </main>
      </div>
    </div>
  </div>;
}
