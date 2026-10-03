import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle, Building2, FileText, Loader2, MapPin, ShieldCheck, Upload, UserRound, X,
} from "lucide-react";
import CFRSBreadcrumb from "@/components/cfrs/CFRSBreadcrumb";

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

export default function CFRSNew() {
  const [form, setForm] = useState({ business_name: "", logo_url: "", business_address: "", poc_name: "", poc_email: "", poc_phone: "" });
  const [files, setFiles] = useState({});
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const uploadLogo = async (file) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      set("logo_url", file_url);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Logo could not be uploaded.");
    } finally {
      setLogoUploading(false);
    }
  };

  const run = async () => {
    setError("");
    if (!form.business_name.trim()) { setError("Company name is required."); return; }
    const selected = Object.entries(files).filter(([, f]) => f);
    if (!selected.length) { setError("Upload at least one assessment report."); return; }
    setBusy(true);
    try {
      let report_files = [];
      for (const [category, file] of selected) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        report_files.push({ category, name: file.name, file_url, mime_type: file.type, size: file.size, last_modified: file.lastModified, uploaded_at: new Date().toISOString(), new_upload: true });
      }
      const evidence_files = [];
      for (const file of evidenceFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        evidence_files.push({ category: "evidence", name: file.name, file_url, mime_type: file.type, size: file.size, last_modified: file.lastModified, uploaded_at: new Date().toISOString(), new_upload: true });
      }
      const x = await base44.functions.invoke("analyzeCCIAssessment", { ...form, report_files, evidence_files });
      window.location.href = `/CFRS?organization=${encodeURIComponent(x.data.assessment.organization_id)}`;
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Assessment Intelligence could not process the reports.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cfrs-sg min-h-screen">
      <div className="mx-auto max-w-[1480px] px-4 py-7 lg:px-7">
        <CFRSBreadcrumb crumbs={[{ label: "CFRS", href: "/CFRS" }, { label: "Add organization" }]} />
        <header className="sg-enter mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "#d4d4d4" }}>
          <div>
            <h1 className="text-2xl font-semibold lg:text-3xl">Add Organization</h1>
            <p className="sg-body mt-1" style={{ color: "#404040" }}>Upload assessment reports to generate a CFRS score for a new organization.</p>
          </div>
          <a href="/CFRS" className="sg-btn px-4 py-2 text-xs font-semibold" style={{ color: "#b91c1c" }}>← Back to CFRS</a>
        </header>

        <section className="sg-panel sg-panel-hover sg-enter sg-profile mb-5 p-5" style={{ animationDelay: ".05s" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4" style={{ color: "#000000" }} />Customer profile</h2>
          <p className="sg-body mt-1" style={{ color: "#404040" }}>Company details and logo for the assessment.</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border" style={{ borderColor: "#d4d4d4", background: form.logo_url ? "#fff" : "linear-gradient(180deg,#f5f5f5,#ededed)" }}>
              {form.logo_url ? <img src={form.logo_url} alt="Company logo" className="h-full w-full object-contain" /> : <Building2 className="h-6 w-6" style={{ color: "#737373" }} />}
            </div>
            <div className="flex-1">
              <div className="sg-micro mb-1.5">Company logo</div>
              <div className="flex items-center gap-2">
                <label className="sg-btn flex h-9 cursor-pointer items-center gap-2 px-3 text-xs font-semibold">
                  {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {logoUploading ? "Uploading…" : form.logo_url ? "Change logo" : "Upload logo"}
                  <input type="file" accept="image/*" className="hidden" disabled={logoUploading} onChange={e => uploadLogo(e.target.files?.[0])} />
                </label>
                {form.logo_url && <button type="button" onClick={() => set("logo_url", "")} className="sg-btn flex h-9 items-center gap-2 px-3 text-xs font-semibold"><X className="h-3.5 w-3.5" />Remove</button>}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Company name *" icon={Building2} value={form.business_name} onChange={e => set("business_name", e.target.value)} />
            <Field label="Business address" icon={MapPin} value={form.business_address} onChange={e => set("business_address", e.target.value)} />
            <Field label="POC name" icon={UserRound} value={form.poc_name} onChange={e => set("poc_name", e.target.value)} />
            <Field label="POC email" type="email" value={form.poc_email} onChange={e => set("poc_email", e.target.value)} />
            <Field label="POC phone" value={form.poc_phone} onChange={e => set("poc_phone", e.target.value)} />
          </div>
        </section>

        <section className="sg-panel sg-panel-hover sg-enter mb-5 p-5" style={{ animationDelay: ".1s" }}>
          <div className="flex justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4" style={{ color: "#b91c1c" }} />Assessment reports</h2>
              <p className="sg-body mt-1" style={{ color: "#404040" }}>PDF, Word, Excel, or CSV.</p>
            </div>
            <span className="text-xs" style={{ color: "#404040" }}>{Object.values(files).filter(Boolean).length}/4</span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {TYPES.map(([k, l, h]) => (
              <label key={k} className="sg-tile cursor-pointer p-3" style={files[k] ? { borderColor: "#b91c1c", background: "#b91c1c14" } : {}}>
                <input className="hidden" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={e => setFiles(s => ({ ...s, [k]: e.target.files?.[0] || null }))} />
                <div className="flex gap-3">
                  <FileText className="h-4 w-4 shrink-0" style={{ color: "#b91c1c" }} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{l}</div>
                    <div className="mt-1 text-[10px]" style={{ color: "#404040" }}>{h}</div>
                    <div className="mt-2 truncate text-[10px]" style={{ color: "#b91c1c" }}>{files[k]?.name || "Choose file"}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="sg-panel sg-panel-hover sg-enter mb-5 p-5" style={{ animationDelay: ".15s" }}>
          <div className="sg-panel p-3" style={{ background: "#b91c1c0a", borderColor: "#b91c1c40" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold" style={{ color: "#b91c1c" }}>Supporting evidence attachments</div>
                <p className="mt-1 text-[10px]" style={{ color: "#404040" }}>Narratives, exported findings, logs, and structured evidence. Multiple files allowed.</p>
              </div>
              <label className="sg-btn cursor-pointer px-3 py-2 text-[10px] font-semibold" style={{ color: "#b91c1c" }}>
                <input className="hidden" multiple type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.log,.xml" onChange={e => { const next = Array.from(e.target.files || []); setEvidenceFiles(s => [...s, ...next]); e.target.value = ""; }} />Add evidence
              </label>
            </div>
            {evidenceFiles.length > 0 && (
              <div className="mt-3 space-y-1">{evidenceFiles.map((f, i) => (
                <div key={f.name + i} className="sg-panel flex items-center justify-between gap-2 px-2.5 py-2 text-[10px]">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => setEvidenceFiles(s => s.filter((_, n) => n !== i))} style={{ color: "#404040" }} aria-label={`Remove ${f.name}`}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}</div>
            )}
            <div className="sg-panel mt-3 flex gap-2 p-2.5 text-[10px] leading-4" style={{ color: "#b8860b", background: "#b8860b14", borderColor: "#b8860b40" }}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Redact credentials, hashes, tokens, keys, patient data, and unnecessary personal information. Do not upload raw secrets-dump or credential files.
            </div>
          </div>
          <button onClick={run} disabled={busy} className="sg-btn-primary mt-4 flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{busy ? "Analyzing evidence…" : "Run Assessment Intelligence"}</button>
          {error && <div className="sg-panel mt-3 p-3 text-xs" style={{ color: "#dc2626", background: "#dc262614", borderColor: "#dc262640" }}>{error}</div>}
        </section>
      </div>
    </div>
  );
}