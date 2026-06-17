import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function LabAIBot({ labTitle, currentStepLabel }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me to explain any term, command, or concept from this lab." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a cybersecurity lab assistant helping a student in the "${labTitle}" lab. 
They are currently on step: "${currentStepLabel}".
Answer the following question clearly and concisely in 2-4 sentences, focused on practical security relevance:

"${q}"`,
      });
      setMessages(prev => [...prev, { role: "assistant", text: res.result || res }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't fetch an answer. Please try again." }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="border-t border-gray-800 mt-auto shrink-0">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-red-900/60 border border-red-600/50 flex items-center justify-center">
            <Bot className="h-3 w-3 text-red-400" />
          </div>
          <span className="text-[11px] font-mono text-gray-300 font-semibold">AI Assistant</span>
        </div>
        {open ? <ChevronDown className="h-3 w-3 text-gray-500" /> : <ChevronUp className="h-3 w-3 text-gray-500" />}
      </button>

      {open && (
        <div className="flex flex-col" style={{ height: "260px" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`text-[11px] font-mono leading-relaxed rounded-lg px-2.5 py-2 ${
                m.role === "user"
                  ? "bg-red-900/30 border border-red-800/40 text-red-200 ml-2"
                  : "bg-gray-800/60 border border-gray-700/40 text-gray-300"
              }`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-2.5 py-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
                <span className="text-[11px] font-mono text-gray-400">Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 shrink-0">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about a term..."
                className="flex-1 bg-transparent text-[11px] font-mono text-gray-300 outline-none placeholder-gray-600"
              />
              <button onClick={send} disabled={loading || !input.trim()} className="text-red-400 hover:text-red-300 disabled:opacity-30 transition-colors">
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}