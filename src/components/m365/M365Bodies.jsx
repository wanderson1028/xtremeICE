import React from "react";

/* Decorative (non-interactive) app content drawn beneath the clickable controls. */

const Bar = ({ w = "100%", h = 4, c = "#e1dfdd" }) => (
  <div style={{ width: w, height: h, backgroundColor: c, borderRadius: 2 }} />
);

export function DocumentBody({ top }) {
  const paragraphs = [
    { top: 10, lines: ["84%", "92%", "70%"] },
    { top: 26, lines: ["88%", "95%", "64%", "80%"] },
    { top: 42, lines: ["76%", "90%"] },
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[#f3f2f1]" style={{ top: `${top}%` }}>
      <div className="absolute inset-x-0 top-0 h-[3%] border-b border-[#e1dfdd] bg-white" />
      <div
        className="absolute bg-white shadow-[0_1px_8px_rgba(0,0,0,0.16)]"
        style={{ left: "17%", right: "17%", top: "3%", bottom: "2%" }}
      >
        <div className="absolute left-[7%] right-[7%] top-[7%]">
          <Bar w="58%" h={9} c="#b4c7e7" />
        </div>
        {paragraphs.map((p) => (
          <div key={p.top} className="absolute left-[7%] right-[7%] flex flex-col gap-[4px]" style={{ top: `${p.top}%` }}>
            {p.lines.map((w, i) => (
              <Bar key={i} w={w} h={4} c="#d9d9d9" />
            ))}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-[5%] items-center justify-end gap-3 border-t border-[#e1dfdd] bg-[#f3f2f1] px-3 text-[8px] text-[#605e5c]">
        <span>Page 1 of 4</span>
        <span>1,204 words</span>
        <span>100%</span>
      </div>
    </div>
  );
}

const SHEET_ROWS = [
  ["Region", "Q1", "Q2", "Q3", "Q4", "Total", "", "", ""],
  ["North", "120,400", "131,200", "142,800", "150,300", "544,700", "", "", ""],
  ["South", "98,200", "104,600", "111,900", "119,400", "434,100", "", "", ""],
  ["Marketing", "76,500", "82,300", "88,100", "94,800", "341,700", "", "", ""],
  ["West", "64,800", "70,200", "75,900", "81,400", "292,300", "", "", ""],
  ["East", "58,700", "61,900", "66,200", "70,800", "257,600", "", "", ""],
  ["EMEA", "44,300", "47,800", "51,200", "55,600", "198,900", "", "", ""],
  ["APAC", "39,100", "41,700", "44,800", "48,300", "173,900", "", "", ""],
  ["Total", "502,000", "539,700", "580,900", "620,600", "2,243,200", "", "", ""],
  ["", "", "", "", "", "", "", "", ""],
];

export function SheetBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-white" style={{ top: `${top}%` }}>
      {/* Formula bar */}
      <div className="absolute inset-x-0 top-0 flex h-[8%] items-center gap-2 border-b border-[#d0cecc] bg-white px-2 text-[9px]">
        <span className="rounded border border-[#d0cecc] px-2 py-[1px] text-[#3b3a39]">A4</span>
        <span className="italic text-[#8a8886]">fx</span>
        <span className="truncate text-[#3b3a39]">=SUM(B2:B12)</span>
      </div>

      {/* Column headers */}
      <div className="absolute inset-x-0 flex bg-[#f3f2f1]" style={{ top: "8%", height: "7%" }}>
        <div className="w-[3.2%] shrink-0 border-r border-[#e1dfdd]" />
        {["A", "B", "C", "D", "E", "F", "G", "H", "I"].map((c) => (
          <div key={c} className="flex flex-1 items-center justify-center border-r border-[#e1dfdd] text-[8px] text-[#605e5c]">
            {c}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="absolute inset-x-0" style={{ top: "15%", height: "77%" }}>
        {SHEET_ROWS.map((row, i) => (
          <div key={i} className="flex h-[10%] border-b border-[#f0f0f0]">
            <div className="flex w-[3.2%] shrink-0 items-center justify-center border-r border-[#e1dfdd] bg-[#f3f2f1] text-[7px] text-[#605e5c]">
              {i + 1}
            </div>
            {row.map((cell, j) => (
              <div key={j} className="flex flex-1 items-center truncate border-r border-[#f0f0f0] px-1 text-[8px] text-[#3b3a39]">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Sheet tabs */}
      <div className="absolute inset-x-0 bottom-0 flex h-[8%] items-center gap-3 border-t border-[#e1dfdd] bg-[#f3f2f1] px-2 text-[8px] text-[#605e5c]">
        <span className="rounded-t border border-[#d0cecc] bg-white px-2 py-[1px] font-semibold text-[#217346]">Sheet1</span>
        <span>Sheet2</span>
        <span>+</span>
        <span className="ml-auto">Ready</span>
      </div>
    </div>
  );
}

const LIBRARY_ROWS = [
  { name: "Security_Policy_Q4.docx", by: "A. Rivera", when: "2 hours ago" },
  { name: "Budget_2026.xlsx", by: "M. Chen", when: "Yesterday" },
  { name: "Incident_Response_Plan.pptx", by: "A. Rivera", when: "3 days ago" },
  { name: "Vendor_List.xlsx", by: "J. Okafor", when: "Last week" },
];

export function LibraryBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-white" style={{ top: `${top}%` }}>
      <div className="absolute inset-x-0 top-0 flex h-[6%] items-center gap-2 border-b border-[#e1dfdd] px-3 text-[9px] text-[#605e5c]">
        <span className="font-semibold text-[#036c70]">Security Operations</span>
        <span>›</span>
        <span>Documents</span>
      </div>
      <div className="absolute inset-x-0 flex h-[7%] items-center gap-2 border-b border-[#e1dfdd] px-3 text-[9px] font-semibold text-[#605e5c]" style={{ top: "6%" }}>
        <span className="w-[42%]">Name</span>
        <span className="w-[18%]">Modified</span>
        <span className="w-[18%]">Modified by</span>
      </div>
      {LIBRARY_ROWS.map((r, i) => (
        <div
          key={r.name}
          className="absolute inset-x-0 flex items-center gap-2 border-b border-[#f3f2f1] px-3 text-[9px] text-[#3b3a39]"
          style={{ top: `${13 + i * 9.5}%`, height: "9.5%" }}
        >
          <span className="flex w-[42%] items-center gap-1.5 truncate">
            <span className="h-2 w-2 rounded-sm bg-[#036c70]/70" />
            {r.name}
          </span>
          <span className="w-[18%] text-[#8a8886]">{r.when}</span>
          <span className="w-[18%] text-[#8a8886]">{r.by}</span>
        </div>
      ))}
    </div>
  );
}

const MESSAGES = [
  { from: "Nadia Haddad", subject: "Q4 vendor renewal", time: "9:14 AM" },
  { from: "SOC Queue", subject: "Alert: impossible travel", time: "8:52 AM" },
  { from: "Marcus Chen", subject: "Budget approval needed", time: "Mon" },
  { from: "IT Change Board", subject: "Firewall change window", time: "Mon" },
];

export function MailBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-white" style={{ top: `${top}%` }}>
      <div className="absolute inset-y-0 left-0 w-[6%] border-r border-[#e1dfdd] bg-[#f3f2f1]" />
      <div className="absolute inset-y-0 left-[6%] w-[33%] border-r border-[#e1dfdd]">
        <div className="absolute inset-x-0 top-0 flex h-[6%] items-center justify-between border-b border-[#e1dfdd] px-2 text-[9px] font-semibold text-[#0f6cbd]">
          Inbox (12)
          <span className="text-[7px] font-normal text-[#8a8886]">Sort: Newest</span>
        </div>
        {MESSAGES.map((m, i) => (
          <div
            key={m.subject}
            className={`absolute inset-x-0 border-b border-[#f3f2f1] px-2 py-1 ${i === 0 ? "bg-[#e8f1fb]" : ""}`}
            style={{ top: `${6 + i * 8}%`, height: "8%" }}
          >
            <div className="truncate text-[9px] font-semibold text-[#3b3a39]">{m.from}</div>
            <div className="truncate text-[8px] text-[#605e5c]">{m.subject}</div>
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-[39%] right-0 px-[3%] py-[2%]">
        <div className="text-[10px] font-semibold text-[#3b3a39]">Q4 vendor renewal</div>
        <div className="mb-2 text-[8px] text-[#8a8886]">Nadia Haddad · 9:14 AM</div>
        <div className="flex flex-col gap-[5px]">
          <Bar w="90%" h={3} />
          <Bar w="76%" h={3} />
          <Bar w="84%" h={3} />
          <Bar w="52%" h={3} />
          <Bar w="68%" h={3} />
        </div>
      </div>
    </div>
  );
}

export function ChatBody({ top }) {
  const channels = ["SOC Tier 1", "SOC Tier 2", "Threat Intel", "Purple Team"];
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[#f5f5f5]" style={{ top: `${top}%` }}>
      <div className="absolute inset-y-0 left-0 w-[6%] border-r border-[#e0e0e0] bg-[#ebebeb]" />
      <div className="absolute inset-y-0 left-[6%] w-[19%] border-r border-[#e0e0e0] bg-[#fafafa]">
        <div className="absolute inset-x-0 top-0 flex h-[8%] items-center border-b border-[#e0e0e0] px-2 text-[9px] font-semibold text-[#424242]">
          Your teams
        </div>
        {channels.map((c, i) => (
          <div
            key={c}
            className={`absolute inset-x-0 flex items-center truncate px-2 text-[8px] ${i === 0 ? "bg-[#e8e6f8] font-semibold text-[#4b53bc]" : "text-[#616161]"}`}
            style={{ top: `${8 + i * 7}%`, height: "7%" }}
          >
            # {c}
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-[25%] right-0">
        <div className="absolute inset-x-0 top-0 flex h-[8%] items-center border-b border-[#e0e0e0] bg-white px-2 text-[9px] font-semibold text-[#424242]">
          SOC Tier 1
        </div>
        <div className="absolute inset-x-0" style={{ top: "9%", height: "76%" }}>
          {[
            { who: "Nadia H.", text: "Phishing wave hitting finance this morning." },
            { who: "Marcus C.", text: "I will pull the mail trace and post the numbers." },
            { who: "You", text: "Running the rule against the last 24 hours now." },
          ].map((m) => (
            <div key={m.who} className="mb-2 px-2">
              <div className="text-[8px] font-semibold text-[#4b53bc]">{m.who}</div>
              <div className="text-[8px] text-[#424242]">{m.text}</div>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-2 flex items-center rounded border border-[#d0d0d0] bg-white px-2" style={{ top: "88%", height: "8%" }}>
          <span className="text-[8px] text-[#a0a0a0]">Type a message</span>
          <span className="ml-auto text-[9px] text-[#616161]">➤</span>
        </div>
      </div>
    </div>
  );
}

export function ReportBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[#eaeaea]" style={{ top: `${top}%` }}>
      <div className="absolute inset-y-0 left-0 w-[7%] border-r border-[#dcdcdc] bg-[#f7f7f7]">
        {["Report", "Data", "Model"].map((v, i) => (
          <div key={v} className={`px-1 py-1 text-[7px] ${i === 0 ? "font-semibold text-[#3b3a39]" : "text-[#8a8886]"}`}>
            {v}
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-[7%] right-0">
        <div className="absolute left-[3%] top-[4%] h-[46%] w-[44%] rounded bg-white shadow-sm">
          <div className="px-2 py-1 text-[8px] font-semibold text-[#3b3a39]">Findings by region</div>
          <div className="flex h-[70%] items-end justify-around px-2 pb-1">
            {[52, 34, 68, 22, 45].map((h, i) => (
              <div key={i} className="w-[12%] rounded-t bg-[#f2c811]" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="absolute left-[51%] top-[4%] h-[46%] w-[26%] rounded bg-white shadow-sm">
          <div className="px-2 py-1 text-[8px] font-semibold text-[#3b3a39]">Open alerts</div>
          <div className="flex items-center justify-center pt-2 text-[20px] font-semibold text-[#3b3a39]">37</div>
        </div>
        <div className="absolute left-[3%] top-[55%] h-[36%] w-[74%] rounded bg-white shadow-sm">
          <div className="px-2 py-1 text-[8px] font-semibold text-[#3b3a39]">Risk trend</div>
          <svg viewBox="0 0 200 60" className="h-[70%] w-full px-2">
            <polyline points="0,45 40,32 80,38 120,18 160,26 200,10" fill="none" stroke="#4b53bc" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-[8%] items-center gap-3 border-t border-[#dcdcdc] bg-[#f7f7f7] px-2 text-[8px] text-[#605e5c]">
        <span>Page 1</span>
        <span className="text-[#8a8886]">Page 2</span>
      </div>
    </div>
  );
}