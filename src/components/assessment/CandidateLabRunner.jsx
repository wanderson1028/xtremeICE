import React from "react";
import { AlertCircle, Shield } from "lucide-react";
import M365Assessment from "@/pages/M365Assessment";
import { isCandidateRunnable } from "@/lib/candidateLabs";

/* Runs the lab an assessment was built from, inside the candidate's own link.
   The candidate is not signed in, so the lab reports its result instead of
   storing a training score. */
export default function CandidateLabRunner({ lab, onComplete }) {
  if (!isCandidateRunnable(lab)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h2 className="mb-2 text-xl font-bold text-white">This lab cannot run here yet</h2>
          <p className="text-sm leading-relaxed text-gray-400">
            {lab?.title || "The selected lab"} needs the training environment and is not available
            inside this invitation link. Please contact the hiring team to arrange your attempt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="flex items-center gap-2 border-b border-gray-800 bg-black/80 px-5 py-2.5">
        <Shield className="h-4 w-4 text-red-500" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-gray-400">
          Candidate assessment
        </span>
      </div>
      <M365Assessment candidateMode onComplete={onComplete} />
    </div>
  );
}