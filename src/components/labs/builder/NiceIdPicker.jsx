import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";

function getItemDescription(item) {
  return item.description || item.name || "";
}

export default function NiceIdPicker({ label, dataset = [], items = [], onChange, placeholder }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resolved, setResolved] = useState({});
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Look up descriptions for IDs not in the reference dataset via LLM with web search
  useEffect(() => {
    const unknownIds = items.filter((id) => !dataset.find((d) => d.id === id) && !resolved[id]);
    if (unknownIds.length === 0) return;

    // Mark as pending immediately
    setResolved((prev) => {
      const next = { ...prev };
      for (const id of unknownIds) next[id] = "__pending__";
      return next;
    });

    // Build schema with explicit property names per ID
    const props = {};
    for (const id of unknownIds) props[id] = { type: "string" };

    base44.integrations.Core.InvokeLLM({
      prompt: `You are a NICE Cybersecurity Workforce Framework reference. For each ID below, search the web and return its official description text. If an ID is not a real NICE Framework ID, return "Description not available".

IDs to look up:
${unknownIds.join("\n")}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: props,
      },
    })
      .then((res) => {
        setResolved((prev) => ({ ...prev, ...res }));
      })
      .catch(() => {
        setResolved((prev) => {
          const next = { ...prev };
          for (const id of unknownIds) next[id] = "Description not available";
          return next;
        });
      });
  }, [items.join(",")]);

  const lookup = (id) => {
    const local = dataset.find((d) => d.id === id);
    if (local) return getItemDescription(local);
    const llmVal = resolved[id];
    if (llmVal && llmVal !== "__pending__") return llmVal;
    if (llmVal === "__pending__") return "Looking up description...";
    return "Looking up description...";
  };

  const suggestions = input.trim()
    ? dataset
        .filter(
          (item) =>
            item.id.toLowerCase().includes(input.toLowerCase()) ||
            getItemDescription(item).toLowerCase().includes(input.toLowerCase())
        )
        .filter((item) => !items.includes(item.id))
        .slice(0, 8)
    : [];

  const add = (id) => {
    if (id && !items.includes(id)) {
      onChange([...items, id]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  return (
    <div>
      <Label className="text-gray-300 mb-1.5 block text-sm">{label}</Label>
      <div className="relative" ref={ref}>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestions.length > 0) {
                    add(suggestions[0].id);
                  } else if (input.trim()) {
                    add(input.trim());
                  }
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder}
              className="bg-gray-800 border-gray-700 text-white text-sm pl-8"
            />
          </div>
          <Button
            onClick={() => {
              if (suggestions.length > 0) {
                add(suggestions[0].id);
              } else if (input.trim()) {
                add(input.trim());
              }
            }}
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white border-0 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => add(item.id)}
                className="flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-700/50 last:border-0"
              >
                <span className="text-xs font-mono text-amber-400 flex-shrink-0 mt-0.5">{item.id}</span>
                <span className="text-xs text-gray-300 line-clamp-2">{getItemDescription(item)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1.5 min-h-[28px]">
        {items.length === 0 ? (
          <p className="text-gray-600 text-xs italic">No items added yet</p>
        ) : (
          items.map((id, i) => (
            <div key={i} className="flex items-start gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-amber-400 flex-shrink-0 mt-0.5">{id}</span>
              <span className="text-xs text-gray-300 flex-1 leading-relaxed">{lookup(id)}</span>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-gray-600 hover:text-red-400 flex-shrink-0 mt-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}