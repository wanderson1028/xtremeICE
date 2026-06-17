import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import NiceCategoryPicker from "@/components/labs/NiceCategoryPicker";

function TagEditor({ label, items = [], onChange, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    if (input.trim()) { onChange([...items, input.trim()]); setInput(""); }
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
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} className="bg-gray-700 text-gray-200 border-0 flex items-center gap-1 text-xs">
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function Step5NiceMapping({ form, updateForm }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">NICE Framework Mapping</h2>
      <p className="text-gray-400 text-sm">Align this lab with the NICE Cybersecurity Workforce Framework.</p>

      <NiceCategoryPicker
        category={form.nice_category}
        workRole={form.nice_work_role}
        onCategoryChange={v => updateForm({ nice_category: v })}
        onWorkRoleChange={v => updateForm({ nice_work_role: v })}
      />

      <TagEditor
        label="Task IDs"
        items={form.nice_task_ids || []}
        onChange={v => updateForm({ nice_task_ids: v })}
        placeholder="e.g., T0001"
      />

      <TagEditor
        label="KSA IDs (Knowledge, Skills, Abilities)"
        items={form.nice_ksa_ids || []}
        onChange={v => updateForm({ nice_ksa_ids: v })}
        placeholder="e.g., K0001"
      />

      {form.nice_category && (
        <div className="p-4 bg-green-950/20 border border-green-800/30 rounded-lg">
          <p className="text-green-300 text-sm font-medium">✓ NICE Mapping Applied</p>
          <p className="text-green-400/70 text-xs mt-1">
            Category: {form.nice_category}
            {form.nice_work_role && ` › ${form.nice_work_role}`}
          </p>
        </div>
      )}
    </div>
  );
}