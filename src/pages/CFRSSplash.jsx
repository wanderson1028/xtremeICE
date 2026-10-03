import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  ExternalLink, FileText, Gauge, History, Loader2, MapPin, Paperclip,
  Plug, RefreshCw, Upload, UserRound, X,
} from "lucide-react";
import CFRSBreadcrumb from "@/components/cfrs/CFRSBreadcrumb";

const Field = ({ label, icon: Icon, ...x }) => (
  <label>
    <span className="sg-micro mb-1.5 flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5" />}{label}
    </span>
    <input {...x} className="sg-input h-10 w-full px-3 text-sm" />
  </label>
);

export default function CFRSSplash() {
  const [user, setUser] = useState(null);
  const [connection, setConnection] = useState({ status: "checking", configured: false, companies: [] });
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [selectedVPOrg, setSelectedVPOrg] = useState(null);
  const [vpAssessments, setVPAssessments] = useState([]);
  const [vpLoading, setVPLoading] = useState(false);
  const [vpImporting, setVPImporting] = useState("");
  const [vpError, setVPError] = useState("");
  const [form, setForm] = useState({ business_name: "", logo_url: "", business_address: "", poc_name: "", poc_email: "", poc_phone: "" });
  const [history, setHistory] = useState([]);

  async function checkConnection(show = false) {
    if (show) setConnectionOpen(true);
    setConnectionLoading(true);
    try {
      const x = await base44.functions.invoke("vpentestConnection", { action: "status" });
      setConnection(x.data);
    } catch (e) {
      setConnection({ status: "error", configured: false, message: e?.response?.data?.error || e.message || "Connection status could not be verified.", companies: [] });
    } finally {
      setConnectionLoading(false);
    }
  }

  async function loadVPAssessments(org) {
    setSelectedVPOrg(org);
    setVPAssessments([]);
    setVPError("");
    setVPLoading(true);
    const saved = history.find(x => x.organization_id === `vpentest:${org.id}`);
    setForm(saved ? { business_name: org.name, logo_url: saved.logo_url || "", business_address: saved.business_address || "", poc_name: saved.poc_name || "", poc_email: saved.poc_email || "", poc_phone: saved.poc_phone || "" } : { business_name: org.name, logo_url: "", business_address: "", poc_name: "", poc_email: "", poc_phone: "" });
    try {
      const x = await base44.functions.invoke("vpentestConnection", { action: "assessments", company_id: org.id });
      setVPAssessments(x.data.assessments || []);
      if (!(x.data.assessments || []).length) setVPError("No assessments were returned for this organization.");
    } catch (e) {
      setVPError(e?.response?.data?.error || e?.response?.data?.message || e.message || "Assessments could not be retrieved.");
    } finally {
      setVPLoading(false);
    }
  }

  async function importVPAssessment(assessment, closeAfter = true, batchMode = false) {
    if (!batchMode) setVPError("");
    if (!form.business_name.trim()) {
      const message = "Company name is required before importing.";
      if (!batchMode) setVPError(message);
      return { ok: false, error: message };
    }
    if (!batchMode) setVPImporting(assessment.id);
    try {
      const p = (await base44.functions.invoke("vpentestConnection", { action: "assessment_package", company_id: selectedVPOrg.id, assessment_id: assessment.id })).data;
      const report_files = [];
      for (const report of p.reports || []) {
        for (const [category, key, label] of [["vulnerability_report", "vulnerability_report_url", "Vulnerability Report"], ["executive_summary", "executive_summary_url", "Executive Summary"], ["technical_report", "technical_report_url", "Technical Report"], ["activity_report", "activity_report_url", "Activity Report"]]) {
          if (report[key]) report_files.push({ category, name: `${assessment.name} — ${label}.pdf`, file_url: report[key], uploaded_at: new Date().toISOString(), source: "vpentest_api" });
        }
      }
      const x = await base44.functions.invoke("analyzeCCIAssessment", { ...form, business_name: selectedVPOrg.name, organization_id: `vpentest:${selectedVPOrg.id}`, report_files, api_import: { provider: "vpentest", company_id: selectedVPOrg.id, assessment_id: assessment.id, assessment_name: assessment.name, assessment_date: assessment.created_at, findings: p.findings || [], activities: p.activities || [], warnings: p.warnings || [] } });
      const result = x.data.assessment;
      if (report_files.length && result.evidence_analysis_status !== "completed") {
        try { await base44.functions.invoke("queueCCIEvidenceAnalysis", { assessment_id: result.id }); } catch (_) {}
      }
      setHistory(h => [result, ...h.filter(v => v.id !== result.id)]);
      if (closeAfter) {
        setConnectionOpen(false);
        window.location.href = `/CFRS?organization=${encodeURIComponent(result.organization_id)}`;
      }
      return { ok: true, reused: Boolean(x.data.reused), assessment: result };
    } catch (e) {
      const message = e?.response?.data?.error || e?.response?.data?.message || e.message || "The vPenTest assessment could not be imported.";
      if (!batchMode) setVPError(message);
      return { ok: false, error: message };
    } finally {
      if (!batchMode) setVPImporting("");
    }
  }

  async function importAllVPAssessments() {
    setVPError("");
    if (!form.business_name.trim()) { setVPError("Company name is required before importing."); return; }
    const assessments = [...vpAssessments].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (!assessments.length) { setVPError("No assessments were returned for this organization."); return; }
    let imported = 0, current = 0;
    const failures = [];
    for (let i = 0; i < assessments.length; i++) {
      const assessment = assessments[i];
      setVPImporting(`all:${i + 1}/${assessments.length}`);
      const result = await importVPAssessment(assessment, false, true);
      if (result.ok) { if (result.reused) current++; else imported++; } else failures.push(`${assessment.name}: ${result.error}`);
    }
    setVPImporting("");
    try {
      const refreshed = await base44.functions.invoke("getCCIAssessments", {});
      setHistory(refreshed.data.assessments || []);
    } catch (_) {}
    setVPError(`Import All verified ${imported + current} of ${assessments.length} assessment(s): ${imported} newly imported, ${current} already current.${failures.length ? ` Failed: ${failures.join(" | ")}` : ""}`);
  }

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me?.role === "admin") {
          checkConnection(false);
          const x = await base44.functions.invoke("getCCIAssessments", {});
          setHistory(x.data.assessments || []);
        }
      } catch (_) {}
    })();
  }, []);

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const features = [
    {
      icon: Gauge,
      title: "Evidence-based scoring",
      body: "CFRS derives a financial risk score from Vulnerability Assessment and Penetration Test reports. Scores range from -500 to 1,000 with rating bands from Extreme Risk to Exceptional.",
    },
    {
      icon: FileText,
      title: "Supported report types",
      body: "Upload four report categories: Vulnerability Assessment, Penetration Test Executive Summary, Penetration Test Technical Report, and Penetration Test Activity Report.",
    },
    {
      icon: Paperclip,
      title: "Supporting evidence attachments",
      body: "Add narratives, exported findings, logs, and structured evidence. Multiple files are accepted to strengthen the assessment analysis.",
    },
  ];

  return (
    <div className="cfrs-sg min-h-screen">
      <div className="mx-auto max-w-[1480px] px-4 py-7 lg:px-7">
        <CFRSBreadcrumb crumbs={[{ label: "CFRS" }]} />
        <header className="sg-enter mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "#d4d4d4" }}>
          <div>
            <h1 className="text-2xl font-semibold lg:text-3xl">Cyber Financial Risk Score (CFRS)</h1>
            <p className="sg-body mt-1" style={{ color: "#404040" }}>Evidence-based scoring from Vulnerability Assessment and Penetration Test reports.</p>
          </div>
          {user?.role === "admin" && (
            <button type="button" onClick={() => checkConnection(true)} className="sg-btn flex items-center gap-2 px-3 py-2 text-xs" style={connection.status === "connected" ? { color: "#0f9d58", borderColor: "#0f9d5840", background: "#0f9d5814" } : connection.status === "checking" ? { color: "#404040" } : { color: "#b8860b", borderColor: "#b8860b40", background: "#b8860b14" }}>
              <Plug className="h-3.5 w-3.5" />Assessment Intelligence · {connection.status === "connected" ? "vPenTest connected" : connection.status === "checking" ? "Checking connection…" : "vPenTest disconnected"}
            </button>
          )}
        </header>

        <section className="sg-panel sg-panel-hover sg-enter mb-5 p-5" style={{ animationDelay: ".05s" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" style={{ color: "#b91c1c" }} />Saved CFRS Organizations</div>
              <p className="sg-body mt-1" style={{ color: "#404040" }}>Organization cards and organization selection are managed on a dedicated page.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/CFRS/organizations" className="sg-btn px-4 py-2 text-xs font-semibold" style={{ color: "#b91c1c" }}>View saved organizations</a>
              <a href="/CFRS/new" className="sg-btn-primary px-4 py-2 text-xs font-semibold">Add organization</a>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <section key={i} className="sg-panel sg-panel-hover sg-enter p-5" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ border: "1px solid #b91c1c40", background: "#b91c1c14", color: "#b91c1c" }}>
                <f.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="sg-body mt-2" style={{ color: "#404040" }}>{f.body}</p>
            </section>
          ))}
        </div>

        {connectionOpen && user?.role === "admin" && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setConnectionOpen(false)}>
            <div className="sg-score-card max-h-[88vh] w-full max-w-2xl overflow-y-auto">
              <div className="sticky top-0 flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "#d4d4d4", background: "linear-gradient(145deg,#ffffff,#f5f5f5)" }}>
                <div>
                  <div className="sg-micro" style={{ color: "#b91c1c" }}>Administrator connection settings</div>
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
                      <p className="mt-1 text-xs" style={{ color: "#404040" }}>{connection.message || "The vPenTest API has not been verified."}</p>
                    </div>
                    <button type="button" disabled={connectionLoading} onClick={() => checkConnection(false)} className="sg-btn flex items-center gap-2 px-3 py-2 text-xs"><RefreshCw className={`h-3.5 w-3.5 ${connectionLoading ? "animate-spin" : ""}`} />Test connection</button>
                  </div>
                  {connection.checked_at && <div className="mt-3 text-[10px]" style={{ color: "#737373" }}>Last checked: {new Date(connection.checked_at).toLocaleString()}</div>}
                </div>
                <div className="sg-panel p-4">
                  <div className="text-xs font-semibold">Secure configuration required</div>
                  <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5" style={{ color: "#404040" }}>
                    <li>In vPenTest, open <strong>My Account → My Settings → API Key</strong>.</li>
                    <li>Generate and immediately copy the API key; vPenTest displays it only once.</li>
                    <li>Add it to Xtreme I.C.E. Base44 secrets as <code className="sg-panel px-1.5 py-0.5" style={{ color: "#b91c1c" }}>VPENTEST_API_KEY</code>.</li>
                    <li>Return here and select <strong>Test connection</strong>.</li>
                  </ol>
                  <a href="https://help.vonahi.kaseya.com/help/Content/5-Integrations/vpentest-api.htm" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: "#b91c1c" }}>Official vPenTest API instructions <ExternalLink className="h-3 w-3" /></a>
                </div>
                {connection.status === "connected" && (
                  <div className="sg-panel p-4" style={{ borderColor: "#0f9d5840", background: "#0f9d5814" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold" style={{ color: "#0f9d58" }}>Organizations available for import</div>
                        <p className="mt-1 text-[10px]" style={{ color: "#404040" }}>These are returned live by vPenTest and will be used to map assessments and reports to CFRS organizations.</p>
                      </div>
                      <span className="text-2xl font-semibold sg-tabular" style={{ color: "#0f9d58" }}>{connection.total_count ?? connection.companies?.length ?? 0}</span>
                    </div>
                    <div className={`${selectedVPOrg ? "hidden" : "grid"} mt-3 max-h-48 gap-2 overflow-y-auto sm:grid-cols-2`}>
                      {connection.companies?.map(c => (
                        <button type="button" key={c.id} onClick={() => loadVPAssessments(c)} className="sg-panel sg-panel-hover px-3 py-2 text-left" style={selectedVPOrg?.id === c.id ? { borderColor: "#b91c1c", background: "#b91c1c14" } : {}}>
                          <div className="truncate text-xs">{c.name}</div>
                          <div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-[9px]" style={{ color: "#737373" }}>{c.id}</span><span className="shrink-0 text-[9px]" style={{ color: "#b91c1c" }}>View assessments →</span></div>
                        </button>
                      ))}
                    </div>
                    {selectedVPOrg && (
                      <div className="mt-4 border-t pt-4" style={{ borderColor: "#d4d4d4" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold" style={{ color: "#b91c1c" }}>{selectedVPOrg.name} assessments</div>
                            <p className="mt-1 text-[10px]" style={{ color: "#404040" }}>Import one assessment, or import every new assessment for this organization.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={Boolean(vpImporting) || !vpAssessments.length} onClick={importAllVPAssessments} className="sg-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-semibold">{String(vpImporting).startsWith("all") ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}{String(vpImporting).startsWith("all:") ? `Importing ${vpImporting.slice(4)}` : "Import All"}</button>
                            <button type="button" onClick={() => { setSelectedVPOrg(null); setVPAssessments([]); setVPError("") }} className="sg-btn px-2.5 py-1.5 text-[9px]">← Organizations</button>
                          </div>
                          {vpLoading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#b91c1c" }} />}
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
                                <div className="mt-1 flex flex-wrap gap-2 text-[9px] uppercase" style={{ color: "#404040" }}>{a.created_at && <span>{new Date(a.created_at).toLocaleDateString()}</span>}{a.status && <span>{a.status}</span>}{a.severity && <span>{a.severity}</span>}</div>
                              </div>
                              <button type="button" disabled={Boolean(vpImporting)} onClick={() => importVPAssessment(a)} className="sg-btn-primary flex shrink-0 items-center gap-1.5 px-3 py-2 text-[10px] font-semibold">{vpImporting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{vpImporting === a.id ? "Importing…" : "Import & Score"}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="sg-panel p-4 text-xs leading-5" style={{ color: "#404040", borderColor: "#991b1b40", background: "#991b1b0a" }}><strong style={{ color: "#991b1b" }}>Automatic import:</strong> after the first organization import establishes its CFRS profile, CFRS checks vPenTest every six hours for newly completed penetration tests and linked VulScan assessments. New results are imported, scored, and added to the organization's rating history automatically.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}