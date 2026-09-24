import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle, Building2, CalendarDays, ChevronDown, ChevronUp, FileText, Gauge,
  History, Loader2, MapPin, ExternalLink, Plug, RefreshCw, ShieldAlert, ShieldCheck,
  Trash2, Upload, UserRound, X, Inbox,
} from "lucide-react";
import SoftGraphiteStyle from "@/components/cfrs/SoftGraphiteStyle";
import SemanticBadge from "@/components/cfrs/SemanticBadge";
import RadialGauge from "@/components/cfrs/RadialGauge";
import Sparkline from "@/components/cfrs/Sparkline";
import CountUp from "@/components/cfrs/CountUp";
import ScoreBar from "@/components/cfrs/ScoreBar";
import EmptyState from "@/components/cfrs/EmptyState";
import SkeletonGrid from "@/components/cfrs/Skeleton";

const TYPES = [
  ["vulnerability_report", "Vulnerability Assessment", "Scanner report and findings"],
  ["executive_summary", "Penetration Test — Executive Summary", "Business impact and outcome"],
  ["technical_report", "Penetration Test — Technical Report", "Authoritative findings"],
  ["activity_report", "Penetration Test — Activity Report", "Attempts and test coverage"],
];

const Field = ({ label, icon: Icon, ...x }) => (
  <label>
    <span className="sg-micro mb-1.5 flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5" />}{label}
    </span>
    <input {...x} className="sg-input h-10 w-full px-3 text-sm" />
  </label>
);

const Tile = ({ label, value, sub, tone = "" }) => (
  <div className="sg-tile p-4">
    <div className="sg-micro">{label}</div>
    <div className={"mt-2 text-3xl font-semibold sg-tabular " + tone}>{value}</div>
    <div className="mt-1 text-[11px]" style={{ color: "#6b7280" }}>{sub}</div>
  </div>
);

const CFRS_VERSION = "CFRS-ASSESS-2026.16", CFRS_BASELINE = 600, CFRS_MIN = -500, CFRS_MAX = 1000;
const ratingFor = n => n >= 900 ? "Exceptional" : n >= 750 ? "Strong" : n >= 600 ? "Good" : n >= 450 ? "Fair" : n >= 250 ? "Poor" : n >= 1 ? "Critical" : n >= -249 ? "Distressed" : "Extreme Risk";
const componentRating = n => n >= 90 ? "Exceptional" : n >= 80 ? "Good" : n >= 70 ? "Fair" : n >= 60 ? "Poor" : "Critical";
const vulnerabilityAssessed = x => { if ((x?.vulnerability_findings || []).length > 0) return true; const flag = x?.scoring_breakdown?.vulnerability?.assessed; if (flag === false) return false; if (flag === true && x?.source_mode !== "api") return true; return false; };
const evidenceTime = x => { const authoritative = new Date(x?.source_assessment_date || "").getTime(); if (Number.isFinite(authoritative)) return authoritative; const dates = Object.values(x?.assessment_dates || {}).map(v => new Date(v).getTime()).filter(Number.isFinite); return dates.length ? Math.max(...dates) : new Date(x?.analyzed_at || x?.created_date || 0).getTime() };
const assessmentScore = x => Number(x?.scoring_breakdown?.rating?.current_assessment_score ?? x?.final_score ?? CFRS_BASELINE);
const organizationRollup = (history, current) => { const orgRows = history.filter(x => x.organization_id === current.organization_id && x.status === "completed"), versioned = orgRows.filter(x => x.calculation_version === CFRS_VERSION), eligible = versioned.length ? versioned : orgRows; const sorted = [...eligible].sort((a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0)); const latest = sorted.find(x => x.is_current_rating) || sorted[0] || current; return Number(latest?.final_score ?? current?.final_score ?? CFRS_BASELINE) };

