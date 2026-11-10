import React from "react";

/* Decorative (non-interactive) app content drawn beneath the clickable targets. */

const Bar = ({ w = "100%", h = 4, c = "#e1dfdd" }) => (
  <div style={{ width: w, height: h, backgroundColor: c, borderRadius: 2 }} />
);

export function DocumentBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[#f3f2f1]" style={{ top: `${top}%` }}>
      <div
        className="absolute bg-white shadow-[0_1px_8px_rgba(0,0,0,0.16)]"
        style={{ left: "17%", right: "17%", top: "5%", bottom: "-4%" }}
      >
        <div className="flex flex-col gap-[7px] p-[6%]">
          <Bar w="55%" h={10} c="#b4c7e7" />
          <Bar w="80%" />
          <Bar w="68%" />
          <Bar w="76%" />
          <Bar w="45%" />
          <Bar w="72%" />
          <Bar w="60%" />
        </div>
      </div>
    </div>
  );
}

export function SheetBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-white" style={{ top: `${top}%` }}>
      <div className="flex h-[7%] border-b border-[#d0cecc] bg-[#f3f2f1] text-[8px] text-[#605e5c]">
        {["", "A", "B", "C", "D", "E", "F", "G", "H"].map((c, i) => (
          <div key={i} className="flex flex-1 items-center justify-center border-r border-[#e1dfdd]">{c}</div>
        ))}
      </div>
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: "7%",
          backgroundImage:
            "repeating-linear-gradient(to bottom, #e6e6e6 0 1px, transparent 1px 11%), repeating-linear-gradient(to right, #e6e6e6 0 1px, transparent 1px 11.11%)",
        }}
      />
      <div className="absolute left-[2%] top-[1.4%] font-mono text-[9px] font-semibold text-[#217346]">Q4 Budget</div>
    </div>
  );
}

export function LibraryBody({ top }) {
  const rows = [
    { name: "Security_Policy_Q4.docx", by: "A. Rivera", when: "2 hours ago" },
    { name: "Budget_2026.xlsx", by: "M. Chen", when: "Yesterday" },
    { name: "Incident_Response_Plan.pptx", by: "A. Rivera", when: "3 days ago" },
    { name: "Vendor_List.xlsx", by: "J. Okafor", when: "Last week" },
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 bg-white" style={{ top: `${top}%` }}>
      <div className="flex items-center gap-2 border-b border-[#e1dfdd] px-3 py-[0.8%] text-[9px] font-semibold text-[#605e5c]">
        <span className="w-[42%]">Name</span>
        <span className="w-[18%]">Modified</span>
        <span className="w-[18%]">Modified by</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 border-b border-[#f3f2f1] px-3 py-[0.9%] text-[9px] text-[#3b3a39]">
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

export function MailBody({ top }) {
  const messages = [
    { from: "Nadia Haddad", subject: "Q4 vendor renewal", time: "9:14 AM" },
    { from: "SOC Queue", subject: "Alert: impossible travel", time: "8:52 AM" },
    { from: "Marcus Chen", subject: "Budget approval needed", time: "Mon" },
    { from: "IT Change Board", subject: "Firewall change window", time: "Mon" },
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 bg-white" style={{ top: `${top}%` }}>
      <div className="absolute inset-y-0 left-0 w-[6%] bg-[#f3f2f1] border-r border-[#e1dfdd]" />
      <div className="absolute inset-y-0 left-[6%] w-[33%] border-r border-[#e1dfdd]">
        <div className="border-b border-[#e1dfdd] px-2 py-1.5 text-[9px] font-semibold text-[#0f6cbd]">Inbox (12)</div>
        {messages.map((m, i) => (
          <div key={m.subject} className={`border-b border-[#f3f2f1] px-2 py-1.5 ${i === 0 ? "bg-[#e8f1fb]" : ""}`}>
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
        </div>
      </div>
    </div>
  );
}

export function ChatBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[#f5f5f5]" style={{ top: `${top}%` }}>
      <div className="absolute inset-y-0 left-0 w-[6%] bg-[#ebebeb] border-r border-[#e0e0e0]" />
      <div className="absolute inset-y-0 left-[6%] w-[19%] border-r border-[#e0e0e0] bg-[#fafafa]">
        <div className="border-b border-[#e0e0e0] px-2 py-1.5 text-[9px] font-semibold text-[#424242]">Your teams</div>
        {["SOC Tier 1", "SOC Tier 2", "Threat Intel", "Purple Team"].map((c, i) => (
          <div key={c} className={`truncate px-2 py-1 text-[8px] ${i === 0 ? "bg-[#e8e6f8] font-semibold text-[#4b53bc]" : "text-[#616161]"}`}>
            # {c}
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-[25%] right-0 flex flex-col">
        <div className="border-b border-[#e0e0e0] px-2 py-1 text-[9px] font-semibold text-[#424242]">SOC Tier 1</div>
        <div className="flex-1 px-2 py-1.5">
          {[
            { who: "Nadia H.", text: "Phishing wave hitting finance this morning." },
            { who: "Marcus C.", text: "I will pull the mail trace and post the numbers." },
          ].map((m) => (
            <div key={m.who} className="mb-1.5">
              <div className="text-[8px] font-semibold text-[#4b53bc]">{m.who}</div>
              <div className="text-[8px] text-[#424242]">{m.text}</div>
            </div>
          ))}
        </div>
        <div className="mx-2 mb-1.5 h-[9%] rounded border border-[#d0d0d0] bg-white" />
      </div>
    </div>
  );
}

export function ReportBody({ top }) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[#eaeaea]" style={{ top: `${top}%` }}>
      <div className="absolute inset-y-0 left-0 w-[7%] bg-[#f7f7f7] border-r border-[#dcdcdc]">
        {["Report", "Data", "Model"].map((v, i) => (
          <div key={v} className={`px-1 py-1 text-[7px] ${i === 0 ? "font-semibold text-[#3b3a39]" : "text-[#8a8886]"}`}>{v}</div>
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
    </div>
  );
}