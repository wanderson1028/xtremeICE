import React from "react";
import { BookOpen, Terminal, Video, HelpCircle, Trophy, FilePlus } from "lucide-react";

const PRESETS = [
  {
    id: "briefing",
    name: "Scenario Briefing",
    icon: BookOpen,
    desc: "Context-setting reading material",
    defaults: {
      title: "", description: "", type: "reading", duration_minutes: 10,
      points: 5, is_required: true,
      content: "## Scenario Briefing\n\nRead the following scenario and understand the context before proceeding.\n\n",
    },
  },
  {
    id: "lab",
    name: "Step-by-Step Lab",
    icon: Terminal,
    desc: "Hands-on guided exercise",
    defaults: {
      title: "", description: "", type: "hands_on", duration_minutes: 45,
      points: 20, is_required: true,
      content: "## Objective\n\nDescribe what the student will accomplish.\n\n## Instructions\n\n1. \n2. \n3. \n\n## Verification\n\nHow to confirm the task is complete.\n",
    },
  },
  {
    id: "video",
    name: "Video Lesson",
    icon: Video,
    desc: "Instructional video segment",
    defaults: {
      title: "", description: "", type: "video", duration_minutes: 20,
      points: 10, is_required: true,
      content: "## Video Lesson\n\nWatch the instructional video, then proceed to the next module.\n\n**Video URL:** \n\n**Key Takeaways:**\n- \n- \n",
    },
  },
  {
    id: "quiz",
    name: "Knowledge Check",
    icon: HelpCircle,
    desc: "Quick assessment quiz",
    defaults: {
      title: "", description: "", type: "quiz", duration_minutes: 15,
      points: 15, is_required: true,
      content: "## Knowledge Check\n\nAnswer the following questions:\n\n1. \n2. \n3. \n\n**Passing Score:** 70%\n",
    },
  },
  {
    id: "challenge",
    name: "Advanced Challenge",
    icon: Trophy,
    desc: "Open-ended capstone challenge",
    defaults: {
      title: "", description: "", type: "challenge", duration_minutes: 60,
      points: 50, is_required: true,
      content: "## Challenge\n\n**Scenario:**\n\nDescribe the real-world scenario.\n\n**Your Task:**\n\nWhat the student must accomplish.\n\n**Success Criteria:**\n\n- \n- \n\n**Hints:**\n- \n",
    },
  },
];

export default function ModulePresets({ onSelect, onBlank, onCancel }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <p className="text-sm text-gray-300 mb-3">Choose a starting point:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className="flex items-start gap-3 p-3 rounded-lg border border-gray-700 hover:border-red-500/50 hover:bg-gray-800 transition-all text-left"
          >
            <div className="h-8 w-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
              <preset.icon className="h-4 w-4 text-gray-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{preset.name}</p>
              <p className="text-xs text-gray-500">{preset.desc}</p>
              <p className="text-[10px] text-gray-600 mt-1">
                {preset.defaults.duration_minutes}m · {preset.defaults.points} pts
              </p>
            </div>
          </button>
        ))}
        <button
          onClick={onBlank}
          className="flex items-start gap-3 p-3 rounded-lg border border-dashed border-gray-700 hover:border-gray-500 hover:bg-gray-800 transition-all text-left"
        >
          <div className="h-8 w-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
            <FilePlus className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Blank Module</p>
            <p className="text-xs text-gray-500">Start from scratch</p>
          </div>
        </button>
      </div>
      <button onClick={onCancel} className="text-xs text-gray-500 hover:text-white mt-3">
        Cancel
      </button>
    </div>
  );
}