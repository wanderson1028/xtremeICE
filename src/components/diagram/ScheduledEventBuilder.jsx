import React, { useState } from "react";
import { Timer, Plus, Trash2, Clock, Repeat2 } from "lucide-react";

export default function ScheduledEventBuilder({ events = [], onAdd, onRemove }) {
  const [label, setLabel] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  const [expanded, setExpanded] = useState(true);

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd({
      id: Date.now(),
      label: label.trim(),
      delay: delaySeconds,
      interval: intervalSeconds,
    });
    setLabel("");
    setDelaySeconds(5);
    setIntervalSeconds(0);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5" /> Schedule Complex Events
        </p>
        <div className="space-y-3">
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Event description (e.g., WAN link cut at 15s)"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Trigger after (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="3600"
                value={delaySeconds}
                onChange={e => setDelaySeconds(Math.max(1, Number(e.target.value)))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
                <Repeat2 className="h-3 w-3" /> Repeat every (s)
              </label>
              <input
                type="number"
                min="0"
                max="3600"
                value={intervalSeconds}
                onChange={e => setIntervalSeconds(Math.max(0, Number(e.target.value)))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Set repeat interval to 0 for one-time events. Leave 0 to not repeat. Build complex multi-step failure scenarios.
          </p>
          <button
            onClick={handleAdd}
            disabled={!label.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" /> Add to Schedule
          </button>
        </div>
      </div>

      {events.length > 0 && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="text-xs font-semibold text-foreground mb-2">Timeline</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {events
              .sort((a, b) => a.delay - b.delay)
              .map(ev => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-lg bg-background px-3 py-2.5 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{ev.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Triggers at +{ev.delay}s
                      {ev.interval > 0 && ` • Repeats every ${ev.interval}s`}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(ev.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}