import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Fetches CISA KEV, NVD CVE, and GitHub Security Advisories (GHSA) feeds,
// enriches NVD records with EPSS exploit-likelihood scores from FIRST.org,
// normalizes all into ThreatFeedItem records, and upserts (dedupes by
// source + external_id). Admin-only. Limits to recent entries to stay
// within function timeout.

const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const NVD_CVE_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const GHSA_URL = 'https://api.github.com/advisories?type=reviewed&per_page=';
const EPSS_URL = 'https://api.first.org/data/v1/epss';
const MAX_CISA = 100;
const MAX_NVD = 50;
const MAX_GHSA = 50;

function severityLabel(score) {
  if (score == null) return 'medium';
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function normalizeCisaKev(data) {
  const vulns = data?.vulnerabilities || [];
  const sorted = [...vulns].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  const recent = sorted.slice(0, MAX_CISA);
  const now = new Date().toISOString();
  return recent.map(v => {
    const cveId = v.cveID || '';
    const externalId = cveId || `${v.vendorProject}-${v.product}`;
    return {
      source: 'CISA-KEV',
      external_id: externalId,
      cve_id: cveId || null,
      title: v.vulnerabilityName || cveId || 'CISA KEV Entry',
      description: v.shortDescription || v.notes || '',
      severity: v.cvssScore != null ? Number(v.cvssScore) : null,
      severity_label: severityLabel(v.cvssScore != null ? Number(v.cvssScore) : 7),
      affected_products: [`${v.vendorProject || ''} ${v.product || ''}`.trim()].filter(Boolean),
      mitre_techniques: [],
      published_date: v.dateAdded || null,
      ingested_at: now,
      raw: {
        vendorProject: v.vendorProject || null,
        product: v.product || null,
        requiredAction: v.requiredAction || null,
        knownRansomware: v.knownRansomwareCampaignUse || null,
      },
    };
  });
}

async function fetchNvdRecent() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pubStart = thirtyDaysAgo.toISOString().split('T')[0] + 'T00:00:00.000';
  const url = `${NVD_CVE_URL}?pubStartDate=${encodeURIComponent(pubStart)}&resultsPerPage=${MAX_NVD}`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error(`NVD API returned ${resp.status}`);
  const data = await resp.json();
  const nowIso = now.toISOString();
  const items = [];
  for (const cve of data.vulnerabilities || []) {
    const cveData = cve?.cve;
    if (!cveData?.id) continue;
    let cvssScore = null;
    const metrics = cveData?.metrics || {};
    const cvss = metrics.cvssMetricV31?.[0]?.cvssData || metrics.cvssMetricV2?.[0]?.cvssData;
    if (cvss?.baseScore != null) cvssScore = Number(cvss.baseScore);
    if (cvssScore != null && cvssScore < 7) continue;
    let desc = '';
    for (const d of cveData?.descriptions || []) {
      if (d.lang === 'en') { desc = d.value; break; }
    }
    const products = [];
    for (const conf of cveData?.configurations || []) {
      for (const node of conf.nodes || []) {
        for (const m of node.cpeMatch || []) {
          if (m.criteria) {
            const parts = m.criteria.split(':');
            if (parts.length >= 5) products.push(`${parts[3]} ${parts[4]}`.trim());
          }
        }
      }
    }
    items.push({
      source: 'NVD-CVE',
      external_id: cveData.id,
      cve_id: cveData.id,
      title: cveData.id,
      description: desc || 'No description available',
      severity: cvssScore,
      severity_label: severityLabel(cvssScore ?? 7),
      affected_products: [...new Set(products)].slice(0, 10),
      mitre_techniques: [],
      published_date: cveData?.published || null,
      ingested_at: nowIso,
      raw: {
        cvssVector: cvss?.vectorString || null,
        weaknesses: (cveData?.weaknesses || []).map(w => w.source).slice(0, 5),
      },
    });
  }
  return items;
}

