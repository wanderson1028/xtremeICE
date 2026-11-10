import React, { useState } from "react";
import {
  Activity, MessageSquare, Users, CalendarDays, FolderOpen, Hash,
  Paperclip, Send, BellOff, Video, Plus,
} from "lucide-react";
import Hit, { BodyStatus } from "./Hit";
import M365MenuButton from "../M365MenuButton";
import { ATTACH_MENU, CHANNEL_MENU, MEET_MENU, TEAM_MENU } from "@/lib/m365/teams";

const RAIL = [
  { id: "activity", label: "Activity", icon: Activity },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "teams", label: "Teams", icon: Users },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "files", label: "Files", icon: FolderOpen },
];

const BASE_CHANNELS = [
  { id: "teams-channel-general", name: "General" },
  { id: "teams-channel-threat-intel", name: "Threat Intel" },
  { id: "teams-channel-incident", name: "Incident Response" },
  { id: "teams-channel-handover", name: "Shift Handover" },
];

const POSTS = [
  { from: "Marcus Lee", time: "9:04 AM", text: "Morning handover: two medium alerts overnight, both closed as benign." },
  { from: "Priya Raman", time: "9:11 AM", text: "Vendor renewal is signed — tracking it in the Vendors folder." },
  { from: "Dana Whitfield", time: "9:20 AM", text: "Reminder: the quarterly access review closes Friday." },
];

const FILES = [
  { name: "Q4_Security_Policy.docx", by: "Dana Whitfield", when: "Nov 8" },
  { name: "Incident_Response_Plan.pptx", by: "Marcus Lee", when: "Nov 6" },
  { name: "Vendor_Renewal_Tracker.xlsx", by: "Priya Raman", when: "Nov 5" },
];

