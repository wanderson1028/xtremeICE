import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2 } from "lucide-react";

const inputCls =
  "w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";

export default function HotspotGenerator({ question, onChange }) {
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    const prompt = brief.trim() || question.title?.trim() || "";
    if (!prompt) {
      setError("Describe the screenshot you want, or write the question first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("generateHotspotQuestion", {
        question: question.title || "",
        prompt,
      });
      const data = res.data || {};
      if (!data.image_url) throw new Error(data.error || "No image was returned.");
      onChange({
        ...question,
        hotspot_image_url: data.image_url,
        hotspot_regions: data.regions || [],
        correct_region_id: data.correct_region_id || "",
      });
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Could not build that image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-red-300 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3" /> Smart Assistant — build the screenshot and its areas
      </p>
      <textarea
        className={inputCls + " min-h-[60px] resize-y"}
        placeholder="What should the screenshot show? e.g. Windows Firewall inbound rules with one rule blocking RDP from a suspicious IP"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-gray-500">Replaces the current image and clickable areas.</p>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors shrink-0"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {busy ? "Building…" : "Generate image + areas"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}