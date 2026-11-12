import React from "react";
import { Paperclip, Search, CalendarDays, Users, Mail } from "lucide-react";
import Hit, { BodyStatus } from "./Hit";
import { MESSAGE_MENU } from "@/lib/m365/outlook";

const MESSAGES = [
  {
    id: "ol-msg-vendor",
    from: "Dana Whitfield",
    subject: "Q4 vendor renewal",
    preview: "Attaching the signed renewal for the SIEM licence — signature page is on 4.",
    time: "9:12 AM",
    unread: true,
    body:
      "Hi team, attaching the signed renewal for the SIEM licence. The signature page is on page 4. Please file it in the Vendors folder once your review is done.\n\nThanks,\nDana",
  },
  {
    id: "ol-msg-access",
    from: "Priya Raman",
    subject: "Quarterly access review due",
    preview: "The certification window closes Friday at 5 PM.",
    time: "8:40 AM",
    unread: false,
    body:
      "The quarterly access review window closes Friday at 5 PM. Please certify the analyst and admin groups before then.",
  },
  {
    id: "ol-msg-phish",
    from: "IT Helpdesk",
    subject: "Unusual sign-in attempt",
    preview: "Verify your credentials within 24 hours to avoid suspension.",
    time: "7:05 AM",
    unread: true,
    body:
      "We detected an unusual sign-in attempt. Verify your credentials within 24 hours at the link below to avoid account suspension.",
  },
  {
    id: "ol-msg-tabletop",
    from: "Marcus Lee",
    subject: "Tabletop scheduling",
    preview: "Can we move the exercise to the 18th? White team is available.",
    time: "Yesterday",
    unread: false,
    body: "Can we move the tabletop exercise to the 18th? The white team is available all afternoon.",
  },
];

const NAV = [
  { id: "mail", label: "Mail", icon: Mail },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "people", label: "People", icon: Users },
];

