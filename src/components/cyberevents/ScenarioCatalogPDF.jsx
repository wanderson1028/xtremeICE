import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const DIFFICULTY_ORDER = ["Beginner", "Intermediate", "Advanced", "Expert"];

const DIFFICULTY_COLORS = {
  Beginner:     [34, 197, 94],
  Intermediate: [234, 179, 8],
  Advanced:     [249, 115, 22],
  Expert:       [239, 68, 68],
};

const STATUS_COLORS = {
  published: [34, 197, 94],
  draft:     [148, 163, 184],
  archived:  [107, 114, 128],
};

const RED_ROLES =   ["Penetration Tester", "Exploit Developer", "Social Engineer", "C2 Operator", "OSINT Specialist", "Malware Analyst"];
const BLUE_ROLES =  ["SOC Analyst", "Incident Responder", "Threat Hunter", "Forensics Analyst", "Security Engineer", "SIEM Operator"];
const WHITE_ROLES = ["Exercise Director", "Scenario Adjudicator", "Inject Operator", "Scorekeeper", "Observer"];

function getRoles(roles, size) {
  return roles.slice(0, Math.max(1, Math.min(size || 2, roles.length)));
}

function formatDuration(mins) {
  if (!mins) return "TBD";
  const m = Number(mins);
  if (m < 60) return `${m} min`;
  const days = Math.floor(m / 1440);
  const rem = m % 1440;
  const hours = Math.floor(rem / 60);
  if (days >= 1) {
    const dayLabel = `${days} day${days !== 1 ? "s" : ""}`;
    return hours > 0 ? `${dayLabel} ${hours}h (${m.toLocaleString()} min)` : `${dayLabel} (${m.toLocaleString()} min)`;
  }
  return `${Math.floor(m / 60)}h (${m} min)`;
}

function wrapText(pdf, text, x, y, maxWidth, lineHeight) {
  const lines = pdf.splitTextToSize(String(text || ""), maxWidth);
  lines.forEach(line => { pdf.text(line, x, y); y += lineHeight; });
  return y;
}

function safe(str) {
  return String(str || "").replace(/[^\x00-\x7F]/g, "").trim();
}

function darkPage(pdf, pageW, pageH) {
  pdf.setFillColor(10, 14, 26);
  pdf.rect(0, 0, pageW, pageH, "F");
}

function newPageBase(pdf, pageW, pageH, accentColor) {
  pdf.addPage();
  darkPage(pdf, pageW, pageH);
  pdf.setFillColor(...accentColor);
  pdf.rect(0, 0, pageW, 6, "F");
}

function checkPage(pdf, pageW, pageH, y, needed, diffColor, contLabel) {
  if (y + needed > pageH - 40) {
    newPageBase(pdf, pageW, pageH, diffColor);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(safe(contLabel) + " - continued", 50, 28);
    return 46;
  }
  return y;
}

async function loadImageBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Draw logo on a light frosted panel so it's visible on dark background
function drawLogo(pdf, logoData, x, y, w, h) {
  if (!logoData) return;
  try {
    // White frosted backing
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x - 6, y - 4, w + 12, h + 8, 6, 6, "F");
    pdf.addImage(logoData, "PNG", x, y, w, h);
  } catch { }
}

