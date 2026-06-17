import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, XCircle, Lightbulb, Terminal, FileText,
  ChevronDown, Send, Star, Wrench, Lock
} from "lucide-react";
import TerminalEmulator from "./TerminalEmulator";
import { base44 } from "@/api/base44Client";

const BRANCH_LABELS = {
  advanced: { label: "Advanced", icon: Star, color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  remediation: { label: "Remediation", icon: Wrench, color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
};

export default function TaskWorkspaceModal({ task, taskProgress, attempt, onClose, onProgressSaved }) {
  const [hintsRevealed, setHintsRevealed] = useState(taskProgress?.hints_used || 0);
  const [submission, setSubmission] = useState(taskProgress?.submission || "");
  const [saving, setSaving] = useState(false);
  const [validationResults, setValidationResults] = useState(taskProgress?.validation_results || []);
  const [terminalMatches, setTerminalMatches] = useState([]);

  const hints = task?.hints || [];
  const criteria = task?.validation_criteria || [];
  const expectedCmds = task?.expected_commands || [];
  const branchInfo = BRANCH_LABELS[task?.branch_type];

  // Called by TerminalEmulator whenever commands are validated
  const handleValidationUpdate = useCallback((matchedArray, cmdHistory) => {
    setTerminalMatches(matchedArray);

    // Auto-fill validation_results from terminal session
    if (criteria.length > 0) {
      const autoResults = criteria.map((crit, i) => ({
        check: crit.check,
        passed: matchedArray[i] ?? false,
        points_awarded: (matchedArray[i] ?? false) ? (crit.points || 0) : 0,
        message: (matchedArray[i] ?? false) ? "Verified via terminal" : "Command not yet entered",
      }));
      setValidationResults(autoResults);
    }
  }, [criteria]);

  const pointsEarned = validationResults.reduce((s, r) => s + (r.passed ? (r.points_awarded || 0) : 0), 0);
  const totalPoints = criteria.reduce((s, c) => s + (c.points || 0), 0);
  const allPassed = criteria.length > 0 && validationResults.filter(r => r.passed).length === criteria.length;

  const handleRevealHint = () => {
    if (hintsRevealed < hints.length) setHintsRevealed(h => h + 1);
  };

  const handleSubmit = async () => {
    if (!attempt?.id || !task?.id) return;
    setSaving(true);

    const existingProgress = taskProgress;
    const progressData = {
      attempt_id: attempt.id,
      task_id: task.id,
      scenario_id: task.scenario_id,
      user_email: attempt.user_email,
      submission,
      hints_used: hintsRevealed,
      validation_results: validationResults,
      points_earned: pointsEarned,
      status: allPassed ? "passed" : (submission || terminalMatches.some(Boolean) ? "submitted" : "in_progress"),
      submitted_at: new Date().toISOString(),
    };

    if (existingProgress?.id) {
      await base44.entities.TaskProgress.update(existingProgress.id, progressData);
    } else {
      await base44.entities.TaskProgress.create({ ...progressData, started_at: new Date().toISOString() });
    }

    setSaving(false);
    if (onProgressSaved) onProgressSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-card border-border p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-semibold leading-tight">{task?.title}</DialogTitle>
                {branchInfo && (
                  <Badge className={`text-xs border ${branchInfo.color}`}>{branchInfo.label}</Badge>
                )}
                <Badge className="text-xs bg-secondary text-muted-foreground">{task?.task_type}</Badge>
                <Badge className="text-xs bg-secondary text-muted-foreground">{task?.points || 0} pts</Badge>
              </div>
              {totalPoints > 0 && (
                <div className="flex items-center gap-2">
                  <Progress value={totalPoints > 0 ? (pointsEarned / totalPoints) * 100 : 0} className="h-1.5 flex-1 max-w-[200px]" />
                  <span className="text-xs text-muted-foreground">{pointsEarned}/{totalPoints} pts earned</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="terminal" className="h-full flex flex-col">
            <TabsList className="mx-6 mt-4 mb-0 grid grid-cols-3 w-fit bg-secondary shrink-0">
              <TabsTrigger value="terminal" className="gap-1.5 text-xs">
                <Terminal className="h-3.5 w-3.5" /> Terminal
              </TabsTrigger>
              <TabsTrigger value="instructions" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> Instructions
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 text-xs">
                <Send className="h-3.5 w-3.5" /> Notes & Submit
              </TabsTrigger>
            </TabsList>

            {/* Terminal Tab */}
            <TabsContent value="terminal" className="flex-1 p-4 pt-3 space-y-3">
              {expectedCmds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No expected commands defined for this task.</p>
                  <p className="text-xs mt-1">The admin can add commands in the task configuration.</p>
                </div>
              ) : (
                <TerminalEmulator
                  task={task}
                  onValidationUpdate={handleValidationUpdate}
                />
              )}

              {/* Expected commands hint */}
              {expectedCmds.length > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>Tip: Press <kbd className="px-1 py-0.5 rounded bg-secondary font-mono">Tab</kbd> to autocomplete, <kbd className="px-1 py-0.5 rounded bg-secondary font-mono">↑↓</kbd> for history</span>
                </div>
              )}
            </TabsContent>

            {/* Instructions Tab */}
            <TabsContent value="instructions" className="flex-1 p-6 pt-4 space-y-5 overflow-y-auto">
              {task?.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Task Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{task.description}</p>
                </div>
              )}

              {criteria.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Validation Criteria</h3>
                  <div className="space-y-2">
                    {criteria.map((crit, i) => {
                      const res = validationResults[i];
                      const passed = res?.passed ?? false;
                      return (
                        <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm transition-colors ${passed ? "border-green-500/30 bg-green-500/5" : "border-border bg-secondary/50"}`}>
                          {passed
                            ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                            : <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={passed ? "text-green-300" : "text-foreground"}>{crit.description || crit.check}</p>
                            {res?.message && <p className="text-xs text-muted-foreground mt-0.5">{res.message}</p>}
                          </div>
                          {crit.points && (
                            <span className={`text-xs font-medium shrink-0 ${passed ? "text-green-400" : "text-muted-foreground"}`}>
                              {passed ? "+" : ""}{crit.points}pts
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hints */}
              {hints.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-yellow-400" />
                    Hints ({hintsRevealed}/{hints.length} revealed)
                  </h3>
                  <div className="space-y-2">
                    {hints.slice(0, hintsRevealed).map((hint, i) => (
                      <div key={i} className="flex gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                        <span className="text-yellow-400 font-medium shrink-0">#{i + 1}</span>
                        <p className="text-yellow-200">{hint}</p>
                      </div>
                    ))}
                    {hintsRevealed < hints.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                        onClick={handleRevealHint}
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        Reveal Hint {hintsRevealed + 1}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Notes & Submit Tab */}
            <TabsContent value="notes" className="flex-1 p-6 pt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Your Notes / Submission</label>
                <Textarea
                  value={submission}
                  onChange={e => setSubmission(e.target.value)}
                  placeholder="Paste your configuration, observations, or analysis here..."
                  className="bg-secondary border-border font-mono text-xs resize-none"
                  rows={10}
                />
                <p className="text-xs text-muted-foreground mt-1">This will be saved alongside your terminal validation results.</p>
              </div>

              {/* Summary */}
              {criteria.length > 0 && (
                <div className="p-4 rounded-lg border border-border bg-secondary/50 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Submission Summary</h3>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Checks Passed</p>
                      <p className={`font-bold ${allPassed ? "text-green-400" : "text-foreground"}`}>
                        {validationResults.filter(r => r.passed).length} / {criteria.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Points Earned</p>
                      <p className={`font-bold ${pointsEarned > 0 ? "text-primary" : "text-foreground"}`}>{pointsEarned} / {totalPoints}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <p className={`font-bold ${allPassed ? "text-green-400" : "text-muted-foreground"}`}>
                        {allPassed ? "✓ Passed" : "In Progress"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 shrink-0 bg-card">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            Close
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className={`gap-1.5 ${allPassed ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
          >
            <Send className="h-3.5 w-3.5" />
            {saving ? "Saving..." : allPassed ? "Submit & Complete" : "Save Progress"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}