import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Swords, Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const AI_PRESETS = [
  { id: "apt_intrusion", label: "APT Intrusion Campaign", description: "Your organization's threat intelligence feed just flagged a known nation-state actor targeting your industry. You have reason to believe a spear-phishing email landed in an executive's inbox three days ago — and no one noticed. The clock is ticking." },
  { id: "ransomware", label: "Ransomware Outbreak", description: "It's 3:12 AM and your on-call engineer is getting flooded with alerts. Workstations across the finance floor are going dark. A ransom note has appeared on the shared drive. Your company's data is being encrypted — right now." },
  { id: "web_app_attack", label: "Web Application Attack", description: "Your customer-facing web portal is under attack. An adversary has discovered a SQL injection vulnerability and is escalating privileges on your DMZ web server. Customer PII may already be at risk." },
  { id: "insider_threat", label: "Insider Threat", description: "A disgruntled employee in your IT department gave their two-week notice yesterday. Your DLP system just flagged an unusual after-hours transfer of 40GB of sensitive files to a personal cloud account. You have 72 hours before they walk out the door." },
  { id: "ddos_response", label: "DDoS + Intrusion Combo", description: "Your e-commerce platform is being hammered by a massive DDoS attack — but something feels off. While your team scrambles to restore service, a second adversary is quietly slipping through your perimeter using the chaos as cover." },
  { id: "ics_attack", label: "ICS / OT Attack", description: "Your facility's industrial control systems are behaving erratically. Sensors are reporting false readings and a safety interlock was remotely disabled 20 minutes ago. An adversary has crossed from your IT network into your operational technology environment." },
];

export default function StepScenarioSetup({ data, onChange, onGenerate, generating, onDocumentScanned }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [scanPhase, setScanPhase] = useState(""); // "extracting" | "generating" | ""

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document (.pdf, .doc, .docx)");
      return;
    }

    setScanning(true);
    setUploadedFileName(file.name);
    setScanPhase("extracting");

    try {
      // Step 1: Upload and extract raw document data
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Event or exercise title" },
            scenario_prompt: { type: "string", description: "Scenario description or background" },
            difficulty: { type: "string", description: "Difficulty level: Beginner, Intermediate, Advanced, or Expert" },
            duration_minutes: { type: "number", description: "Duration in minutes" },
            red_team_size: { type: "number", description: "Number of red team members" },
            blue_team_size: { type: "number", description: "Number of blue team members" },
            white_team_size: { type: "number", description: "Number of white team / controller members" },
          }
        }
      });

      if (result.status !== "success" || !result.output) {
        toast.error("Could not extract data from document. Please try a different file.");
        setScanning(false);
        setScanPhase("");
        return;
      }

      const extracted = result.output;
      const baseData = {
        title: extracted.title || data.title || "",
        scenario_prompt: extracted.scenario_prompt || data.scenario_prompt || "",
        difficulty: extracted.difficulty || data.difficulty || "Intermediate",
        duration_minutes: extracted.duration_minutes || data.duration_minutes || 120,
        red_team_size: extracted.red_team_size || data.red_team_size || 2,
        blue_team_size: extracted.blue_team_size || data.blue_team_size || 2,
        white_team_size: extracted.white_team_size || data.white_team_size || 1,
      };

      // Step 2: Use LLM to generate the full scenario + best network topology
      setScanPhase("generating");
      const fullScenario = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert Cyber Range exercise designer working to the standards of a multi-tenant Cyber Range platform (such as those defined in NATO NSPA Cyber Range Statement of Work requirements). A document has been uploaded with this exercise context:

Title: "${baseData.title}"
Description: "${baseData.scenario_prompt}"
Difficulty: ${baseData.difficulty}
Duration: ${baseData.duration_minutes} minutes
Red Team Size: ${baseData.red_team_size}
Blue Team Size: ${baseData.blue_team_size}
White Team (Exercise Controller) Size: ${baseData.white_team_size}

Generate a COMPLETE active defence Cyber Range exercise package suitable for deployment on a multi-tenant Cyber Range platform. Be specific, realistic, and operationally detailed.

Terminology to use:
- "Cyber Range exercise" or "live-fire exercise" (not just "exercise")
- "simulated network topology" or "simulated environment" (not just "network")
- "Blue Team" uses the NICE Cybersecurity Workforce Framework roles (SOC Analyst, Incident Responder, Threat Hunter, Forensics Analyst, SIEM Operator)
- "Red Team" uses MITRE ATT&CK Framework roles (Initial Access Operator, Lateral Movement Specialist, C2 Operator, Exfil Specialist, Exploit Developer)
- "White Team" acts as the Exercise Controller / Inject Operator / Scorekeeper / Adjudicator
- Objectives should reference attack scenario categories: ransomware, botnet C2, data exfiltration, spear-phishing, ICS/SCADA attacks, DDoS, brute-force, zero-day exploits, lateral movement, APT campaign techniques
- Directions should be actionable, referencing real Cyber Range tools (Metasploit, Nmap, Splunk, Wazuh, Zeek, Suricata, MISP, Arkime, Graylog, Cuckoo Sandbox)
- Rules of Engagement should reference what is and is not permitted within the simulated environment
- Scoring criteria should reference CTF-style flags, blue team detection tasks, and incident response objectives