// Generate expanded overview + team learning objectives for a scenario via LLM
async function enrichScenario(ev) {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional Cyber Range exercise designer writing content for a printed Cyber Range Scenario Catalog, consistent with multi-tenant Cyber Range platform standards (NATO/NSPA Cyber Range SOW terminology).

Scenario title: "${ev.title}"
Brief description: "${ev.description || ev.scenario_prompt || ""}"
Difficulty: ${ev.difficulty}
Duration: ${formatDuration(ev.duration_minutes)}
Red Team size: ${ev.red_team_size}, Blue Team size: ${ev.blue_team_size}

1. Write an EXPANDED SCENARIO OVERVIEW (4-6 sentences, immersive and operationally realistic, written in second-person present tense, placing participants inside the simulated Cyber Range environment with urgency and operational context). Reference the simulated network environment, the threat actor TTPs (Tactics, Techniques and Procedures), and what is at stake for the defending organisation. Use plain ASCII text only — no special characters, no Unicode, no emoji. Use Cyber Range terminology: "simulated environment", "live-fire exercise", "active defence", "threat actor", "APT", "MITRE ATT&CK", "NICE Framework", "incident response", "SIEM", "SOC".

2. Write LEARNING OBJECTIVES for each team — what skills, knowledge, and competencies participants will gain AFTER completing this Cyber Range exercise (not what they will DO during it). Each objective should start with an action verb: "Understand", "Demonstrate", "Apply", "Develop", "Analyse", "Practice". 3 objectives per team. Reference MITRE ATT&CK for Red Team gains and NICE Cybersecurity Workforce Framework competencies for Blue Team gains. Plain ASCII only.

Return ONLY valid JSON matching this schema exactly.`,
      response_json_schema: {
        type: "object",
        properties: {
          expanded_overview: { type: "string" },
          red_learning: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
          blue_learning: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
          white_learning: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
        },
      },
    });
    return result;
  } catch {
    return null;
  }
}

// Generate a scenario image — caches the URL in the entity to avoid re-generating
async function getOrGenerateScenarioImage(ev) {
  try {
    // If we already have a cached image URL, just load it
    if (ev.export_bundle) {
      try {
        const cached = JSON.parse(ev.export_bundle);
        if (cached.cover_image_url) {
          return await loadImageBase64(cached.cover_image_url);
        }
      } catch { }
    }

    // Generate a new image
    const keywords = safe(ev.title).replace(/Operation\s+\w+\s*—?\s*/i, "").slice(0, 60);
    const diffStyle = {
      Beginner: "clean, educational, soft blue tones",
      Intermediate: "tactical, professional, amber and steel tones",
      Advanced: "intense, dramatic, deep orange and shadow tones",
      Expert: "cinematic, dark and ominous, red and black tones",
    }[ev.difficulty] || "professional cybersecurity";

    const prompt = `Cybersecurity concept illustration for a training exercise titled "${keywords}". ${diffStyle}. Dark background with glowing network lines, digital code streams, abstract server infrastructure. No text, no people's faces, no logos. Professional infosec aesthetic, 16:9 widescreen composition.`;

    const result = await base44.integrations.Core.GenerateImage({ prompt });
    if (result?.url) {
      // Persist the URL into export_bundle so future exports skip generation
      try {
        const existing = ev.export_bundle ? JSON.parse(ev.export_bundle) : {};
        await base44.entities.CyberEvent.update(ev.id, {
          export_bundle: JSON.stringify({ ...existing, cover_image_url: result.url }),
        });
      } catch { }
      return await loadImageBase64(result.url);
    }
  } catch { }
  return null;
}

