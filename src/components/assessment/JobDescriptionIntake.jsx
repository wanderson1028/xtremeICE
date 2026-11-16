import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Upload, Sparkles, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

const inputCls =
  "w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";
const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";

const ALLOWED = ["pdf", "docx", "txt"];
const MAX_MB = 10;

export default function JobDescriptionIntake({ onDrafted }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const pickFile = (next) => {
    if (!next) return;
    const ext = next.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError("Upload a PDF, DOCX or TXT file.");
      return;
    }
    if (next.size > MAX_MB * 1024 * 1024) {
      setError(`Keep the file under ${MAX_MB} MB.`);
      return;
    }
    setError("");
    setStatus("");
    setFile(next);
  };

  const handleDraft = async () => {
    if (!file && !title.trim()) {
      setError("Upload a job description or type a job title first.");
      return;
    }
    setError("");
    setStatus("");
    setBusy(true);
    try {
      let fileUri = "";
      if (file) {
        const upload = await base44.integrations.Core.UploadPrivateFile({ file });
        fileUri = upload.file_uri;
      }
      const res = await base44.functions.invoke("draftAssessmentIntake", {
        file_uri: fileUri,
        file_name: file ? file.name : "",
        job_title: title.trim(),
        company_name: company.trim(),
      });
      onDrafted(res.data);
      setStatus("Drafted. Review the details, scenario and brief below — edit anything before generating questions.");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Could not draft the test from that source.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-red-900/40 rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="icon-3d h-9 w-9 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg leading-tight">Start From a Job Description</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Upload the posting or type the job title — we draft the details, the shared scenario and the question brief.
            Nothing is used until you review and edit it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Job Description File</label>
          {file ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-red-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-[11px] text-gray-500">{(file.size / 1024).toFixed(0)} KB · stored privately</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-gray-500 hover:text-white transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                dragging ? "border-red-600 bg-red-950/20" : "border-gray-700 hover:border-red-800 hover:bg-gray-950/40"
              }`}
            >
              <Upload className="h-5 w-5 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-300">Drop a file or click to browse</p>
              <p className="text-[11px] text-gray-600 mt-1">PDF, DOCX or TXT · up to {MAX_MB} MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Job Title</label>
            <input
              className={inputCls}
              placeholder="e.g. Junior SOC Analyst"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Company (optional)</label>
            <input
              className={inputCls}
              placeholder="e.g. Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-xs">
        A document takes priority; the job title alone is enough when there is no posting. Uploaded files are used only to
        draft this test.
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {status && !error && (
        <div className="flex items-start gap-2 p-3 bg-green-900/20 border border-green-800/50 rounded-lg text-green-300 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> {status}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-gray-500 text-xs">You can also skip this and fill everything in by hand.</p>
        <button
          type="button"
          onClick={handleDraft}
          disabled={busy}
          className="btn-3d flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Reading and drafting…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Draft Details and Brief</>
          )}
        </button>
      </div>
    </div>
  );
}