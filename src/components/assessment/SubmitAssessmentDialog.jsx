import React from "react";
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

/**
 * Confirms an early submission. Submitting ends the attempt immediately, so the
 * candidate is told exactly how many questions they are leaving unanswered.
 */
export default function SubmitAssessmentDialog({ open, onOpenChange, answeredCount, totalCount, submitting, onConfirm }) {
  const unanswered = Math.max(0, totalCount - answeredCount);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <AlertDialogContent className="bg-gray-950 border border-red-900/40 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Submit your assessment now?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400 leading-relaxed">
            You have answered <span className="text-white font-semibold">{answeredCount}</span> of{" "}
            <span className="text-white font-semibold">{totalCount}</span> questions.
            {unanswered > 0 ? (
              <>
                {" "}
                The remaining <span className="text-red-400 font-semibold">{unanswered}</span> will be
                submitted as unanswered.
              </>
            ) : (
              " Every question has an answer."
            )}{" "}
            Submission is final — you cannot change answers or retake this assessment afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={submitting}
            className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
          >
            Keep working
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-green-700 hover:bg-green-600 text-white font-semibold"
          >
            {submitting ? "Submitting..." : "Submit assessment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}