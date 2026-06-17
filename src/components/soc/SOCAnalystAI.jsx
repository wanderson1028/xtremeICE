import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";

export default function SOCAnalystAI({ scenario, alerts, logs, actionsLog, mode }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: mode === "assessment"
        ? `**Assessment Mode Active** 📋\n\nI'm monitoring your investigation. I won't give you the answers — that's your job.\n\nComplete the tasks in the checklist. Ask me specific questions if you're truly stuck, but expect Socratic guidance, not direct answers.\n\n**Scenario:** ${scenario?.name || "Unknown"}`
        : `**Incoming — SOC Analyst AI** 🛡️\n\nThe alert just came in. I've been briefed on the scenario. Let's work this together.\n\n**Scenario:** ${scenario?.name || "Unknown"}\n\n**My recommendation:** Start by opening the **SIEM** tab — review the logs, identify the source and timeline of the attack. Then we'll move to EDR to scope the damage.\n\nAsk me anything as you go — MITRE mappings, next steps, IOC analysis, ticket drafts. I'm your partner on this one.`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildSystemPrompt = () => {
    const alertSummary = alerts.slice(0, 5).map(a => `- [${a.severity}] ${a.title} (${a.mitre})`).join("\n");
    const actionsSummary = actionsLog.slice(0, 8).map(a => `- ${a.label}${a.target ? " on " + a.target : ""}`).join("\n");
    const logCount = logs.length;
    const isAssessment = mode === "assessment";

    return `You are a Tier 1/2 SOC Analyst AI assistant embedded in a cybersecurity training simulation platform.

CURRENT SCENARIO: ${scenario?.name || "Unknown"}
SCENARIO DESCRIPTION: ${scenario?.description || ""}
MITRE TACTICS IN PLAY: ${(scenario?.mitre || []).join(", ")}
MODE: ${isAssessment ? "ASSESSMENT — limit hints, don't give away answers directly" : "TRAINING — guide the user step by step"}

ACTIVE ALERTS (${alerts.filter(a => a.status === "open").length} open):
${alertSummary}

TOTAL SIEM EVENTS: ${logCount}

ANALYST ACTIONS TAKEN SO FAR:
${actionsSummary || "None yet"}

YOUR ROLE:
- Act like a real SOC analyst mentor
- ${isAssessment ? "Give minimal guidance. Ask Socratic questions. Don't tell them exactly what to do." : "Guide step by step. Explain why actions matter. Be educational."}
- Map activity to MITRE ATT&CK when relevant
- Help draft tickets, notifications, and incident reports when asked
- Explain the business impact of threats
- Keep responses concise and actionable
- Use markdown formatting for readability`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const conversationHistory = messages
      .slice(-8)
      .map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
      .join("\n\n");

    const fullPrompt = `${buildSystemPrompt()}

CONVERSATION HISTORY:
${conversationHistory}

User: ${userMsg}

Respond as the SOC Analyst AI. Be helpful, precise, and appropriately directive based on the mode.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
      setMessages(prev => [...prev, { role: "assistant", content: typeof response === "string" ? response : response?.text || "I could not generate a response." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ AI connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "What should I do first?",
    "Explain the MITRE tactics",
    "What are the IOCs?",
    "Draft an incident ticket",
    "Is the threat contained?",
    "What's the business impact?",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Mode badge */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b border-border/20 ${mode === "assessment" ? "bg-orange-500/5" : "bg-primary/5"}`}>
        <Bot className={`h-4 w-4 ${mode === "assessment" ? "text-orange-400" : "text-primary"}`} />
        <span className="text-xs font-semibold">SOC Analyst AI</span>
        <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded border ${mode === "assessment" ? "text-orange-400 border-orange-500/30 bg-orange-500/10" : "text-primary border-primary/30 bg-primary/10"}`}>
          {mode === "assessment" ? "Assessment Mode" : "Training Mode"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border/30"}`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  className="prose prose-sm prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                    strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
                    code: ({ children }) => <code className="px-1 py-0.5 rounded bg-secondary/80 text-xs font-mono">{children}</code>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-lg bg-primary/30 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-secondary border border-border/30 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 pt-2 flex flex-wrap gap-1.5">
        {quickPrompts.map(p => (
          <button
            key={p}
            onClick={() => { setInput(p); }}
            className="text-[10px] px-2.5 py-1 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask the SOC analyst AI..."
          className="flex-1 bg-secondary border border-border/40 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-all"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}