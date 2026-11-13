import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2, Search, UserPlus, Users, X } from "lucide-react";

const message = (error, fallback) => error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

export default function AssignmentDialog({ exercise, onClose, onAssigned }) {
  const [learners, setLearners] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [wholeOrg, setWholeOrg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [options, assignments] = await Promise.all([
        base44.functions.invoke("trainingAssignments", { action: "options" }),
        base44.entities.TrainingAssignment.filter({ exercise_id: exercise.id }, { sort: "-created_date", limit: 200 }),
      ]);
      setLearners(options.data?.learners || []);
      setAssigned(assignments.items || []);
    } catch (error) {
      setLoadError(message(error, "Learners could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [exercise.id]);

  useEffect(() => { load(); }, [load]);

  const orgLearners = useMemo(() => {
    const scoped = learners.filter((learner) => learner.organization_id && learner.organization_id === exercise.app_organization_id);
    return scoped.length ? scoped : learners;
  }, [learners, exercise.app_organization_id]);

  const assignedEmails = useMemo(
    () => new Set(assigned.map((row) => String(row.assignee_email || "").toLowerCase())),
    [assigned]
  );

  const available = useMemo(
    () => orgLearners.filter((learner) => !assignedEmails.has(String(learner.email || "").toLowerCase())),
    [orgLearners, assignedEmails]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((learner) => `${learner.full_name || ""} ${learner.email || ""}`.toLowerCase().includes(q));
  }, [available, query]);

  const toggle = (email) => {
    const key = String(email || "").toLowerCase();
    setSelectedEmails((current) => (current.includes(key) ? current.filter((value) => value !== key) : [...current, key]));
  };

  const commit = async () => {
    setSaveError("");
    setSaving(true);
    try {
      const response = await base44.functions.invoke("trainingAssignments", {
        action: "assign",
        exercise_id: exercise.id,
        emails: selectedEmails,
        whole_organization: wholeOrg,
      });
      onAssigned?.(response.data?.created || 0);
    } catch (error) {
      setSaveError(message(error, "The assignment could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = wholeOrg ? available.length : selectedEmails.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-white shadow-2xl" style={{ borderColor: "#d4d4d4" }}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "#e5e5e5" }}>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><UserPlus className="h-4 w-4" /> Assign training</h2>
            <p className="mt-1 truncate text-[11px]" style={{ color: "#404040" }}>
              {exercise.title} · {exercise.organization_name || "Organization"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: "#404040" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {loadError && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{loadError}</p>}

          <label className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${wholeOrg ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white"}`}>
            <input type="checkbox" checked={wholeOrg} onChange={(event) => setWholeOrg(event.target.checked)} className="mt-0.5" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold"><Users className="h-3.5 w-3.5" /> Assign the whole organization</span>
              <span className="mt-0.5 block" style={{ color: "#404040" }}>
                Everyone in {exercise.organization_name || "this organization"} gets this exercise ({orgLearners.length} learner{orgLearners.length === 1 ? "" : "s"}).
              </span>
            </span>
          </label>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#404040" }}>Or pick individual learners</p>
            <label className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#737373" }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search learners"
                disabled={wholeOrg}
                className="sg-input h-9 w-full pl-9 pr-3 text-sm disabled:opacity-60"
              />
            </label>

            <div className={`mt-2 max-h-52 overflow-y-auto rounded-lg border ${wholeOrg ? "opacity-50" : ""}`} style={{ borderColor: "#e5e5e5" }}>
              {loading ? (
                <p className="flex items-center gap-2 px-3 py-3 text-xs" style={{ color: "#404040" }}><Loader2 className="h-4 w-4 animate-spin" /> Loading learners…</p>
              ) : filtered.length ? (
                filtered.map((learner) => {
                  const key = String(learner.email || "").toLowerCase();
                  const isOn = selectedEmails.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={wholeOrg}
                      onClick={() => toggle(key)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${isOn ? "bg-red-50" : "hover:bg-neutral-100"}`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isOn ? "border-red-600 bg-red-600" : "border-[#d4d4d4] bg-white"}`}>
                        {isOn && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{learner.full_name || learner.email}</span>
                        <span className="block truncate text-[10px]" style={{ color: "#404040" }}>{learner.email}</span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-3 text-xs" style={{ color: "#404040" }}>
                  {available.length ? "No learner matches that search." : "Everyone in this organization already has this exercise."}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#404040" }}>Assigned so far ({assigned.length})</p>
            {assigned.length ? (
              <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto">
                {assigned.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-[11px]" style={{ borderColor: "#e5e5e5", color: "#404040" }}>
                    <span className="truncate">{row.assignee_name || row.assignee_email}</span>
                    <span className="shrink-0">{row.assignment_scope === "organization" ? "whole org" : "individual"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px]" style={{ color: "#404040" }}>No learners assigned yet.</p>
            )}
          </div>

          {saveError && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{saveError}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "#e5e5e5" }}>
          <button type="button" onClick={onClose} className="sg-btn px-3 py-2 text-xs">Cancel</button>
          <button
            type="button"
            onClick={commit}
            disabled={saving || !pendingCount}
            className="sg-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            {saving ? "Assigning…" : `Assign ${pendingCount || ""}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}