// Fetch EPSS scores for a list of CVE IDs and return a map cve -> { epss, percentile }
async function fetchEpssScores(cveIds) {
  const map = new Map();
  const unique = Array.from(new Set(cveIds.filter(Boolean)));
  if (unique.length === 0) return map;
  try {
    const url = `${EPSS_URL}?cve=${encodeURIComponent(unique.join(','))}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) return map;
    const data = await resp.json();
    const entries = data?.data || [];
    for (const entry of entries) {
      if (entry?.cve) {
        map.set(entry.cve, {
          epss: entry.epss != null ? Number(entry.epss) : null,
          percentile: entry.percentile != null ? Number(entry.percentile) : null,
        });
      }
    }
  } catch (e) {
    // EPSS is best-effort enrichment — skip on error
  }
  return map;
}

async function fetchGhsa() {
  const url = `${GHSA_URL}${MAX_GHSA}`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Xtreme-ICE-Threat-Feed-Ingestion' } });
  if (!resp.ok) throw new Error(`GHSA API returned ${resp.status}`);
  const data = await resp.json();
  const nowIso = new Date().toISOString();
  const items = [];
  for (const adv of data || []) {
    const ghsaId = adv.ghsa_id;
    if (!ghsaId) continue;
    const cveId = adv.cve_id || null;
    let cvssScore = null;
    if (adv.cvss?.score != null) {
      cvssScore = Number(adv.cvss.score);
    } else if (typeof adv.severity === 'string') {
      const sevMap = { critical: 9.5, high: 7.5, medium: 5, low: 2.5 };
      cvssScore = sevMap[adv.severity.toLowerCase()] || null;
    }
    const products = [];
    for (const a of adv.affected || []) {
      const pkg = a?.package;
      if (pkg?.name) products.push(`${pkg.ecosystem || ''}/${pkg.name}`.replace(/^\//, ''));
    }
    items.push({
      source: 'GHSA',
      external_id: ghsaId,
      cve_id: cveId,
      title: adv.summary?.slice(0, 120) || cveId || ghsaId,
      description: adv.summary || 'No description available',
      severity: cvssScore,
      severity_label: severityLabel(cvssScore ?? 7),
      affected_products: [...new Set(products)].slice(0, 10),
      mitre_techniques: [],
      published_date: adv.published_at || null,
      ingested_at: nowIso,
      raw: {
        ghsaId,
        severity: adv.severity || null,
        url: adv.html_url || null,
        references: (adv.references || []).slice(0, 3).map(r => r.url || r),
      },
    });
  }
  return items;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const results = { cisa: 0, nvd: 0, ghsa: 0, epss_enriched: 0, created: 0, updated: 0, errors: [] };

    const existing = await base44.asServiceRole.entities.ThreatFeedItem.list('-ingested_at', 500);
    const existingMap = new Map();
    for (const e of existing) {
      existingMap.set(`${e.source}|${e.external_id}`, e.id);
    }

    const toCreate = [];
    const toUpdate = [];

    const upsert = (item) => {
      const key = `${item.source}|${item.external_id}`;
      if (existingMap.has(key)) {
        toUpdate.push({ id: existingMap.get(key), ...item });
      } else {
        toCreate.push(item);
        existingMap.set(key, 'pending');
      }
    };

    // Fetch CISA KEV
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

    // Fetch NVD CVE (recent, high severity) + EPSS enrichment
    try {
      const nvdItems = await fetchNvdRecent();
      const cveIds = nvdItems.map(i => i.cve_id).filter(Boolean);
      const epssMap = await fetchEpssScores(cveIds);
      for (const item of nvdItems) {
        const e = epssMap.get(item.cve_id);
        if (e) {
          item.epss_score = e.epss;
          item.epss_percentile = e.percentile;
          results.epss_enriched++;
        }
      }
      results.nvd = nvdItems.length;
      nvdItems.forEach(upsert);
    } catch (e) {
      results.errors.push(`NVD fetch: ${e.message}`);
    }

    // Fetch GitHub Security Advisories
    try {
      const ghsaItems = await fetchGhsa();
      results.ghsa = ghsaItems.length;
      ghsaItems.forEach(upsert);
    } catch (e) {
      results.errors.push(`GHSA fetch: ${e.message}`);
    }

    // Bulk create new records (up to 500 per call)
    if (toCreate.length > 0) {
      try {
        await base44.asServiceRole.entities.ThreatFeedItem.bulkCreate(toCreate);
        results.created = toCreate.length;
      } catch (e) {
        results.errors.push(`Bulk create: ${e.message}`);
      }
    }

    // Update existing records individually (only if there are a reasonable number)
    for (const item of toUpdate.slice(0, 50)) {
      try {
        await base44.asServiceRole.entities.ThreatFeedItem.update(item.id, item);
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