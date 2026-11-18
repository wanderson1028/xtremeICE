import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, ClipboardList, Clock3, FileText, Monitor, Radio } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { browserPilot, hasBrowserPilot } from "@/lib/browserPilot";
import PilotResumePrep from "@/components/assessments/PilotResumePrep";

const slots = [
  { id: "A", label: "Candidate A" },
  { id: "B", label: "Candidate B" },
  { id: "practice", label: "Practice" },
];
const tools = [
  { name: "Device", icon: Monitor },
  { name: "Service status", icon: Radio },
  { name: "Knowledge base", icon: BookOpen },
  { name: "Scheduling Web", icon: ClipboardList },
];
const observedLabels = {
  deviceChecked: "Device evidence checked",
  serviceChecked: "Service status checked",
  relevantArticleRead: "Relevant knowledge article opened",
  saveVerified: "Sample edit saved and reopened",
};
const statusLabels = { in_progress: "In progress", submitted: "Submitted", finalized: "Scored" };
const panel = "rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-5";
const actionStyle = "rounded-lg border border-gray-700 bg-transparent text-gray-100 hover:bg-gray-800 hover:text-white";
const primary = "bg-red-700 text-white hover:bg-red-600";
const textField = "mt-2 min-h-28 border-gray-700 bg-black/30 text-gray-100";
const characterLimit = 4000;

function displayTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function HelpDeskPilot() {
  const { user, canEdit } = useFeatureAccess();
  const mayRun = canEdit("soc_assessments");
  const [focusIds, setFocusIds] = useState([]);
  const [readingResume, setReadingResume] = useState(false);
  const [slot, setSlot] = useState(null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [employeeReply, setEmployeeReply] = useState("");
  const [ticketNote, setTicketNote] = useState("");
  const [selectedTool, setSelectedTool] = useState("Device");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [now, setNow] = useState(Date.now);
  const [scores, setScores] = useState({});
  const [evidence, setEvidence] = useState("");
  const [copied, setCopied] = useState(false);
  const lock = useRef(false);

  const attempt = data?.state;
  const inProgress = attempt?.status === "in_progress";
  const remaining = inProgress ? Math.max(0, Date.parse(attempt.deadlineAt) - now) : 0;
  const hasTime = remaining > 0;
  const dirty = inProgress && (
    employeeReply !== attempt.employeeReply || ticketNote !== attempt.ticketNote
  );

  const request = useCallback(async (action, args = {}, selectedSlot = slot) => {
    if (!mayRun || !user?.id || lock.current) return null;
    lock.current = true;
    setBusy(action);
    setError("");
    try {
      const payload = { action, slot: selectedSlot, ...args };
      let result;
      if ((data?.storage === "browser" && selectedSlot === slot) || hasBrowserPilot(user.id, selectedSlot)) {
        result = browserPilot(user.id, payload);
      } else {
        try {
          const response = await base44.functions.invoke("helpDeskPilot", payload);
          result = response.data;
          if (!result?.scenario) throw new Error(result?.error || "No pilot response was returned.");
        } catch (failure) {
          const status = Number(failure.response?.status ?? failure.status ?? failure.statusCode);
          const unavailable = failure.response?.data?.code === "pilot_storage_unavailable" || status === 404 || status >= 500;
          if (action !== "load" || data?.storage === "server" || !unavailable) throw failure;
          result = browserPilot(user.id, payload);
        }
      }
      setSlot(selectedSlot);
      setData(result);
      setNow(Date.now());
      if (["load", "start", "submit"].includes(action) || result.state?.status !== "in_progress") {
        setEmployeeReply(result.state?.employeeReply || "");
        setTicketNote(result.state?.ticketNote || "");
      }
      return result;
    } catch (error) {
      setError(error?.response?.data?.error || error.message || "The pilot could not be reached.");
      return null;
    } finally {
      lock.current = false;
      setBusy("");
    }
  }, [slot, data?.storage, mayRun, user?.id]);

  useEffect(() => {
    if (!inProgress) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [inProgress]);

  useEffect(() => {
    if (inProgress && remaining === 0 && !busy && !error) request("load");
  }, [inProgress, remaining, busy, error, request]);

  useEffect(() => {
    if (!dirty || !hasTime || busy || error) return;
    const timer = setTimeout(() => request("save", { employeeReply, ticketNote }), 800);
    return () => clearTimeout(timer);
  }, [dirty, hasTime, busy, error, employeeReply, ticketNote, request]);

  const openSlot = (id) => {
    setSelectedTool("Device");
    setSelectedEvent(null);
    setEvidence("");
    setScores({});
    setFocusIds([]);
    setCopied(false);
    request("load", {}, id);
  };
  const backToSlots = () => {
    setSlot(null);
    setData(null);
    setError("");
  };
  const showAction = async (id) => {
    const existing = attempt.events.find((event) => event.id === id);
    if (existing) {
      setSelectedEvent(id);
      return;
    }
    const result = await request("observe", { id });
    if (result?.state?.events.some((event) => event.id === id)) setSelectedEvent(id);
  };
  const copyScorecard = async () => {
    const review = attempt.review;
    const lines = [
      `Stage 2 Help Desk · ${slots.find((item) => item.id === slot).label}`,
      `Scenario: ${data.scenario.title} · ${data.scenario.version}`,
      `Score: ${review.total}/10`,
      ...data.rubric.map((item) => `${item.label}: ${review.scores[item.id]}/2`),
      `Interviewer evidence: ${review.evidence}`,
      `Résumé follow-ups: ${data.resumeTopics.filter(topic => attempt.focusIds.includes(topic.id)).map(topic => topic.title).join(", ") || "None selected"}`,
      `Sandbox actions: ${attempt.events.map((event) => event.label).join(", ") || "None recorded"}`,
      `Employee reply: ${attempt.employeeReply || "No reply submitted"}`,
      `Ticket note: ${attempt.ticketNote || "No note submitted"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
    } catch {
      setError("Clipboard access was unavailable. Select and copy the evidence directly.");
    }
  };

  const currentResult = attempt?.events.find((event) => event.id === selectedEvent);
  const busyText = busy ? "Working…" : null;
  const slotLabel = slots.find((item) => item.id === slot)?.label;

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-6 text-gray-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/CandidateAssessments" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Candidate Assessments
          </Link>
          {slot && <Button type="button" variant="outline" className={actionStyle} onClick={backToSlots} disabled={!!busy || dirty}>Pilot slots</Button>}
        </div>

        <header className="flex flex-wrap justify-between gap-3 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-semibold">Stage 2 Help Desk Practical</h1>
            <p className="mt-1 text-sm text-gray-300">Technical Support · IO-WRL-007 · NICE Components v2.2.0</p>
          </div>
          {inProgress && (
            <div className="flex items-center gap-2 self-start rounded-lg border border-gray-700 px-3 py-2 font-mono text-sm" aria-label="Time remaining">
              <Clock3 className="h-4 w-4" /> {displayTime(remaining)} remaining
            </div>
          )}
        </header>

        {data?.storage === "browser" && (
          <p className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            This attempt uses browser storage. Continue in the same browser and copy the scorecard to your approved interview notes afterward.
          </p>
        )}

        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</p>}

        {!slot && (
          <>
            <section className={panel} aria-labelledby="pilot-guide">
              <h2 id="pilot-guide" className="mb-3 text-lg font-semibold">Interviewer guide · 30 minutes max</h2>
              <div className="grid gap-3 text-sm text-gray-300 sm:grid-cols-3">
                <div><p className="font-semibold text-gray-100">0–5 min · Live roleplay</p><p>Play the frustrated employee. Ask the candidate to think aloud and respond as the help desk technician.</p></div>
                <div><p className="font-semibold text-gray-100">5–22 min · Browser sandbox</p><p>Give the candidate control of the sandbox. Observe which evidence they seek, why they choose each check, and how they verify a workaround.</p></div>
                <div><p className="font-semibold text-gray-100">22–30 min · Documentation</p><p>Have the candidate write an employee reply and ticket handoff, then submit. Score after the interview.</p></div>
              </div>
              <details className="mt-4 border-t border-gray-800 pt-3 text-sm">
                <summary className="cursor-pointer text-gray-100">Roleplay script and consistent prompts</summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-300">
                  <li>Open with: “I’ve already tried twice, and I have 20 minutes before the schedule is due. I need someone to help me get this done.”</li>
                  <li>If asked: the app closes immediately, restarting it did not help, and the employee can still use other apps. The employee does not know what changed overnight.</li>
                  <li>At 22 minutes, tell each candidate: “Please switch to documenting your next action and telling the employee what to expect.”</li>
                </ul>
              </details>
            </section>
            <section className={panel}>
              <h2 className="mb-2 text-lg font-semibold">Choose an attempt</h2>
              <p className="mb-4 text-sm text-gray-300">Use A and B for the interviews. Keep candidate names and contact details out of the pilot.</p>
              <div className="flex flex-wrap gap-3">
                {slots.map(({ id, label }) => (
                  <Button key={id} type="button" variant="outline" className={actionStyle} onClick={() => openSlot(id)} disabled={!!busy || !mayRun}>
                    Open {label}
                  </Button>
                ))}
                {busyText && <span className="self-center text-sm text-gray-300">{busyText}</span>}
                {!mayRun && user && <p className="text-sm text-gray-400">Editor access to Candidate Assessments is required.</p>}
              </div>
            </section>
          </>
        )}

        {slot && data && !attempt && (
          <section className={panel}>
            <h2 className="text-lg font-semibold">{slotLabel}</h2>
            <p className="mb-4 mt-1 text-sm text-gray-300">Start the timer when the live roleplay begins. The sandbox closes at 30 minutes and keeps the last saved work.</p>
            <PilotResumePrep topics={data.resumeTopics} selected={focusIds} onSelect={setFocusIds} onBusyChange={setReadingResume} />
            <Button type="button" className={primary} onClick={() => request("start", { focusIds })} disabled={!!busy || readingResume}>{busyText || "Start 30-minute attempt"}</Button>
          </section>
        )}

        {inProgress && (
          <>
            <section className={panel}>
              <p className="mb-1 text-sm text-gray-300">Incoming ticket · {slotLabel}</p>
              <h2 className="text-lg font-semibold">{data.scenario.title}</h2>
              <p className="mt-2 text-gray-200">{data.scenario.ticket}</p>
            </section>
            <section className={panel} aria-labelledby="sandbox-title">
              <h2 id="sandbox-title" className="mb-3 text-lg font-semibold">Help desk sandbox</h2>
              <div className="flex flex-wrap gap-2" aria-label="Sandbox tools">
                {tools.map(({ name, icon: Icon }) => (
                  <Button key={name} type="button" variant="outline" className={actionStyle} aria-pressed={selectedTool === name} onClick={() => { setSelectedTool(name); setSelectedEvent(null); }}>
                    <Icon className="mr-2 h-4 w-4" />{name}
                  </Button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[320px_1fr]">
                <div className="space-y-2">
                  {data.toolActions.filter((action) => action.tool === selectedTool).map((action) => (
                    <button key={action.id} type="button" className="block w-full rounded-lg border border-gray-700 px-3 py-2.5 text-left text-sm hover:bg-gray-800 disabled:opacity-50" disabled={!!busy || !action.available || !remaining} onClick={() => showAction(action.id)}>{action.label}</button>
                  ))}
                </div>
                <div aria-live="polite" className="min-h-24 rounded-lg border border-gray-800 bg-black/30 p-4 text-sm text-gray-200">
                  {currentResult ? <><p className="mb-1 font-semibold">{currentResult.label}</p><p>{currentResult.result}</p></> : <p>Select a check to see the result.</p>}
                </div>
              </div>
            </section>
            <section className={panel} aria-labelledby="work-title">
              <h2 id="work-title" className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5" /> Your work</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">Employee reply
                  <Textarea aria-label="Employee reply" className={textField} maxLength={characterLimit} disabled={!remaining} value={employeeReply} onChange={(event) => { setEmployeeReply(event.target.value); setError(""); }} />
                </label>
                <label className="text-sm font-medium">Ticket handoff note
                  <Textarea aria-label="Ticket handoff note" className={textField} maxLength={characterLimit} disabled={!remaining} value={ticketNote} onChange={(event) => { setTicketNote(event.target.value); setError(""); }} />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-300" aria-live="polite">{busyText || (dirty ? "Changes pending" : "Work saved")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className={actionStyle} disabled={!!busy || !remaining || !dirty} onClick={() => request("save", { employeeReply, ticketNote })}>Save draft</Button>
                  <Button type="button" className={primary} disabled={!!busy} onClick={() => request("submit", { employeeReply, ticketNote })}>Submit work sample</Button>
                </div>
              </div>
            </section>
          </>
        )}

        {attempt && !inProgress && (
          <>
            <section className={panel} aria-labelledby="evidence-title">
              <h2 id="evidence-title" className="text-lg font-semibold">{slotLabel} · {statusLabels[attempt.status]}</h2>
              <p className="mt-1 text-sm text-gray-300">Review the candidate’s actions and written work alongside your live observations.</p>
              <ul className="mt-4 grid gap-2 text-sm text-gray-200 sm:grid-cols-2">
                {Object.entries(observedLabels).map(([key, label]) => <li key={key}>{label}: <strong>{attempt.observed[key] ? "Observed" : "No event recorded"}</strong></li>)}
              </ul>
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer">Action history ({attempt.events.length})</summary>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-gray-200">
                  {attempt.events.map((event) => <li key={event.id}><strong>{event.label}</strong> · {displayTime(Date.parse(event.at) - Date.parse(attempt.startedAt))}<p>{event.result}</p></li>)}
                </ol>
              </details>
              {attempt.focusIds.length > 0 && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer">Selected résumé follow-ups</summary>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-gray-200">
                    {data.resumeTopics.filter(topic => attempt.focusIds.includes(topic.id)).map(topic => <li key={topic.id}><strong>{topic.title}</strong> · {topic.prompt}</li>)}
                  </ul>
                </details>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><h3 className="font-semibold">Employee reply</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-300">{attempt.employeeReply || "No reply submitted"}</p></div>
                <div><h3 className="font-semibold">Ticket handoff note</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-300">{attempt.ticketNote || "No note submitted"}</p></div>
              </div>
            </section>
            <section className={panel} aria-labelledby="rubric-title">
              <h2 id="rubric-title" className="text-lg font-semibold">Interviewer scorecard {attempt.review && `· ${attempt.review.total}/10`}</h2>
              <p className="mt-1 text-sm text-gray-300">0 missing or unsafe · 1 partial · 2 demonstrated</p>
              <div className="mt-3 divide-y divide-gray-800">
                {data.rubric.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                    <div><p className="font-semibold">{item.label}</p><p className="text-sm text-gray-300">{item.anchor}</p></div>
                    {attempt.review
                      ? <span className="shrink-0 text-sm">{attempt.review.scores[item.id]}/2</span>
                      : <select aria-label={item.label} value={scores[item.id] ?? ""} onChange={(event) => setScores((previous) => ({ ...previous, [item.id]: event.target.value === "" ? undefined : Number(event.target.value) }))} className="rounded-md border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm">
                          <option value="">Score</option><option value="0">0</option><option value="1">1</option><option value="2">2</option>
                        </select>}
                  </div>
                ))}
              </div>
              {attempt.review ? (
                <><p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-200">{attempt.review.evidence}</p>
                  <Button type="button" variant="outline" className={`${actionStyle} mt-4`} onClick={copyScorecard}>{copied ? "Copied" : "Copy scorecard"}</Button></>
              ) : (
                <>
                  <label className="text-sm font-medium">Interviewer evidence
                    <Textarea aria-label="Interviewer evidence" className={textField} maxLength={characterLimit} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Record specific examples from the roleplay, troubleshooting, and ticket." />
                  </label>
                  <Button type="button" className={`${primary} mt-4`} onClick={() => request("finalize", { scores, evidence })} disabled={!!busy || !evidence.trim() || data.rubric.some(({ id }) => scores[id] === undefined)}>{busyText || "Finalize scorecard"}</Button>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}