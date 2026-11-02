import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Cloud, RefreshCw } from "lucide-react";

const invoke = async (action, fields = {}) => {
  const response = await base44.functions.invoke("cloudCoursePocAWS", { action, ...fields });
  return response?.data || response;
};
const messageOf = (error) => {
  const body = error?.response?.data;
  return [body?.error, body?.error_code].filter(Boolean).join(": ") || error?.message || "Request failed";
};

export default function CloudCoursePoc() {
  const [user, setUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [preflight, setPreflight] = useState(null);
  const [runs, setRuns] = useState([]);
  const [observations, setObservations] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshRuns = async () => {
    const data = await invoke("list");
    setRuns(data.runs || []);
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!mounted) return;
        setUser(me);
        if (me?.role !== "admin") return;
        const [rows, data] = await Promise.all([
          base44.entities.LabTemplate.list("-created_date", 100),
          invoke("list"),
        ]);
        if (mounted) {
          setTemplates(rows || []);
          setRuns(data.runs || []);
        }
      } catch (cause) {
        if (mounted) setError(messageOf(cause));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const runAction = async (name, operation) => {
    setBusy(name);
    setError("");
    setNotice("");
    try { await operation(); } catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(""); }
  };
  const prepareTemplate = () => runAction("prepare", async () => {
    const data = await invoke("prepareTemplate");
    const rows = await base44.entities.LabTemplate.list("-created_date", 100);
    setTemplates(rows || []);
    setTemplateId(data.template_id);
    setPreflight(null);
    setNotice(data.created ? "A draft AWS proof template was prepared." : "Using the existing draft AWS proof template.");
  });
  const check = () => runAction("preflight", async () => {
    const data = await invoke("preflight", { template_id: templateId });
    setPreflight(data);
    setNotice(data.assessment?.ready ? "AWS account, AMI, and template preflight passed." : "AWS is reachable, but this template is outside the proof scope.");
  });
  const launch = () => {
    if (!preflight?.assessment?.ready || preflight.template_id !== templateId) return;
    const approved = window.confirm(
      "Launch ONE t3.micro Amazon Linux VM in us-east-1 with an 8 GiB encrypted root disk and a new isolated VPC? " +
      "There is no internet gateway, public IP, inbound rule, SSH key, or learner access. " +
      "The guest requests termination after 105 minutes; inspect and clean up immediately after the proof. " +
      "Your limit is $10 and two hours."
    );
    if (!approved) return;
    runAction("launch", async () => {
      const data = await invoke("launch", { template_id: templateId, ack: "LAUNCH_ISOLATED_AWS_POC" });
      setNotice(`AWS launch requested for run ${data.run_id}. Inspect until the guest boot marker appears, then clean up.`);
      await refreshRuns();
    });
  };
  const inspect = (runId) => runAction(runId, async () => {
    const data = await invoke("inspect", { run_id: runId });
    setObservations((previous) => ({ ...previous, [runId]: data }));
    setNotice(data.guest_ready ? "Guest boot marker observed in AWS console output." : "AWS guest boot marker is pending.");
    await refreshRuns();
  });
  const cleanup = (run) => {
    if (!window.confirm(`Terminate the instance and remove the isolated VPC for proof run ${run.id}? This deletes its 8 GiB root volume.`)) return;
    runAction(run.id, async () => {
      const data = await invoke("cleanup", { run_id: run.id });
      setNotice(data.message || `Cleanup status: ${data.status}. If pending, refresh and retry until terminated.`);
      await refreshRuns();
    });
  };

  if (user && user.role !== "admin") {
    return <div className="min-h-screen bg-gray-950 p-8 text-red-300">Platform admin access is required.</div>;
  }
  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ChevronLeft className="h-4 w-4" /> Course Lab Builder</Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Cloud className="h-6 w-6 text-sky-400" /> AWS course lab proof</h1>
          <p className="text-gray-400 text-sm mt-2">Experimental Design Studio integration branch. Proves a frozen course lab can boot one isolated AWS guest and records the result in a LabInstance. Learner access and AWS task validation are not included.</p>
        </div>
        {error && <div role="alert" className="rounded border border-red-700 bg-red-950/50 p-3 text-red-200">{error}</div>}
        {notice && <div role="status" className="rounded border border-sky-700 bg-sky-950/40 p-3 text-sky-200">{notice}</div>}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <h2 className="font-semibold">1. Select and check a course template</h2>
          <button type="button" disabled={!!busy} onClick={prepareTemplate} className="rounded border border-sky-700 text-sky-300 px-4 py-2 disabled:opacity-50">Prepare isolated proof template</button>
          <select aria-label="Course template" className="w-full rounded bg-gray-950 border border-gray-700 p-2" value={templateId}
            onChange={(event) => { setTemplateId(event.target.value); setPreflight(null); }}>
            <option value="">Select a template</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.title} ({template.status})</option>)}
          </select>
          <button type="button" disabled={!templateId || !!busy} onClick={check} className="rounded bg-sky-700 px-4 py-2 disabled:opacity-50">Check AWS and template</button>
          {preflight && (
            <div className="rounded bg-gray-950 border border-gray-800 p-4 text-sm space-y-2">
              <p>AWS account: <span className="font-mono">{preflight.aws?.account_id}</span> · Region: {preflight.aws?.region} · AMI: <span className="font-mono">{preflight.aws?.ami_id}</span></p>
              <p>Scope: {preflight.scope}</p>
              <p>Template: <strong className={preflight.assessment?.ready ? "text-green-300" : "text-amber-300"}>{preflight.assessment?.ready ? "Eligible" : "Needs changes"}</strong></p>
              {(preflight.assessment?.errors || []).map((item, index) => <p className="text-amber-300" key={index}>• {item}</p>)}
            </div>
          )}
          <button type="button" disabled={!preflight?.assessment?.ready || preflight.template_id !== templateId || !!busy} onClick={launch}
            className="rounded bg-red-700 px-4 py-2 disabled:opacity-50">Launch one isolated AWS guest</button>
        </section>
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">2. Observe and clean up</h2>
            <button type="button" disabled={!!busy} onClick={() => runAction("refresh", refreshRuns)} className="text-sm text-sky-300 inline-flex gap-1 items-center disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>
          {runs.length === 0 && <p className="text-sm text-gray-400">No AWS course lab proof runs recorded.</p>}
          {runs.map((run) => {
            const observed = observations[run.id];
            return <div key={run.id} className="rounded border border-gray-700 bg-gray-950 p-4 text-sm space-y-2">
              <p className="font-mono text-xs break-all">{run.id} · {run.status}</p>
              <p>Instance: {run.instance_id || "pending"} · Region: {run.region} · Expires: {run.expires_at || "pending"}</p>
              {observed && <p>AWS state: {observed.state} · Guest marker: {observed.guest_ready ? "observed" : "pending"}</p>}
              {run.last_error_code && <p className="text-amber-300">Last AWS error: {run.last_error_code}</p>}
              <div className="flex gap-3">
                <button type="button" disabled={!!busy} onClick={() => inspect(run.id)} className="rounded bg-sky-800 px-3 py-1.5 disabled:opacity-50">Inspect in AWS</button>
                {run.status !== "terminated" && <button type="button" disabled={!!busy} onClick={() => cleanup(run)} className="rounded bg-red-800 px-3 py-1.5 disabled:opacity-50">Terminate and clean up</button>}
              </div>
            </div>;
          })}
        </section>
      </div>
    </div>
  );
}
