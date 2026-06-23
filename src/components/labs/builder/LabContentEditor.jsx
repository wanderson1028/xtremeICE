import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, Pencil, ListChecks } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

export default function LabContentEditor({ form, updateForm }) {
  const labContent = form.lab_content || { scenario: "", tasks: [], success_criteria: "" };
  const [previewField, setPreviewField] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);

  const updateLabContent = (updates) => {
    updateForm({ lab_content: { ...labContent, ...updates } });
  };

  const addTask = () => {
    const newTask = { title: "", instructions: "" };
    const tasks = [...(labContent.tasks || []), newTask];
    updateLabContent({ tasks });
    setExpandedTask(tasks.length - 1);
  };

  const updateTask = (idx, updates) => {
    const tasks = labContent.tasks.map((t, i) => (i === idx ? { ...t, ...updates } : t));
    updateLabContent({ tasks });
  };

  const removeTask = (idx) => {
    const tasks = labContent.tasks.filter((_, i) => i !== idx);
    updateLabContent({ tasks });
    setExpandedTask(null);
  };

  const moveTask = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= (labContent.tasks || []).length) return;
    const tasks = [...labContent.tasks];
    [tasks[idx], tasks[newIdx]] = [tasks[newIdx], tasks[idx]];
    updateLabContent({ tasks });
    setExpandedTask(newIdx);
  };

  const tasks = labContent.tasks || [];

  return (
    <div className="space-y-5">
      {/* Lab Scenario */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-gray-300 text-sm">Lab Scenario</Label>
          <button
            onClick={() => setPreviewField(previewField === "scenario" ? null : "scenario")}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
              previewField === "scenario" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"
            }`}
          >
            {previewField === "scenario" ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
          </button>
        </div>
        {previewField === "scenario" ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[80px] text-sm">
            <ReactMarkdown components={MD_COMPONENTS}>
              {labContent.scenario || "*No scenario written yet*"}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={labContent.scenario || ""}
            onChange={(e) => updateLabContent({ scenario: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white h-20"
            placeholder="Describe the real-world scenario students will work through... (Markdown supported)"
          />
        )}
      </div>

      {/* Lab Tasks */}
      <div className="pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-gray-300 text-sm flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-gray-400" />
            Lab Tasks
          </Label>
          <Button onClick={addTask} size="sm" className="bg-red-900/40 hover:bg-red-800/60 text-red-200 border-0">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
          </Button>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
            <ListChecks className="h-7 w-7 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm mb-1">No tasks defined yet</p>
            <p className="text-gray-600 text-xs">Add the step-by-step tasks students must complete</p>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((task, idx) => (
            <div key={idx} className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-gray-800/70">
                <span className="text-xs text-gray-600 w-4 text-center font-mono flex-shrink-0">{idx + 1}</span>
                <span className="flex-1 text-sm text-white font-medium truncate">
                  {task.title || "Untitled Task"}
                </span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => moveTask(idx, -1)} disabled={idx === 0} className="text-gray-600 hover:text-white p-1 disabled:opacity-20">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveTask(idx, 1)} disabled={idx === tasks.length - 1} className="text-gray-600 hover:text-white p-1 disabled:opacity-20">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removeTask(idx)} className="text-gray-600 hover:text-red-400 p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setExpandedTask(expandedTask === idx ? null : idx)} className="text-gray-500 hover:text-white p-1 ml-1">
                    {expandedTask === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {expandedTask === idx && (
                <div className="p-4 space-y-3 border-t border-gray-700 bg-gray-900">
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">Task Title</Label>
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(idx, { title: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white text-sm"
                      placeholder="e.g., Configure OSPF on Router R1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-gray-400 text-xs">Instructions</Label>
                      <button
                        onClick={() => setPreviewField(previewField === `task-${idx}` ? null : `task-${idx}`)}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                          previewField === `task-${idx}` ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        {previewField === `task-${idx}` ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
                      </button>
                    </div>
                    {previewField === `task-${idx}` ? (
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[80px] text-sm">
                        <ReactMarkdown components={MD_COMPONENTS}>
                          {task.instructions || "*No instructions written yet*"}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <Textarea
                        value={task.instructions || ""}
                        onChange={(e) => updateTask(idx, { instructions: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white text-sm h-24"
                        placeholder="Step-by-step instructions for this task... (Markdown supported — use # for headings, - for lists, `code` for commands)"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Success Criteria */}
      <div className="pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-gray-300 text-sm">Success Criteria</Label>
          <button
            onClick={() => setPreviewField(previewField === "success" ? null : "success")}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
              previewField === "success" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"
            }`}
          >
            {previewField === "success" ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
          </button>
        </div>
        {previewField === "success" ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 min-h-[80px] text-sm">
            <ReactMarkdown components={MD_COMPONENTS}>
              {labContent.success_criteria || "*No success criteria defined yet*"}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={labContent.success_criteria || ""}
            onChange={(e) => updateLabContent({ success_criteria: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white h-20"
            placeholder="How will students and instructors verify the lab is complete? (e.g., specific CLI outputs, configuration states, test results)"
          />
        )}
      </div>
    </div>
  );
}