export default function OutlookBody({ state, selectedId, click, context }) {
  let messages = MESSAGES.filter(
    (message) =>
      state.movedMessage !== message.id && state.deletedMessage !== message.id
  );
  if (state.filter === "unread") messages = messages.filter((message) => message.unread);

  /* Nothing is open until a message is actually selected: the reading pane must
     not imply a message is acted on, since Reply, Move and Forward only apply to
     a selected message. */
  const selected = messages.find((message) => message.id === selectedId) || null;
  const unread = messages.filter((message) => message.unread).length;

  return (
    <div className="flex min-h-0 flex-1 bg-white">
      <div className="flex w-[15%] shrink-0 flex-col items-center gap-2 border-r border-[#e1dfdd] bg-[#f3f2f1] py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex w-full flex-col items-center gap-[2px] py-1 text-[8px] ${
                item.id === "mail" ? "text-[#0f6cbd]" : "text-[#605e5c]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </div>
          );
        })}
      </div>

      <div className="hidden w-[19%] shrink-0 flex-col gap-[2px] border-r border-[#e1dfdd] bg-[#faf9f8] px-1.5 py-2 text-[9px] sm:flex">
        <div className="mb-1 px-1 text-[8px] font-semibold uppercase tracking-wide text-[#8a8886]">
          Folders
        </div>
        {[
          { label: "Inbox", count: unread },
          { label: "Vendors", count: state.movedMessage ? 1 : 0 },
          { label: "Archive", count: 0 },
          { label: "Deleted Items", count: state.deletedMessage ? 1 : 0 },
        ].map((folder) => (
          <div
            key={folder.label}
            className="flex items-center justify-between rounded px-1.5 py-[3px] text-[#3b3a39] hover:bg-white"
          >
            <span>{folder.label}</span>
            <span className="tabular-nums text-[#8a8886]">{folder.count}</span>
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#e1dfdd] px-2 py-1">
          <span className="text-[10px] font-semibold text-[#201f1e]">Inbox</span>
          {state.filter === "unread" ? (
            <span className="rounded-full border border-[#0f6cbd]/40 bg-[#eef6fd] px-2 py-[1px] text-[8px] text-[#0f6cbd]">
              Filtered: Unread ✕
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1 rounded-full border border-[#d0cecc] px-2 py-[1px] text-[8px] text-[#8a8886]">
            <Search className="h-2.5 w-2.5" />
            Search
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="w-[46%] shrink-0 overflow-hidden border-r border-[#e1dfdd]">
            {state.filter === "unread" && messages.length === 0 ? (
              <div className="px-3 py-4 text-[9px] text-[#8a8886]">No unread messages.</div>
            ) : null}
            {messages.map((message) => (
              <Hit
                key={message.id}
                id={message.id}
                click={click}
                context={context}
                menu={MESSAGE_MENU}
                selected={selectedId === message.id}
                className="cursor-default border-b border-[#f3f2f1] px-2 py-[5px]"
              >
                <div className="flex items-baseline gap-1">
                  {message.unread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f6cbd]" /> : null}
                  <span className={`truncate text-[9px] ${message.unread ? "font-semibold" : ""} text-[#201f1e]`}>
                    {message.from}
                  </span>
                  <span className="ml-auto shrink-0 text-[8px] text-[#8a8886]">{message.time}</span>
                </div>
                <div className={`truncate text-[9px] ${message.unread ? "font-semibold" : ""} text-[#3b3a39]`}>
                  {message.subject}
                </div>
                <div className="truncate text-[8px] text-[#8a8886]">{message.preview}</div>
              </Hit>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
              {state.autoReplies ? (
                <div className="mb-2 rounded border border-[#0f6cbd]/40 bg-[#eef6fd] px-2 py-1.5">
                  <div className="text-[9px] font-semibold text-[#0f6cbd]">Automatic replies are on</div>
                  <div className="text-[8px] text-[#3b3a39]">
                    Outside my organization: “I am on call this week and monitoring the SOC queue.”
                  </div>
                </div>
              ) : null}

              {selected ? (
                <>
                  <div className="text-[11px] font-semibold text-[#201f1e]">{selected.subject}</div>
                  <div className="mt-0.5 text-[8px] text-[#8a8886]">
                    {selected.from} · {selected.time} · to SOC Operations
                  </div>
                  <div className="mt-2 whitespace-pre-line text-[9px] leading-relaxed text-[#3b3a39]">
                    {selected.body}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[8px] text-[#8a8886]">
                    <Paperclip className="h-2.5 w-2.5" /> 1 attachment
                  </div>
                </>
              ) : (
                <div className="text-[9px] text-[#8a8886]">Select a message to read it.</div>
              )}
            </div>

            {state.replyDraftFor || state.forwardOf ? (
              <div className="shrink-0 border-t border-[#e1dfdd] bg-[#faf9f8] px-2 py-1.5">
                <div className="flex items-center gap-2 text-[8px] text-[#605e5c]">
                  <span className="rounded bg-white px-1.5 py-[1px] font-semibold text-[#0f6cbd]">
                    {state.forwardOf ? "Forward" : "Reply"}
                  </span>
                  <span>
                    {state.forwardOf
                      ? "To: manager@northwind.example"
                      : "To: Dana Whitfield"}
                  </span>
                  <span className="ml-auto truncate font-mono text-[7px] text-[#8a8886]">
                    {MESSAGES.find(
                      (m) => m.id === (state.forwardOf || state.replyDraftFor)
                    )?.subject || ""}
                  </span>
                </div>
                <div className="mt-1 rounded-sm border border-[#c8c6c4] bg-white px-2 py-1 text-[9px] text-[#3b3a39]">
                  {state.forwardOf
                    ? "FYI — please review the renewal before Friday."
                    : "Thanks Dana — filed for review."}
                </div>
                <div className="mt-1 flex justify-end">
                  <span className="rounded bg-[#0f6cbd] px-2 py-[2px] text-[8px] font-semibold text-white">Send</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <BodyStatus
          left={`${messages.length} messages · ${unread} unread`}
          right={state.autoReplies ? "Automatic replies: On" : "Connected · Outlook"}
        />
      </div>
    </div>
  );
}