import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Target, ClipboardList } from "lucide-react";

function ListEditor({ label, items = [], onChange, placeholder, icon: Icon }) {
  const [input, setInput] = useState("");

  const add = () => {
    if (input.trim()) {
      onChange([...items, input.trim()]);
      setInput("");
    }
  };

  return (
    <div>
      <Label className="text-gray-300 mb-1.5 block text-sm flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
        {label}
      </Label>
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-gray-800 border-gray-700 text-white text-sm"
        />
        <Button
          onClick={add}
          size="sm"
          className="bg-gray-700 hover:bg-gray-600 text-white border-0 px-3"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 ? (
          <p className="text-gray-600 text-xs italic">No items added yet</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <span className="text-xs text-gray-500 mt-1.5 flex-shrink-0 font-mono">{i + 1}.</span>
              <p className="text-sm text-gray-300 flex-1 bg-gray-800/40 rounded px-2 py-1 leading-relaxed">
                {item}
              </p>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
      <div>
        <Label className="text-gray-300 mb-1.5 block">
          Title <span className="text-red-400">*</span>
        </Label>
        <Input
          value={form.title}
          onChange={(e) => updateForm({ title: e.target.value })}
          placeholder="e.g., Cisco Router Security Hardening"
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label className="text-gray-300 mb-1.5 block">Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => updateForm({ description: e.target.value })}
          placeholder="What will students learn and accomplish in this lab?"
          className="bg-gray-800 border-gray-700 text-white h-24"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-300 mb-1.5 block">Difficulty</Label>
          <Select value={form.difficulty} onValueChange={(v) => updateForm({ difficulty: v })}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Beginner", "Intermediate", "Advanced", "Expert"].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-300 mb-1.5 block">Duration (minutes)</Label>
          <Input
            type="number"
            value={form.estimated_duration_minutes || ""}
            onChange={(e) =>
              updateForm({ estimated_duration_minutes: parseInt(e.target.value) || 0 })
            }
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      <div>
        <Label className="text-gray-300 mb-1.5 block">Status</Label>
        <Select value={form.status} onValueChange={(v) => updateForm({ status: v })}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["draft", "review", "published", "archived"].map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-gray-300 mb-1.5 block">
          Tags <span className="text-gray-500 text-xs">(press Enter)</span>
        </Label>
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKey}
          placeholder="networking, cisco, hardening..."
          className="bg-gray-800 border-gray-700 text-white mb-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {(form.tags || []).map((t) => (
            <Badge
              key={t}
              className="bg-gray-700 text-gray-200 border-0 flex items-center gap-1 text-xs"
            >
              {t}
              <button onClick={() => updateForm({ tags: form.tags.filter((x) => x !== t) })}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Objectives & Prerequisites */}
      <div className="pt-2 border-t border-gray-800 space-y-4">
        <ListEditor
          label="Learning Objectives"
          icon={Target}
          items={form.objectives}
          onChange={(v) => updateForm({ objectives: v })}
          placeholder="e.g., Students will be able to configure OSPF on Cisco routers"
        />
        <ListEditor
          label="Prerequisites"
          icon={ClipboardList}
          items={form.prerequisites}
          onChange={(v) => updateForm({ prerequisites: v })}
          placeholder="e.g., Basic understanding of TCP/IP networking"
        />
      </div>
    </div>
  );
}