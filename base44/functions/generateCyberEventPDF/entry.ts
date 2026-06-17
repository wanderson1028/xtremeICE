import { jsPDF } from "npm:jspdf@4.0.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { eventData } = await req.json();
    if (!eventData || !eventData.title) {
      return Response.json({ error: "Invalid event data" }, { status: 400 });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;

    // ── Helper functions ──
    const addTitle = (text, size = 20) => {
      doc.setFontSize(size);
      doc.setFont(undefined, "bold");
      yPos += size / 4;
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * size * 0.35 + 3;
      doc.setFont(undefined, "normal");
    };

    const addHeading = (text) => {
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      yPos += 5;
      doc.text(text, margin, yPos);
      yPos += 8;
      doc.setDrawColor(100);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    };

    const addText = (text, size = 10) => {
      doc.setFontSize(size);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * size * 0.35 + 2;
    };

    const addBulletList = (items, indent = 0) => {
      items.forEach((item) => {
        const lines = doc.splitTextToSize(`• ${item}`, contentWidth - indent);
        doc.text(lines, margin + indent, yPos);
        yPos += lines.length * 10 * 0.35 + 1;
      });
    };

    const checkPageBreak = (minSpace = 20) => {
      if (yPos + minSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // ── Cover Page ──
    addTitle(eventData.title || "Cyber Exercise Scenario", 28);
    addText("", 5);
    addText(`Difficulty: ${eventData.difficulty || "Intermediate"}`, 11);
    addText(`Duration: ${eventData.duration_minutes || 120} minutes`, 11);
    addText(`Status: ${eventData.status || "Draft"}`, 11);
    addText(`Created: ${new Date(eventData.created_date).toLocaleDateString()}`, 11);
    yPos += 15;
    
    if (eventData.description) {
      doc.setFont(undefined, "italic");
      addText(eventData.description, 10);
      doc.setFont(undefined, "normal");
    }

    // Page break
    doc.addPage();
    yPos = margin;

    // ── Executive Summary ──
    addHeading("Executive Summary");
    addText(`Red Team Size: ${eventData.red_team_size} members`);
    addText(`Blue Team Size: ${eventData.blue_team_size} members`);
    addText(`White Team Size: ${eventData.white_team_size} members`);
    yPos += 3;
    
    if (eventData.scenario_prompt) {
      addHeading("Scenario Overview");
      addText(eventData.scenario_prompt);
    }

    checkPageBreak();

    // ── Network Topology ──
    if (eventData.topology_summary) {
      addHeading("Network Topology");
      addText(eventData.topology_summary);
      checkPageBreak();
    }

    // ── Red Team Section ──
    addHeading("🔴 RED TEAM MISSION");
    if (eventData.red_team_objectives?.length > 0) {
      doc.setFont(undefined, "bold");
      addText("Objectives:", 11);
      doc.setFont(undefined, "normal");
      addBulletList(eventData.red_team_objectives, 5);
      checkPageBreak();
    }

    if (eventData.red_team_directions) {
      doc.setFont(undefined, "bold");
      addText("Attack Instructions:", 11);
      doc.setFont(undefined, "normal");
      addText(eventData.red_team_directions);
      checkPageBreak();
    }

    // ── Blue Team Section ──
    addHeading("🔵 BLUE TEAM MISSION");
    if (eventData.blue_team_objectives?.length > 0) {
      doc.setFont(undefined, "bold");
      addText("Objectives:", 11);
      doc.setFont(undefined, "normal");
      addBulletList(eventData.blue_team_objectives, 5);
      checkPageBreak();
    }

    if (eventData.blue_team_directions) {
      doc.setFont(undefined, "bold");
      addText("Defense & Detection Instructions:", 11);
      doc.setFont(undefined, "normal");
      addText(eventData.blue_team_directions);
      checkPageBreak();
    }

    // ── White Team Section ──
    if (eventData.white_team_objectives?.length > 0 || eventData.white_team_directions) {
      addHeading("⚪ WHITE TEAM (ADJUDICATORS)");
      if (eventData.white_team_objectives?.length > 0) {
        doc.setFont(undefined, "bold");
        addText("Responsibilities:", 11);
        doc.setFont(undefined, "normal");
        addBulletList(eventData.white_team_objectives, 5);
        checkPageBreak();
      }
      if (eventData.white_team_directions) {
        doc.setFont(undefined, "bold");
        addText("Instructions:", 11);
        doc.setFont(undefined, "normal");
        addText(eventData.white_team_directions);
        checkPageBreak();
      }
    }

    // ── Ingress Points ──
    if (eventData.ingress_points?.length > 0) {
      addHeading("Access Points & Credentials");
      eventData.ingress_points.forEach((point, idx) => {
        checkPageBreak(15);
        doc.setFont(undefined, "bold");
        addText(`${point.team.toUpperCase()} Team - ${point.role}`, 11);
        doc.setFont(undefined, "normal");
        addText(`System: ${point.system}`);
        addText(`IP Address: ${point.ip}`);
        addText(`Credentials: ${point.credentials}`);
        if (point.description) addText(`Details: ${point.description}`);
        yPos += 3;
      });
      checkPageBreak();
    }

    // ── CTF Flags ──
    if (eventData.flags?.length > 0) {
      addHeading(`Capture The Flag (${eventData.flags.length} Flags)`);
      eventData.flags.forEach((flag, idx) => {
        checkPageBreak(12);
        doc.setFont(undefined, "bold");
        doc.text(`${idx + 1}. ${flag.name}`, margin, yPos);
        yPos += 6;
        doc.setFont(undefined, "normal");
        addText(`Points: ${flag.points}`);
        if (flag.location) addText(`Location: ${flag.location}`);
        if (flag.description) addText(`Description: ${flag.description}`);
        if (flag.hint) {
          doc.setFont(undefined, "italic");
          addText(`Hint: ${flag.hint}`);
          doc.setFont(undefined, "normal");
        }
        yPos += 2;
      });
      checkPageBreak();
    }

    // ── Rules & Scoring ──
    if (eventData.rules_of_engagement || eventData.scoring_criteria) {
      addHeading("Rules of Engagement & Scoring");
      if (eventData.rules_of_engagement) {
        doc.setFont(undefined, "bold");
        addText("Rules of Engagement:", 11);
        doc.setFont(undefined, "normal");
        addText(eventData.rules_of_engagement);
        checkPageBreak();
      }
      if (eventData.scoring_criteria) {
        doc.setFont(undefined, "bold");
        addText("Scoring Criteria:", 11);
        doc.setFont(undefined, "normal");
        addText(eventData.scoring_criteria);
      }
    }

    // ── Footer ──
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    for (let i = 1; i <= doc.internal.pages.length; i++) {
      doc.setPage(i);
      doc.text(
        `Page ${i} of ${doc.internal.pages.length}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );
    }

    const pdfBytes = doc.output("arraybuffer");
    const filename = `${(eventData.title || "CyberEvent").replace(/\s+/g, "_")}_Scenario.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});