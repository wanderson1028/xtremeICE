import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

const NICE_CATEGORIES = [
  "Securely Provision",
  "Operate and Maintain",
  "Oversee and Govern",
  "Protect and Defend",
  "Analyze",
  "Collect and Operate",
  "Investigate",
];

export default function StepNiceMapping({ data, update }) {
  const [taskIds, setTaskIds] = useState((data.nice_task_ids || []).join(", "));
  const [ksaIds, setKsaIds] = useState((data.nice_ksa_ids || []).join(", "));
  const [rubric, setRubric] = useState(data.nice_rubric_criteria || []);
  const [mappingNotes, setMappingNotes] = useState(data.nice_mapping_notes || "");
  const [evidence, setEvidence] = useState(data.nice_evidence_of_performance || "");

  const syncTaskIds = (text) => {
    setTaskIds(text);
    update({ nice_task_ids: text.split(",").map((t) => t.trim()).filter(Boolean) });
  };

  const syncKsaIds = (text) => {
    setKsaIds(text);
    update({ nice_ksa_ids: text.split(",").map((t) => t.trim()).filter(Boolean) });
  };

  const syncField = (field, value) => {
    if (field === "nice_mapping_notes") setMappingNotes(value);
    if (field === "nice_evidence_of_performance") setEvidence(value);
    update({ [field]: value });
  };

  const addRubric = () => {
    const newRubric = [...rubric, ""];
    setRubric(newRubric);
    update({ nice_rubric_criteria: newRubric });
  };

  const updateRubric = (idx, value) => {
    const newRubric = rubric.map((r, i) => (i === idx ? value : r));
    setRubric(newRubric);
    update({ nice_rubric_criteria: newRubric });
  };

  const removeRubric = (idx) => {
    const newRubric = rubric.filter((_, i) => i !== idx);
    setRubric(newRubric);
    update({ nice_rubric_criteria: newRubric });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-gray-200 text-sm font-medium">NICE Framework Category *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
          {NICE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => update({ nice_category: cat })}
              className={`text-left px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                data.nice_category === cat
                  ? "bg-red-600 border-red-600 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-gray-200 text-sm font-medium">Work Role</Label>
        <Input
          value={data.nice_work_role || ""}
          onChange={(e) => update({ nice_work_role: e.target.value })}
          placeholder="e.g., Cyber Defense Analyst"
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-200 text-sm font-medium">Task IDs (comma-separated)</Label>
          <Input
            value={taskIds}
            onChange={(e) => syncTaskIds(e.target.value)}
            placeholder="T001, T002"
            className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
          />
        </div>
        <div>
          <Label className="text-gray-200 text-sm font-medium">KSA IDs (comma-separated)</Label>
          <Input
            value={ksaIds}
            onChange={(e) => syncKsaIds(e.target.value)}
            placeholder="K001, K002"
            className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
          />
        </div>
      </div>

      <div>
        <Label className="text-gray-200 text-sm font-medium">Mapping Notes</Label>
        <Textarea
          value={mappingNotes}
          onChange={(e) => syncField("nice_mapping_notes", e.target.value)}
          placeholder="How this lab maps to the NICE Framework..."
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[70px]"
        />
      </div>

      <div>
        <Label className="text-gray-200 text-sm font-medium">Evidence of Performance</Label>
        <Textarea
          value={evidence}
          onChange={(e) => syncField("nice_evidence_of_performance", e.target.value)}
          placeholder="How student performance is demonstrated and measured..."
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[70px]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-gray-200 text-sm font-medium">Rubric Criteria</Label>
          <button
            type="button"
            onClick={addRubric}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Criterion
          </button>
        </div>
        {rubric.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-4 text-center border border-dashed border-gray-800 rounded-lg">
            No rubric criteria yet.
          </p>
        ) : (
          <div className="space-y-2">
            {rubric.map((criterion, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-xs font-semibold text-gray-500 mt-2.5 shrink-0">{idx + 1}.</span>
                <Textarea
                  value={criterion}
                  onChange={(e) => updateRubric(idx, e.target.value)}
                  placeholder="e.g., Student correctly identifies 3 indicators of compromise..."
                  className="bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 text-sm min-h-[50px] flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeRubric(idx)}
                  className="mt-2 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}