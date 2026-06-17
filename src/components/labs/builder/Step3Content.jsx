import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

const MODULE_TYPES = ["hands_on", "reading", "video", "quiz", "challenge"];

export default function Step3Content({ modules, setModules }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const addModule = () => {
    setModules(prev => [...prev, {
      title: "", description: "", type: "hands_on",
      order: prev.length + 1, duration_minutes: 30,
      is_required: true, points: 10, content: "", hints: []
    }]);
    setExpandedIdx(modules.length);
  };

  const updateModule = (idx, updates) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, ...updates } : m));
  };

  const removeModule = (idx) => {
    setModules(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, order: i + 1 })));
    setExpandedIdx(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Course Content</h2>
          <p className="text-gray-400 text-xs mt-0.5">{modules.length} module{modules.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={addModule} size="sm" className="bg-red-900/40 hover:bg-red-800/60 text-red-200 border-0">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Module
        </Button>
      </div>

      {modules.length === 0 && (
        <div className="text-center py-10 border border-dashed border-gray-700 rounded-lg">
          <p className="text-gray-500 text-sm">No modules yet. Add your first task or lesson above.</p>
        </div>
      )}

      <div className="space-y-2">
        {modules.map((mod, idx) => (
          <div key={idx} className="border border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-gray-800/70 cursor-pointer"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
              <GripVertical className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <span className="text-xs text-gray-600 w-4 flex-shrink-0">{idx + 1}</span>
              <span className="flex-1 text-sm text-white font-medium truncate">{mod.title || "Untitled Module"}</span>
              <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded flex-shrink-0">{mod.type?.replace("_", " ")}</span>
              <button onClick={(e) => { e.stopPropagation(); removeModule(idx); }}
                className="text-gray-600 hover:text-red-400 p-1 flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {expandedIdx === idx
                ? <ChevronUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                : <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />}
            </div>

            {expandedIdx === idx && (
              <div className="p-4 space-y-3 border-t border-gray-700 bg-gray-900">
                <div>
                  <Label className="text-gray-400 text-xs mb-1 block">Title</Label>
                  <Input value={mod.title} onChange={e => updateModule(idx, { title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white text-sm" placeholder="Module title" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Type</Label>
                    <Select value={mod.type} onValueChange={v => updateModule(idx, { type: v })}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULE_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Points</Label>
                    <Input type="number" value={mod.points}
                      onChange={e => updateModule(idx, { points: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-700 text-white text-sm" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Duration (min)</Label>
                    <Input type="number" value={mod.duration_minutes}
                      onChange={e => updateModule(idx, { duration_minutes: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-700 text-white text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs mb-1 block">Instructions / Content</Label>
                  <Textarea value={mod.content} onChange={e => updateModule(idx, { content: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white text-sm h-20"
                    placeholder="Step-by-step instructions for this module..." />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}