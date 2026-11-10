import React, { useState } from "react";

/**
 * Modal dialog inside the simulated app window. Nothing is committed until the
 * primary button is pressed, and the button stays disabled until the candidate
 * has made a choice or typed a value.
 */
export default function M365Dialog({ dialog, onCancel, onConfirm }) {
  const [choice, setChoice] = useState(null);
  const [text, setText] = useState(dialog.input?.value || "");
  /* A dialog with nothing to fill in (a single on/off action) is confirmable
     straight away; the label itself is the value it commits. */
  const value = dialog.items ? choice : dialog.input ? text.trim() : dialog.confirm;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-md border border-[#c8c6c4] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
        <div className="border-b border-[#e1dfdd] px-3 py-2 text-[11px] font-semibold text-[#201f1e]">
          {dialog.title}
        </div>

        <div className="px-3 py-2">
          <p className="text-[9.5px] leading-relaxed text-[#3b3a39]">{dialog.description}</p>

          {dialog.items ? (
            <div className="mt-2 space-y-[2px]">
              {dialog.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChoice(item.id)}
                  className={`flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-[9.5px] transition-colors ${
                    choice === item.id
                      ? "border-[#0f6cbd] bg-[#eef6fd]"
                      : "border-[#e1dfdd] hover:bg-[#f3f2f1]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full border ${
                      choice === item.id ? "border-[#0f6cbd] bg-[#0f6cbd]" : "border-[#c8c6c4]"
                    }`}
                  />
                  <span className="truncate text-[#201f1e]">{item.label}</span>
                  {item.meta ? (
                    <span className="ml-auto shrink-0 text-[8px] text-[#8a8886]">{item.meta}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {dialog.input ? (
            <label className="mt-2 block text-[9px] text-[#605e5c]">
              {dialog.input.label}
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={dialog.input.placeholder}
                className="mt-1 w-full rounded border border-[#c8c6c4] px-2 py-1 text-[10px] text-[#201f1e] outline-none focus:border-[#0f6cbd]"
              />
            </label>
          ) : null}
        </div>

        <div className="flex justify-end gap-1.5 border-t border-[#e1dfdd] bg-[#faf9f8] px-3 py-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[#c8c6c4] bg-white px-2.5 py-1 text-[9px] text-[#3b3a39] hover:bg-[#f3f2f1]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!value}
            onClick={() => onConfirm(value)}
            className="rounded bg-[#0f6cbd] px-2.5 py-1 text-[9px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {dialog.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}