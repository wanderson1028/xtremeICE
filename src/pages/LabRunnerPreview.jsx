import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import KasmLaunchPanel from "@/components/labs/runtime/KasmLaunchPanel";
import AssignedProxmoxLab from "@/components/labs/runtime/AssignedProxmoxLab";
import { kasmProviderClient } from "@/lib/providers/kasmProviderClient";
import { runtimeValidationClient } from "@/lib/runtime/runtimeValidationClient";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Cpu,
  ExternalLink,
  Flag,
  HardDrive,
  Lightbulb,
  Lock,
  MemoryStick,
  Network,
  Play,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import { resolveUnlockedTasks } from "../../base44/functions/kasmProvider/shared/runtime/branchingResolver.js";
import { calculateInstanceScore } from "../../base44/functions/kasmProvider/shared/runtime/instanceScoring.js";
import {
  buildUpdatedTaskResult,
  getTaskResult,
  revealNextHint,
  setCriterionPassed,
  upsertTaskResult,
} from "../../base44/functions/kasmProvider/shared/runtime/instanceModel.js";

const INSTANCE_TERMINAL_STATUSES = ["completed", "failed", "terminated"];
const TASK_TERMINAL_STATUSES = ["passed", "failed", "skipped"];

function taskStatusIcon(result, unlocked) {
  if (!unlocked) return <Lock className="h-3.5 w-3.5 text-muted-foreground" />;
  if (result?.status === "passed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (result?.status === "failed") return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  if (result) return <Circle className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500/20" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />;
}

function branchBadge(task) {
  if (task?.branch_type === "advanced") {
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-0 text-[10px]">Advanced path</Badge>;
  }
  if (task?.branch_type === "remediation") {
    return <Badge className="bg-orange-500/15 text-orange-600 border-0 text-[10px]">Remediation</Badge>;
  }
  return null;
}

export default function LabRunnerPreview() {
  const [params] = useSearchParams();
  const assignmentId = params.get("assignmentId");
  const { user } = useAuth();
  if (assignmentId) return <AssignedProxmoxLab key={assignmentId} assignmentId={assignmentId} />;
  return <KasmLabRunner key={user?.id + ":" + params.toString()} />;
}

function KasmLabRunner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const templateId = params.get("templateId");
  const instanceId = params.get("instanceId");

  const [instanceState, setInstanceState] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [submissionDraft, setSubmissionDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [validatingCheckId, setValidatingCheckId] = useState(null);
  const [inspection, setInspection] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const inspectWorkspace = async () => {
    setInspecting(true);
    try {
      const result = await kasmProviderClient.inspectWorkspace(instanceId);
      setInspection(result.present
        ? "The stored workspace is present in Kasm inventory."
        : "The stored workspace is absent from Kasm inventory.");
    } catch (error) {
      setInspection(error.message);
    } finally {
      setInspecting(false);
    }
  };

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ["runner-template", templateId],
    queryFn: () => base44.entities.LabTemplate.filter({ id: templateId }).then((rows) => rows[0]),
    enabled: !!templateId && !instanceId,
  });

  const { data: loadedInstance, isLoading: instanceLoading } = useQuery({
    queryKey: ["runner-instance", user?.id, instanceId],
    queryFn: () => base44.entities.KasmLearnerRun.filter({ id: instanceId }).then((rows) => rows[0]),
    enabled: !!user?.id && !!instanceId,
  });

  const { data: runtimeAttempts = [], refetch: refreshRuntimeAttempts } = useQuery({
    queryKey: ["runtime-attempts", instanceState?.id],
    queryFn: () => runtimeValidationClient.listAttempts(instanceState.id).then((body) => body.attempts || []),
    enabled: !!instanceState?.id && instanceState.provider === "kasm",
    refetchInterval: validatingCheckId ? 2000 : false,
  });

  useEffect(() => {
    if (loadedInstance) setInstanceState(loadedInstance);
  }, [loadedInstance]);

  useEffect(() => {
    if (instanceState?.provider !== "kasm" || !instanceState?.id ||
      instanceState.runtime_authority !== "server_kasm_v1" ||
      !["provisioning", "running"].includes(instanceState.status)) return undefined;

    let cancelled = false;
    let timer;
    const refreshProviderStatus = async () => {
      try {
        const result = await kasmProviderClient.status(instanceState.id);
        if (!cancelled) {
          setInstanceState((previous) => ({
            ...previous,
            status: result.status,
            cleanup_state: result.cleanup_state,
            provider_session_url: result.provider_session_url,
            provider_status_progress: result.provider_status_progress,
            provider_status_message: result.provider_status_message,
          }));
        }
      } catch (error) {
        if (!cancelled) setInstanceState((previous) => ({
          ...previous,
          provider_status_message: error.message,
        }));
      } finally {
        if (!cancelled && instanceState.status === "provisioning") {
          timer = window.setTimeout(refreshProviderStatus, 4000);
        }
      }
    };
    void refreshProviderStatus();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [instanceState?.id, instanceState?.provider, instanceState?.runtime_authority, instanceState?.status]);

  const snapshot = instanceState?.template_snapshot;
  const taskResults = instanceState?.task_results || [];
  const authoredTasks = snapshot?.lab_content?.tasks || [];
  const resolvedTasks = useMemo(
    () => resolveUnlockedTasks(authoredTasks, taskResults),
    [authoredTasks, taskResults]
  );
  const metrics = useMemo(
    () => calculateInstanceScore(snapshot, taskResults),
    [snapshot, taskResults]
  );

  useEffect(() => {
    if (!resolvedTasks.length) return;
    const current = resolvedTasks.find((task) => task.id === activeTaskId);
    if (current?.unlocked) return;
    const next = resolvedTasks.find((task) => task.unlocked);
    setActiveTaskId(next?.id || null);
  }, [resolvedTasks, activeTaskId]);

  const activeTask = resolvedTasks.find((task) => task.id === activeTaskId) || null;
  const activeResult = activeTask ? getTaskResult(taskResults, activeTask.id) : null;

  useEffect(() => {
    setSubmissionDraft(activeResult?.submission || "");
  }, [activeTaskId, activeResult?.submission]);

  const isKasm = instanceState?.provider === "kasm";
  const readOnly = INSTANCE_TERMINAL_STATUSES.includes(instanceState?.status) ||
    (isKasm && (instanceState.status !== "running" || !!instanceState.cleanup_state ||
      instanceState.runtime_authority !== "server_kasm_v1"));

  const runKasmTaskAction = async (action, fields = {}) => {
    if (!activeTask || !instanceState?.id || readOnly) return;
    setSaving(true);
    try {
      const next = await kasmProviderClient.task(action, instanceState.id, activeTask.id, fields);
      setInstanceState(next);
      return next;
    } catch (error) {
      toast({ title: "Could not save progress", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startPreview = async () => {
    if (!template || !user?.email) return;
    setStarting(true);
    try {
      const created = await kasmProviderClient.createPreview(template.id);
      navigate(`/LabRunnerPreview?instanceId=${created.id}`);
    } catch (error) {
      toast({
        title: "Could not start preview",
        description: error?.message || "Failed to create the preview instance.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const persistTaskResult = async (task, nextResult, extraInstanceFields = {}) => {
    if (!instanceState?.id || readOnly) return;
    setSaving(true);
    try {
      const nextResults = upsertTaskResult(taskResults, nextResult);
      const nextMetrics = calculateInstanceScore(snapshot, nextResults);
      const patch = {
        task_results: nextResults,
        progress: nextMetrics.progress,
        score: nextMetrics.score,
        ...extraInstanceFields,
      };
      await kasmProviderClient.savePreview(instanceState.id, patch);
      setInstanceState((prev) => ({ ...prev, ...patch }));
    } catch (error) {
      toast({
        title: "Could not save progress",
        description: error?.message || "The task result was not saved.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCriterionToggle = async (checkId, checked) => {
    if (!activeTask || isKasm) return;
    const next = setCriterionPassed(activeTask, activeResult, checkId, !!checked);
    await persistTaskResult(activeTask, next);
  };

  const handleRuntimeValidation = async (criterion) => {
    if (!activeTask || !criterion?.check || !instanceState?.id) return;
    setValidatingCheckId(criterion.check);
    try {
      const response = await runtimeValidationClient.validateCriterion({
        instanceId: instanceState.id,
        taskId: activeTask.id,
        checkId: criterion.check,
      });
      const saved = await runKasmTaskAction("applyValidation", { attempt_id: response.attempt_id });
      if (!saved) return;
      toast({
        title: response?.outcome?.passed ? "Runtime validation passed" : "Runtime validation failed",
        description: response?.outcome?.message || criterion.description || criterion.check,
      });
    } catch (error) {
      toast({
        title: "Runtime validation could not complete",
        description: error?.message || "The provider validator did not return a result.",
        variant: "destructive",
      });
    } finally {
      setValidatingCheckId(null);
      void refreshRuntimeAttempts();
    }
  };

  const handleRevealHint = async () => {
    if (!activeTask) return;
    if (isKasm) return runKasmTaskAction("hint");
    const next = revealNextHint(activeTask, activeResult);
    await persistTaskResult(activeTask, next);
  };

  const handleSaveProgress = async () => {
    if (!activeTask) return;
    if (isKasm) return runKasmTaskAction("saveTask", { submission: submissionDraft });
    const next = buildUpdatedTaskResult(activeTask, activeResult, {
      submission: submissionDraft,
      status: activeResult?.status === "passed" || activeResult?.status === "failed"
        ? activeResult.status
        : "in_progress",
    });
    await persistTaskResult(activeTask, next);
    toast({ title: "Progress saved", description: `${activeTask.title} was saved.` });
  };

  const handleFinalizeTask = async () => {
    if (!activeTask) return;
    if (isKasm) return runKasmTaskAction("submitTask", { submission: submissionDraft });
    const next = buildUpdatedTaskResult(activeTask, activeResult, {
      submission: submissionDraft,
      finalize: true,
    });
    await persistTaskResult(activeTask, next);
    toast({
      title: next.status === "passed" ? "Task passed" : "Task recorded as failed",
      description: next.status === "passed"
        ? "Adaptive flow and scoring have been updated."
        : "Any remediation path can now unlock based on this result.",
    });
  };

  const scoreableTasks = resolvedTasks.filter(
    (task) => task.unlocked || !!getTaskResult(taskResults, task.id)
  );
  const requiredTasks = scoreableTasks.filter((task) => task.is_required !== false);
  const allRequiredEvaluated = requiredTasks.length > 0 && requiredTasks.every((task) => {
    const result = getTaskResult(taskResults, task.id);
    return result && TASK_TERMINAL_STATUSES.includes(result.status);
  });

  const finishLab = async () => {
    if (!instanceState?.id || !allRequiredEvaluated || readOnly) return;
    setSaving(true);
    const completedAt = new Date().toISOString();
    const finalStatus = metrics.passed ? "completed" : "failed";
    try {
      if (isKasm) {
        const next = await kasmProviderClient.finish(instanceState.id);
        setInstanceState(next);
        toast({
          title: next.learning_outcome === "passed" ? "Lab passed" : "Lab finished",
          description: next.provider_status_message,
        });
        return;
      }
      await kasmProviderClient.savePreview(instanceState.id, {
        status: finalStatus,
        completed_at: completedAt,
        score: metrics.score,
        progress: metrics.progress,
      });
      setInstanceState((prev) => ({
        ...prev,
        status: finalStatus,
        completed_at: completedAt,
        score: metrics.score,
        progress: metrics.progress,
      }));
      toast({
        title: finalStatus === "completed" ? "Preview completed" : "Preview finished below passing score",
        description: `Final score: ${metrics.score}% (passing: ${metrics.passing_score}%).`,
      });
    } catch (error) {
      toast({ title: "Could not confirm lab finish", description: error.message, variant: "destructive" });
      if (isKasm) {
        const next = await kasmProviderClient.status(instanceState.id).catch(() => null);
        if (next) setInstanceState(next);
      }
    } finally {
      setSaving(false);
    }
  };

  if ((!instanceId && templateLoading) || (instanceId && instanceLoading)) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading lab preview…</div>;
  }

  if (!instanceId) {
    if (!template) {
      return (
        <div className="max-w-3xl mx-auto p-8">
          <p className="text-muted-foreground">Lab template not found.</p>
          <Link to="/LabTemplates" className="text-primary text-sm">Return to Lab Templates</Link>
        </div>
      );
    }

    const env = template.environment_definition || {};
    const tasks = template.lab_content?.tasks || [];
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/LabTemplates" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-6">
            <ArrowLeft className="h-4 w-4" /> Lab Templates
          </Link>

          <Card className="border-border bg-card overflow-hidden">
            <CardContent className="p-0">
              <div className="p-7 border-b border-border bg-gradient-to-br from-red-950/25 to-transparent">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-red-500/15 text-red-400 border-0">Native Preview</Badge>
                  <Badge variant="outline">{template.status || "draft"}</Badge>
                  <Badge variant="outline">{template.difficulty || "Beginner"}</Badge>
                </div>
                <h1 className="text-3xl font-bold text-foreground">{template.title}</h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">{template.description || "No description yet."}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 p-7">
                <div className="rounded-lg border border-border p-4">
                  <BookOpen className="h-5 w-5 text-primary mb-2" />
                  <p className="font-medium">{tasks.length} Tasks</p>
                  <p className="text-xs text-muted-foreground mt-1">Runs from a frozen template snapshot</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <Server className="h-5 w-5 text-primary mb-2" />
                  <p className="font-medium">{(env.resources || []).length} Resources</p>
                  <p className="text-xs text-muted-foreground mt-1">{(env.networks || []).length} defined networks</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <Target className="h-5 w-5 text-primary mb-2" />
                  <p className="font-medium">Passing score: {template.passing_score ?? 70}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Manual validation in preview mode</p>
                </div>
              </div>

              <div className="px-7 pb-5 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground max-w-2xl">
                  Preview mode creates a frozen <code className="text-foreground">LabInstance</code> without provisioning an execution provider.
                </div>
                <Button onClick={startPreview} disabled={starting || !user?.email} variant="outline" className="gap-2">
                  <Play className="h-4 w-4" /> {starting ? "Starting…" : "Start Native Preview"}
                </Button>
              </div>
              <div className="px-7 pb-7">
                <KasmLaunchPanel template={template} user={user} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!instanceState || !snapshot) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <p className="text-muted-foreground">Preview instance not found or missing its template snapshot.</p>
        <Link to="/LearnerWorkspace" className="text-primary text-sm">Return to Assigned Labs</Link>
      </div>
    );
  }

  const env = snapshot.environment_definition || {};
  const activeHints = activeTask?.hints || [];
  const revealedHints = activeHints.slice(0, activeResult?.hints_used || 0);
  const criteria = activeTask?.validation_criteria || [];
  const passedChecks = (activeResult?.validation_results || []).filter((result) => result.passed).length;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <Link to="/LearnerWorkspace" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Lab Instances
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{snapshot.title}</h1>
              <Badge className={instanceState.provider === "kasm" ? "bg-green-500/15 text-green-500 border-0" : "bg-red-500/15 text-red-400 border-0"}>{instanceState.provider === "kasm" ? "Kasm Live" : "Native Preview"}</Badge>
              <Badge variant="outline">{instanceState.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Frozen template v{instanceState.template_version || "1.0"} · provider: {instanceState.provider}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</p>
              <p className={`text-xl font-bold ${metrics.passed ? "text-green-500" : "text-foreground"}`}>{metrics.score}%</p>
            </div>
            <div className="text-right min-w-28">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Progress</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={metrics.progress} className="h-2 w-20" />
                <span className="text-xs">{metrics.progress}%</span>
              </div>
            </div>
            {instanceState.provider === "kasm" && instanceState.status === "running" && !readOnly && instanceState.provider_session_url && (
              <a href={instanceState.provider_session_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Kasm Workspace
                </Button>
              </a>
            )}
            {!readOnly && (
              <Button size="sm" onClick={finishLab} disabled={!allRequiredEvaluated || saving || instanceState.status === "provisioning"} className="gap-1.5">
                <Flag className="h-3.5 w-3.5" /> Finish Lab
              </Button>
            )}
          </div>
        </div>

        {instanceState.provider === "kasm" && instanceState.status === "provisioning" && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
            <p className="text-sm font-medium text-yellow-700">Kasm workspace is starting…</p>
            <p className="text-xs text-muted-foreground mt-1">
              {instanceState.provider_status_message || "Waiting for Kasm to report the workspace as running."}
              {Number(instanceState.provider_status_progress) > 0 ? ` · ${instanceState.provider_status_progress}%` : ""}
            </p>
          </div>
        )}

        {isKasm && user?.role === "admin" && instanceState.runtime_authority !== "server_kasm_v1" && (
          <div className="mb-4 space-y-2">
            <Button size="sm" variant="outline" disabled={inspecting} onClick={inspectWorkspace}>
              {inspecting ? "Checking Kasm…" : "Check workspace inventory"}
            </Button>
            {inspection && <p role="status" className="text-sm">{inspection}</p>}
          </div>
        )}
        {readOnly && (
          <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">This preview is finished.</p>
              <p className="text-xs text-muted-foreground">Results are read-only. Start another preview from the template to test again.</p>
            </div>
            <Link to={`/LabRunnerPreview?templateId=${instanceState.template_id}`}>
              <Button variant="outline" size="sm" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> New Preview</Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_300px] gap-4">
          {/* Task rail */}
          <aside className="rounded-xl border border-border bg-card overflow-hidden h-fit xl:sticky xl:top-4">
            <div className="p-4 border-b border-border">
              <p className="font-semibold text-sm">Lab Tasks</p>
              <p className="text-xs text-muted-foreground mt-1">Adaptive paths update from task results.</p>
            </div>
            <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {resolvedTasks.length === 0 && <p className="text-xs text-muted-foreground p-3">No tasks authored yet.</p>}
              {resolvedTasks.map((task, index) => {
                const result = getTaskResult(taskResults, task.id);
                const active = task.id === activeTaskId;
                return (
                  <button
                    type="button"
                    key={task.id}
                    disabled={!task.unlocked}
                    onClick={() => task.unlocked && setActiveTaskId(task.id)}
                    className={`w-full text-left rounded-lg px-3 py-3 border transition-colors ${
                      active ? "border-red-500/50 bg-red-500/10" : "border-transparent hover:bg-secondary/60"
                    } ${!task.unlocked ? "opacity-55 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{taskStatusIcon(result, task.unlocked)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex gap-1 items-center flex-wrap mb-0.5">
                          <span className="text-[10px] text-muted-foreground">Task {index + 1}</span>
                          {branchBadge(task)}
                        </div>
                        <p className="text-xs font-medium leading-snug truncate">{task.title || "Untitled Task"}</p>
                        {!task.unlocked && task.branch_locked_reason && (
                          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{task.branch_locked_reason}</p>
                        )}
                      </div>
                      {task.unlocked && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main workspace */}
          <main className="min-w-0 space-y-4">
            {snapshot.lab_content?.scenario && (
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <details open>
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Scenario Briefing</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Frozen with this instance</span>
                    </summary>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground mt-4">
                      <ReactMarkdown>{snapshot.lab_content.scenario}</ReactMarkdown>
                    </div>
                    {snapshot.lab_content?.success_criteria && (
                      <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-3">
                        <p className="text-xs font-semibold mb-1">Overall Success Criteria</p>
                        <div className="prose prose-xs dark:prose-invert max-w-none text-muted-foreground">
                          <ReactMarkdown>{snapshot.lab_content.success_criteria}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </details>
                </CardContent>
              </Card>
            )}

            {!activeTask ? (
              <Card className="border-border bg-card"><CardContent className="p-8 text-center text-muted-foreground">No unlocked task is available.</CardContent></Card>
            ) : (
              <>
                <Card className="border-border bg-card">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="text-xl font-semibold">{activeTask.title}</h2>
                          {branchBadge(activeTask)}
                          <Badge variant="outline" className="text-[10px]">{activeTask.task_type}</Badge>
                          <Badge variant="outline" className="text-[10px]">{activeTask.points || 0} pts</Badge>
                          {activeTask.is_required === false && <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{activeResult?.status ? `Status: ${activeResult.status}` : "Not started"}</p>
                      </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                      <ReactMarkdown>{activeTask.instructions || "No instructions authored for this task."}</ReactMarkdown>
                    </div>

                    {criteria.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Validation Criteria</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Manual criteria can be checked here. Criteria with a runtime validator are verified against the live provider workspace.</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{passedChecks}/{criteria.length} passed</span>
                        </div>
                        <div className="space-y-2">
                          {criteria.map((criterion) => {
                            const result = activeResult?.validation_results?.find((r) => r.check === criterion.check);
                            const diagnostic = runtimeAttempts.find(
                              (attempt) => attempt.task_id === activeTask.id && attempt.check_id === criterion.check
                            );
                            const diagnosticEvidence = diagnostic?.evidence || result?.evidence || {};
                            const runtimeValidator = criterion.runtime_validator;
                            const isRuntimeCriterion = !!runtimeValidator?.type;
                            const canRuntimeValidate =
                              isRuntimeCriterion &&
                              instanceState.provider === "kasm" &&
                              instanceState.status === "running";
                            return (
                              <div key={criterion.check} className="flex items-start gap-3 rounded-lg border border-border p-3 bg-secondary/20">
                                {isRuntimeCriterion ? (
                                  <div className="mt-0.5 h-4 w-4 rounded-full border border-border flex items-center justify-center">
                                    {result?.passed
                                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      : <Circle className="h-3 w-3 text-muted-foreground" />}
                                  </div>
                                ) : (
                                  <Checkbox
                                    checked={!!result?.passed}
                                    onCheckedChange={(checked) => handleCriterionToggle(criterion.check, checked)}
                                    disabled={readOnly || saving || isKasm}
                                    className="mt-0.5"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm">{criterion.description || criterion.check}</p>
                                    {isRuntimeCriterion && (
                                      <Badge variant="outline" className="text-[10px]">Runtime: {runtimeValidator.type}</Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1">Check ID: {criterion.check || "—"}</p>
                                  {runtimeValidator?.type === "path_exists" && (
                                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                                      {runtimeValidator.path_kind || "any"} · {runtimeValidator.path || "path not configured"}
                                    </p>
                                  )}
                                  {runtimeValidator?.type === "command_result" && (
                                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                                      file mode · {runtimeValidator.path || "path not configured"} · expected {runtimeValidator.expected_output || "not configured"}
                                    </p>
                                  )}
                                  {result?.message && (
                                    <p className={`text-[10px] mt-1 ${result.passed ? "text-green-600" : "text-orange-600"}`}>
                                      {result.message}
                                    </p>
                                  )}
                                  {result?.source === "runtime" && result?.evidence?.observed && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Evidence: {result.evidence.observed}
                                    </p>
                                  )}
                                  {isRuntimeCriterion && (diagnostic || result?.evidence?.stages) && (
                                    <details className="mt-2 text-[10px] text-muted-foreground">
                                      <summary className="cursor-pointer font-medium">
                                        Runtime diagnostic · {diagnostic?.status || "completed"}
                                      </summary>
                                      <div className="mt-1 space-y-0.5 font-mono">
                                        {diagnostic?.id && <p>attempt ID: {diagnostic.id}</p>}
                                        <p>dispatch: {diagnosticEvidence.stages?.dispatch || "unknown"}</p>
                                        <p>probe: {diagnosticEvidence.stages?.probe_execution || "not confirmed"}</p>
                                        <p>callback: {diagnosticEvidence.stages?.callback || "not confirmed"}</p>
                                        {diagnosticEvidence.workspace_result_path && (
                                          <p className="break-all">workspace trace: {diagnosticEvidence.workspace_result_path}</p>
                                        )}
                                        {diagnostic?.message && <p>{diagnostic.message}</p>}
                                      </div>
                                    </details>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">{criterion.points || 0} pts</span>
                                  {isRuntimeCriterion && !readOnly && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px]"
                                      onClick={() => handleRuntimeValidation(criterion)}
                                      disabled={!canRuntimeValidate || saving || validatingCheckId === criterion.check}
                                    >
                                      {validatingCheckId === criterion.check ? "Validating…" : "Validate"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeHints.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" /> Progressive Hints</h3>
                          {!readOnly && revealedHints.length < activeHints.length && (
                            <Button size="sm" variant="outline" onClick={handleRevealHint} disabled={saving} className="text-xs gap-1.5">
                              <Lightbulb className="h-3.5 w-3.5" /> Reveal next hint
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {revealedHints.length === 0 && <p className="text-xs text-muted-foreground">No hints revealed yet.</p>}
                          {revealedHints.map((hint, index) => (
                            <div key={index} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm">
                              <span className="text-yellow-600 font-medium mr-2">Hint {index + 1}</span>{hint}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold mb-2">Learner Notes / Submission</h3>
                      <Textarea
                        value={submissionDraft}
                        onChange={(event) => setSubmissionDraft(event.target.value)}
                        disabled={readOnly}
                        rows={7}
                        placeholder="Record commands, observations, analysis, or paste a configuration here…"
                        className="font-mono text-xs"
                      />
                    </div>

                    {!readOnly && (
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={handleSaveProgress} disabled={saving} className="gap-1.5">
                          <Save className="h-3.5 w-3.5" /> Save Progress
                        </Button>
                        <Button onClick={handleFinalizeTask} disabled={saving} className="gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Submit Task Result
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </main>

          {/* Context rail */}
          <aside className="space-y-4 h-fit xl:sticky xl:top-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Target className="h-4 w-4 text-primary" /> Session</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Points</span><span>{metrics.points_earned}/{metrics.points_possible}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Passing</span><span>{metrics.passing_score}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Required passed</span><span>{metrics.required_tasks_passed}/{metrics.required_tasks_total}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{snapshot.estimated_duration_minutes || 60} min</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Server className="h-4 w-4 text-primary" /> Environment</h3>
                <div className="space-y-3">
                  {(env.resources || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No provider-independent resources defined.</p>
                  ) : (
                    (env.resources || []).slice(0, 6).map((resource) => (
                      <div key={resource.id} className="rounded-lg border border-border p-2.5">
                        <p className="text-xs font-medium truncate">{resource.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{resource.role || resource.resource_type} · {resource.os_type || "OS unspecified"}</p>
                        <div className="flex gap-2 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Cpu className="h-2.5 w-2.5" />{resource.cpu_cores || 2}</span>
                          <span className="flex items-center gap-0.5"><MemoryStick className="h-2.5 w-2.5" />{resource.memory_mb || 4096}MB</span>
                          <span className="flex items-center gap-0.5"><HardDrive className="h-2.5 w-2.5" />{resource.storage_gb || 20}GB</span>
                        </div>
                      </div>
                    ))
                  )}
                  <Separator />
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Network className="h-3 w-3" /> Networks</span><span>{(env.networks || []).length}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Internet</span><span>{env.connectivity_policy?.internet_access || "none"}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Isolation</span><span>{env.connectivity_policy?.isolation_required !== false ? "required" : "not required"}</span></div>
                </div>
              </CardContent>
            </Card>

            {(snapshot.objectives || []).length > 0 && (
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Objectives</h3>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {snapshot.objectives.map((objective, index) => <li key={index} className="flex gap-2"><span className="text-primary">•</span><span>{objective}</span></li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
