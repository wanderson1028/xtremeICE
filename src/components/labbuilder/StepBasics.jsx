import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function StepBasics({ data, update }) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-gray-200 text-sm font-medium">Lab Title *</Label>
        <Input
          value={data.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g., Introduction to Network Traffic Analysis"
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
        />
      </div>

      <div>
        <Label className="text-gray-200 text-sm font-medium">Description</Label>
        <Textarea
          value={data.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Brief description of what the lab covers..."
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[90px]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-200 text-sm font-medium">Difficulty *</Label>
          <div className="flex gap-2 mt-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => update({ difficulty: d })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  data.difficulty === d
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-gray-200 text-sm font-medium">Estimated Duration (minutes)</Label>
          <Input
            type="number"
            value={data.estimated_duration_minutes || ""}
            onChange={(e) => update({ estimated_duration_minutes: parseInt(e.target.value) || 0 })}
            placeholder="60"
            className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
          />
        </div>
      </div>

      <div>
        <Label className="text-gray-200 text-sm font-medium">Tags (comma-separated)</Label>
        <Input
          value={(data.tags || []).join(", ")}
          onChange={(e) => update({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
          placeholder="networking, security, Wireshark"
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
        />
      </div>

      <div>
        <Label className="text-gray-200 text-sm font-medium">Prerequisites (one per line)</Label>
        <Textarea
          value={(data.prerequisites || []).join("\n")}
          onChange={(e) => update({ prerequisites: e.target.value.split("\n").map((p) => p.trim()).filter(Boolean) })}
          placeholder="Basic networking knowledge&#10;Familiarity with Linux CLI"
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[70px]"
        />
      </div>
    </div>
  );
}