For the simulated network topology: recommend the BEST Cyber Range network design for this specific scenario, including topology type, number of simulated sites, routing protocol, WAN technology, firewall vendor, whether DMZ/server farm/redundancy are needed, and number of VLANs.`,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            red_team_objectives: { type: "array", items: { type: "string" } },
            blue_team_objectives: { type: "array", items: { type: "string" } },
            white_team_objectives: { type: "array", items: { type: "string" } },
            red_team_directions: { type: "string" },
            blue_team_directions: { type: "string" },
            white_team_directions: { type: "string" },
            rules_of_engagement: { type: "string" },
            scoring_criteria: { type: "string" },
            topology_summary: { type: "string" },
            ingress_points: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  team: { type: "string" },
                  role: { type: "string" },
                  system: { type: "string" },
                  ip: { type: "string" },
                  credentials: { type: "string" },
                  description: { type: "string" },
                }
              }
            },
            recommended_network: {
              type: "object",
              properties: {
                topology_type: { type: "string" },
                routing_protocol: { type: "string" },
                wan_technology: { type: "string" },
                num_sites: { type: "number" },
                firewall_vendor: { type: "string" },
                dmz_required: { type: "boolean" },
                server_farm: { type: "boolean" },
                num_servers: { type: "number" },
                redundancy_enabled: { type: "boolean" },
                load_balancer: { type: "boolean" },
                num_vlans_per_site: { type: "number" },
                design_rationale: { type: "string" },
              }
            }
          }
        }
      });

      const fullPatch = {
        ...baseData,
        description: fullScenario.description || "",
        red_team_objectives: fullScenario.red_team_objectives || [],
        blue_team_objectives: fullScenario.blue_team_objectives || [],
        white_team_objectives: fullScenario.white_team_objectives || [],
        red_team_directions: fullScenario.red_team_directions || "",
        blue_team_directions: fullScenario.blue_team_directions || "",
        white_team_directions: fullScenario.white_team_directions || "",
        rules_of_engagement: fullScenario.rules_of_engagement || "",
        scoring_criteria: fullScenario.scoring_criteria || "",
        topology_summary: fullScenario.topology_summary || "",
        ingress_points: fullScenario.ingress_points || [],
        _recommended_network: fullScenario.recommended_network || null,
      };

      onChange(fullPatch);
      toast.success("Document scanned & full scenario generated! Advancing to review…");

      // Notify parent to advance to directions step (step 2)
      if (onDocumentScanned) onDocumentScanned(fullPatch);

    } catch (err) {
      toast.error("Scan failed. Please try again.");
    }
    setScanning(false);
    setScanPhase("");
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">{t("scenarioSetup.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("scenarioSetup.subtitle")}</p>
      </div>

      {/* Document Upload */}
      <div
        onClick={() => !scanning && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 flex items-center gap-4 cursor-pointer transition-all
          ${scanning ? "border-primary/40 bg-primary/5 cursor-wait" : "border-border hover:border-primary/50 hover:bg-secondary/50"}`}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          {scanning ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : uploadedFileName ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <Upload className="h-5 w-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          {scanning ? (
            <p className="text-sm font-semibold text-primary">
              {scanPhase === "extracting" ? "Extracting document data…" : "Generating full scenario & network design…"}
            </p>
          ) : uploadedFileName ? (
            <>
              <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {uploadedFileName}</p>
              <p className="text-xs text-muted-foreground">Fields auto-filled from document. Click to upload another.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Upload Scenario Document</p>
              <p className="text-xs text-muted-foreground">Upload a PDF or Word doc — fields will be auto-filled from its content.</p>
            </>
          )}
        </div>
      </div>

      {/* Custom prompt */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">{t("scenarioSetup.eventTitle")}</label>
        <input
          value={data.title || ""}
          onChange={e => onChange({ title: e.target.value })}
          placeholder={t("scenarioSetup.eventTitlePlaceholder")}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">{t("scenarioSetup.scenarioPrompt")}</label>
        <textarea
          value={data.scenario_prompt || ""}
          onChange={e => onChange({ scenario_prompt: e.target.value })}
          placeholder={t("scenarioSetup.scenarioPromptPlaceholder")}
          rows={4}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      {/* AI Presets */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> {t("scenarioSetup.aiPresets")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AI_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => {
                onChange({ title: p.label, scenario_prompt: p.description });
                onGenerate({ title: p.label, scenario_prompt: p.description });
              }}
              className={`text-left rounded-lg border px-4 py-3 text-xs transition-all hover:border-primary/50
                ${data.title === p.label ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              <p className="font-semibold text-sm mb-0.5">{p.label}</p>
              <p className="opacity-75 leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Config */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "difficulty", label: t("scenarioSetup.difficulty"), options: ["Beginner","Intermediate","Advanced","Expert"] },
          { key: "duration_minutes", label: t("scenarioSetup.duration"), options: [60,90,120,180,240,480] },
          { key: "red_team_size", label: t("scenarioSetup.redTeamSize"), options: [1,2,3,4,5,6] },
          { key: "blue_team_size", label: t("scenarioSetup.blueTeamSize"), options: [1,2,3,4,5,6] },
        ].map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-xs text-muted-foreground">{f.label}</label>
            <select
              value={data[f.key] || f.options[0]}
              onChange={e => onChange({ [f.key]: isNaN(e.target.value) ? e.target.value : Number(e.target.value) })}
              className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <Button
        onClick={onGenerate}
        disabled={generating || !data.scenario_prompt?.trim()}
        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
        {generating ? t("scenarioSetup.generating") : t("scenarioSetup.generate")}
      </Button>
    </div>
  );
}