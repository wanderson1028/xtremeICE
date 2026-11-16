import React from "react";
import { TASK_TYPE_LABEL, taskType } from "@/lib/trainingScoring";
import McqTask from "./McqTask";
import MatchingTask from "./MatchingTask";
import HotspotTask from "./HotspotTask";
import HandsOnTask from "./HandsOnTask";

const typeTone = {
  hands_on: { border: "#bbf7d0", color: "#166534", background: "#f0fdf4" },
  mcq: { border: "#bfdbfe", color: "#1e40af", background: "#eff6ff" },
  matching: { border: "#ddd6fe", color: "#5b21b6", background: "#f5f3ff" },
  hotspot: { border: "#fde68a", color: "#92400e", background: "#fffbeb" },
};

export default function TaskCard({ task, index, total, value, onChange }) {
  const type = taskType(task);
  const tone = typeTone[type];

  return (
    <section className="sg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="sg-micro">Activity {index + 1} of {total}</span>
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={tone}>
          {TASK_TYPE_LABEL[type]}
        </span>
      </div>

      <h2 className="mt-2 text-base font-semibold">{task.title}</h2>
      {task.instructions && (
        <p className="sg-body mt-1.5 whitespace-pre-line" style={{ color: "#404040" }}>{task.instructions}</p>
      )}

      {type === "mcq" && <McqTask task={task} value={value} onChange={onChange} />}
      {type === "matching" && <MatchingTask task={task} value={value} onChange={onChange} />}
      {type === "hotspot" && <HotspotTask task={task} value={value} onChange={onChange} />}
      {type === "hands_on" && <HandsOnTask task={task} value={value} onChange={onChange} />}
    </section>
  );
}