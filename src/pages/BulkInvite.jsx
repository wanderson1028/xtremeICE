import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, Plus, Trash2, Loader2, Send, CheckCircle2, XCircle, Copy, Check, Users, ClipboardList,
} from "lucide-react";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyRow = () => ({ key: uid(), name: "", email: "" });

export default function BulkInvite() {
  const navigate = useNavigate();
  const assessmentId = new URLSearchParams(window.location.search).get("assessment_id");

  const [rows, setRows] = useState([emptyRow()]);
  const [paste, setPaste] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState("");

  const { data: assessment } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: () => base44.entities.Assessment.get(assessmentId),
    enabled: !!assessmentId,
  });

  const updateRow = (key, field, value) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  const removeRow = (key) => setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((row) => row.key !== key)));

  const applyPaste = () => {
    const parsed = paste
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const emailMatch = line.match(/[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+/);
        const email = emailMatch ? emailMatch[0].toLowerCase() : "";
        const name = line
          .replace(email || "", "")
          .replace(/[<>,]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return { key: uid(), name, email };
      })
      .filter((row) => row.email);

    if (!parsed.length) {
      setError("No email addresses found in the pasted list.");
      return;
    }
    setError("");
    setRows((prev) => [...prev.filter((row) => row.name || row.email), ...parsed]);
    setPaste("");
  };

  const validRows = rows.filter((row) => row.name.trim() && row.email.trim());
  const invalidCount = rows.filter((row) => (row.name.trim() || row.email.trim()) && !validRows.includes(row)).length;

  const handleSend = async () => {
    if (!validRows.length) {
      setError("Add at least one candidate with a name and email address.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendCandidateInvite", {
        assessment_id: assessmentId,
        candidates: validRows.map((row) => ({
          candidate_name: row.name.trim(),
          candidate_email: row.email.trim().toLowerCase(),
        })),
        app_url: window.location.origin,
      });
      setSummary(res.data);
    } catch (e) {
      setError(e.message || "Failed to send invitations.");
    } finally {
      setSending(false);
    }
  };

  const copyLink = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const inputCls =
    "w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";

  if (summary) {
    const results = summary.results || [];
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
        <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button onClick={() => navigate("/CandidateAssessments")} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-gray-600">|</span>
            <h1 className="text-white font-bold">Invitation Results</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Invited", value: summary.total, color: "text-blue-400" },
              { label: "Email delivered", value: summary.sent, color: "text-green-400" },
              { label: "Needs attention", value: summary.failed, color: "text-yellow-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-gray-800 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-4">Candidate</div>
              <div className="col-span-5">Delivery</div>
              <div className="col-span-3 text-right">Link</div>
            </div>
            {results.map((result, index) => (
              <div key={`${result.candidate_email}-${index}`} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-800/60 last:border-0 items-center">
                <div className="col-span-4 min-w-0">
                  <p className="text-gray-200 text-sm truncate">{result.candidate_name || "—"}</p>
                  <p className="text-gray-500 text-[11px] truncate">{result.candidate_email}</p>
                </div>
                <div className="col-span-5 min-w-0">
                  {result.emailSent ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Invitation emailed
                    </span>
                  ) : (
                    <span className="inline-flex items-start gap-1.5 text-xs text-red-400">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="truncate" title={result.reason || ""}>{result.reason || "Not sent"}</span>
                    </span>
                  )}
                </div>
                <div className="col-span-3 flex justify-end">
                  {result.assessmentLink ? (
                    <button
                      onClick={() => copyLink(result.assessmentLink, result.candidate_email)}
                      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-lg hover:text-white transition-colors"
                    >
                      {copied === result.candidate_email ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === result.candidate_email ? "Copied" : "Copy link"}
                    </button>
                  ) : (
                    <span className="text-gray-600 text-[11px]">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {summary.failed > 0 && (
            <p className="text-yellow-400/80 text-xs">
              Invitations were still created for candidates whose email failed — use “Copy link” to send the unique link manually.
            </p>
          )}

          <div className="flex items-center gap-3">
            <Link to={`/assessment-detail?id=${assessmentId}`} className="px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors">
              View Test
            </Link>
            <button
              onClick={() => { setSummary(null); setRows([emptyRow()]); }}
              className="px-4 py-2.5 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
            >
              Invite More
            </button>
            <Link to="/CandidateAssessments" className="ml-auto text-sm text-gray-400 hover:text-white transition-colors">
              Back to tracker
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-gray-600">|</span>
          <div>
            <h1 className="text-white font-bold">Invite Multiple Candidates</h1>
            <p className="text-gray-500 text-xs">Each candidate gets their own unique link</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {!assessmentId && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
            No assessment selected. Open an assessment and choose “Invite Multiple”.
          </div>
        )}

        {assessment && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{assessment.position_title}</p>
              <p className="text-gray-400 text-xs">
                {assessment.assessment_kind === "application_test" ? "Application test" : assessment.assessment_type} · {assessment.duration_minutes} min · pass {assessment.pass_threshold}%
              </p>
            </div>
          </div>
        )}

        {error && <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>}

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /> Candidates</h2>
            <span className="text-xs text-gray-400">{validRows.length} ready</span>
          </div>

          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_36px] gap-2 items-center">
              <input className={inputCls} placeholder="Candidate name" value={row.name} onChange={(e) => updateRow(row.key, "name", e.target.value)} />
              <input type="email" className={inputCls} placeholder="candidate@example.com" value={row.email} onChange={(e) => updateRow(row.key, "email", e.target.value)} />
              <button onClick={() => removeRow(row.key)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors justify-self-start" title="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button onClick={() => setRows((prev) => [...prev, emptyRow()])} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add another candidate
          </button>

          {invalidCount > 0 && (
            <p className="text-yellow-400/80 text-xs">{invalidCount} row(s) are missing a name or email and will be skipped.</p>
          )}
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-2">Paste a list</h2>
          <p className="text-gray-500 text-xs mb-3">One candidate per line, either “Name, email@example.com” or just the email address.</p>
          <textarea
            rows={4}
            className={inputCls + " resize-none font-mono"}
            placeholder={"Jane Smith, jane@example.com\nmarcus@example.com"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <button onClick={applyPaste} disabled={!paste.trim()} className="mt-2 px-3 py-1.5 border border-gray-700 text-gray-300 hover:text-white disabled:opacity-40 rounded-lg text-xs transition-colors">
            Add to list
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 pt-5">
          <p className="text-gray-500 text-xs max-w-sm">
            Invitations are valid for 7 days. Delivery is reported per candidate, so any failed send stays visible.
          </p>
          <button
            onClick={handleSend}
            disabled={sending || !assessmentId || !validRows.length}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send {validRows.length || ""} Invitation{validRows.length === 1 ? "" : "s"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}