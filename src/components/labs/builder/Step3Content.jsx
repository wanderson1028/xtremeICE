import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Eye, Pencil, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import CurriculumPacing from "./CurriculumPacing";
import ModulePresets from "./ModulePresets";

const MODULE_TYPES = ["hands_on", "reading", "video", "quiz", "challenge"];

const MD_COMPONENTS = {
  h1: (props) => <h1 className="text-base font-bold text-white mb-2" {...props} />,
  h2: (props) => <h2 className="text-sm font-semibold text-white mb-1.5" {...props} />,
  h3: (props) => <h3 className="text-sm font-semibold text-gray-200 mb-1" {...props} />,
  p: (props) => <p className="mb-2 text-gray-300" {...props} />,
  ul: (props) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-gray-300" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-gray-300" {...props} />,
  code: (props) => <code className="bg-gray-800 px-1 py-0.5 rounded text-xs text-green-400" {...props} />,
  strong: (props) => <strong className="text-white font-semibold" {...props} />,
};

export default function Step3Content({ modules, setModules }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(null);

  const addModuleFromPreset = (preset) => {
    setModules((prev) => [
      ...prev,
      { ...preset.defaults, order: prev.length + 1, hints: [] },
    ]);
    setExpandedIdx(modules.length);
    setShowPresets(false);
  };

  const addBlankModule = () => {
    setModules((prev) => [
      ...prev,
      {
        title: "", description: "", type: "hands_on",
        order: prev.length + 1, duration_minutes: 30,
        is_required: true, points: 10, content: "", hints: [],
      },
    ]);
    setExpandedIdx(modules.length);
    setShowPresets(false);
  };

  const updateModule = (idx, updates) => {
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, ...updates } : m)));
  };

  const removeModule = (idx) => {
    setModules((prev) =>
      prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, order: i + 1 }))
    );
    setExpandedIdx(null);
  };

  const moveModule = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= modules.length) return;
    setModules((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((m, i) => ({ ...m, order: i + 1 }));
    });
    setExpandedIdx(newIdx);
  };

  return (
    <div className="space-y-4">
      {modules.length > 0 && <CurriculumPacing modules={modules} />}

      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-xs">
          {modules.length} module{modules.length !== 1 ? "s" : ""} ·{" "}
          {modules.reduce((s, m) => s + (m.duration_minutes || 0), 0)} min total
        </p>
        <Button
          onClick={() => setShowPresets(!showPresets)}
          size="sm"
          className="bg-red-900/40 hover:bg-red-800/60 text-red-200 border-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Module
        </Button>
      </div>

      {showPresets && (
        <ModulePresets
          onSelect={addModuleFromPreset}
          onBlank={addBlankModule}
          onCancel={() => setShowPresets(false)}
        />
      )}

      {modules.length === 0 && !showPresets && (
        <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
          <BookOpen className="h-8 w-8 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm mb-1">No modules yet</p>
          <p className="text-gray-600 text-xs">Click "Add Module" to choose a preset or start from scratch</p>
        </div>
      )}

      <div className="space-y-2">
        {modules.map((mod, idx) => (
          <div key={idx} className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Module Header */}
            <div className="flex items-center gap-2 p-3 bg-gray-800/70">
              <span className="text-xs text-gray-600 w-4 flex-shrink-0 text-center font-mono">{idx + 1}</span>
              <span className="flex-1 text-sm text-white font-medium truncate">
                {mod.title || "Untitled Module"}
              </span>
              <Badge className="bg-gray-700 text-gray-300 border-0 text-xs flex-shrink-0">
                {mod.type?.replace("_", " ")}
              </Badge>
              <span className="text-xs text-gray-500 flex-shrink-0">{mod.duration_minutes || 0}m</span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveModule(idx, -1)}
                  disabled={idx === 0}
                  className="text-gray-600 hover:text-white p-1 disabled:opacity-20"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveModule(idx, 1)}
                  disabled={idx === modules.length - 1}
                  className="text-gray-600 hover:text-white p-1 disabled:opacity-20"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeModule(idx)}
                  className="text-gray-600 hover:text-red-400 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className="text-gray-500 hover:text-white p-1 ml-1"
                >
                  {expandedIdx === idx ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Editor */}
            {expandedIdx === idx && (
              <div className="p-4 space-y-3 border-t border-gray-700 bg-gray-900">
                <div>
                  <Label className="text-gray-400 text-xs mb-1 block">Title</Label>
                  <Input
                    value={mod.title}
                    onChange={(e) => updateModule(idx, { title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                    placeholder="Module title"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs mb-1 block">Description</Label>
                  <Input
                    value={mod.description || ""}
                    onChange={(e) => updateModule(idx, { description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                    placeholder="Short summary shown in course outline"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Type</Label>
                    <Select
                      value={mod.type}
                      onValueChange={(v) => updateModule(idx, { type: v })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Points</Label>
                    <Input
                      type="number"
                      value={mod.points}
                      onChange={(e) =>
                        updateModule(idx, { points: parseInt(e.target.value) || 0 })
                      }
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Duration (min)</Label>
                    <Input
                      type="number"
                      value={mod.duration_minutes}
                      onChange={(e) =>
                        updateModule(idx, { duration_minutes: parseInt(e.target.value) || 0 })
                      }
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-gray-400 text-xs">Instructions / Content</Label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                          previewIdx === idx
                            ? "bg-gray-700 text-white"
                            : "text-gray-500 hover:text-white"
                        }`}
                      >
                        {previewIdx === idx ? (
                          <>
                            <Pencil className="h-3 w-3" /> Edit
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" /> Preview
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {previewIdx === idx ? (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[96px] text-sm">
                      <ReactMarkdown components={MD_COMPONENTS}>
                        {mod.content || "*No content yet*"}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <Textarea
                      value={mod.content}
                      onChange={(e) => updateModule(idx, { content: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white text-sm h-24"
                      placeholder="Step-by-step instructions... (Markdown supported — use # for headings, - for lists, `code` for commands)"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}