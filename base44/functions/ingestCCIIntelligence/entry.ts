import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Nightly CCI intelligence ingestion.
// Fetches MITRE ATT&CK techniques and CISA KEV exploits, and registers a small
// curated set of reviewed annual financial-impact sources, upserting each into
// CCIEvidenceObservation records (deduped by source + external_id). Admin-only.
// Modeled on ingestThreatFeeds — partial success is OK: each source is wrapped
// in its own try/catch so a single feed outage does not abort the whole run.

const MITRE_ATTACK_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json';
const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const MAX_MITRE = 150;
const MAX_CISA = 100;

// Curated registry of authoritative annual sources used as financial-reference
// benchmarks by the CCI weighted impact algorithm. Kept small and stable so
// the registry refreshes cleanly each night without bloating the table.
const REVIEWED_ANNUAL_SOURCES = [
  {
    external_id: 'DBIR-2025',
    source: 'Verizon DBIR',
    title: 'Verizon 2025 Data Breach Investigations Report',
    source_url: 'https://www.verizon.com/business/resources/reports/dbir/',
    description: 'Annual industry-wide breach statistics covering attack patterns, vectors, and financial impact across sectors.',
    year: 2025,
  },
  {
    external_id: 'IBM-CODB-2025',
    source: 'IBM Cost of a Data Breach',
    title: 'IBM Security 2025 Cost of a Data Breach Report',
    source_url: 'https://www.ibm.com/reports/data-breach',
    description: 'Annual benchmark study of per-incident breach cost, root causes, and cost-reducing factors across geographies and industries.',
    year: 2025,
  },
  {
    external_id: 'MANDIANT-MTrends-2025',
    source: 'Mandiant M-Trends',
    title: 'Mandiant M-Trends 2025',
    source_url: 'https://www.mandiant.com/resources/m-trends',
    description: 'Annual incident-response and threat-landscape report covering attacker dwell time, initial access vectors, and impact trends.',
    year: 2025,
  },
  {
    external_id: 'CISA-YARO-2025',
    source: 'CISA Year in Review',
    title: 'CISA 2025 Year in Review',
    source_url: 'https://www.cisa.gov/year-in-review',
    description: 'CISA annual summary of notable vulnerabilities, advisories, and risk-reduction guidance.',
    year: 2025,
  },
];

function normalizeMitreTechniques(bundle) {
  const objects = bundle?.objects || [];
  const now = new Date().toISOString();
  const techniques = [];
  for (const obj of objects) {
    if (obj?.type !== 'attack-pattern') continue;
    // External ID (e.g. T1046) lives in external_references under mitre-attack
    let mitreId = '';
    let sourceUrl = '';
    for (const ref of obj.external_references || []) {
      if (ref.source_name === 'mitre-attack' && ref.external_id) {
        mitreId = ref.external_id;
        if (ref.url) sourceUrl = ref.url;
      }
    }
    if (!mitreId) continue;
    // Tactics from kill_chain_phases (phase_name)
    const tactics = (obj.kill_chain_phases || [])
      .filter((p) => p.kill_chain_name === 'mitre-attack')
      .map((p) => p.phase_name)
      .filter(Boolean);
    // Description: first x_mitre_description or a referenced description
    const description = obj.description || '';
    techniques.push({
      source: 'MITRE-ATTACK',
      source_category: 'attack_intelligence',
      external_id: mitreId,
      title: obj.name || mitreId,
      observation_type: 'technique',
      ingestion_mode: 'automated_feed',
      scenario_tags: tactics,
      description: description.slice(0, 1200),
      source_url: sourceUrl || `https://attack.mitre.org/techniques/${mitreId.replace(/\./g, '/')}/`,
      published_date: obj.modified || obj.created || now,
      ingested_at: now,
      raw: {
        tactics,
        platforms: obj.x_mitre_platforms || [],
        data_sources: obj.x_mitre_data_sources || [],
        is_subtechnique: Boolean(obj.x_mitre_is_subtechnique),
      },
    });
    if (techniques.length >= MAX_MITRE) break;
  }
  return techniques;
}

