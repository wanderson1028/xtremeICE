import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export default function Step1Basics({ form, updateForm }) {
  const [tagInput, setTagInput] = useState("");

  const handleTagKey = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      updateForm({ tags: [...(form.tags || []), tagInput.trim()] });
      setTagInput("");
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-white">Basic Information</h2>

      <div>
        <Label className="text-gray-300 mb-1.5 block">Title <span className="text-red-400">*</span></Label>
        <Input value={form.title} onChange={e => updateForm({ title: e.target.value })}
          placeholder="e.g., Cisco Router Security Hardening"
          className="bg-gray-800 border-gray-700 text-white" />
      </div>

      <div>
        <Label className="text-gray-300 mb-1.5 block">Description</Label>
        <Textarea value={form.description} onChange={e => updateForm({ description: e.target.value })}
          placeholder="What will students learn and accomplish in this lab?"
          className="bg-gray-800 border-gray-700 text-white h-24" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-300 mb-1.5 block">Difficulty</Label>
          <Select value={form.difficulty} onValueChange={v => updateForm({ difficulty: v })}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Beginner", "Intermediate", "Advanced", "Expert"].map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300 mb-1.5 block">Duration (minutes)</Label>
          <Input type="number" value={form.estimated_duration_minutes || ""}
            onChange={e => updateForm({ estimated_duration_minutes: parseInt(e.target.value) || 0 })}
            className="bg-gray-800 border-gray-700 text-white" />
        </div>
      </div>

      <div>
        <Label className="text-gray-300 mb-1.5 block">Status</Label>
        <Select value={form.status} onValueChange={v => updateForm({ status: v })}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["draft", "review", "published", "archived"].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-gray-300 mb-1.5 block">Tags <span className="text-gray-500 text-xs">(press Enter)</span></Label>
        <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey}
          placeholder="networking, cisco, hardening..."
          className="bg-gray-800 border-gray-700 text-white mb-2" />
        <div className="flex flex-wrap gap-1.5">
          {(form.tags || []).map(t => (
            <Badge key={t} className="bg-gray-700 text-gray-200 border-0 flex items-center gap-1 text-xs">
              {t}
              <button onClick={() => updateForm({ tags: form.tags.filter(x => x !== t) })}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}