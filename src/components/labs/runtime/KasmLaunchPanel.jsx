import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { kasmProviderClient } from "@/lib/providers/kasmProviderClient";

export default function KasmLaunchPanel({ template, user }) {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  const launch = async () => {
    setLaunching(true);
    setError("");
    try {
      const instance = await kasmProviderClient.launch(template.id);
      navigate(`/LabRunnerPreview?instanceId=${instance.id}`);
    } catch (error) {
      setError(error.message || "The Kasm workspace could not be requested.");
    } finally {
      setLaunching(false);
    }
  };

  if (!template?.environment_profile_id || template.status !== "published") return null;

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
      <p className="text-sm font-semibold">Kasm workspace</p>
      <Button type="button" onClick={launch} disabled={!user?.email || launching} className="gap-1.5">
        {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {launching ? "Launching…" : "Launch Kasm workspace"}
      </Button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
