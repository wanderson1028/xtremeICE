import React, { useState, useEffect } from "react";
import { NotebookPen, ChevronLeft, ChevronRight } from "lucide-react";

const STORAGE_KEY_PREFIX = "lab_notes_";

export default function LabNotepad({ labTitle }) {
  const storageKey = STORAGE_KEY_PREFIX + labTitle.replace(/\s+/g, "_");
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(() => localStorage.getItem(storageKey) || "");

  useEffect(() => {
    localStorage.setItem(storageKey, notes);
  }, [notes, storageKey]);

  return (
    <div className={`shrink-0 border-l border-gray-800 bg-black/40 flex flex-col transition-all duration-300 ${open ? "w-64" : "w-8"}`}>
      {/* Toggle tab */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center gap-1.5 px-1 py-3 hover:bg-gray-800/60 transition-colors border-b border-gray-800 shrink-0"
        title={open ? "Close notepad" : "Open notepad"}
      >
        {open ? (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <NotebookPen className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-mono text-gray-400">Notes</span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ChevronLeft className="h-3 w-3 text-gray-500" />
            <NotebookPen className="h-3.5 w-3.5 text-amber-400" />
          </div>
        )}
      </button>

      {open && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-800 shrink-0">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wide">Lab Notepad</span>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Take notes here…&#10;&#10;• Commands to remember&#10;• Key observations&#10;• Questions to follow up"
            className="flex-1 w-full bg-transparent text-[11px] font-mono text-gray-300 placeholder-gray-700 outline-none resize-none p-3 leading-relaxed"
            spellCheck={false}
          />
          <div className="px-3 py-1.5 border-t border-gray-800 shrink-0">
            <span className="text-[9px] font-mono text-gray-600">Auto-saved locally</span>
          </div>
        </div>
      )}
    </div>
  );
}