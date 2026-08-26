import React from "react";
import { AlertTriangle, Flag, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CompleteScenarioDialog({
  open,
  onOpenChange,
  onConfirm,
  actionsCompleted = 0,
  score = 0,
}) {
  const confirm = () => {
    onOpenChange(false);
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg overflow-hidden border-amber-500/30 bg-card p-0 text-foreground shadow-2xl">
        <div className="border-b border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent px-6 py-5">
          <AlertDialogHeader className="text-left">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
              <Flag className="h-6 w-6 text-amber-400" />
            </div>
            <AlertDialogTitle className="text-xl text-foreground">End this scenario early?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              This submits your current work as a completed attempt. The system will score what you accomplished and send the result to your stats and dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
              <div className="text-2xl font-bold font-mono text-primary">{actionsCompleted}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Actions completed</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
              <div className="text-2xl font-bold font-mono text-primary">{score}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Current points</div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-100/80">
              Any incomplete response steps and remaining threats will lower the final score. This action cannot be undone.
            </p>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80">
              Continue Scenario
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400"
            >
              <ShieldCheck className="h-4 w-4" />
              Score &amp; Submit Attempt
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
