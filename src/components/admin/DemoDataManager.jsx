import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Database, FlaskConical, Loader2, Network, ShieldAlert, GraduationCap, UserCheck, Radar, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const tiles = [
  { key: "network_designs", label: "Network designs", icon: Network, color: "text-blue-600 bg-blue-50" },
  { key: "soc_sessions", label: "SOC sessions", icon: ShieldAlert, color: "text-red-600 bg-red-50" },
  { key: "lab_scores", label: "Lab results", icon: GraduationCap, color: "text-violet-600 bg-violet-50" },
  { key: "assessments", label: "Assessments", icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
  { key: "candidate_invitations", label: "Candidate records", icon: Database, color: "text-amber-600 bg-amber-50" },
  { key: "threat_items", label: "Threat feed items", icon: Radar, color: "text-cyan-600 bg-cyan-50" },
];

export default function DemoDataManager() {
  const queryClient = useQueryClient();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notice, setNotice] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["demo-data-status"],
    queryFn: async () => {
      const response = await base44.functions.invoke("demoDataManager", { action: "status" });
      return response.data;
    },
  });

  const operation = useMutation({
    mutationFn: async (action) => {
      const response = await base44.functions.invoke("demoDataManager", { action });
      return response.data;
    },
    onSuccess: async (result) => {
      setNotice({ type: "success", text: result.message });
      await refetch();
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      setNotice({ type: "error", text: error?.response?.data?.error || error.message || "Operation failed" });
    },
  });

  const counts = data?.counts || {};
  const hasDemoData = (counts.total || 0) > 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-6 py-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center shrink-0">
              <FlaskConical className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Application Demo Data</h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Populate Xtreme I.C.E. with safe, clearly labeled sample records to demonstrate dashboards, network design, SOC analytics, candidate assessments, labs, and threat-driven drills.
              </p>
            </div>
          </div>
          <div className={"rounded-full border px-3 py-1.5 text-xs font-semibold self-start " + (hasDemoData ? "border-green-400/30 bg-green-400/10 text-green-300" : "border-slate-500/30 bg-white/5 text-slate-300")}>
            {isLoading ? "Checking…" : hasDemoData ? (counts.total + " demo records active") : "Demo data hidden"}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {notice && (
          <div className={"flex items-start gap-2.5 rounded-xl border p-3.5 text-sm " + (notice.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800")}>
            {notice.type === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {tiles.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={"h-9 w-9 rounded-lg flex items-center justify-center " + color}><Icon className="h-4 w-4" /></div>
              <div>
                <div className="text-xl font-bold text-gray-900">{isLoading ? "—" : counts[key] || 0}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-sm font-semibold text-blue-950">Safe demo-data controls</p>
          <ul className="mt-2 space-y-1.5 text-xs text-blue-900/70">
            <li>• Demo records are labeled with a [DEMO] marker and tied to your administrator account.</li>
            <li>• Loading again refreshes the sample set instead of creating duplicates.</li>
            <li>• Removing demo data targets only those marked records; production and user-created data remain unchanged.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => operation.mutate("seed")} disabled={operation.isPending} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            {operation.isPending && operation.variables === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            {hasDemoData ? "Refresh Demo Data" : "Load Demo Data"}
          </Button>
          <Button variant="outline" onClick={() => setConfirmRemove(true)} disabled={!hasDemoData || operation.isPending} className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
            <Trash2 className="h-4 w-4" /> Remove / Hide Demo Data
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {counts.total || 0} records marked as demo data. Real network designs, scores, sessions, assessments, and threat records will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Demo Data</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmRemove(false); operation.mutate("remove"); }} className="bg-red-600 text-white hover:bg-red-700">
              Remove Demo Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
