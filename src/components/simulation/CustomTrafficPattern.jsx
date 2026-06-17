import React, { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

const PATTERN_TEMPLATES = [
  { id: "steady_low", label: "Steady (Low)", baseline: 20, variance: 5 },
  { id: "steady_high", label: "Steady (High)", baseline: 80, variance: 5 },
  { id: "business_hours", label: "Business Hours Peak", baseline: 30, peakTime: 0.5, peakValue: 85 },
  { id: "night_batch", label: "Night Batch", baseline: 40, peakTime: 0.75, peakValue: 95 },
  { id: "gradual_ramp", label: "Gradual Ramp-up", baseline: 10, rampEnd: 90 },
  { id: "random_burst", label: "Random Bursts", baseline: 25, burstProbability: 0.3, burstSize: 60 },
];

function generateTrafficCurve(template, points = 24) {
  const data = [];
  for (let i = 0; i < points; i++) {
    const x = i / points;
    let y = template.baseline;

    if (template.peakTime !== undefined) {
      const peakDist = Math.abs(x - template.peakTime);
      if (peakDist < 0.2) {
        y = template.baseline + (template.peakValue - template.baseline) * Math.cos(peakDist * Math.PI);
      }
    }

    if (template.rampEnd !== undefined) {
      y = template.baseline + (template.rampEnd - template.baseline) * Math.min(x / 0.8, 1);
    }

    if (template.burstProbability !== undefined) {
      if (Math.random() < template.burstProbability) {
        y += template.burstSize * Math.random();
      }
    }

    y += (Math.random() - 0.5) * template.variance;
    data.push({ x: i, y: Math.max(0, Math.min(100, y)) });
  }
  return data;
}

export default function CustomTrafficPattern({ patterns = [], onAdd, onRemove }) {
  const [selectedTemplate, setSelectedTemplate] = useState("steady_low");
  const [customName, setCustomName] = useState("");
  const [previewData, setPreviewData] = useState([]);

  const handleTemplateChange = (id) => {
    setSelectedTemplate(id);
    const template = PATTERN_TEMPLATES.find(p => p.id === id);
    setPreviewData(generateTrafficCurve(template));
  };

  const handleAdd = () => {
    if (!customName.trim()) return;
    const template = PATTERN_TEMPLATES.find(p => p.id === selectedTemplate);
    const curveData = generateTrafficCurve(template);

    onAdd({
      id: Date.now(),
      name: customName.trim(),
      templateId: selectedTemplate,
      templateLabel: template.label,
      curveData,
    });

    setCustomName("");
    setSelectedTemplate("steady_low");
  };

  React.useEffect(() => {
    const template = PATTERN_TEMPLATES.find(p => p.id === selectedTemplate);
    setPreviewData(generateTrafficCurve(template));
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
          Template
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {PATTERN_TEMPLATES.map(pt => (
            <option key={pt.id} value={pt.id}>{pt.label}</option>
          ))}
        </select>
      </div>

      {previewData.length > 0 && (
        <div className="bg-secondary rounded-lg border border-border p-2">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Preview</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={previewData}>
              <XAxis dataKey="x" hide />
              <YAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Line
                type="monotone"
                dataKey="y"
                stroke="hsl(199 89% 48%)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="e.g. Morning Surge"
          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <Button
          onClick={handleAdd}
          disabled={!customName.trim()}
          className="gap-2 text-xs h-8 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Save
        </Button>
      </div>

      {patterns.length > 0 && (
        <div className="space-y-1.5">
          {patterns.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs bg-primary/10 border border-primary/30"
            >
              <div>
                <div className="font-medium text-primary">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.templateLabel}</div>
              </div>
              <button
                onClick={() => onRemove(p.id)}
                className="text-primary hover:opacity-70 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}