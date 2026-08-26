import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Loader2, Network, ShieldCheck, Users, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const REGIONS = {
  aws: ["us-east-1", "us-east-2", "us-west-2"],
  azure: ["eastus", "eastus2", "westus2"],
  gcp: ["us-east1", "us-central1", "us-west1"],
};

export default function LaunchLiveFireDialog({ event, open, onOpenChange }) {
  const navigate = useNavigate();
  const [cloudProvider, setCloudProvider] = useState("aws");
  const [region, setRegion] = useState("us-east-1");
  const [visibility, setVisibility] = useState("private");
  const [autoShutdown, setAutoShutdown] = useState(120);
  const [launching, setLaunching] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState("");

  const { data: designs = [], isLoading: loadingDesigns } = useQuery({
    queryKey: ["network-designs-for-live-fire"],
    queryFn: () => base44.entities.NetworkDesign.list("-created_date", 100),
    enabled: open,
  });

  useEffect(() => {
    setSelectedDesignId(event?.network_design_id || "");
  }, [event?.id, event?.network_design_id, open]);

  if (!event) return null;

  const selectedDesign = designs.find(design => design.id === selectedDesignId);
  const designIsGenerated = !!selectedDesign?.diagram_data?.nodes?.length;

  const checks = [
    { label: designIsGenerated ? "Network design ready" : "Select a generated design", ok: designIsGenerated, icon: Network },
    { label: "Team objectives configured", ok: !!(event.red_team_objectives?.length && event.blue_team_objectives?.length), icon: Users },
    { label: "Rules and scoring configured", ok: !!(event.rules_of_engagement && event.scoring_criteria), icon: ShieldCheck },
  ];
  const canLaunch = !!selectedDesignId && designIsGenerated;

  const changeProvider = (provider) => {
    setCloudProvider(provider);
    setRegion(REGIONS[provider][0]);
  };

  const launch = async () => {
    if (!canLaunch) return;
    setLaunching(true);
    try {
      if (selectedDesignId !== event.network_design_id) {
        await base44.entities.CyberEvent.update(event.id, { network_design_id: selectedDesignId });
      }
      const response = await base44.functions.invoke("launchCyberEventLiveFire", {
        cyber_event_id: event.id,
        cloud_provider: cloudProvider,
        region,
        visibility,
        auto_shutdown_minutes: Number(autoShutdown),
      });
      const labId = response.data?.lab_id;
      if (!labId) throw new Error("Live Fire draft was not created");
      toast.success(response.data.message || "Live Fire draft created");
      onOpenChange(false);
      navigate("/lab-creation-wizard?lab=" + labId);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Unable to create Live Fire exercise");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-950 border-red-900/40 text-white">
        <DialogHeader>
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30 flex items-center justify-center mb-2">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <DialogTitle className="text-xl text-white">Launch in Live Fire</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a draft cloud exercise from “{event.title}.” Nothing will deploy until the topology, images, access controls, and estimated cost are reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {checks.map(({ label, ok, icon: Icon }) => (
              <div key={label} className={"rounded-xl border p-3 " + (ok ? "border-green-800/50 bg-green-950/25" : "border-amber-800/50 bg-amber-950/25")}>
                <div className="flex items-center gap-2">
                  {ok ? <Icon className="h-4 w-4 text-green-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  <span className={"text-xs font-medium " + (ok ? "text-green-300" : "text-amber-300")}>{label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white">Network Design</p>
                <p className="text-[11px] text-gray-500">Choose the saved topology to use for this Live Fire exercise.</p>
              </div>
              <Network className="h-4 w-4 text-red-400" />
            </div>
            <select
              value={selectedDesignId}
              onChange={e => setSelectedDesignId(e.target.value)}
              disabled={loadingDesigns}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white"
            >
              <option value="">{loadingDesigns ? "Loading network designs…" : "Select a network design…"}</option>
              {designs.map(design => (
                <option key={design.id} value={design.id}>
                  {design.name || "Untitled Design"}{design.diagram_data?.nodes?.length ? ` · ${design.diagram_data.nodes.length} devices` : " · topology not generated"}
                </option>
              ))}
            </select>
            {selectedDesignId && !designIsGenerated && (
              <p className="text-xs text-amber-300">This design has no generated topology. Open it under Design → Network Diagram and generate/save the topology first.</p>
            )}
            {!selectedDesignId && (
              <p className="text-xs text-red-300">A generated network design is required before a Live Fire draft can be created.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Cloud Provider</span>
              <select value={cloudProvider} onChange={e => changeProvider(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white">
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">Google Cloud</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Region</span>
              <select value={region} onChange={e => setRegion(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white">
                {REGIONS[cloudProvider].map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Visibility</span>
              <select value={visibility} onChange={e => setVisibility(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white">
                <option value="private">Private</option>
                <option value="organization">Organization</option>
                <option value="shared">Shared</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Auto-Shutdown</span>
              <select value={autoShutdown} onChange={e => setAutoShutdown(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white">
                <option value={60}>After 1 hour idle</option>
                <option value={120}>After 2 hours idle</option>
                <option value={240}>After 4 hours idle</option>
                <option value={0}>Disabled</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 grid grid-cols-3 gap-3">
            <div><p className="text-[10px] text-gray-500">Difficulty</p><p className="text-sm text-white font-semibold">{event.difficulty}</p></div>
            <div><p className="text-[10px] text-gray-500">Exercise Time</p><p className="text-sm text-white font-semibold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{event.duration_minutes} min</p></div>
            <div><p className="text-[10px] text-gray-500">Participants</p><p className="text-sm text-white font-semibold">{(event.red_team_size || 0) + (event.blue_team_size || 0) + (event.white_team_size || 0)}</p></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white">Cancel</Button>
          <Button onClick={launch} disabled={!canLaunch || launching} className="gap-2 bg-red-700 hover:bg-red-600 text-white">
            {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
            {launching ? "Creating Draft…" : "Create Live Fire Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
