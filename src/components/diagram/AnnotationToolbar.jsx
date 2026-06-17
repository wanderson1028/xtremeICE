import React, { useState } from "react";
import { Type, X, Trash2, Bold } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ["#fde68a", "#86efac", "#93c5fd", "#f9a8d4", "#c4b5fd", "#ffffff", "#f87171"];

export default function AnnotationToolbar({ onAdd, onClose, onDeleteSelected, hasSelected }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#fde68a");
  const [size, setSize] = useState(13);
  const [bold, setBold] = useState(false);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), color, size, bold });
    setText("");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Add Annotation</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Type annotation text…"
          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <Button onClick={handleAdd} size="sm" className="text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90">Add</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full border-2 transition-all ${color === c ? "border-white scale-125" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <label className="text-[10px] text-muted-foreground">Size</label>
          <input type="number" min="9" max="28" value={size} onChange={e => setSize(Number(e.target.value))}
            className="w-12 bg-secondary border border-border rounded px-2 py-0.5 text-xs text-foreground focus:outline-none" />
          <button onClick={() => setBold(v => !v)}
            className={`p-1 rounded border text-xs transition-all ${bold ? "bg-primary/20 border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
            <Bold className="h-3 w-3" />
          </button>
          {hasSelected && (
            <button onClick={onDeleteSelected}
              className="p-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors ml-1">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">Click anywhere on the diagram to place the next annotation at that position.</p>
    </div>
  );
}