function normalizeCisaKev(data) {
  const vulns = data?.vulnerabilities || [];
  const sorted = [...vulns].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  const recent = sorted.slice(0, MAX_CISA);
  const now = new Date().toISOString();
  return recent.map((v) => {
    const cveId = v.cveID || '';
    const externalId = cveId || `${v.vendorProject}-${v.product}`;
    return {
      source: 'CISA-KEV',
      source_category: 'frequency_likelihood',
      external_id: externalId,
      title: v.vulnerabilityName || cveId || 'CISA KEV Entry',
      observation_type: 'exploited_vulnerability',
      ingestion_mode: 'automated_feed',
      scenario_tags: ['Known Exploited Vulnerability'],
      description: v.shortDescription || v.notes || '',
      source_url: cveId ? `https://nvd.nist.gov/vuln/detail/${cveId}` : '',
      published_date: v.dateAdded || now,
      ingested_at: now,
      raw: {
        cve_id: cveId || null,
        vendorProject: v.vendorProject || null,
        product: v.product || null,
        requiredAction: v.requiredAction || null,
        knownRansomware: v.knownRansomwareCampaignUse || null,
      },
    };
  });
}

function normalizeReviewedAnnual() {
  const now = new Date().toISOString();
  return REVIEWED_ANNUAL_SOURCES.map((s) => ({
    source: s.source,
    source_category: 'financial_reference',
    external_id: s.external_id,
    title: s.title,
    observation_type: 'reviewed_report',
    ingestion_mode: 'reviewed_annual_report',
    scenario_tags: ['Annual Benchmark'],
    description: s.description,
    source_url: s.source_url,
    published_date: `${s.year}-06-01T00:00:00.000Z`,
    ingested_at: now,
    raw: { publication_year: s.year, registry: 'cci_reviewed_sources' },
  }));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const results = { mitre: 0, cisa: 0, reviewed: 0, created: 0, updated: 0, errors: [] };

    // Load existing observations to dedupe by source + external_id
    const existing = await base44.asServiceRole.entities.CCIEvidenceObservation.list('-ingested_at', 500);
    const existingMap = new Map();
    for (const e of existing) {
      existingMap.set(`${e.source}|${e.external_id}`, e.id);
    }

    const toCreate = [];
    const toUpdate = [];
    const upsert = (item) => {
      const key = `${item.source}|${item.external_id}`;
      if (existingMap.has(key) && existingMap.get(key) !== 'pending') {
        toUpdate.push({ id: existingMap.get(key), ...item });
      } else {
        toCreate.push(item);
        existingMap.set(key, 'pending');
      }
    };

    // MITRE ATT&CK techniques
    try {
      const resp = await fetch(MITRE_ATTACK_URL, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error(`MITRE ATT&CK returned ${resp.status}`);
      const bundle = await resp.json();
      const mitreItems = normalizeMitreTechniques(bundle);
      results.mitre = mitreItems.length;
      mitreItems.forEach(upsert);
    } catch (e) {
      results.errors.push(`MITRE fetch: ${e.message}`);
    }

    // CISA KEV
    try {
      const resp = await fetch(CISA_KEV_URL, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error(`CISA KEV returned ${resp.status}`);
      const data = await resp.json();
      const cisaItems = normalizeCisaKev(data);
      results.cisa = cisaItems.length;
      cisaItems.forEach(upsert);
    } catch (e) {
      results.errors.push(`CISA fetch: ${e.message}`);
    }

    // Reviewed annual sources (curated registry)
    try {
      const reviewedItems = normalizeReviewedAnnual();
      results.reviewed = reviewedItems.length;
      reviewedItems.forEach(upsert);
    } catch (e) {
      results.errors.push(`Reviewed registry: ${e.message}`);
    }

    // Bulk create new records
    if (toCreate.length > 0) {
      try {
        await base44.asServiceRole.entities.CCIEvidenceObservation.bulkCreate(toCreate);
        results.created = toCreate.length;
      } catch (e) {
        results.errors.push(`Bulk create: ${e.message}`);
      }
    }

    // Update existing records individually (cap to stay within timeout)
    for (const item of toUpdate.slice(0, 50)) {
      try {
        await base44.asServiceRole.entities.CCIEvidenceObservation.update(item.id, item);
        results.updated++;
      } catch (e) {
        results.errors.push(`Update ${item.external_id}: ${e.message}`);
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}