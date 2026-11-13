import React, { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerClick, CheckCircle, Crosshair } from "lucide-react";

/**
 * Guided point-and-click lesson overlay.
 * Watches clicks inside the main evidence panel (marked data-soc-scope) and
 * grades them against the step's target row. Clicks outside the panel are
 * ignored so navigation keeps working normally.
 */
export default function GuidedClickOverlay({ step, index, total, onComplete }) {
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [spotlight, setSpotlight] = useState(null);
  const clearTimer = useRef(null);
  const spotTimer = useRef(null);

  // Reset feedback whenever the step changes
  useEffect(() => {
    setStatus("idle");
    setSpotlight(null);
  }, [step?.id]);

  useEffect(() => () => {
    clearTimeout(clearTimer.current);
    clearInterval(spotTimer.current);
  }, []);

  const showSpotlight = useCallback(() => {
    const find = () => document.querySelector(step.selector);
    const paint = () => {
      const el = find();
      if (!el) {
        setSpotlight({ missing: true });
        return;
      }
      const r = el.getBoundingClientRect();
      setSpotlight({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    paint();
    clearInterval(spotTimer.current);
    spotTimer.current = setInterval(paint, 350);
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      clearInterval(spotTimer.current);
      setSpotlight(null);
    }, 3600);
  }, [step?.selector]);

  useEffect(() => {
    if (!step) return;
    const handler = (event) => {
      // Only the evidence panel counts; tabs, header and guide stay usable
      if (!event.target.closest?.("[data-soc-scope]")) return;
      // Filter chips inside the panel are not evidence — ignore them
      if (event.target.closest?.("[data-soc-ignore]")) return;
      const hit = event.target.closest?.(step.selector);
      if (hit) {
        setStatus("correct");
        clearTimeout(clearTimer.current);
        clearTimer.current = setTimeout(() => onComplete?.(step), 700);
        return;
      }
      setStatus("wrong");
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setStatus("idle"), 2600);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [step, onComplete]);

  if (!step) return null;

  return (
    <>
      {spotlight && !spotlight.missing && (
        <div
          className="fixed z-[60] pointer-events-none rounded-lg ring-2 ring-cyan-400 shadow-[0_0_0_4px_rgba(34,211,238,0.25)] transition-all duration-200"
          style={{ top: spotlight.top - 2, left: spotlight.left - 2, width: spotlight.width + 4, height: spotlight.height + 4 }}
        />
      )}

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[61] w-[min(30rem,calc(100vw-2rem))]">
        <div className={`rounded-xl border shadow-2xl backdrop-blur px-4 py-3 ${
          status === "correct"
            ? "border-green-500/50 bg-green-950/90"
            : status === "wrong"
              ? "border-red-500/50 bg-red-950/90"
              : "border-cyan-500/40 bg-gray-950/92"
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            {status === "correct"
              ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
              : <MousePointerClick className="h-4 w-4 text-cyan-400 shrink-0 animate-pulse" />}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              Point &amp; click · step {index} of {total}
            </span>
            <span className="ml-auto text-[10px] font-mono text-gray-400">{step.title}</span>
          </div>

          <p className="text-xs text-gray-100 leading-relaxed">{step.instruction}</p>

          {status === "wrong" && (
            <p className="mt-1.5 text-[11px] text-red-300 leading-relaxed">{step.missHint}</p>
          )}
          {status === "correct" && (
            <p className="mt-1.5 text-[11px] text-green-300">Correct — that is the evidence for this step.</p>
          )}
          {spotlight?.missing && status !== "correct" && (
            <p className="mt-1.5 text-[11px] text-amber-300 leading-relaxed">
              The row is hidden by your current SIEM filters — clear the search box or severity filter to see it.
            </p>
          )}

          {status === "idle" && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={showSpotlight}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all"
              >
                <Crosshair className="h-3 w-3" /> Spotlight it
              </button>
              <span className="text-[10px] text-gray-500">click the matching row in the panel above</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}