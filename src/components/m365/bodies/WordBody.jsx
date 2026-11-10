import React from "react";
import Hit, { BodyStatus } from "./Hit";
import { PARA_MENU, WORD_PARAGRAPHS, isLandscape } from "@/lib/m365/word";

const TOC_ENTRIES = ["1. Purpose", "2. Liability", "3. Control list"];

export default function WordBody({ state, selectedId, click, context }) {
  const landscape = isLandscape(state);
  const titleStyled = state.headingTarget === "word-title";
  const boldPara = state.boldParagraph === "word-para-3";
  const commentOn = WORD_PARAGRAPHS[state.commentTarget] || null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 justify-center overflow-hidden bg-[#e9e8e8] px-4 py-3">
        <div
          className={`flex h-full gap-3 transition-all duration-300 ${landscape ? "w-[96%]" : "w-[70%]"}`}
        >
          <div className="relative flex-1 overflow-hidden bg-white px-7 py-4 shadow-[0_1px_6px_rgba(0,0,0,0.3)]">
            {state.toc ? (
              <div className="mb-3 border-b border-dashed border-[#b1b1b1] pb-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#2b579a]">
                  {state.toc === "custom" ? "Custom Table of Contents" : "Table of Contents"}
                </div>
                {TOC_ENTRIES.map((entry, i) => (
                  <div key={entry} className="mt-1 flex items-baseline gap-1 text-[9px] text-[#201f1e]">
                    <span>{entry}</span>
                    <span className="flex-1 border-b border-dotted border-[#b1b1b1]" />
                    <span className="tabular-nums text-[#605e5c]">{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <Hit
              id="word-title"
              click={click}
              selected={selectedId === "word-title"}
              title="Click to select the title"
              className="cursor-default px-0.5"
            >
              {titleStyled ? (
                <h1 className="text-[15px] font-semibold leading-tight text-[#2b579a]">
                  Q4 Security Policy — Northwind Logistics
                </h1>
              ) : (
                <div className="text-[12px] font-bold leading-tight text-[#201f1e]">
                  Q4 Security Policy — Northwind Logistics
                </div>
              )}
            </Hit>

            <p className="mt-2.5 text-[9.5px] leading-relaxed text-[#201f1e]">
              <span className="font-semibold">1. Purpose.</span> This policy sets out how the security
              operations team protects customer data across the Northwind Logistics sites and how
              exceptions are recorded.
            </p>

            <Hit
              id="word-para-2"
              click={click}
              context={context}
              menu={PARA_MENU}
              selected={selectedId === "word-para-2"}
              title="Right-click for the paragraph menu"
              className="mt-2 cursor-default px-0.5 py-0.5 text-[9.5px] leading-relaxed text-[#201f1e]"
            >
              <span className="font-semibold">2. Liability.</span> Suppliers must report a confirmed
              incident within 24 hours of discovery. Any notification received after that window is
              logged as a policy exception and escalated to Legal.
              {state.commentTarget === "word-para-2" ? (
                <span className="ml-1 rounded-sm bg-[#fff4ce] px-1 text-[8px] text-[#605e5c]">
                  comment
                </span>
              ) : null}
            </Hit>

            <Hit
              id="word-para-3"
              click={click}
              context={context}
              menu={PARA_MENU}
              selected={selectedId === "word-para-3"}
              title="Click to select this paragraph"
              className={`mt-2 cursor-default px-0.5 py-0.5 text-[9.5px] leading-relaxed text-[#201f1e] ${
                boldPara ? "font-bold" : ""
              }`}
            >
              <span className={boldPara ? "" : "font-semibold"}>3. Control list.</span> Access reviews
              quarterly; Backups daily; Log retention twelve months.
            </Hit>

            {state.trackChanges ? (
              <>
                <div className="absolute right-2 top-16 h-10 w-[2px] rounded bg-[#c50f1f]" />
                <div className="absolute right-2 top-28 h-6 w-[2px] rounded bg-[#c50f1f]" />
                <div className="absolute bottom-3 right-2 text-[8px] uppercase tracking-wide text-[#c50f1f]">
                  markup
                </div>
              </>
            ) : null}
          </div>

          {commentOn ? (
            <aside className="w-[32%] shrink-0 rounded-sm border border-[#c8c6c4] bg-[#fffbf0] px-2.5 py-2 shadow-sm">
              <div className="text-[9px] font-semibold text-[#201f1e]">D. Whitfield</div>
              <div className="text-[8px] text-[#8a8886]">just now · {commentOn}</div>
              <p className="mt-1 text-[9px] leading-relaxed text-[#3b3a39]">
                Please confirm the 24-hour notification window with Legal before this policy is
                published.
              </p>
              <div className="mt-1.5 text-[8px] text-[#605e5c]">Reply · Resolve · ⋯</div>
            </aside>
          ) : null}
        </div>
      </div>

      <BodyStatus
        left={`Page 1 of 3 · 1,842 words · ${landscape ? "Landscape 11 × 8.5 in" : "Portrait 8.5 × 11 in"}`}
        right={`Track Changes: ${state.trackChanges ? "On" : "Off"} · English (United States)`}
      />
    </div>
  );
}