const HistoryReport = ({ history, current }) => {
  const [selected, setSelected] = useState(null);
  const openAssessment = async x => {
    const fingerprint = String(x.report_fingerprint || "");
    if (!fingerprint.startsWith("vpentest:")) { setSelected(x); return }
    const [, companyId, assessmentId] = fingerprint.split(":");
    setSelected({ ...x, report_files: (x.report_files || []).filter(f => f.source !== "vpentest_api"), _documentStatus: "Refreshing secure vPenTest report links…" });
    try {
      const response = (await base44.functions.invoke("vpentestConnection", { action: "report_links", company_id: companyId, assessment_id: assessmentId })).data;
      const definitions = [["executive_summary", "Executive Summary", "executive_summary_url"], ["technical_report", "Technical Report", "technical_report_url"], ["activity_report", "Activity Report", "activity_report_url"], ["vulnerability_report", "Vulnerability Report", "vulnerability_report_url"]];
      const refreshed = [];
      for (const report of response.reports || []) for (const [category, name, key] of definitions) if (report?.[key] && !refreshed.some(file => file.category === category)) refreshed.push({ category, name: `vPenTest ${name}.pdf`, file_url: report[key], source: "vpentest_api" });
      setSelected(current => current?.id === x.id ? { ...current, report_files: [...(current.report_files || []), ...refreshed], _documentStatus: refreshed.length ? "" : "No source reports were returned for this assessment." } : current)
    } catch (error) { setSelected(current => current?.id === x.id ? { ...current, _documentStatus: error?.response?.data?.message || error?.message || "The secure report links could not be refreshed." } : current) }
  };
  const now = Date.now();
  const dateFor = x => { const authoritative = new Date(x.source_assessment_date || "").getTime(); if (Number.isFinite(authoritative)) return authoritative; const evidenceDates = Object.values(x.assessment_dates || {}).map(v => new Date(v).getTime()).filter(Number.isFinite); return evidenceDates.length ? Math.max(...evidenceDates) : new Date(x.analyzed_at || x.created_date || 0).getTime() };
  const scoreFor = x => Number(x.scoring_breakdown?.rating?.current_assessment_score ?? x.final_score ?? CFRS_BASELINE);
  const allOrgRows = history.filter(x => x.organization_id === current.organization_id && x.status === "completed"), newModelRows = allOrgRows.filter(x => x.calculation_version === CFRS_VERSION), orgRows = (newModelRows.length ? newModelRows : allOrgRows).sort((a, b) => dateFor(b) - dateFor(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0));
  const rows = Array.from(new Map(orgRows.map(x => [x.report_fingerprint || x.id, x])).values());
  const factorSummary = x => {
    const rating = x.scoring_breakdown?.rating || {}, negative = [], positive = [];
    const plain = label => { const value = String(label || "Finding"); if (/LLMNR/i.test(value)) return "An attacker was able to misuse local name lookup and redirect network traffic."; if (/mDNS|multicast dns/i.test(value)) return "An attacker was able to misuse device-discovery traffic and redirect network connections."; if (/DNS spoof/i.test(value)) return "Testing showed network traffic could be redirected through false DNS responses."; if (/anonymous ftp/i.test(value)) return "Files could be accessed through FTP without a verified user account."; if (/null session/i.test(value)) return "Network information could be accessed without valid sign-in credentials."; if (/critical vulnerabilit/i.test(value)) return "Critical weaknesses were found that could lead to serious business disruption or data exposure."; return value };
    for (const section of ["vulnerability", "penetration_test"]) for (const item of x.scoring_breakdown?.[section]?.items || []) { const points = Number(item.points || 0); (points < 0 ? negative : positive).push({ label: plain(item.label), points }) }
    const add = (list, label, points) => { const value = Number(points || 0); if (value) list.push({ label, points: value }) };
    add(positive, "Strong vulnerability controls improved the result.", rating.vulnerability_adjustment);
    add(positive, "Resistance demonstrated during penetration testing improved the result.", rating.penetration_test_adjustment);
    add(positive, "Verified remediation of earlier issues improved the result.", rating.remediation_adjustment);
    add(negative, "Successful test attacks showed that important safeguards could be bypassed.", -Math.abs(Number(rating.validated_attack_penalty || 0)));
    add(negative, "Previously identified weaknesses were found again.", -Math.abs(Number(rating.repeat_finding_penalty || 0)));
    add(negative, "Risk was concentrated in high-impact weaknesses.", -Math.abs(Number(rating.exposure_concentration_penalty || 0)));
    const trend = Number(rating.trend_adjustment || 0);
    if (trend > 0) add(positive, "Recent results improved compared with earlier assessments.", trend);
    if (trend < 0) add(negative, "Recent results declined compared with earlier assessments.", trend);
    return { negative: negative.filter((v, i, a) => i === a.findIndex(other => other.label === v.label && other.points === v.points)), positive: positive.filter((v, i, a) => i === a.findIndex(other => other.label === v.label && other.points === v.points)) }
  };
  const windows = [90, 180, 270, 365].map(days => {
    const included = rows.filter(x => now - dateFor(x) <= days * 86400000);
    const newest = included[0], oldest = included[included.length - 1];
    const avg = k => included.length ? Math.round(included.reduce((s, x) => s + Number(x[k] || 0), 0) / included.length) : null;
    const trendValues = included.map(scoreFor).reverse();
    return { days, count: included.length, current: newest ? scoreFor(newest) : null, change: included.length > 1 ? scoreFor(newest) - scoreFor(oldest) : null, average: included.length ? Math.round(included.reduce((s, x) => s + scoreFor(x), 0) / included.length) : null, vulnerability: avg("vulnerability_score"), pentest: avg("penetration_test_score"), trendValues }
  });
  return (
    <section className="sg-panel sg-panel-hover sg-enter mb-5 p-5" style={{ animationDelay: ".25s" }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" style={{ color: "#0EA5C7" }} />CFRS history report</div>
          <p className="sg-body mt-1" style={{ color: "#6b7280" }}>{current.business_name} performance by rolling assessment window. Duplicate versions of the same scan are counted once.</p>
        </div>
        <div className="text-right">
          <div className="sg-micro">{rows.length} distinct assessment{rows.length === 1 ? "" : "s"}</div>
          <div className="mt-1 text-[9px]" style={{ color: "#0EA5C7" }}>Newest evidence first · select a row for details</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {windows.map(w => (
          <div key={w.days} className="sg-tile p-4">
            <div className="sg-micro" style={{ color: "#0EA5C7" }}>Last {w.days} days</div>
            {w.count ? (
              <>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-3xl font-semibold sg-tabular">{w.current}</div>
                    <div className="sg-micro">Latest CFRS</div>
                  </div>
                  <div className={`text-sm font-semibold sg-tabular ${w.change === null ? "" : w.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>{w.change === null ? "New" : `${w.change >= 0 ? "+" : ""}${w.change} pts`}</div>
                </div>
                <div className="mt-2"><Sparkline values={w.trendValues} width={150} height={30} /></div>
                <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-3 text-[10px]" style={{ borderColor: "#d6dae2" }}>
                  <div><span style={{ color: "#6b7280" }}>Average</span><div className="mt-1 sg-tabular" style={{ color: "#2A2F3A" }}>{w.average}</div></div>
                  <div><span style={{ color: "#6b7280" }}>Assessments</span><div className="mt-1 sg-tabular" style={{ color: "#2A2F3A" }}>{w.count}</div></div>
                  <div><span style={{ color: "#6b7280" }}>Vulnerability</span><div className="mt-1 sg-tabular" style={{ color: "#0EA5C7" }}>{w.vulnerability}/100</div></div>
                  <div><span style={{ color: "#6b7280" }}>Penetration</span><div className="mt-1 sg-tabular" style={{ color: "#7c3aed" }}>{w.pentest}/100</div></div>
                </div>
              </>
            ) : (
              <div className="mt-5"><EmptyState icon={Inbox} title="No assessments" message={`No assessments in the last ${w.days} days.`} /></div>
            )}
          </div>
        ))}
      </div>
      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: "#d6dae2" }}>
          <table className="sg-table w-full min-w-[650px] text-left text-xs">
            <thead className="sg-micro">
              <tr>
                <th className="p-3">Evidence date</th>
                <th className="p-3">CFRS</th>
                <th className="p-3">Vulnerability</th>
                <th className="p-3">Penetration</th>
                <th className="p-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map(x => (
                <tr key={x.id} onClick={() => openAssessment(x)} className="cursor-pointer border-t" style={{ borderColor: "#d6dae2" }} title="Open executive assessment view">
                  <td className="p-3" style={{ color: "#6b7280" }}>{new Date(dateFor(x)).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold sg-tabular" style={{ color: "#0EA5C7" }}>{scoreFor(x)}</td>
                  <td className="p-3 sg-tabular">{x.vulnerability_score}/100</td>
                  <td className="p-3 sg-tabular">{x.penetration_test_score}/100</td>
                  <td className="p-3" style={{ color: "#6b7280" }}>{ratingFor(scoreFor(x))} <span className="ml-2 text-[9px]" style={{ color: "#0EA5C7" }}>View →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="sg-score-card max-h-[88vh] w-full max-w-3xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "#d6dae2", background: "linear-gradient(145deg,#f8f9fb,#f0f2f6)" }}>
              <div>
                <div className="sg-micro" style={{ color: "#0EA5C7" }}>Executive assessment view</div>
                <h2 className="mt-1 text-xl font-semibold">{selected.business_name}</h2>
                <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>Evidence date: {new Date(dateFor(selected)).toLocaleDateString()}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="sg-btn p-2"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Tile label="Assessment rating" value={ratingFor(scoreFor(selected))} sub={`${scoreFor(selected)} / 1,000`} tone={scoreFor(selected) >= 750 ? "text-emerald-600" : scoreFor(selected) >= 450 ? "text-amber-600" : "text-red-500"} />
                <Tile label="Vulnerability posture" value={vulnerabilityAssessed(selected) ? componentRating(Number(selected.vulnerability_score)) : "Not assessed"} sub={vulnerabilityAssessed(selected) ? `${selected.vulnerability_score}/100` : "No VulScan evidence"} tone={vulnerabilityAssessed(selected) ? "text-cyan-600" : ""} />
                <Tile label="Penetration resilience" value={componentRating(Number(selected.penetration_test_score))} sub={`${selected.penetration_test_score}/100`} tone="text-violet-600" />
                <Tile label="Historical trend" value={`${Number(selected.scoring_breakdown?.rating?.trend_adjustment || 0) >= 0 ? "+" : ""}${Number(selected.scoring_breakdown?.rating?.trend_adjustment || 0)}`} sub="Trend contribution to this result" tone={Number(selected.scoring_breakdown?.rating?.trend_adjustment || 0) >= 0 ? "text-emerald-600" : "text-red-500"} />
              </div>
              <div className="sg-panel p-4" style={{ background: "#0ea5c70a" }}>
                <div className="sg-micro" style={{ color: "#0EA5C7" }}>What this score means</div>
                <p className="sg-body mt-2">{selected.business_name} received a CFRS of <b>{scoreFor(selected)}</b>, rated <b>{ratingFor(scoreFor(selected))}</b>. This score reflects the business impact of the weaknesses found, whether testing successfully bypassed safeguards, evidence of remediation, and the organization's recent assessment history.</p>
              </div>
              {(() => {
                const factors = factorSummary(selected);
                const FactorList = ({ items, empty, tone }) => (
                  <ul className="mt-3 space-y-2">
                    {items.length ? items.map((item, index) => (
                      <li key={`${item.label}-${index}`} className="flex items-start justify-between gap-4 border-t pt-2 text-sm" style={{ borderColor: "#d6dae2" }}>
                        <span>{item.label}</span>
                        <b className={`shrink-0 sg-tabular ${tone}`}>{item.points > 0 ? "+" : ""}{item.points} pts</b>
                      </li>
                    )) : <li className="text-sm" style={{ color: "#6b7280" }}>{empty}</li>}
                  </ul>
                );
                return (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="sg-panel p-4" style={{ background: "#dc26260a" }}>
                      <div className="sg-micro" style={{ color: "#dc2626" }}>Results that reduced the score</div>
                      <FactorList items={factors.negative} empty="No negative scoring factors were recorded." tone="text-red-500" />
                    </div>
                    <div className="sg-panel p-4" style={{ background: "#0f9d580a" }}>
                      <div className="sg-micro" style={{ color: "#0f9d58" }}>Results that supported the score</div>
                      <FactorList items={factors.positive} empty="No positive scoring factors were recorded." tone="text-emerald-600" />
                    </div>
                  </div>
                );
              })()}
              <div className="sg-panel p-4">
                <div className="sg-micro">Source reports</div>
                <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>Open the original documents when you need the full technical evidence.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.report_files?.filter(f => f.file_url).length ? selected.report_files.filter(f => f.file_url).map((file, index) => (
                    <a key={`${file.category}-${index}`} href={file.file_url} target="_blank" rel="noreferrer" className="sg-btn px-3 py-2 text-xs font-semibold" style={{ color: "#0EA5C7" }}>View {file.name || String(file.category || "report").replaceAll("_", " ")} ↗</a>
                  )) : <span className="text-sm" style={{ color: "#6b7280" }}>{selected._documentStatus || "No source reports are available for this archived assessment."}</span>}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sg-panel p-4" style={{ background: "#b8860b0a" }}>
                  <div className="sg-micro" style={{ color: "#b8860b" }}>Primary scored factor</div>
                  <p className="sg-body mt-2">{selected.primary_deduction || "No scored deductions"}</p>
                </div>
                <div className="sg-panel p-4">
                  <div className="sg-micro">Attack outcomes</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SemanticBadge tone="successful">{(selected.attack_evidence || []).filter(a => a.status === "successful").length} successful</SemanticBadge>
                    <SemanticBadge tone="attempted">{(selected.attack_evidence || []).filter(a => a.status !== "successful").length} attempted</SemanticBadge>
                  </div>
                </div>
              </div>
              <div className="sg-panel p-4">
                <div className="sg-micro">Evidence coverage</div>
                <p className="sg-body mt-2">{selected.coverage_summary || "Coverage details were not recorded."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const vectorFor = a => { if (a.attack_vector) return a.attack_vector; const s = `${a.name || ""} ${a.mitre_tactic || ""} ${a.mitre_technique_name || ""}`.toLowerCase(); if (/phish|email/.test(s)) return "Email"; if (/web|http|https|sql|script/.test(s)) return "Web Application"; if (/password|credential|brute|account/.test(s)) return "Authentication"; if (/cloud/.test(s)) return "Cloud"; if (/wireless|wifi|wi-fi/.test(s)) return "Wireless"; if (/host|process|endpoint|malware/.test(s)) return "Endpoint"; if (/scan|discover|enumerat|recon|nmap|traceroute|dns|whois/.test(s)) return "Discovery / Reconnaissance"; return "Network"; };
const correlationFor = a => { if (a.attack_correlation_type) return a.attack_correlation_type; const s = `${a.name || ""} ${a.mitre_technique_name || ""} ${a.evidence || ""}`.toLowerCase(); if (/ransom|encrypt.*impact/.test(s)) return "Ransomware"; if (/spear.?phish|phish/.test(s)) return "Spearphishing"; if (/password|credential|brute.?force|spray/.test(s)) return "Credential Attack"; if (/sql injection|cross.?site|xss|web application/.test(s)) return "Web Application Attack"; if (/privilege|elevat/.test(s)) return "Privilege Escalation"; if (/lateral/.test(s)) return "Lateral Movement"; if (/exfil|data theft/.test(s)) return "Data Exfiltration"; if (/persist/.test(s)) return "Persistence"; if (/command and control|c2|c&c/.test(s)) return "Command and Control"; if (/denial|ddos|dos attack/.test(s)) return "Denial of Service"; if (/malware|payload|shellcode/.test(s)) return "Malware Execution"; if (/exploit/.test(s)) return "Exploitation"; if (/vulnerab/.test(s)) return "Vulnerability Discovery"; if (/scan|discover|enumerat|nmap|traceroute|dns|whois/.test(s)) return "Network Reconnaissance"; return "Security Testing"; };
const isSuccessful = a => { if (a.status !== "successful") return false; const s = `${a.name || ""} ${a.outcome || ""} ${a.evidence || ""}`; const discovery = /scan|discover|enumerat|recon|nmap|traceroute|dns|whois|vulnerabilit/i.test(s); const compromise = /unauthorized access|access gained|shell obtained|compromised|credential.*captured|privilege.*(gained|escalat)|lateral movement.*(achieved|successful)|exfiltrat|code execution|control bypass|exploit.*successful|validated penetration-test finding|spoof|poison|relay/i.test(s); return !discovery || compromise; };
const plainText = value => { const raw = String(value || "").replace(/<\/(p|li|ol|ul|div)>/gi, ". ").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#39;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").replace(/\.\s*\./g, ".").trim(); return raw; };
const executiveEvidence = (a, company) => { const name = String(a?.name || "security test"), s = name.toLowerCase(), technical = plainText(a?.evidence); if (/llmnr/.test(s)) return { summary: `Testing confirmed that devices at ${company} could be tricked into sending Windows authentication requests to an unauthorized system when normal name resolution fails.`, evidence: "The assessment verified that LLMNR responses could be spoofed on the internal network. This creates an opportunity to intercept authentication attempts and potentially reuse or crack exposed credentials.", impact: "An attacker with internal network access could impersonate a trusted system, capture employee authentication traffic, and use recovered credentials to access additional systems." }; if (/mdns/.test(s)) return { summary: `Testing confirmed that multicast DNS traffic at ${company} could be impersonated by an unauthorized system.`, evidence: "The assessment verified that a system could respond to local mDNS requests as though it were the intended device or service.", impact: "This weakness could redirect users or systems to an attacker-controlled device, exposing credentials, sessions, or sensitive network traffic." }; if (/ipv6.*dns|dns.*spoof/.test(s)) return { summary: `Testing confirmed that network name-resolution traffic at ${company} could be redirected to an unauthorized system.`, evidence: "The penetration test validated that DNS-related responses could be spoofed, allowing an attacker-controlled system to appear legitimate.", impact: "A successful attacker could redirect connections, intercept authentication traffic, or position themselves between users and trusted services." }; if (/anonymous\s+ftp/.test(s)) return { summary: `Testing confirmed that a file-transfer service at ${company} allowed access without an authorized user account.`, evidence: "The assessor was able to connect to the FTP service anonymously, demonstrating that authentication controls were not required for the exposed content.", impact: "Unauthorized users could view or transfer accessible files, increasing the risk of information disclosure or malicious file placement." }; if (/null session/.test(s)) return { summary: `Testing confirmed that a Windows file-sharing service at ${company} accepted an unauthenticated connection.`, evidence: "The assessor established an SMB null session without valid credentials, demonstrating unintended anonymous access.", impact: "An attacker could use this access to collect network information, identify accounts or shared resources, and prepare additional attacks." }; const concise = technical.length > 420 ? technical.slice(0, 417).replace(/\s+\S*$/, "") + "…" : technical; return { summary: `Testing at ${company} confirmed the security condition described as "${name}."`, evidence: concise || "The penetration-test report recorded this as a validated finding.", impact: a?.business_relevance || "This confirmed weakness could help an attacker gain unauthorized access or move further into the environment. Management should prioritize remediation and verify the fix through retesting." }; };

export default function CCI() {
  const selectedOrganizationId = new URLSearchParams(window.location.search).get("organization");
  const [user, setUser] = useState(null), [form, setForm] = useState({ business_name: "", business_address: "", poc_name: "", poc_email: "", poc_phone: "" }), [files, setFiles] = useState({}), [evidenceFiles, setEvidenceFiles] = useState([]), [revisionBase, setRevisionBase] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [r, setR] = useState(null), [open, setOpen] = useState(true), [scoreExplanationOpen, setScoreExplanationOpen] = useState(true), [selectedSuccess, setSelectedSuccess] = useState(null), [history, setHistory] = useState([]), [ratings, setRatings] = useState([]), [organizations, setOrganizations] = useState([]), [orgFilter, setOrgFilter] = useState("all"), [historyLoading, setHistoryLoading] = useState(true), [profileSaving, setProfileSaving] = useState(false), [profileStatus, setProfileStatus] = useState(""), [deleteTarget, setDeleteTarget] = useState(null), [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState(""), [connectionOpen, setConnectionOpen] = useState(false), [connection, setConnection] = useState({ status: "checking", configured: false, companies: [] }), [connectionLoading, setConnectionLoading] = useState(false), [selectedVPOrg, setSelectedVPOrg] = useState(null), [vpAssessments, setVPAssessments] = useState([]), [vpLoading, setVPLoading] = useState(false), [vpImporting, setVPImporting] = useState(""), [vpError, setVPError] = useState("");
  async function checkConnection(show = false) { if (show) setConnectionOpen(true); setConnectionLoading(true); try { const x = await base44.functions.invoke("vpentestConnection", { action: "status" }); setConnection(x.data) } catch (e) { setConnection({ status: "error", configured: false, message: e?.response?.data?.error || e.message || "Connection status could not be verified.", companies: [] }) } finally { setConnectionLoading(false) } }
  async function loadVPAssessments(org) { setSelectedVPOrg(org); setVPAssessments([]); setVPError(""); setVPLoading(true); const saved = history.find(x => x.organization_id === `vpentest:${org.id}`); setForm(saved ? { business_name: org.name, business_address: saved.business_address || "", poc_name: saved.poc_name || "", poc_email: saved.poc_email || "", poc_phone: saved.poc_phone || "" } : { business_name: org.name, business_address: "", poc_name: "", poc_email: "", poc_phone: "" }); try { const x = await base44.functions.invoke("vpentestConnection", { action: "assessments", company_id: org.id }); setVPAssessments(x.data.assessments || []); if (!(x.data.assessments || []).length) setVPError("No assessments were returned for this organization.") } catch (e) { setVPError(e?.response?.data?.error || e?.response?.data?.message || e.message || "Assessments could not be retrieved.") } finally { setVPLoading(false) } }
  async function importVPAssessment(assessment, closeAfter = true, batchMode = false) { if (!batchMode) setVPError(""); if (!form.business_name.trim()) { const message = "Company name is required before importing."; if (!batchMode) setVPError(message); return { ok: false, error: message } } if (!batchMode) setVPImporting(assessment.id); try { const p = (await base44.functions.invoke("vpentestConnection", { action: "assessment_package", company_id: selectedVPOrg.id, assessment_id: assessment.id })).data; const report_files = []; for (const report of p.reports || []) { for (const [category, key, label] of [["vulnerability_report", "vulnerability_report_url", "Vulnerability Report"], ["executive_summary", "executive_summary_url", "Executive Summary"], ["technical_report", "technical_report_url", "Technical Report"], ["activity_report", "activity_report_url", "Activity Report"]]) if (report[key]) report_files.push({ category, name: `${assessment.name} — ${label}.pdf`, file_url: report[key], uploaded_at: new Date().toISOString(), source: "vpentest_api" }) } const x = await base44.functions.invoke("analyzeCCIAssessment", { ...form, business_name: selectedVPOrg.name, organization_id: `vpentest:${selectedVPOrg.id}`, report_files, api_import: { provider: "vpentest", company_id: selectedVPOrg.id, assessment_id: assessment.id, assessment_name: assessment.name, assessment_date: assessment.created_at, findings: p.findings || [], activities: p.activities || [], warnings: p.warnings || [] } }); const result = x.data.assessment; if (report_files.length && result.evidence_analysis_status !== "completed") try { await base44.functions.invoke("queueCCIEvidenceAnalysis", { assessment_id: result.id }) } catch (queueError) { result.evidence_analysis_status = "failed"; result.evidence_analysis_message = queueError?.response?.data?.error || queueError.message || "Background evidence analysis could not be queued." } setR(result); setRevisionBase(result); setHistory(h => [result, ...h.filter(v => v.id !== result.id)]); setOrganizations(o => o.some(v => v.id === result.organization_id) ? o : [...o, { id: result.organization_id, name: result.business_name }]); if (closeAfter) { setConnectionOpen(false); window.location.href = `/CFRS?organization=${encodeURIComponent(result.organization_id)}` } return { ok: true, reused: Boolean(x.data.reused), assessment: result } } catch (e) { const message = e?.response?.data?.error || e?.response?.data?.message || e.message || "The vPenTest assessment could not be imported."; if (!batchMode) setVPError(message); return { ok: false, error: message } } finally { if (!batchMode) setVPImporting("") } }
  async function importAllVPAssessments() { setVPError(""); if (!form.business_name.trim()) { setVPError("Company name is required before importing."); return } const assessments = [...vpAssessments].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); if (!assessments.length) { setVPError("No assessments were returned for this organization."); return } let imported = 0, current = 0; const failures = []; for (let i = 0; i < assessments.length; i++) { const assessment = assessments[i]; setVPImporting(`all:${i + 1}/${assessments.length}`); const result = await importVPAssessment(assessment, false, true); if (result.ok) { if (result.reused) current++; else imported++ } else failures.push(`${assessment.name} (${assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : "date unavailable"}): ${result.error}`) } setVPImporting(""); try { const refreshed = await base44.functions.invoke("getCCIAssessments", {}); setHistory(refreshed.data.assessments || []); setRatings(refreshed.data.ratings || []); setOrganizations(refreshed.data.organizations || []) } catch (_) { } const completed = imported + current; setVPError(`Import All verified ${completed} of ${assessments.length} assessment(s): ${imported} newly imported, ${current} already current.${failures.length ? ` Failed: ${failures.join(" | ")}` : ""}`) }
  useEffect(() => { (async () => { try { const me = await base44.auth.me(); setUser(me); const x = await base44.functions.invoke("getCCIAssessments", {}); const rows = x.data.assessments || []; setHistory(rows); setRatings(x.data.ratings || []); setOrganizations(x.data.organizations || []); if (selectedOrganizationId) { const selected = [...rows].filter(v => v.organization_id === selectedOrganizationId).sort((a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0))[0]; if (selected) { setR(selected); setRevisionBase(selected); setForm({ business_name: selected.business_name || "", business_address: selected.business_address || "", poc_name: selected.poc_name || "", poc_email: selected.poc_email || "", poc_phone: selected.poc_phone || "" }) } else setError("The selected organization could not be found.") } if (me?.role === "admin") checkConnection(false) } catch (_) { } finally { setHistoryLoading(false) } })() }, []);
  useEffect(() => { if (!history.some(x => x.evidence_analysis_status === "queued" || x.evidence_analysis_status === "processing")) return; const timer = setInterval(async () => { try { const x = await base44.functions.invoke("getCCIAssessments", {}), next = x.data.assessments || []; setHistory(next); setRatings(x.data.ratings || []); setOrganizations(x.data.organizations || []); setR(current => current ? next.find(v => v.id === current.id) || current : current); setRevisionBase(current => current ? next.find(v => v.id === current.id) || current : current) } catch (_) { } }, 30000); return () => clearInterval(timer) }, [history]);
  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const run = async () => { setError(""); if (!form.business_name.trim()) { setError("Company name is required."); return } const selected = Object.entries(files).filter(([, f]) => f); if (!revisionBase && !selected.length) { setError("Upload at least one assessment report."); return } if (revisionBase && !selected.length && !evidenceFiles.length) { setError("Add at least one new evidence file or replacement report before saving a revision."); return } setBusy(true); try { let report_files = [...(revisionBase?.report_files || [])]; for (const [category, file] of selected) { const { file_url } = await base44.integrations.Core.UploadFile({ file }); report_files = report_files.filter(f => f.category !== category); report_files.push({ category, name: file.name, file_url, mime_type: file.type, size: file.size, last_modified: file.lastModified, uploaded_at: new Date().toISOString(), new_upload: true }) } const evidence_files = [...(revisionBase?.evidence_files || [])]; for (const file of evidenceFiles) { const { file_url } = await base44.integrations.Core.UploadFile({ file }); evidence_files.push({ category: "evidence", name: file.name, file_url, mime_type: file.type, size: file.size, last_modified: file.lastModified, uploaded_at: new Date().toISOString(), new_upload: true }) } const x = await base44.functions.invoke("analyzeCCIAssessment", { ...form, organization_id: revisionBase?.organization_id, report_files, evidence_files, revision_of_id: revisionBase?.id }); setR(x.data.assessment); setRevisionBase(x.data.assessment); setFiles({}); setEvidenceFiles([]); setHistory(h => [x.data.assessment, ...h.filter(v => v.id !== x.data.assessment.id)]); setOrganizations(o => o.some(v => v.id === x.data.assessment.organization_id) ? o : [...o, { id: x.data.assessment.organization_id, name: x.data.assessment.business_name }]); window.location.href = `/CFRS?organization=${encodeURIComponent(x.data.assessment.organization_id)}` } catch (e) { setError(e?.response?.data?.error || e.message || "Assessment Intelligence could not process the reports.") } finally { setBusy(false) } };
  const profileDirty = Boolean(revisionBase) && ["business_name", "business_address", "poc_name", "poc_email", "poc_phone"].some(k => String(form[k] || "").trim() !== String(revisionBase[k] || "").trim());
  const saveProfile = async () => { if (!revisionBase?.id || !profileDirty) return; setProfileStatus(""); if (!form.business_name.trim()) { setProfileStatus("Company name is required."); return } setProfileSaving(true); try { const x = await base44.functions.invoke("updateCCIAssessmentProfile", { assessment_id: revisionBase.id, ...form }); const updated = x.data.assessment; setR(v => v?.id === updated.id ? updated : v); setRevisionBase(updated); setHistory(h => h.map(v => v.id === updated.id ? updated : v)); setOrganizations(o => o.map(v => v.id === updated.organization_id ? { ...v, name: updated.business_name } : v)); setProfileStatus("Company profile saved.") } catch (e) { setProfileStatus(e?.response?.data?.error || e.message || "Company profile could not be saved.") } finally { setProfileSaving(false) } };
  const deleteResult = async () => { if (!deleteTarget?.id) return; setDeleting(true); setDeleteError(""); try { await base44.functions.invoke("deleteCCIAssessment", { assessment_id: deleteTarget.id }); setHistory(h => h.filter(v => v.id !== deleteTarget.id)); if (r?.id === deleteTarget.id) setR(null); if (revisionBase?.id === deleteTarget.id) { setRevisionBase(null); setFiles({}); setEvidenceFiles([]); setForm({ business_name: "", business_address: "", poc_name: "", poc_email: "", poc_phone: "" }) } setDeleteTarget(null) } catch (e) { setDeleteError(e?.response?.data?.error || e.message || "The result could not be deleted.") } finally { setDeleting(false) } };
  const stale = r && r.data_confidence === "unknown";
  const officialRating = r ? ratings.find(x => x.organization_id === r.organization_id) : null;
  const orgScore = r ? Number(officialRating?.final_score ?? organizationRollup(history, r)) : CFRS_BASELINE;
  const orgScoredRows = r ? [...history.filter(x => x.organization_id === r.organization_id && x.status === "completed" && x.calculation_version === CFRS_VERSION)].sort((a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0)) : [];
  const orgLatest = orgScoredRows[0] || r;
  const latestAssessmentChange = orgScoredRows.length > 1 ? assessmentScore(orgScoredRows[0]) - assessmentScore(orgScoredRows[1]) : null;
  // Gauge trend falls back to all completed assessments when fewer than 2 versioned rows exist
  const orgAllCompletedRows = r ? [...history.filter(x => x.organization_id === r.organization_id && x.status === "completed")].sort((a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0)) : [];
  const gaugeTrend = orgScoredRows.length > 1 ? latestAssessmentChange : orgAllCompletedRows.length > 1 ? assessmentScore(orgAllCompletedRows[0]) - assessmentScore(orgAllCompletedRows[1]) : null;
  const sourceExplanation = orgLatest?.executive_score_explanation;
  const distinctAssessmentCount = r ? new Set(orgScoredRows.map(x => x.report_fingerprint || x.id)).size : 0;
  const scoreExplanation = sourceExplanation ? { ...sourceExplanation, headline: `${r.business_name} has an organizational CFRS of ${orgScore}, rated ${ratingFor(orgScore)}.`, summary: `This rating consolidates ${distinctAssessmentCount} scored assessment${distinctAssessmentCount === 1 ? "" : "s"} using recency-weighted evidence. ${latestAssessmentChange === null ? "This is the first assessment scored under the current CFRS model." : `The latest assessment ${latestAssessmentChange >= 0 ? "improved" : "reduced"} the organization's measured position by ${Math.abs(latestAssessmentChange)} points compared with the preceding assessment.`} The result reflects vulnerability exposure, demonstrated attack resilience, verified remediation, recurring issues, and historical performance.` } : null;
  const visibleHistory = history.filter(x => orgFilter === "all" || x.organization_id === orgFilter).sort((a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0));
  const organizationCards = Array.from(new Map(visibleHistory.map(x => [x.organization_id, x])).values());
  const validatedFindingActivities = (r?.pentest_findings || []).filter(f => ["critical", "high", "medium"].includes(String(f.severity || "").toLowerCase()) && /spoof|poison|relay|credential|anonymous\s+ftp|null session|remote code execution|\brce\b|shell|injection|authentication bypass|privilege|lateral movement|exfiltrat|code execution/i.test(f.title || "")).map(f => ({ name: f.title, status: "successful", outcome: "Validated penetration-test finding", evidence: f.evidence || `Validated ${f.severity || ""} penetration-test finding`, affected_asset: f.asset || "", source_report: f.source_report || "vPenTest technical findings" }));
  const observedActivities = Array.from(new Map([...(r?.attack_evidence || []), ...validatedFindingActivities].map(a => [String(a.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), a])).values());

  return (
    <div className="cfrs-sg min-h-screen">
      <SoftGraphiteStyle />
      <div className="mx-auto max-w-[1480px] px-4 py-7 lg:px-7">
        <header className="sg-enter mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "#d6dae2" }}>
          <div>
            <div className="sg-micro mb-2 flex items-center gap-2" style={{ color: "#0EA5C7" }}><Gauge className="h-4 w-4" />Capital Intelligence</div>
            <h1 className="text-2xl font-semibold lg:text-3xl">Cyber Financial Risk Score (CFRS)</h1>
            <p className="sg-body mt-1" style={{ color: "#6b7280" }}>Evidence-based scoring from Vulnerability Assessment and Penetration Test reports.</p>
          </div>
          {user?.role === "admin" && !selectedOrganizationId && (
            <button type="button" onClick={() => checkConnection(true)} className="sg-btn flex items-center gap-2 px-3 py-2 text-xs" style={connection.status === "connected" ? { color: "#0f9d58", borderColor: "#0f9d5840", background: "#0f9d5814" } : connection.status === "checking" ? { color: "#6b7280" } : { color: "#b8860b", borderColor: "#b8860b40", background: "#b8860b14" }}>
              <Plug className="h-3.5 w-3.5" />Assessment Intelligence · {connection.status === "connected" ? "vPenTest connected" : connection.status === "checking" ? "Checking connection…" : "vPenTest disconnected"}
            </button>
          )}
        </header>

        {!selectedOrganizationId && (
          <section className="sg-panel sg-panel-hover sg-enter mb-5 p-5" style={{ animationDelay: ".05s" }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" style={{ color: "#0EA5C7" }} />Saved CFRS Organizations</div>
                <p className="sg-body mt-1" style={{ color: "#6b7280" }}>Organization cards and organization selection are managed on a dedicated page.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/CFRS/organizations" className="sg-btn px-4 py-2 text-xs font-semibold" style={{ color: "#0EA5C7" }}>View saved organizations</a>
                <a href="/CFRS?new=1" className="sg-btn-primary px-4 py-2 text-xs font-semibold">Add organization</a>
              </div>
            </div>
          </section>
        )}

        <section className="sg-panel sg-panel-hover sg-enter mb-5 p-5" style={{ animationDelay: ".1s" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4" style={{ color: "#0EA5C7" }} />Customer profile</h2>
              <p className="sg-body mt-1" style={{ color: "#6b7280" }}>Logistical changes save without rerunning or changing the CFRS score.</p>
            </div>
            {revisionBase && (
              <div className="flex gap-2">
                <button type="button" onClick={() => { setDeleteError(""); setDeleteTarget(revisionBase) }} className="sg-btn-danger flex h-9 items-center gap-2 px-3 text-xs font-semibold"><Trash2 className="h-3.5 w-3.5" />Delete Result</button>
                <button type="button" onClick={saveProfile} disabled={!profileDirty || profileSaving} className="sg-btn-primary flex h-9 items-center gap-2 px-3 text-xs font-semibold">{profileSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}{profileSaving ? "Saving…" : profileDirty ? "Save Changes" : "Saved"}</button>
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Company name *" icon={Building2} value={form.business_name} onChange={e => { set("business_name", e.target.value); setProfileStatus("") }} />
            <Field label="Business address" icon={MapPin} value={form.business_address} onChange={e => { set("business_address", e.target.value); setProfileStatus("") }} />
            <Field label="POC name" icon={UserRound} value={form.poc_name} onChange={e => { set("poc_name", e.target.value); setProfileStatus("") }} />
            <Field label="POC email" type="email" value={form.poc_email} onChange={e => { set("poc_email", e.target.value); setProfileStatus("") }} />
            <Field label="POC phone" value={form.poc_phone} onChange={e => { set("poc_phone", e.target.value); setProfileStatus("") }} />
          </div>
          {profileStatus && <div className="sg-panel mt-3 p-2.5 text-xs" style={profileStatus === "Company profile saved." ? { color: "#0f9d58", background: "#0f9d5814", borderColor: "#0f9d5840" } : { color: "#dc2626", background: "#dc262614", borderColor: "#dc262640" }}>{profileStatus}</div>}
        </section>

        {selectedOrganizationId && (
          <div className="sg-panel sg-enter mb-5 flex items-center justify-between px-4 py-3" style={{ animationDelay: ".15s" }}>
            <div>
              <div className="sg-micro" style={{ color: "#0EA5C7" }}>Organization workspace</div>
              <div className="mt-1 text-sm font-semibold">{r?.business_name || "Loading organization…"}</div>
            </div>
            <a href="/CFRS" className="sg-btn px-3 py-2 text-xs">← Back to main CFRS</a>
          </div>
        )}

        {historyLoading && !r ? (
          <div className="sg-enter mb-5" style={{ animationDelay: ".2s" }}><SkeletonGrid count={4} /></div>
        ) : r && (
          <section className="sg-score-card sg-enter mb-5 overflow-hidden" style={{ animationDelay: ".2s" }}>
            <div className="grid lg:grid-cols-[.42fr_1.58fr]">
              <div className="border-b p-5 lg:border-b-0 lg:border-r" style={{ borderColor: "#d6dae2" }}>
                <div className="sg-micro" style={{ color: "#0EA5C7" }}>CFRS</div>
                <div className="mt-2 flex items-center gap-4">
                  <div className="text-5xl font-semibold sg-tabular"><CountUp target={orgScore} duration={1100} /></div>
                  <RadialGauge score={orgScore} min={CFRS_MIN} max={CFRS_MAX} size={116} trend={gaugeTrend} />
                </div>
                <div className="mt-1 text-sm font-medium" style={{ color: "#0EA5C7" }}>{ratingFor(orgScore)} · −500 to 1,000</div>
                <div className="mt-5"><ScoreBar score={orgScore} /></div>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{r.business_name}</h2>
                    {(r.business_address || r.poc_name) && <p className="text-xs" style={{ color: "#6b7280" }}>{[r.business_address, r.poc_name && `POC: ${r.poc_name}`].filter(Boolean).join(" · ")}</p>}</div>
                  <SemanticBadge tone={stale ? "critical" : "success"}>Evidence status: {r.data_confidence === "expired" || r.data_confidence === "expiring" ? "historical" : r.data_confidence}</SemanticBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Tile label="Latest vulnerability posture" value={vulnerabilityAssessed(orgLatest) ? componentRating(Number(orgLatest.vulnerability_score)) : "Not assessed"} sub={vulnerabilityAssessed(orgLatest) ? `${orgLatest.vulnerability_score}/100 · latest assessment` : "No VulScan evidence was returned"} tone={vulnerabilityAssessed(orgLatest) ? "text-cyan-600" : ""} />
                  <Tile label="Latest penetration resilience" value={componentRating(Number(orgLatest?.penetration_test_score || 0))} sub={`${orgLatest?.penetration_test_score || 0}/100 · latest assessment`} tone="text-violet-600" />
                  <Tile label="Latest assessment change" value={latestAssessmentChange === null ? "New" : `${latestAssessmentChange >= 0 ? "+" : ""}${latestAssessmentChange}`} sub={latestAssessmentChange === null ? "First score under current model" : "Compared with preceding assessment"} tone={latestAssessmentChange === null ? "text-cyan-600" : latestAssessmentChange >= 0 ? "text-emerald-600" : "text-red-500"} />
                  <Tile label="Security rating" value={ratingFor(orgScore)} sub="Recency-weighted organization rating" tone={orgScore >= 750 ? "text-emerald-600" : orgScore >= 450 ? "text-amber-600" : "text-red-500"} />
                </div>
                {r.evidence_analysis_status && r.evidence_analysis_status !== "not_required" && (
                  <div className="sg-panel mt-4 p-3 text-xs" style={r.evidence_analysis_status === "failed" ? { color: "#dc2626", background: "#dc262614", borderColor: "#dc262640" } : r.evidence_analysis_status === "completed" ? { color: "#0f9d58", background: "#0f9d5814", borderColor: "#0f9d5840" } : { color: "#0EA5C7", background: "#0ea5c714", borderColor: "#0ea5c740" }}>
                    <div className="flex items-center justify-between gap-3"><strong className="sg-micro">Evidence analysis: {r.evidence_analysis_status}</strong><span className="sg-tabular">{Number(r.evidence_analysis_progress || 0)}%</span></div>
                    <div className="mt-1" style={{ color: "#2A2F3A" }}>{r.evidence_analysis_message}</div>
                    {(r.evidence_analysis_status === "queued" || r.evidence_analysis_status === "processing") && <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "#d6dae2" }}><div className="h-full transition-all" style={{ width: `${Math.max(3, Number(r.evidence_analysis_progress || 0))}%`, background: "#0EA5C7" }} /></div>}
                  </div>
                )}
                <div className="sg-panel mt-4 p-3 text-xs" style={stale ? { color: "#dc2626", background: "#dc262614", borderColor: "#dc262640" } : { color: "#0f9d58", background: "#0f9d5814", borderColor: "#0f9d5840" }}>{r.data_confidence === "expired" || r.data_confidence === "expiring" ? `Historical evidence retained. This result remains part of ${r.business_name}'s recency-weighted CFRS history.` : r.confidence_message}</div>
              </div>
            </div>
            <div className="border-t p-5" style={{ borderColor: "#d6dae2" }}>
              <p className="sg-body">{r.executive_summary}</p>
              <p className="mt-2 text-xs" style={{ color: "#6b7280" }}>{r.coverage_summary}</p>
            </div>
          </section>
        )}

        {r && scoreExplanation && (
          <section className="sg-panel sg-enter mb-5 overflow-hidden" style={{ animationDelay: ".25s" }}>
            <button type="button" onClick={() => setScoreExplanationOpen(v => !v)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
              <div>
                <div className="sg-micro" style={{ color: "#0EA5C7" }}>Executive score explanation</div>
                <h2 className="mt-1 text-base font-semibold">{scoreExplanation.headline}</h2>
                <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>Business interpretation of the verified assessment results</p>
              </div>
              {scoreExplanationOpen ? <ChevronUp className="h-5 w-5 shrink-0" style={{ color: "#6b7280" }} /> : <ChevronDown className="h-5 w-5 shrink-0" style={{ color: "#6b7280" }} />}
            </button>
            {scoreExplanationOpen && (
              <div className="border-t p-5" style={{ borderColor: "#d6dae2" }}>
                <p className="sg-body">{scoreExplanation.summary}</p>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="sg-panel p-4" style={{ background: "#dc26260a" }}>
                    <div className="sg-micro" style={{ color: "#dc2626" }}>Factors increasing exposure</div>
                    {scoreExplanation.key_pressures?.length ? <ul className="mt-3 space-y-2 text-xs leading-5">{scoreExplanation.key_pressures.map((item, i) => <li key={i} className="flex gap-2"><span style={{ color: "#dc2626" }}>•</span><span>{item}</span></li>)}</ul> : <p className="mt-3 text-xs" style={{ color: "#6b7280" }}>No material downward drivers were identified in the scored evidence.</p>}
                  </div>
                  <div className="sg-panel p-4" style={{ background: "#0f9d580a" }}>
                    <div className="sg-micro" style={{ color: "#0f9d58" }}>Factors supporting resilience</div>
                    {scoreExplanation.key_strengths?.length ? <ul className="mt-3 space-y-2 text-xs leading-5">{scoreExplanation.key_strengths.map((item, i) => <li key={i} className="flex gap-2"><span style={{ color: "#0f9d58" }}>•</span><span>{item}</span></li>)}</ul> : <p className="mt-3 text-xs" style={{ color: "#6b7280" }}>The scored evidence did not produce a material positive resilience adjustment.</p>}
                  </div>
                </div>
                <div className="sg-panel mt-4 p-4" style={{ background: "#b8860b0a" }}>
                  <div className="sg-micro" style={{ color: "#b8860b" }}>Leadership priorities</div>
                  <ol className="mt-3 space-y-2 text-xs leading-5">{scoreExplanation.executive_priorities?.map((item, i) => <li key={i} className="flex gap-3"><span className="font-semibold sg-tabular" style={{ color: "#b8860b" }}>{i + 1}.</span><span>{item}</span></li>)}</ol>
                </div>
                <p className="mt-4 text-[10px] leading-4" style={{ color: "#9aa1ad" }}>{scoreExplanation.method_note}</p>
              </div>
            )}
          </section>
        )}

        {r && <HistoryReport history={history} current={r} />}

        <div className="sg-enter mt-5" style={{ animationDelay: ".3s" }}>
          <section className="sg-panel sg-panel-hover p-5">
            {revisionBase && (
              <div className="sg-panel mb-4 p-3" style={{ background: "#7c3aed0a", borderColor: "#7c3aed40" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "#7c3aed" }}>Revising saved output · Version {revisionBase.revision_number || 1}</div>
                    <p className="mt-1 text-[10px] leading-4" style={{ color: "#6b7280" }}>Existing reports and evidence are carried forward. The original score remains unchanged for audit history.</p>
                  </div>
                  <button type="button" onClick={() => { setRevisionBase(null); setFiles({}); setEvidenceFiles([]); setForm({ business_name: "", business_address: "", poc_name: "", poc_email: "", poc_phone: "" }); setError("") }} className="sg-btn shrink-0 px-2.5 py-1.5 text-[10px]">Start new</button>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4" style={{ color: "#0EA5C7" }} />Assessment reports</h2>
                <p className="sg-body mt-1" style={{ color: "#6b7280" }}>{revisionBase ? "Upload only reports you want to replace." : "PDF, Word, Excel, or CSV."}</p>
              </div>
              <span className="text-xs" style={{ color: "#6b7280" }}>{revisionBase ? (revisionBase.report_files?.length || 0) + " saved" : Object.values(files).filter(Boolean).length + "/4"}</span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {TYPES.map(([k, l, h]) => (
                <label key={k} className={`sg-tile cursor-pointer p-3 ${files[k] ? "" : ""}`} style={files[k] ? { borderColor: "#0EA5C7", background: "#0ea5c714" } : {}}>
                  <input className="hidden" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={e => setFiles(s => ({ ...s, [k]: e.target.files?.[0] || null }))} />
                  <div className="flex gap-3">
                    <FileText className="h-4 w-4 shrink-0" style={{ color: "#0EA5C7" }} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{l}</div>
                      <div className="mt-1 text-[10px]" style={{ color: "#6b7280" }}>{h}</div>
                      <div className="mt-2 truncate text-[10px]" style={{ color: "#0EA5C7" }}>{files[k]?.name || (revisionBase?.report_files?.some(f => f.category === k) ? "Saved report · choose to replace" : "Choose file")}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="sg-panel mt-4 p-3" style={{ background: "#0ea5c70a", borderColor: "#0ea5c740" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold" style={{ color: "#0EA5C7" }}>Supporting evidence attachments</div>
                  <p className="mt-1 text-[10px]" style={{ color: "#6b7280" }}>Narratives, exported findings, logs, and structured evidence. Multiple files allowed.</p>
                </div>
                <label className="sg-btn cursor-pointer px-3 py-2 text-[10px] font-semibold" style={{ color: "#0EA5C7" }}>
                  <input className="hidden" multiple type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.log,.xml" onChange={e => { const next = Array.from(e.target.files || []); setEvidenceFiles(s => [...s, ...next]); e.target.value = "" }} />Add evidence
                </label>
              </div>
              {(revisionBase?.evidence_files?.length || 0) > 0 && <div className="mt-3 text-[10px]" style={{ color: "#6b7280" }}>{revisionBase.evidence_files.length} saved evidence file(s) will be carried forward.</div>}
              {evidenceFiles.length > 0 && (
                <div className="mt-3 space-y-1">{evidenceFiles.map((f, i) => (
                  <div key={f.name + i} className="sg-panel flex items-center justify-between gap-2 px-2.5 py-2 text-[10px]">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setEvidenceFiles(s => s.filter((_, n) => n !== i))} style={{ color: "#6b7280" }} aria-label={`Remove ${f.name}`}><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}</div>
              )}
              <div className="sg-panel mt-3 flex gap-2 p-2.5 text-[10px] leading-4" style={{ color: "#b8860b", background: "#b8860b14", borderColor: "#b8860b40" }}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Redact credentials, hashes, tokens, keys, patient data, and unnecessary personal information. Do not upload raw secrets-dump or credential files.
              </div>
            </div>
            <button onClick={run} disabled={busy} className="sg-btn-primary mt-4 flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{busy ? "Analyzing evidence…" : revisionBase ? "Analyze & Save Revised Output" : "Run Assessment Intelligence"}</button>
            {error && <div className="sg-panel mt-3 p-3 text-xs" style={{ color: "#dc2626", background: "#dc262614", borderColor: "#dc262640" }}>{error}</div>}
          </section>
        </div>

        {r && (
          <section className="sg-panel sg-panel-hover sg-enter mt-5 p-5" style={{ animationDelay: ".35s" }}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="sg-micro" style={{ color: "#b8860b" }}>Attack evidence</div>
                <h2 className="mt-1 text-lg font-semibold">Activities observed in the reports</h2>
                <p className="sg-body" style={{ color: "#6b7280" }}>Yellow = attempted. Red = explicitly verified successful.</p>
              </div>
              <div className="flex gap-2"><SemanticBadge tone="attempted">Attempted</SemanticBadge><SemanticBadge tone="successful">Successful</SemanticBadge></div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {observedActivities.length ? observedActivities.map((a, i) => (
                <button type="button" key={i} onClick={() => isSuccessful(a) && setSelectedSuccess(a)} className={`sg-panel p-3 text-left ${isSuccessful(a) ? "cursor-pointer sg-panel-hover" : "cursor-default"}`} style={isSuccessful(a) ? { borderColor: "#dc262640", background: "#dc26260a" } : { borderColor: "#b8860b40", background: "#b8860b0a" }}>
                  <div className="sg-micro mb-1" style={isSuccessful(a) ? { color: "#dc2626" } : { color: "#b8860b" }}>Attack correlation · {correlationFor(a)}</div>
                  <div className="sg-micro mb-1" style={{ color: "#6b7280" }}>Attack vector · {vectorFor(a)}</div>
                  <div className="flex items-center gap-2 text-sm font-semibold">{isSuccessful(a) ? <ShieldAlert className="h-4 w-4" style={{ color: "#dc2626" }} /> : <AlertTriangle className="h-4 w-4" style={{ color: "#b8860b" }} />}{a.name}</div>
                  {(a.mitre_technique_id || a.mitre_tactic) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="sg-badge" style={{ color: "#0EA5C7", background: "#0ea5c714", borderColor: "#0ea5c740" }}>{a.mitre_technique_id || "MITRE"}</span>
                      {a.mitre_technique_name && <span className="sg-badge" style={{ color: "#6b7280", background: "#6b728014", borderColor: "#6b728040" }}>{a.mitre_technique_name}</span>}
                      {a.mitre_tactic && a.mitre_technique_name && <span className="sg-badge" style={{ color: "#9aa1ad", background: "#6b728014", borderColor: "#6b728040" }}>{a.mitre_tactic}</span>}
                    </div>
                  )}
                  <p className="mt-2 text-[11px]" style={{ color: "#6b7280" }}>{plainText(a.evidence)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[9px] uppercase" style={{ color: "#9aa1ad" }}><span>{a.source_report}</span>{isSuccessful(a) && <span style={{ color: "#dc2626" }}>View event details →</span>}</div>
                </button>
              )) : (
                <div className="col-span-full"><EmptyState icon={Inbox} title="No attack activity" message="No attack activity was documented in the submitted reports." /></div>
              )}
            </div>
          </section>
        )}

        {connectionOpen && user?.role === "admin" && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setConnectionOpen(false)}>
            <div className="sg-score-card max-h-[88vh] w-full max-w-2xl overflow-y-auto">
              <div className="sticky top-0 flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "#d6dae2", background: "linear-gradient(145deg,#f8f9fb,#f0f2f6)" }}>
                <div>
                  <div className="sg-micro" style={{ color: "#0EA5C7" }}>Administrator connection settings</div>
                  <h2 className="mt-1 text-xl font-semibold">vPenTest API</h2>
                </div>
                <button onClick={() => setConnectionOpen(false)} className="sg-btn p-2"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4 p-5">
                <div className="sg-panel p-4" style={connection.status === "connected" ? { borderColor: "#0f9d5840", background: "#0f9d5814" } : { borderColor: "#b8860b40", background: "#b8860b14" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="sg-micro">Live connection status</div>
                      <div className="mt-1 text-lg font-semibold" style={connection.status === "connected" ? { color: "#0f9d58" } : { color: "#b8860b" }}>{connectionLoading ? "Testing…" : String(connection.status || "unknown").replaceAll("_", " ")}</div>
                      <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>{connection.message || "The vPenTest API has not been verified."}</p>
                    </div>
                    <button type="button" disabled={connectionLoading} onClick={() => checkConnection(false)} className="sg-btn flex items-center gap-2 px-3 py-2 text-xs"><RefreshCw className={`h-3.5 w-3.5 ${connectionLoading ? "animate-spin" : ""}`} />Test connection</button>
                  </div>
                  {connection.checked_at && <div className="mt-3 text-[10px]" style={{ color: "#9aa1ad" }}>Last checked: {new Date(connection.checked_at).toLocaleString()}</div>}
                </div>
                <div className="sg-panel p-4">
                  <div className="text-xs font-semibold">Secure configuration required</div>
                  <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5" style={{ color: "#6b7280" }}>
                    <li>In vPenTest, open <strong>My Account → My Settings → API Key</strong>.</li>
                    <li>Generate and immediately copy the API key; vPenTest displays it only once.</li>
                    <li>Add it to Xtreme I.C.E. Base44 secrets as <code className="sg-panel px-1.5 py-0.5" style={{ color: "#0EA5C7" }}>VPENTEST_API_KEY</code>.</li>
                    <li>Return here and select <strong>Test connection</strong>.</li>
                  </ol>
                  <a href="https://help.vonahi.kaseya.com/help/Content/5-Integrations/vpentest-api.htm" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: "#0EA5C7" }}>Official vPenTest API instructions <ExternalLink className="h-3 w-3" /></a>
                </div>
                {connection.status === "connected" && (
                  <div className="sg-panel p-4" style={{ borderColor: "#0f9d5840", background: "#0f9d5814" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold" style={{ color: "#0f9d58" }}>Organizations available for import</div>
                        <p className="mt-1 text-[10px]" style={{ color: "#6b7280" }}>These are returned live by vPenTest and will be used to map assessments and reports to CFRS organizations.</p>
                      </div>
                      <span className="text-2xl font-semibold sg-tabular" style={{ color: "#0f9d58" }}>{connection.total_count ?? connection.companies?.length ?? 0}</span>
                    </div>
                    <div className={`${selectedVPOrg ? "hidden" : "grid"} mt-3 max-h-48 gap-2 overflow-y-auto sm:grid-cols-2`}>
                      {connection.companies?.map(c => (
                        <button type="button" key={c.id} onClick={() => loadVPAssessments(c)} className="sg-panel sg-panel-hover px-3 py-2 text-left" style={selectedVPOrg?.id === c.id ? { borderColor: "#0EA5C7", background: "#0ea5c714" } : {}}>
                          <div className="truncate text-xs">{c.name}</div>
                          <div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-[9px]" style={{ color: "#9aa1ad" }}>{c.id}</span><span className="shrink-0 text-[9px]" style={{ color: "#0EA5C7" }}>View assessments →</span></div>
                        </button>
                      ))}
                    </div>
                    {selectedVPOrg && (
                      <div className="mt-4 border-t pt-4" style={{ borderColor: "#d6dae2" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold" style={{ color: "#0EA5C7" }}>{selectedVPOrg.name} assessments</div>
                            <p className="mt-1 text-[10px]" style={{ color: "#6b7280" }}>Import one assessment, or import every new assessment for this organization.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={Boolean(vpImporting) || !vpAssessments.length} onClick={importAllVPAssessments} className="sg-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-semibold">{String(vpImporting).startsWith("all") ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}{String(vpImporting).startsWith("all:") ? `Importing ${vpImporting.slice(4)}` : "Import All"}</button>
                            <button type="button" onClick={() => { setSelectedVPOrg(null); setVPAssessments([]); setVPError("") }} className="sg-btn px-2.5 py-1.5 text-[9px]">← Organizations</button>
                          </div>
                          {vpLoading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#0EA5C7" }} />}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Field label="Business address" icon={MapPin} value={form.business_address} onChange={e => set("business_address", e.target.value)} />
                          <Field label="Point of contact" icon={UserRound} value={form.poc_name} onChange={e => set("poc_name", e.target.value)} />
                        </div>
                        {vpError && <div className="sg-panel mt-3 p-2.5 text-[10px]" style={{ color: "#b8860b", background: "#b8860b14", borderColor: "#b8860b40" }}>{vpError}</div>}
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                          {vpAssessments.map(a => (
                            <div key={a.id} className="sg-panel flex items-center justify-between gap-3 p-3">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold">{a.name}</div>
                                <div className="mt-1 flex flex-wrap gap-2 text-[9px] uppercase" style={{ color: "#6b7280" }}>{a.created_at && <span>{new Date(a.created_at).toLocaleDateString()}</span>}{a.status && <span>{a.status}</span>}{a.severity && <span>{a.severity}</span>}</div>
                              </div>
                              <button type="button" disabled={Boolean(vpImporting)} onClick={() => importVPAssessment(a)} className="sg-btn-primary flex shrink-0 items-center gap-1.5 px-3 py-2 text-[10px] font-semibold">{vpImporting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{vpImporting === a.id ? "Importing…" : "Import & Score"}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="sg-panel p-4 text-xs leading-5" style={{ color: "#6b7280", borderColor: "#7c3aed40", background: "#7c3aed0a" }}><strong style={{ color: "#7c3aed" }}>Automatic import:</strong> after the first organization import establishes its CFRS profile, CFRS checks vPenTest every six hours for newly completed penetration tests and linked VulScan assessments. New results are imported, scored, and added to the organization's rating history automatically.</div>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={e => !deleting && e.target === e.currentTarget && setDeleteTarget(null)}>
            <div className="sg-score-card w-full max-w-md p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ border: "1px solid #dc262640", background: "#dc262614", color: "#dc2626" }}><Trash2 className="h-5 w-5" /></div>
              <h2 className="mt-4 text-xl font-semibold">Delete this CFRS result?</h2>
              <p className="sg-body mt-2" style={{ color: "#6b7280" }}>This permanently deletes the saved result for <strong style={{ color: "#2A2F3A" }}>{deleteTarget.business_name}</strong>, including its score of <strong className="sg-tabular" style={{ color: "#2A2F3A" }}>{deleteTarget.final_score}</strong> and version {deleteTarget.revision_number || 1}. Uploaded source files are not modified.</p>
              {deleteTarget.is_current_rating && <div className="sg-panel mt-3 p-3 text-xs" style={{ color: "#b8860b", background: "#b8860b14", borderColor: "#b8860b40" }}>This is a current rating. The organization will fall back to its newest remaining valid result, if available.</div>}
              {deleteError && <div className="sg-panel mt-3 p-3 text-xs" style={{ color: "#dc2626", background: "#dc262614", borderColor: "#dc262640" }}>{deleteError}</div>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="sg-btn px-4 py-2 text-xs">Cancel</button>
                <button type="button" disabled={deleting} onClick={deleteResult} className="sg-btn-danger flex items-center gap-2 px-4 py-2 text-xs font-semibold">{deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}{deleting ? "Deleting…" : "Delete Permanently"}</button>
              </div>
            </div>
          </div>
        )}

        {selectedSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setSelectedSuccess(null)}>
            <div className="sg-score-card max-h-[88vh] w-full max-w-2xl overflow-y-auto">
              <div className="sticky top-0 flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "#d6dae2", background: "linear-gradient(145deg,#f8f9fb,#f0f2f6)" }}>
                <div>
                  <div className="sg-micro" style={{ color: "#dc2626" }}>Successful activity · {correlationFor(selectedSuccess)} · {vectorFor(selectedSuccess)} vector</div>
                  <h2 className="mt-1 text-xl font-semibold">{selectedSuccess.name}</h2>
                </div>
                <button onClick={() => setSelectedSuccess(null)} className="sg-btn p-2" aria-label="Close event details"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4 p-5">
                <div className="sg-panel p-4" style={{ borderColor: "#dc262640", background: "#dc26260a" }}>
                  <div className="sg-micro" style={{ color: "#dc2626" }}>Company-specific event summary</div>
                  <p className="sg-body mt-2">{executiveEvidence(selectedSuccess, r?.business_name || "the organization").summary}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sg-panel p-4"><div className="sg-micro">Affected asset</div><div className="mt-2 text-sm">{selectedSuccess.affected_asset || "Not identified in the report"}</div></div>
                  <div className="sg-panel p-4"><div className="sg-micro">MITRE ATT&CK</div><div className="mt-2 text-sm">{[selectedSuccess.mitre_technique_id, selectedSuccess.mitre_technique_name, selectedSuccess.mitre_tactic].filter(Boolean).join(" · ") || "No defensible mapping documented"}</div></div>
                </div>
                <div><div className="sg-micro">Evidence of success</div><p className="sg-body mt-2">{executiveEvidence(selectedSuccess, r?.business_name || "the organization").evidence}</p></div>
                <div><div className="sg-micro">Why it matters to {r?.business_name}</div><p className="sg-body mt-2">{executiveEvidence(selectedSuccess, r?.business_name || "the organization").impact}</p></div>
                <div className="text-[10px]" style={{ color: "#9aa1ad" }}>Source: {selectedSuccess.source_report}</div>
              </div>
            </div>
          </div>
        )}

        {r && user?.role === "admin" && (
          <section className="sg-panel sg-enter mt-5 overflow-hidden" style={{ animationDelay: ".4s" }}>
            <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-5 text-left">
              <div>
                <div className="sg-micro" style={{ color: "#7c3aed" }}>Administrator detail</div>
                <div className="mt-1 text-sm font-semibold">Expanded score calculations</div>
              </div>
              {open ? <ChevronUp /> : <ChevronDown />}
            </button>
            {open && (
              <div className="grid gap-4 border-t p-5 lg:grid-cols-2" style={{ borderColor: "#d6dae2" }}>
                {["vulnerability", "penetration_test"].map(k => {
                  const b = r.scoring_breakdown?.[k] || {};
                  return (
                    <div key={k} className="sg-panel p-4">
                      <div className="flex justify-between"><h3 className="text-sm font-semibold">{k === "vulnerability" ? "Vulnerability Assessment" : "Penetration Test"}</h3><b className="sg-tabular" style={{ color: "#0EA5C7" }}>{k === "vulnerability" && b.assessed === false ? "Not assessed" : `${b.final_score}/100`}</b></div>
                      <div className="mt-3">
                        {k === "vulnerability" && b.assessed === false ? <div className="text-xs" style={{ color: "#6b7280" }}>No vulnerability findings were returned or verified, so this component contributes neither credit nor a penalty.</div> : <div className="flex justify-between text-xs" style={{ color: "#6b7280" }}><span>Starting score</span><span className="sg-tabular">100</span></div>}
                        {b.items?.map((i, n) => <div key={n} className="mt-2 flex justify-between gap-4 border-t pt-2 text-xs" style={{ borderColor: "#d6dae2" }}><span style={{ color: "#6b7280" }}>{i.label}</span><span className="shrink-0 sg-tabular" style={{ color: "#dc2626" }}>{i.points} pts</span></div>)}
                      </div>
                    </div>
                  );
                })}
                <div className="sg-panel lg:col-span-2 space-y-2 p-4 text-xs" style={{ background: "#0ea5c70a", borderColor: "#0ea5c740" }}>
                  <div>Current assessment result: <b className="sg-tabular">{r.scoring_breakdown.rating.current_assessment_score}</b></div>
                  <div style={{ color: "#6b7280" }}>Posture adjustments: {r.scoring_breakdown.rating.vulnerability_adjustment >= 0 ? "+" : ""}{r.scoring_breakdown.rating.vulnerability_adjustment} vulnerability · {r.scoring_breakdown.rating.penetration_test_adjustment >= 0 ? "+" : ""}{r.scoring_breakdown.rating.penetration_test_adjustment} penetration · {Number(r.scoring_breakdown.rating.remediation_adjustment || 0) >= 0 ? "+" : ""}{Number(r.scoring_breakdown.rating.remediation_adjustment || 0)} remediation · −{Number(r.scoring_breakdown.rating.validated_attack_penalty || 0)} attacks · −{Number(r.scoring_breakdown.rating.repeat_finding_penalty || 0)} repeats · −{Number(r.scoring_breakdown.rating.exposure_concentration_penalty || 0)} concentration</div>
                  <div>Historical rating: <span className="sg-tabular">{r.scoring_breakdown.rating.history_weighted_base}</span> {r.scoring_breakdown.rating.trend_adjustment >= 0 ? "+" : ""}{r.scoring_breakdown.rating.trend_adjustment} trend = <b className="sg-tabular">{r.final_score}</b> · {r.scoring_breakdown.rating.assessment_count} assessment(s)</div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}