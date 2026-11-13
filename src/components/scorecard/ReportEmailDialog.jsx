import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function ReportEmailDialog({ open, onOpenChange, scorecard, assessment }) {
  const [recipients, setRecipients] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");
    setResult(null);
    const list = recipients.split(/[,;\s]+/).map((value) => value.trim()).filter(Boolean);
    if (!list.length) {
      setError("Add at least one reviewer email address.");
      return;
    }
    setSending(true);
    try {
      const response = await base44.functions.invoke("sendCandidateReport", {
        scorecard_id: scorecard.id,
        recipients: list,
        note,
      });
      if (response.data?.error) throw new Error(response.data.error);
      setResult(response.data);
      setRecipients("");
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "The report could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { setError(""); setResult(null); onOpenChange(value); }}>
      <DialogContent className="bg-gray-950 border-gray-800 text-gray-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="h-4 w-4 text-red-400" /> Email Report for Review
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {scorecard?.candidate_name} · {assessment?.position_title || "Assessment"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="report-recipients" className="text-gray-300 text-sm">Reviewer emails</Label>
            <Input
              id="report-recipients"
              value={recipients}
              onChange={(event) => setRecipients(event.target.value)}
              placeholder="hiring.manager@company.com, team.lead@company.com"
              className="bg-black/40 border-gray-700 text-white placeholder:text-gray-600"
            />
            <p className="text-[11px] text-gray-500">Separate multiple addresses with a comma. Up to 10 reviewers.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-note" className="text-gray-300 text-sm">Note for reviewers (optional)</Label>
            <Textarea
              id="report-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Please review before Thursday's hiring sync."
              className="bg-black/40 border-gray-700 text-white placeholder:text-gray-600"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
          )}

          {result && (
            <div className="text-xs text-green-300 bg-green-950/30 border border-green-900/50 rounded-lg px-3 py-2">
              <p className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Report sent to {result.sent} {result.sent === 1 ? "reviewer" : "reviewers"}.
              </p>
              {result.failed?.length > 0 && (
                <p className="mt-1 text-yellow-300">
                  Not delivered to {result.failed.map((item) => item.email).join(", ")}.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-white">
            Close
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-red-600 hover:bg-red-500 text-white">
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Mail className="h-4 w-4 mr-2" />Send Report</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}