export default function TeamsBody({ state, selectedId, click, context, press }) {
  const [activeChannel, setActiveChannel] = useState("teams-channel-general");

  const channels = [...BASE_CHANNELS];
  if (state.addedChannel) {
    channels.push({ id: "teams-channel-incident-2026-11", name: "Incident 2026-11" });
  }
  const channel = channels.find((item) => item.id === activeChannel) || channels[0];

  return (
    <div className="flex min-h-0 flex-1 bg-white">
      <div className="flex w-[10%] min-w-[42px] shrink-0 flex-col items-center gap-2 border-r border-[#e1dfdd] bg-[#ebebf5] py-2">
        {RAIL.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex flex-col items-center gap-[1px] text-[7px] ${
                item.id === "teams" ? "text-[#4b53bc]" : "text-[#605e5c]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </div>
          );
        })}
      </div>

      <div className="hidden w-[26%] shrink-0 flex-col border-r border-[#e1dfdd] bg-[#faf9f8] sm:flex">
        <div className="flex items-center gap-1 border-b border-[#e1dfdd] px-2 py-1.5">
          <span className="truncate text-[10px] font-semibold text-[#201f1e]">SOC Operations</span>
          <M365MenuButton
            label=""
            icon={Plus}
            items={TEAM_MENU}
            className="ml-auto"
            onPress={() => press({ type: "control", controlId: "more" })}
            onChoose={(item) => press({ type: "option", controlId: "more", optionId: item.id })}
            title="More options"
          />
        </div>
        <div className="px-1.5 py-1 text-[8px] uppercase tracking-wide text-[#8a8886]">Channels</div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {channels.map((item) => (
            <Hit
              key={item.id}
              id={item.id}
              click={() => setActiveChannel(item.id)}
              context={context}
              menu={CHANNEL_MENU}
              selected={item.id === activeChannel}
              className="flex cursor-default items-center gap-1 px-2 py-[4px] text-[9px] text-[#3b3a39]"
            >
              <Hash className="h-2.5 w-2.5 shrink-0 text-[#8a8886]" />
              <span className="truncate">{item.name}</span>
              {state.muted && item.id === "teams-channel-threat-intel" ? (
                <BellOff className="ml-auto h-2.5 w-2.5 shrink-0 text-[#8a8886]" />
              ) : null}
            </Hit>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {state.meeting ? (
          <div className="flex shrink-0 items-center gap-2 bg-[#1f1f1f] px-2 py-1 text-[9px] text-white">
            <Video className="h-3 w-3" />
            <span className="truncate">Meeting in progress · SOC Operations / {channel.name}</span>
            <span className="ml-auto rounded bg-white/15 px-1.5 py-[1px]">Leave</span>
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 border-b border-[#e1dfdd] px-2 py-1">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#201f1e]">
            <Hash className="h-3 w-3 text-[#8a8886]" />
            {channel.name}
          </span>
          <div className="ml-2 flex items-center gap-2 text-[9px] text-[#605e5c]">
            <span className="border-b-2 border-[#4b53bc] pb-[2px] font-semibold text-[#424242]">
              Posts
            </span>
            <Hit
              id="teams-tab-files"
              click={click}
              selected={state.filesTab || selectedId === "teams-tab-files"}
              className="cursor-pointer pb-[2px]"
            >
              Files
            </Hit>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <M365MenuButton
              label="Meet"
              icon={Video}
              items={MEET_MENU}
              onPress={() => press({ type: "control", controlId: "meet" })}
              onChoose={(item) => press({ type: "option", controlId: "meet", optionId: item.id })}
            />
            <M365MenuButton
              label="⋯"
              items={TEAM_MENU}
              onPress={() => press({ type: "control", controlId: "more" })}
              onChoose={(item) => press({ type: "option", controlId: "more", optionId: item.id })}
              align="right"
              title="More options"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-2 py-1.5">
          {state.filesTab ? (
            <div>
              <div className="mb-1 text-[8px] uppercase tracking-wide text-[#8a8886]">
                Files shared in {channel.name}
              </div>
              {FILES.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-1.5 border-b border-[#f3f2f1] py-[4px] text-[9px] text-[#3b3a39]"
                >
                  <FolderOpen className="h-2.5 w-2.5 shrink-0 text-[#4b53bc]" />
                  <span className="truncate">{file.name}</span>
                  <span className="ml-auto shrink-0 text-[8px] text-[#8a8886]">
                    {file.by} · {file.when}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {POSTS.map((post) => (
                <div key={post.from} className="rounded border border-[#f3f2f1] px-1.5 py-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9px] font-semibold text-[#201f1e]">{post.from}</span>
                    <span className="text-[8px] text-[#8a8886]">{post.time}</span>
                  </div>
                  <div className="text-[9px] leading-relaxed text-[#3b3a39]">{post.text}</div>
                </div>
              ))}
              {state.sent ? (
                <div className="rounded border border-[#4b53bc]/40 bg-[#f2f2fd] px-1.5 py-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9px] font-semibold text-[#201f1e]">You</span>
                    <span className="text-[8px] text-[#8a8886]">just now</span>
                  </div>
                  <div className="text-[9px] leading-relaxed text-[#3b3a39]">
                    Update posted — evidence is attached to the case in the tracker.
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#e1dfdd] px-2 py-1">
          {state.attachment ? (
            <div className="mb-1 flex items-center gap-1 rounded bg-[#f3f2f1] px-1.5 py-[2px] text-[8px] text-[#3b3a39]">
              <Paperclip className="h-2.5 w-2.5" />
              Q4_Evidence_Log.xlsx · 48 KB
            </div>
          ) : null}
          <div className="flex items-center gap-1 rounded border border-[#c8c6c4] bg-white px-1.5 py-1">
            <span className="flex-1 truncate text-[9px] text-[#8a8886]">
              Type a message in {channel.name}…
            </span>
            <M365MenuButton
              label=""
              icon={Paperclip}
              items={ATTACH_MENU}
              placement="up"
              align="right"
              onPress={() => press({ type: "control", controlId: "attach" })}
              onChoose={(item) => press({ type: "option", controlId: "attach", optionId: item.id })}
              title="Attach"
            />
            <Hit
              id="teams-send"
              click={click}
              selected={selectedId === "teams-send"}
              className="cursor-pointer rounded p-0.5 text-[#4b53bc] hover:bg-black/5"
              title="Send"
            >
              <Send className="h-3 w-3" />
            </Hit>
          </div>
        </div>

        <BodyStatus
          left={`${channels.length} channels · ${channel.name}`}
          right={state.muted ? "Threat Intel muted" : "Notifications on"}
        />
      </div>
    </div>
  );
}