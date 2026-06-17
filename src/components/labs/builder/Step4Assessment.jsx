import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

function ListEditor({ label, items = [], onChange, placeholder }) {
  const [input, setInput] = useState("");

  const add = () => {
    if (input.trim()) {
      onChange([...items, input.trim()]);
      setInput("");
    }
  };

  return (
    <div>
      <Label className="text-gray-300 mb-1.5 block">{label}</Label>
      <div className="flex gap-2 mb-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-gray-800 border-gray-700 text-white text-sm" />
        <Button onClick={add} size="sm" className="bg-gray-700 hover:bg-gray-600 text-white border-0 px-3">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-800 rounded-lg">
            <span className="text-gray-500 text-xs mt-0.5 w-4">{i + 1}.</span>
            <span className="flex-1 text-sm text-gray-200">{item}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-gray-600 hover:text-red-400 flex-shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Step4Assessment({ form, updateForm }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Assessment Configuration</h2>

      <div>
        <Label className="text-gray-300 mb-1.5 block">Passing Score (%)</Label>
        <div className="flex items-center gap-3">
          <Input type="number" min="0" max="100"
            value={form.passing_score || 70}
            onChange={e => updateForm({ passing_score: parseInt(e.target.value) || 70 })}
            className="bg-gray-800 border-gray-700 text-white w-28" />
          <span className="text-gray-400 text-sm">Students need {form.passing_score || 70}% to pass</span>
        </div>
      </div>

      <ListEditor
        label="Learning Objectives"
        items={form.objectives || []}
        onChange={v => updateForm({ objectives: v })}
        placeholder="e.g., Configure ACLs on a Cisco router..."
      />

      <ListEditor
        label="Prerequisites"
        items={form.prerequisites || []}
        onChange={v => updateForm({ prerequisites: v })}
        placeholder="e.g., Basic networking knowledge..."
      />
    </div>
  );
}