export default function ScenarioCatalogPDF({ events }) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  const generate = async () => {
    if (!events || events.length === 0) {
      toast.error("No scenarios to export.");
      return;
    }
    setGenerating(true);
    setProgress("Loading assets...");

    // Group by difficulty first
    const grouped = {};
    DIFFICULTY_ORDER.forEach(d => { grouped[d] = []; });
    [...events]
      .sort((a, b) => (DIFFICULTY_ORDER.indexOf(a.difficulty) || 99) - (DIFFICULTY_ORDER.indexOf(b.difficulty) || 99))
      .forEach(ev => {
        const d = ev.difficulty || "Other";
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(ev);
      });

    // Load logo + all network designs in parallel
    const designMap = {};
    const designIds = [...new Set(events.map(e => e.network_design_id).filter(Boolean))];

    setProgress("Loading logo & designs...");
    const [logoData] = await Promise.all([
      loadImageBase64("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0a5a90473fac0aa3ea135/6a3fbf99a_XtremeICED52aR00aP01ZL-Hoover.png"),
      ...designIds.map(async id => {
        const r = await base44.entities.NetworkDesign.filter({ id });
        if (r?.[0]) designMap[id] = r[0];
      }),
    ]);

    // Enrich each scenario: LLM expanded overview + learning objectives + AI image
    // Process in batches of 4 to avoid rate limits
    const allScenarios = DIFFICULTY_ORDER.flatMap(d => grouped[d] || []);
    const enriched = {};
    const scenarioImages = {};

    const BATCH = 3;
    for (let i = 0; i < allScenarios.length; i += BATCH) {
      const batch = allScenarios.slice(i, i + BATCH);
      const hasCached = batch.every(ev => { try { return !!JSON.parse(ev.export_bundle || "{}").cover_image_url; } catch { return false; } });
      setProgress(`${hasCached ? "Loading" : "Generating"} content ${i + 1}–${Math.min(i + BATCH, allScenarios.length)} of ${allScenarios.length}...`);
      await Promise.all(batch.map(async ev => {
        const [enrichData, imgData] = await Promise.all([
          enrichScenario(ev),
          getOrGenerateScenarioImage(ev),
        ]);
        if (enrichData) enriched[ev.id || ev.title] = enrichData;
        if (imgData) scenarioImages[ev.id || ev.title] = imgData;
      }));
    }

    setProgress("Building PDF...");

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 50;
    const contentW = pageW - margin * 2;
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // ── COVER PAGE ─────────────────────────────────────────────────────────────
    darkPage(pdf, pageW, pageH);

    // Full-bleed accent stripe at top (thick)
    pdf.setFillColor(14, 165, 233);
    pdf.rect(0, 0, pageW, 5, "F");

    // Subtle diagonal grid texture (dot pattern rows)
    pdf.setFillColor(255, 255, 255);
    for (let gx = 0; gx < pageW; gx += 18) {
      for (let gy = 0; gy < pageH; gy += 18) {
        pdf.setFillColor(14, 165, 233);
        pdf.circle(gx, gy, 0.5, "F");
      }
    }

    // Left sidebar accent bar
    pdf.setFillColor(14, 165, 233);
    pdf.rect(0, 0, 6, pageH, "F");

    // ── Hero section: upper half solid dark panel ──
    pdf.setFillColor(10, 14, 26);
    pdf.rect(0, 0, pageW, pageH * 0.52, "F");
    // re-draw left bar on top
    pdf.setFillColor(14, 165, 233);
    pdf.rect(0, 0, 6, pageH * 0.52, "F");
    // top stripe on top of panel
    pdf.setFillColor(14, 165, 233);
    pdf.rect(0, 0, pageW, 5, "F");

    // Logo — white frosted panel, upper left hero area
    drawLogo(pdf, logoData, 34, 30, 140, 50);

    // Vertical divider line in hero
    pdf.setDrawColor(14, 165, 233);
    pdf.setLineWidth(0.5);
    pdf.line(34, 100, pageW - 34, 100);

    // MAIN TITLE block
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(42);
    pdf.setTextColor(220, 38, 38);
    pdf.text("CYBER EXERCISE", 34, 148);


    pdf.setFontSize(42);
    pdf.setTextColor(220, 38, 38);
    pdf.text("LIVE-FIRE CATALOG", 34, 194);

    // Subtitle rule line
    pdf.setFillColor(220, 38, 38);
    pdf.rect(34, 208, 60, 3, "F");

    // Tagline
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(148, 163, 184);
    pdf.text("Red Team vs. Blue Team  |  Adversarial Simulation Exercises", 34, 230);

    // ── Lower half: split Red / Blue ──
    // Red left panel
    pdf.setFillColor(127, 17, 17);
    pdf.rect(6, pageH * 0.52, pageW / 2 - 6, pageH * 0.34, "F");
    // Blue right panel
    pdf.setFillColor(20, 44, 110);
    pdf.rect(pageW / 2, pageH * 0.52, pageW / 2, pageH * 0.34, "F");

    // Thin accent lines above each panel
    pdf.setFillColor(220, 38, 38);
    pdf.rect(6, pageH * 0.52, pageW / 2 - 6, 3, "F");
    pdf.setFillColor(37, 99, 235);
    pdf.rect(pageW / 2, pageH * 0.52, pageW / 2, 3, "F");

    // RED TEAM label + icon area
    const panelMidY = pageH * 0.52 + (pageH * 0.34) / 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(220, 38, 38);
    pdf.text("RED TEAM", pageW / 4, pageH * 0.52 + 22, { align: "center" });
    pdf.setFontSize(26);
    pdf.setTextColor(255, 255, 255);
    pdf.text("OFFENSE", pageW / 4, panelMidY, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(220, 38, 38);
    pdf.text("MITRE ATT&CK Framework", pageW / 4, panelMidY + 18, { align: "center" });
    pdf.setTextColor(200, 150, 150);
    pdf.setFontSize(7.5);
    pdf.text("Adversary Simulation  |  Exploitation  |  Persistence", pageW / 4, panelMidY + 32, { align: "center" });

    // BLUE TEAM label + icon area
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(96, 165, 250);
    pdf.text("BLUE TEAM", (3 * pageW) / 4, pageH * 0.52 + 22, { align: "center" });
    pdf.setFontSize(26);
    pdf.setTextColor(255, 255, 255);
    pdf.text("DEFENSE", (3 * pageW) / 4, panelMidY, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(96, 165, 250);
    pdf.text("NICE Cybersecurity Framework", (3 * pageW) / 4, panelMidY + 18, { align: "center" });
    pdf.setTextColor(150, 180, 220);
    pdf.setFontSize(7.5);
    pdf.text("Detection  |  Response  |  Recovery", (3 * pageW) / 4, panelMidY + 32, { align: "center" });

    // Center VS badge
    pdf.setFillColor(10, 14, 26);
    pdf.circle(pageW / 2, panelMidY - 4, 22, "F");
    pdf.setDrawColor(14, 165, 233);
    pdf.setLineWidth(1.5);
    pdf.circle(pageW / 2, panelMidY - 4, 22, "S");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(14, 165, 233);
    pdf.text("VS", pageW / 2, panelMidY + 1, { align: "center" });

    // ── Footer meta strip ──
    const footerY = pageH * 0.52 + pageH * 0.34;
    pdf.setFillColor(6, 10, 20);
    pdf.rect(6, footerY, pageW - 6, pageH - footerY, "F");

    // Stats row
    const published = events.filter(e => e.status === "published").length;
    const diffLevels = DIFFICULTY_ORDER.filter(d => (grouped[d] || []).length > 0);

    const stats = [
      { label: "TOTAL SCENARIOS", value: String(events.length) },
      { label: "PUBLISHED", value: String(published) },
      { label: "DIFFICULTY LEVELS", value: diffLevels.join("  /  ") },
      { label: "GENERATED", value: today },
    ];

    const statW = (pageW - 40) / stats.length;
    stats.forEach((s, si) => {
      const sx = 20 + si * statW;
      const sy = footerY + 22;
      if (si > 0) {
        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(0.5);
        pdf.line(sx, footerY + 10, sx, footerY + 48);
      }
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(s.label, sx + statW / 2 - (si > 0 ? 5 : 0), sy, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(226, 232, 240);
      pdf.text(s.value, sx + statW / 2 - (si > 0 ? 5 : 0), sy + 16, { align: "center" });
    });

    // Bottom accent bar
    pdf.setFillColor(14, 165, 233);
    pdf.rect(0, pageH - 5, pageW, 5, "F");

    // ── TABLE OF CONTENTS — grouped by difficulty ─────────────────────────────
    pdf.addPage();
    darkPage(pdf, pageW, pageH);
    pdf.setFillColor(14, 165, 233);
    pdf.rect(0, 0, pageW, 6, "F");

    // Logo top-right on frosted panel
    drawLogo(pdf, logoData, pageW - margin - 96, 10, 90, 32);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Table of Live-Fire Exercises", margin, 58);
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(1);
    pdf.line(margin, 68, pageW - margin, 68);

    let tocY = 86;
    let globalIdx = 0;

    for (const diff of DIFFICULTY_ORDER) {
      const group = grouped[diff] || [];
      if (!group.length) continue;

      if (tocY > pageH - 100) {
        pdf.addPage();
        darkPage(pdf, pageW, pageH);
        pdf.setFillColor(14, 165, 233);
        pdf.rect(0, 0, pageW, 6, "F");
        tocY = 40;
      }

      const diffColor = DIFFICULTY_COLORS[diff] || [148, 163, 184];
      pdf.setFillColor(20, 30, 52);
      pdf.rect(margin - 8, tocY, contentW + 16, 22, "F");
      pdf.setFillColor(...diffColor);
      pdf.rect(margin - 8, tocY, 5, 22, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...diffColor);
      pdf.text(diff.toUpperCase(), margin + 8, tocY + 14);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`${group.length} exercise${group.length !== 1 ? "s" : ""}`, pageW - margin - 8, tocY + 14, { align: "right" });

      tocY += 32;

      group.forEach(ev => {
        globalIdx++;
        if (tocY > pageH - 60) {
          pdf.addPage();
          darkPage(pdf, pageW, pageH);
          pdf.setFillColor(14, 165, 233);
          pdf.rect(0, 0, pageW, 6, "F");
          tocY = 40;
        }

        const statusColor = STATUS_COLORS[ev.status] || [148, 163, 184];

        if (globalIdx % 2 === 0) {
          pdf.setFillColor(15, 23, 42);
          pdf.rect(margin - 8, tocY - 12, contentW + 16, 24, "F");
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...diffColor);
        pdf.text(String(globalIdx).padStart(2, "0"), margin, tocY);

        pdf.setTextColor(226, 232, 240);
        const titleStr = safe(ev.title) || "Untitled";
        pdf.text(titleStr, margin + 22, tocY);

        const durStr = formatDuration(ev.duration_minutes);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(durStr, pageW - margin - 18, tocY, { align: "right" });

        pdf.setFillColor(...statusColor);
        pdf.circle(pageW - margin - 5, tocY - 3, 3.5, "F");

        const titleEndX = margin + 22 + pdf.getTextWidth(titleStr) + 6;
        const durStartX = pageW - margin - 18 - pdf.getTextWidth(durStr) - 10;
        if (titleEndX < durStartX - 6) {
          pdf.setDrawColor(30, 41, 59);
          pdf.setLineWidth(0.4);
          pdf.line(titleEndX, tocY - 2, durStartX, tocY - 2);
        }

        tocY += 26;
      });

      tocY += 10;
    }

    // ── SCENARIO PAGES ─────────────────────────────────────────────────────────
    let scenarioNumber = 0;
    for (const diff of DIFFICULTY_ORDER) {
      const group = grouped[diff] || [];
      for (const ev of group) {
        scenarioNumber++;
        const design = ev.network_design_id ? designMap[ev.network_design_id] : null;
        const diffColor = DIFFICULTY_COLORS[ev.difficulty] || [148, 163, 184];
        const statusColor = STATUS_COLORS[ev.status] || [148, 163, 184];
        const evKey = ev.id || ev.title;
        const extra = enriched[evKey] || null;
        const scenarioImg = scenarioImages[evKey] || null;

        pdf.addPage();
        darkPage(pdf, pageW, pageH);
        pdf.setFillColor(...diffColor);
        pdf.rect(0, 0, pageW, 6, "F");

        // Logo top-right frosted panel
        drawLogo(pdf, logoData, pageW - margin - 78, 10, 72, 26);

        // Number chip + difficulty badge
        pdf.setFillColor(...diffColor);
        pdf.roundedRect(margin, 18, 34, 20, 4, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(scenarioNumber).padStart(2, "0"), margin + 17, 32, { align: "center" });

        pdf.setFillColor(20, 30, 52);
        pdf.roundedRect(margin + 40, 18, 72, 20, 4, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(...diffColor);
        pdf.text(safe(ev.difficulty).toUpperCase(), margin + 76, 31, { align: "center" });

        // Title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.setTextColor(255, 255, 255);
        const titleLines = pdf.splitTextToSize(safe(ev.title) || "Untitled Scenario", contentW - 90);
        pdf.text(titleLines, margin, 56);

        let y = 64 + (titleLines.length - 1) * 20;

        // ── AI Scenario Graphic ───────────────────────────────────────────────
        if (scenarioImg) {
          try {
            const imgH = 110;
            const imgW = contentW;
            pdf.addImage(scenarioImg, "JPEG", margin, y, imgW, imgH);
            y += imgH + 8;
          } catch { y += 4; }
        }

        // ── Metadata cards ────────────────────────────────────────────────────
        const durLabel = formatDuration(ev.duration_minutes);
        const metaItems = [
          { label: "DIFFICULTY", value: safe(ev.difficulty) || "—",                        color: diffColor },
          { label: "DURATION",   value: durLabel,                                            color: [148, 163, 184] },
          { label: "STATUS",     value: safe((ev.status || "draft").toUpperCase()),           color: statusColor },
          { label: "RED TEAM",   value: `${ev.red_team_size || "?"} operators`,              color: [239, 68, 68] },
          { label: "BLUE TEAM",  value: `${ev.blue_team_size || "?"} defenders`,             color: [37, 99, 235] },
          { label: "WHITE TEAM", value: `${ev.white_team_size || "?"} controllers`,          color: [148, 163, 184] },
        ];

        const metaBoxW = contentW / 3;
        const metaBoxH = 38;
        const metaStartY = y + 6;

        metaItems.forEach((m, mi) => {
          const col = mi % 3;
          const row = Math.floor(mi / 3);
          const bx = margin + col * metaBoxW;
          const by = metaStartY + row * (metaBoxH + 4);
          pdf.setFillColor(15, 23, 42);
          pdf.roundedRect(bx, by, metaBoxW - 8, metaBoxH, 4, 4, "F");
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.5);
          pdf.setTextColor(148, 163, 184);
          pdf.text(m.label, bx + 8, by + 11);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(...m.color);
          pdf.text(m.value, bx + 8, by + 25);
        });

        y = metaStartY + 2 * (metaBoxH + 4) + 10;

        // ── PARTICIPANT ROLES ─────────────────────────────────────────────────
        y = checkPage(pdf, pageW, pageH, y, 80, diffColor, ev.title);
        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(1);
        pdf.line(margin, y, pageW - margin, y);
        y += 12;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(14, 165, 233);
        pdf.text("EXERCISE PARTICIPANT ROLES", margin, y);
        y += 12;

        const roleColW = contentW / 3;
        const roleStartY = y;
        const teamDefs = [
          { label: "RED TEAM",   color: [239, 68, 68],   roles: getRoles(RED_ROLES,   ev.red_team_size),   size: ev.red_team_size },
          { label: "BLUE TEAM",  color: [37, 99, 235],   roles: getRoles(BLUE_ROLES,  ev.blue_team_size),  size: ev.blue_team_size },
          { label: "WHITE TEAM", color: [148, 163, 184], roles: getRoles(WHITE_ROLES, ev.white_team_size), size: ev.white_team_size },
        ];

        let maxTeamY = roleStartY;
        teamDefs.forEach((team, ti) => {
          const cx = margin + ti * roleColW;
          let ty = roleStartY;
          pdf.setFillColor(...team.color);
          pdf.roundedRect(cx, ty, roleColW - 10, 16, 3, 3, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.setTextColor(255, 255, 255);
          pdf.text(`${team.label}  (${team.size || "?"})`, cx + 6, ty + 10.5);
          ty += 22;
          team.roles.forEach(role => {
            pdf.setFillColor(...team.color);
            pdf.circle(cx + 5, ty - 3, 2, "F");
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(203, 213, 225);
            pdf.text(role, cx + 11, ty);
            ty += 13;
          });
          maxTeamY = Math.max(maxTeamY, ty);
        });
        y = maxTeamY + 10;

        // ── SCENARIO OVERVIEW (expanded) ──────────────────────────────────────
        const overviewText = extra?.expanded_overview
          ? safe(extra.expanded_overview)
          : safe(ev.description || ev.scenario_prompt);

        if (overviewText) {
          y = checkPage(pdf, pageW, pageH, y, 80, diffColor, ev.title);
          pdf.setDrawColor(30, 41, 59);
          pdf.line(margin, y, pageW - margin, y);
          y += 12;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(14, 165, 233);
          pdf.text("EXERCISE OVERVIEW", margin, y);
          y += 12;

          // Frosted callout box for the overview
          const overviewLines = pdf.splitTextToSize(overviewText, contentW - 20);
          const boxH = overviewLines.length * 13 + 16;
          pdf.setFillColor(12, 20, 38);
          pdf.setDrawColor(14, 165, 233);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, y, contentW, boxH, 4, 4, "FD");
          pdf.setFillColor(14, 165, 233);
          pdf.rect(margin, y, 3, boxH, "F");

          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(9);
          pdf.setTextColor(203, 213, 225);
          let oy = y + 11;
          overviewLines.forEach(line => { pdf.text(line, margin + 10, oy); oy += 13; });
          y = oy + 6;
        }

        // ── LEARNING OBJECTIVES (educational outcomes) ────────────────────────
        const redLearn  = extra?.red_learning   || [];
        const blueLearn = extra?.blue_learning  || [];
        const whiteLearn = extra?.white_learning || [];

        if (redLearn.length > 0 || blueLearn.length > 0) {
          y = checkPage(pdf, pageW, pageH, y, 100, diffColor, ev.title);
          pdf.setDrawColor(30, 41, 59);
          pdf.line(margin, y, pageW - margin, y);
          y += 12;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(167, 139, 250);
          pdf.text("LEARNING OBJECTIVES", margin, y);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(148, 163, 184);
          pdf.text("What participants will know and be able to do after completing this scenario", margin + 138, y);
          y += 14;

          // Three learning columns
          const lColW = contentW / 3;
          const learnDefs = [
            { label: "RED TEAM GAINS",   color: [239, 68, 68],   items: redLearn },
            { label: "BLUE TEAM GAINS",  color: [37, 99, 235],   items: blueLearn },
            { label: "WHITE TEAM GAINS", color: [148, 163, 184], items: whiteLearn },
          ];

          // Pre-calculate the max height needed for all columns
          const colHeights = learnDefs.map(col => {
            let h = 20; // header
            col.items.forEach(item => {
              const wrapped = pdf.splitTextToSize(safe(item), lColW - 20);
              h += wrapped.length * 11 + 4;
            });
            return h;
          });
          const maxColHeight = Math.max(...colHeights);

          // If the block won't fit, add a new page
          y = checkPage(pdf, pageW, pageH, y, maxColHeight + 10, diffColor, ev.title);

          const learnStartY = y;
          let maxLY = learnStartY;

          learnDefs.forEach((col, ci) => {
            const cx = margin + ci * lColW;
            let ly = learnStartY;

            pdf.setFillColor(20, 30, 52);
            pdf.roundedRect(cx, ly, lColW - 8, 16, 3, 3, "F");
            pdf.setFillColor(...col.color);
            pdf.rect(cx, ly, 3, 16, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(...col.color);
            pdf.text(col.label, cx + 8, ly + 10.5);
            ly += 22;

            col.items.forEach((item, ii) => {
              const numLabel = `${ii + 1}.`;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(7.5);
              pdf.setTextColor(...col.color);
              pdf.text(numLabel, cx + 4, ly);

              const wrapped = pdf.splitTextToSize(safe(item), lColW - 22);
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(7.5);
              pdf.setTextColor(203, 213, 225);
              wrapped.forEach(line => { pdf.text(line, cx + 14, ly); ly += 11; });
              ly += 6;
            });

            maxLY = Math.max(maxLY, ly);
          });

          y = maxLY + 14;
        }

        // ── TACTICAL OBJECTIVES ───────────────────────────────────────────────
        const redObjs  = ev.red_team_objectives  || [];
        const blueObjs = ev.blue_team_objectives || [];
        const colW = (contentW - 12) / 2;

        if (redObjs.length > 0 || blueObjs.length > 0) {
          // Pre-calculate height needed for both columns
          let redH = 22;
          redObjs.slice(0, 6).forEach(obj => {
            redH += pdf.splitTextToSize(safe(obj), colW - 14).length * 10 + 2;
          });
          let blueH = 22;
          blueObjs.slice(0, 6).forEach(obj => {
            blueH += pdf.splitTextToSize(safe(obj), colW - 14).length * 10 + 2;
          });
          const objBlockH = Math.max(redH, blueH) + 36; // header + separator + label

          y = checkPage(pdf, pageW, pageH, y, objBlockH, diffColor, ev.title);
          pdf.setDrawColor(30, 41, 59);
          pdf.line(margin, y, pageW - margin, y);
          y += 12;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(14, 165, 233);
          pdf.text("LIVE-FIRE OBJECTIVES", margin, y);
          y += 14;

          const redColX = margin;
          const blueColX = margin + colW + 12;
          let redY = y;
          let blueY = y;

          if (redObjs.length > 0) {
            pdf.setFillColor(180, 20, 20);
            pdf.roundedRect(redColX, redY, colW, 16, 3, 3, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7.5);
            pdf.setTextColor(255, 255, 255);
            pdf.text("RED TEAM OBJECTIVES", redColX + 6, redY + 10.5);
            redY += 22;
            redObjs.slice(0, 6).forEach(obj => {
              pdf.setFillColor(239, 68, 68);
              pdf.circle(redColX + 5, redY - 3, 2, "F");
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(7.5);
              pdf.setTextColor(203, 213, 225);
              pdf.splitTextToSize(safe(obj), colW - 14).forEach(line => { pdf.text(line, redColX + 11, redY); redY += 10; });
              redY += 4;
            });
          }

          if (blueObjs.length > 0) {
            pdf.setFillColor(25, 60, 180);
            pdf.roundedRect(blueColX, blueY, colW, 16, 3, 3, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7.5);
            pdf.setTextColor(255, 255, 255);
            pdf.text("BLUE TEAM OBJECTIVES", blueColX + 6, blueY + 10.5);
            blueY += 22;
            blueObjs.slice(0, 6).forEach(obj => {
              pdf.setFillColor(37, 99, 235);
              pdf.circle(blueColX + 5, blueY - 3, 2, "F");
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(7.5);
              pdf.setTextColor(203, 213, 225);
              pdf.splitTextToSize(safe(obj), colW - 14).forEach(line => { pdf.text(line, blueColX + 11, blueY); blueY += 10; });
              blueY += 4;
            });
          }

          y = Math.max(redY, blueY) + 14;
        }

        // ── RULES OF ENGAGEMENT ───────────────────────────────────────────────
        if (ev.rules_of_engagement) {
          y = checkPage(pdf, pageW, pageH, y, 60, diffColor, ev.title);
          pdf.setDrawColor(30, 41, 59);
          pdf.line(margin, y, pageW - margin, y);
          y += 12;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(234, 179, 8);
          pdf.text("RULES OF ENGAGEMENT", margin, y);
          y += 12;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(148, 163, 184);
          const roeLines = pdf.splitTextToSize(safe(ev.rules_of_engagement), contentW);
          roeLines.slice(0, 5).forEach(line => { pdf.text(line, margin, y); y += 11; });
          if (roeLines.length > 5) { pdf.text("(see full document for complete Rules of Engagement)", margin, y); y += 11; }
          y += 4;
        }

        // ── NETWORK TOPOLOGY ──────────────────────────────────────────────────
        if (design) {
          y = checkPage(pdf, pageW, pageH, y, 80, diffColor, ev.title);
          pdf.setDrawColor(30, 41, 59);
          pdf.line(margin, y, pageW - margin, y);
          y += 12;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(14, 165, 233);
          pdf.text("NETWORK TOPOLOGY", margin, y);
          y += 12;

          const topoItems = [
            { label: "Design Name",      value: safe(design.name) },
            { label: "Topology Type",    value: safe(design.topology_type) },
            { label: "Routing Protocol", value: safe(design.routing_protocol) },
            { label: "WAN Technology",   value: safe(design.wan_technology) },
            { label: "Sites",            value: String(design.num_sites || "1") },
            { label: "IP Scheme",        value: safe(design.ip_scheme) || "10.0.0.0/8" },
            { label: "Firewall",         value: design.firewall_enabled ? safe(design.firewall_vendor) || "Enabled" : "None" },
            { label: "DMZ",              value: design.dmz_required ? "Yes" : "No" },
            { label: "Redundancy",       value: design.redundancy_enabled ? "Yes" : "No" },
            { label: "Server Farm",      value: design.server_farm ? `Yes (${design.num_servers || "?"})` : "No" },
          ].filter(t => t.value && t.value !== "undefined");

          const tBoxW = contentW / 3;
          const tBoxH = 34;
          topoItems.forEach((t, ti) => {
            y = checkPage(pdf, pageW, pageH, y, tBoxH + 8, diffColor, ev.title);
            const col = ti % 3;
            if (col === 0 && ti !== 0) y += tBoxH + 4;
            const bx = margin + col * tBoxW;
            pdf.setFillColor(15, 23, 42);
            pdf.roundedRect(bx, y, tBoxW - 8, tBoxH, 3, 3, "F");
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.5);
            pdf.setTextColor(148, 163, 184);
            pdf.text(t.label.toUpperCase(), bx + 7, y + 10);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8.5);
            pdf.setTextColor(226, 232, 240);
            pdf.text(t.value, bx + 7, y + 24);
          });
          y += tBoxH + 12;

          if (ev.topology_summary) {
            pdf.setFont("helvetica", "italic");
            pdf.setFontSize(7.5);
            pdf.setTextColor(148, 163, 184);
            y = wrapText(pdf, safe(ev.topology_summary), margin, y, contentW, 11);
            y += 4;
          }
        }

        // ── FINANCIAL IMPACT ──────────────────────────────────────────────────
        if (ev.financial_impact?.scenario_total_exposure && y < pageH - 70) {
          y = checkPage(pdf, pageW, pageH, y, 52, diffColor, ev.title);
          pdf.setDrawColor(30, 41, 59);
          pdf.line(margin, y, pageW - margin, y);
          y += 8;
          pdf.setFillColor(15, 23, 42);
          pdf.roundedRect(margin, y, contentW, 36, 4, 4, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.setTextColor(148, 163, 184);
          pdf.text("ESTIMATED FINANCIAL EXPOSURE", margin + 10, y + 12);
          pdf.setFontSize(13);
          pdf.setTextColor(239, 68, 68);
          const exp = Number(ev.financial_impact.scenario_total_exposure)
            .toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
          pdf.text(exp, margin + 10, y + 28);
          y += 46;
        }

        // ── PAGE FOOTER ───────────────────────────────────────────────────────
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Live-Fire ${scenarioNumber}  |  ${safe(ev.difficulty)}  |  Created: ${new Date(ev.created_date).toLocaleDateString()}`, pageW - margin, pageH - 14, { align: "right" });
        pdf.setFillColor(14, 165, 233);
        pdf.rect(0, pageH - 6, pageW, 6, "F");
        pdf.text("Xtreme I.C.E. Network Designer  |  Live-Fire Exercise Catalog", pageW / 2, pageH - 12, { align: "center" });
      }
    }

    // ── BACK COVER ─────────────────────────────────────────────────────────────
    pdf.addPage();
    darkPage(pdf, pageW, pageH);
    pdf.setFillColor(14, 165, 233);
    pdf.rect(0, 0, pageW, 6, "F");
    pdf.rect(0, pageH - 6, pageW, 6, "F");

    drawLogo(pdf, logoData, (pageW - 170) / 2, pageH / 2 - 90, 170, 62);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(14, 165, 233);
    pdf.text("Xtreme I.C.E.", pageW / 2, pageH / 2 - 10, { align: "center" });
    pdf.setFontSize(12);
    pdf.setTextColor(148, 163, 184);
    pdf.text("Network Designer & Cyber Exercise Platform", pageW / 2, pageH / 2 + 12, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`${events.length} live-fire exercise${events.length !== 1 ? "s" : ""}  |  Generated ${today}`, pageW / 2, pageH / 2 + 36, { align: "center" });

    pdf.save(`Xtreme_ICE_LiveFire_Catalog_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Scenario Catalog PDF downloaded!");
    setGenerating(false);
    setProgress("");
  };

  return (
    <Button
      onClick={generate}
      disabled={generating || !events || events.length === 0}
      variant="outline"
      className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
      {generating ? (progress || "Generating Catalog...") : "Export Live-Fire Catalog"}
    </Button>
  );
}