import React from "react";

export default function M365Rail({ apps, currentAppId, answers }) {
  return (
    <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-gray-800 bg-black/30 p-3 lg:block">
      <div className="mb-2 px-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">Applications</div>
      {apps.map((app) => {
        const active = app.id === currentAppId;
        const done = app.questions.filter((q) => answers[q.id]).length;
        return (
          <div
            key={app.id}
            className={`mb-1 rounded-lg border px-2.5 py-2 ${active ? "border-sky-700/60 bg-sky-950/30" : "border-transparent"}`}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: app.accent }} />
              <span className={`text-xs font-medium ${active ? "text-white" : "text-gray-400"}`}>{app.name}</span>
              <span className="ml-auto font-mono text-[10px] text-gray-500">{done}/{app.questions.length}</span>
            </div>
            <div className="mt-1.5 flex gap-1">
              {app.questions.map((q) => {
                const a = answers[q.id];
                const tone = !a ? "bg-gray-700" : a.correct ? "bg-emerald-500" : "bg-red-500";
                return <span key={q.id} className={`h-1 flex-1 rounded-full ${tone}`} />;
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}