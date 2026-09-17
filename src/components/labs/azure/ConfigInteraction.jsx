import React, { useState } from "react";
import { CheckCircle2, XCircle, Settings2, ChevronDown, ChevronRight } from "lucide-react";

const AZURE = "#0078D4";
const AZURE_DARK = "#005A9E";
const AZURE_LIGHT = "#50A0E0";

export default function ConfigInteraction({ interaction, onComplete }) {
  const [values, setValues] = useState({});
  const [validated, setValidated] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  if (!interaction) return null;

  const sections = interaction.sections || [{ title: interaction.title || "Configuration", fields: interaction.fields || [] }];
  const fields = sections.flatMap(s => s.fields || []);

  const setField = (id, value) => {
    setValues(prev => ({ ...prev, [id]: value }));
    setValidated(false);
  };

  const toggleSection = (idx) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const validateField = (field) => {
    const val = values[field.id];
    if (field.type === "toggle") {
      return val === field.expected;
    }
    if (field.type === "multiselect") {
      const selected = Array.isArray(val) ? val : [];
      const expected = field.expected || [];
      if (selected.length !== expected.length) return false;
      return expected.every(e => selected.includes(e));
    }
    if (field.type === "number") {
      return Number(val) === Number(field.expected);
    }
    // text, select
    if (field.expectedRegex) {
      return new RegExp(field.expectedRegex).test(val || "");
    }
    return (val || "").toString().toLowerCase() === (field.expected || "").toString().toLowerCase();
  };

  const allCorrect = fields.every(validateField);

  const handleValidate = () => {
    setValidated(true);
    if (allCorrect && onComplete) {
      onComplete();
    }
  };

  const renderField = (field) => {
    const val = values[field.id];
    const isCorrect = validated && validateField(field);
    const isWrong = validated && !validateField(field);

    const fieldLabelClass = `text-[11px] font-mono font-semibold mb-1 ${isCorrect ? "text-green-400" : isWrong ? "text-red-400" : "text-gray-300"}`;

    return (
      <div key={field.id} className="flex flex-col">
        <label className={fieldLabelClass}>
          {field.label}
          {field.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {field.hint && <span className="text-[10px] text-gray-500 font-mono mb-1.5">{field.hint}</span>}

        {field.type === "text" && (
          <input
            type="text"
            value={val || ""}
            onChange={e => setField(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            className="bg-gray-950 border rounded-lg px-3 py-2 text-xs font-mono text-white outline-none transition-colors"
            style={{ borderColor: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : "#374151" }}
          />
        )}

        {field.type === "number" && (
          <input
            type="number"
            value={val ?? ""}
            onChange={e => setField(field.id, e.target.value)}
            placeholder={field.placeholder || ""}
            className="bg-gray-950 border rounded-lg px-3 py-2 text-xs font-mono text-white outline-none transition-colors"
            style={{ borderColor: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : "#374151" }}
          />
        )}

        {field.type === "select" && (
          <div className="relative">
            <select
              value={val || ""}
              onChange={e => setField(field.id, e.target.value)}
              className="w-full appearance-none bg-gray-950 border rounded-lg px-3 py-2 text-xs font-mono text-white outline-none transition-colors pr-8"
              style={{ borderColor: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : "#374151", color: val ? "#fff" : "#6b7280" }}
            >
              <option value="" disabled>Select...</option>
              {field.options.map(opt => (
                <option key={opt} value={opt} className="bg-gray-900">{opt}</option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {field.type === "toggle" && (
          <button
            onClick={() => setField(field.id, !val)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all w-fit"
            style={{
              borderColor: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : "#374151",
              backgroundColor: val ? AZURE_DARK : "#1a1a1a",
            }}
          >
            <span
              className="h-4 w-7 rounded-full relative transition-colors"
              style={{ backgroundColor: val ? "#fff" : "#374151" }}
            >
              <span
                className="absolute top-0.5 h-3 w-3 rounded-full transition-all"
                style={{ left: val ? "14px" : "2px", backgroundColor: val ? AZURE : "#9ca3af" }}
              />
            </span>
            <span className="text-[11px] font-mono font-semibold" style={{ color: val ? "#fff" : "#9ca3af" }}>
              {val ? "Enabled" : "Disabled"}
            </span>
          </button>
        )}

        {field.type === "multiselect" && (
          <div className="flex flex-wrap gap-1.5">
            {field.options.map(opt => {
              const selected = Array.isArray(val) && val.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    const cur = Array.isArray(val) ? val : [];
                    setField(field.id, selected ? cur.filter(v => v !== opt) : [...cur, opt]);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-all"
                  style={{
                    borderColor: selected ? AZURE : "#374151",
                    backgroundColor: selected ? AZURE_DARK : "#1a1a1a",
                    color: selected ? "#fff" : "#9ca3af",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {isCorrect && (
          <div className="flex items-center gap-1 mt-1">
            <CheckCircle2 className="h-3 w-3 text-green-400" />
            <span className="text-[10px] font-mono text-green-400">{field.correctFeedback || "Correct"}</span>
          </div>
        )}
        {isWrong && (
          <div className="flex items-center gap-1 mt-1">
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-[10px] font-mono text-red-400">{field.wrongFeedback || "Not quite — check the hint and try again"}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <Settings2 className="h-4 w-4" style={{ color: AZURE }} />
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: AZURE }}>
          {interaction.title || "Configuration Simulation"}
        </span>
      </div>

      {interaction.description && (
        <p className="text-xs text-gray-400 leading-relaxed font-mono">{interaction.description}</p>
      )}

      {/* Azure-style config panel */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1a3a5c", backgroundColor: "#0a1620" }}>
        {/* Azure portal-like top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ backgroundColor: "#0d1d2e", borderColor: "#1a3a5c" }}>
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: AZURE }} />
          <span className="text-[11px] font-mono font-semibold text-white">Azure Configuration</span>
          <span className="text-[10px] text-gray-500 font-mono ml-auto">{fields.length} settings</span>
        </div>

        {/* Sections */}
        <div className="flex flex-col">
          {sections.map((section, sIdx) => {
            const sectionFields = section.fields || [];
            const expanded = expandedSections[sIdx] !== false; // default expanded
            return (
              <div key={sIdx} className="border-b last:border-b-0" style={{ borderColor: "#15293d" }}>
                <button
                  onClick={() => toggleSection(sIdx)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-blue-950/30 transition-colors"
                >
                  {expanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                  <span className="text-[11px] font-mono font-bold text-gray-200">{section.title}</span>
                  <span className="text-[10px] text-gray-600 font-mono ml-auto">{sectionFields.length} fields</span>
                </button>
                {expanded && (
                  <div className="px-4 pb-4 flex flex-col gap-3">
                    {sectionFields.map(renderField)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Validate button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleValidate}
          disabled={fields.length === 0}
          className="px-5 py-2 rounded-lg text-white text-xs font-mono font-bold transition-colors disabled:opacity-40"
          style={{ backgroundColor: AZURE }}
        >
          Validate Configuration
        </button>
        {validated && allCorrect && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-xs font-mono text-green-400 font-semibold">{interaction.feedback || "Configuration validated successfully!"}</span>
          </div>
        )}
        {validated && !allCorrect && (
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-mono text-red-400 font-semibold">Some settings are incorrect — review and re-validate</span>
          </div>
        )}
      </div>
    </div>
  );
}