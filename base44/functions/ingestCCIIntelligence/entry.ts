import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const MITRE_URL = "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json";
const CISA_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const REPORTS = [
  {
    source: "Verizon DBIR", external_id: "verizon-dbir-2026", title: "Verizon 2026 Data Breach Investigations Report",
    description: "Reviewed annual source for incident patterns, actors, vectors and industry prevalence.",
    source_url: "https://www.verizon.com/business/resources/Tfdc/reports/2026-dbir-data-breach-investigations-report.pdf"
  },
  {
    source: "ENISA", external_id: "enisa-threat-landscape-2025", title: "ENISA Threat Landscape 2025",
    description: "Reviewed annual source for threat trends, motivations, sectors and regional context.",
    source_url: "https://www.enisa.europa.eu/sites/default/files/2025-11/ENISA%20Threat%20Landscape%202025.pdf"
  }
];

const clean = (value = "") => String(value).replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();
const iso = (value) => value ? new Date(value).toISOString() : null;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });

    const now = new Date().toISOString();
    const observations = [];
    const results = { mitre_techniques: 0, mitre_adversaries: 0, cisa_kev: 0, reviewed_reports: 0, created: 0, updated: 0, errors: [] };

    try {
      const response = await fetch(MITRE_URL, { headers: { Accept: "application/json", "User-Agent": "Xtreme-ICE-CCI" } });
      if (!response.ok) throw new Error(`MITRE returned ${response.status}`);
      const bundle = await response.json();
      const active = (bundle.objects || []).filter(item => !item.revoked && !item.x_mitre_deprecated);

      for (const item of active.filter(item => item.type === "attack-pattern").slice(0, 250)) {
        const attackId = (item.external_references || []).find(ref => ref.source_name === "mitre-attack")?.external_id;
        if (!attackId) continue;
        const tactics = (item.kill_chain_phases || []).map(phase => phase.phase_name).filter(Boolean);
        observations.push({
          source: "MITRE ATT&CK", source_category: "attack_intelligence", external_id: attackId,
          title: item.name || attackId, description: clean(item.description).slice(0, 1800),
          observation_type: "technique", scenario_tags: tactics, published_date: iso(item.modified || item.created),
          ingested_at: now, ingestion_mode: "automated_feed", source_url: `https://attack.mitre.org/techniques/${attackId.replace(".", "/")}/`,
          raw: { tactics, stix_id: item.id }
        });
        results.mitre_techniques++;
      }

      for (const item of active.filter(item => item.type === "intrusion-set").slice(0, 100)) {
        const ref = (item.external_references || []).find(ref => ref.source_name === "mitre-attack");
        if (!ref?.external_id) continue;
        observations.push({
          source: "MITRE ATT&CK", source_category: "attack_intelligence", external_id: ref.external_id,
          title: item.name || ref.external_id, description: clean(item.description).slice(0, 1800),
          observation_type: "adversary", scenario_tags: item.aliases || [], published_date: iso(item.modified || item.created),
          ingested_at: now, ingestion_mode: "automated_feed", source_url: ref.url || "https://attack.mitre.org/groups/",
          raw: { aliases: item.aliases || [], stix_id: item.id }
        });
        results.mitre_adversaries++;
      }
    } catch (error) {
      results.errors.push(`MITRE ATT&CK: ${error.message}`);
    }

    try {
      const response = await fetch(CISA_URL, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`CISA returned ${response.status}`);
      const payload = await response.json();
      const rows = [...(payload.vulnerabilities || [])].sort((a, b) => String(b.dateAdded).localeCompare(String(a.dateAdded))).slice(0, 200);
      for (const item of rows) {
        observations.push({
          source: "CISA KEV", source_category: "attack_intelligence", external_id: item.cveID,
          title: item.vulnerabilityName || item.cveID, description: item.shortDescription || "",
          observation_type: "exploited_vulnerability",
          scenario_tags: item.knownRansomwareCampaignUse === "Known" ? ["ransomware", "known-exploited"] : ["known-exploited"],
          published_date: item.dateAdded ? new Date(`${item.dateAdded}T00:00:00Z`).toISOString() : null,
          ingested_at: now, ingestion_mode: "automated_feed",
          source_url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
          raw: { vendor: item.vendorProject, product: item.product, required_action: item.requiredAction, ransomware_use: item.knownRansomwareCampaignUse }
        });
        results.cisa_kev++;
      }
    } catch (error) {
      results.errors.push(`CISA KEV: ${error.message}`);
    }

    for (const report of REPORTS) {
      observations.push({
        ...report, source_category: "frequency_likelihood", observation_type: "reviewed_report",
        scenario_tags: [], published_date: null, ingested_at: now, ingestion_mode: "reviewed_annual_report",
        raw: { usage: "Context only; reviewed statistics must be normalized before modeling", direct_financial_weight: 0 }
      });
      results.reviewed_reports++;
    }

    const existing = await base44.asServiceRole.entities.CCIEvidenceObservation.list("-ingested_at", 1000);
    const existingMap = new Map(existing.map(item => [`${item.source}|${item.external_id}`, item.id]));
    for (const observation of observations) {
      const key = `${observation.source}|${observation.external_id}`;
      const id = existingMap.get(key);
      if (id) {
        await base44.asServiceRole.entities.CCIEvidenceObservation.update(id, observation);
        results.updated++;
      } else {
        await base44.asServiceRole.entities.CCIEvidenceObservation.create(observation);
        results.created++;
      }
    }

    return Response.json({ success: results.errors.length === 0, results, calculated_at: now });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});