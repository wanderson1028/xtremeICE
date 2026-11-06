import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, Trash2, ImageIcon, Check } from "lucide-react";
import { uid } from "@/lib/assessmentQuestions";

const inputCls =
  "w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";

export default function HotspotEditor({ question, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);
  const wrapRef = useRef(null);

  const regions = question.hotspot_regions || [];
  const patch = (updates) => onChange({ ...question, ...updates });

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      patch({ hotspot_image_url: file_url });
    } catch {
      setError("Could not upload that image. Try a PNG or JPG under 10 MB.");
    } finally {
      setUploading(false);
    }
  };

  const pointFrom = (event) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect?.width) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const startDraw = (event) => {
    const point = pointFrom(event);
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraft({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
  };

  const keepDrawing = (event) => {
    if (!draft) return;
    const point = pointFrom(event);
    if (!point) return;
    setDraft({ ...draft, x1: point.x, y1: point.y });
  };

  const finishDraw = () => {
    if (!draft) return;
    const x = Math.min(draft.x0, draft.x1);
    const y = Math.min(draft.y0, draft.y1);
    const w = Math.abs(draft.x1 - draft.x0);
    const h = Math.abs(draft.y1 - draft.y0);
    setDraft(null);
    if (w < 2 || h < 2) return;
    patch({
      hotspot_regions: [
        ...regions,
        {
          id: uid(),
          label: `Area ${regions.length + 1}`,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          w: Math.round(w * 10) / 10,
          h: Math.round(h * 10) / 10,
        },
      ],
    });
  };

  const updateRegion = (id, updates) =>
    patch({ hotspot_regions: regions.map((r) => (r.id === id ? { ...r, ...updates } : r)) });

  const removeRegion = (id) =>
    patch({
      hotspot_regions: regions.filter((r) => r.id !== id),
      correct_region_id: question.correct_region_id === id ? "" : question.correct_region_id,
    });

  const draftBox = draft
    ? {
        left: `${Math.min(draft.x0, draft.x1)}%`,
        top: `${Math.min(draft.y0, draft.y1)}%`,
        width: `${Math.abs(draft.x1 - draft.x0)}%`,
        height: `${Math.abs(draft.y1 - draft.y0)}%`,
      }
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">
          Image — drag on it to draw each clickable area
        </p>
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium cursor-pointer transition-colors">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {question.hotspot_image_url ? "Replace image" : "Upload image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {question.hotspot_image_url ? (
        <div
          ref={wrapRef}
          onPointerDown={startDraw}
          onPointerMove={keepDrawing}
          onPointerUp={finishDraw}
          onPointerLeave={finishDraw}
          className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-950 select-none touch-none cursor-crosshair"
        >
          <img
            src={question.hotspot_image_url}
            alt="Hotspot question"
            className="w-full h-auto block pointer-events-none"
            draggable={false}
          />
          {regions.map((region) => {
            const isCorrect = question.correct_region_id === region.id;
            return (
              <div
                key={region.id}
                className={`absolute border-2 rounded-sm pointer-events-none ${
                  isCorrect ? "border-green-400 bg-green-500/20" : "border-blue-400 bg-blue-500/15"
                }`}
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.w}%`,
                  height: `${region.h}%`,
                }}
              >
                <span className="absolute -top-5 left-0 text-[10px] font-semibold px-1 rounded bg-black/70 text-white whitespace-nowrap">
                  {region.label || "Area"}
                </span>
              </div>
            );
          })}
          {draftBox && (
            <div className="absolute border-2 border-dashed border-white/70 bg-white/10 pointer-events-none" style={draftBox} />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-950/60 py-12 text-gray-600">
          <ImageIcon className="h-8 w-8" />
          <p className="text-xs">Upload a screenshot or diagram candidates should click on.</p>
        </div>
      )}

      <div className="space-y-2">
        {regions.map((region) => (
          <div
            key={region.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              question.correct_region_id === region.id ? "border-green-700/60 bg-green-950/20" : "border-gray-700 bg-gray-950/50"
            }`}
          >
            <button
              type="button"
              onClick={() => patch({ correct_region_id: region.id })}
              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                question.correct_region_id === region.id ? "border-green-500 bg-green-600" : "border-gray-600"
              }`}
              title="Mark as the correct area"
            >
              {question.correct_region_id === region.id && <Check className="h-2.5 w-2.5 text-white" />}
            </button>
            <input
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
              placeholder="Area name (e.g. Address bar)"
              value={region.label || ""}
              onChange={(e) => updateRegion(region.id, { label: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeRegion(region.id)}
              className="p-1 text-gray-600 hover:text-red-400 transition-colors"
              title="Remove area"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {regions.length === 0 && question.hotspot_image_url && (
          <p className="text-xs text-gray-500">No areas yet — drag a box over the part of the image candidates must click.</p>
        )}
      </div>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-300">Use an image URL instead</summary>
        <input
          className={inputCls + " mt-2 text-xs"}
          placeholder="https://…/screenshot.png"
          value={question.hotspot_image_url || ""}
          onChange={(e) => patch({ hotspot_image_url: e.target.value.trim() })}
        />
      </details>
    </div>
  );
}