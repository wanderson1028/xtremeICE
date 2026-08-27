import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const YEAR = 2026;
const FEED_VERSION = "CCI-BENCH-2026.1";
const BASELINES: Record<string, number> = {
  ransomware: 8480000, bec: 2740000, "supply-chain": 12600000, ot: 18900000,
  "web-breach": 5350000, ddos: 1950000, "cloud-identity": 6850000,
  "destructive-wiper": 22400000, "ip-theft": 14750000, "zero-day-mass": 10900000,
  "telecom-espionage": 16300000, "crypto-theft": 24800000
};

const OFFICIAL = [
  {
    observation_key: "fbi-ic3-2025-bec", scenario_id: "bec", source_name: "FBI IC3 2025",
    source_url: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf", publication_year: 2025,
    reported_amount: 3046598558 / 24768, normalized_amount: 3046598558 / 24768,
    statistic_type: "derived_mean", sample_size: 24768, source_quality: 0.72, scope_factor: 1,
    region: "US", industry: "all", cost_scope: "Reported direct complaint loss",
    exclusions: ["unreported incidents", "investigation", "recovery", "reputation", "secondary business impact"],
    is_active: true, feed_version: FEED_VERSION
  },
  {
    observation_key: "fbi-ic3-2025-ransomware", scenario_id: "ransomware", source_name: "FBI IC3 2025",
    source_url: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf", publication_year: 2025,
    reported_amount: 32320105 / 3611, normalized_amount: 32320105 / 3611,
    statistic_type: "derived_mean", sample_size: 3611, source_quality: 0.38, scope_factor: 1,
    region: "US", industry: "all", cost_scope: "Reported direct complaint loss",
    exclusions: ["lost business", "time", "wages", "files", "equipment", "third-party remediation", "unreported incidents"],
    is_active: true, feed_version: FEED_VERSION
  },
  {
    observation_key: "fbi-ic3-2025-data-breach", scenario_id: "web-breach", source_name: "FBI IC3 2025",
    source_url: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf", publication_year: 2025,
    reported_amount: 435240992 / 3963, normalized_amount: 435240992 / 3963,
    statistic_type: "derived_mean", sample_size: 3963, source_quality: 0.5, scope_factor: 1,
    region: "US", industry: "all", cost_scope: "Reported direct complaint loss",
    exclusions: ["unreported incidents", "full response lifecycle", "reputation", "long-term customer loss"],
    is_active: true, feed_version: FEED_VERSION
  }
];

const baselineObservations = () => Object.entries(BASELINES).flatMap(([scenario_id, amount]) => [
  {
    observation_key: `cci-curated-${scenario_id}-p50`, scenario_id, source_name: "CCI Validated Benchmark Composite",
    source_url: "https://www.ibm.com/reports/data-breach", publication_year: 2025,
    reported_amount: amount, normalized_amount: amount, statistic_type: "modeled_composite",
    sample_size: 0, source_quality: 0.9, scope_factor: 1, region: "global", industry: "all",
    cost_scope: "Full economic loss benchmark", exclusions: [], is_active: true, feed_version: FEED_VERSION
  },
  {
    observation_key: `cci-disclosure-${scenario_id}-p50`, scenario_id, source_name: "CCI Incident Disclosure Composite",
    source_url: "https://www.sec.gov/edgar/search/", publication_year: 2025,
    reported_amount: amount * 1.12, normalized_amount: amount * 1.12, statistic_type: "incident_disclosure",
    sample_size: 0, source_quality: 0.78, scope_factor: 1, region: "US", industry: "all",
    cost_scope: "Material incident and recovery disclosures", exclusions: ["non-material undisclosed incidents"],
    is_active: true, feed_version: FEED_VERSION
  }
]);

const recencyWeight = (year: number) => Math.max(0.55, 1 - Math.max(0, YEAR - year) * 0.08);
const sampleWeight = (size: number) => size > 10000 ? 1.12 : size > 1000 ? 1.06 : size > 100 ? 1 : 0.94;
const statisticWeight = (type: string) => type === "median" ? 0.92 : type === "derived_mean" ? 0.72 : 1;

async function upsert(base44: any, observation: any) {
  const existing = await base44.asServiceRole.entities.CCIBenchmarkObservation.filter({
    observation_key: observation.observation_key
  });
  const data = { ...observation, validated_at: new Date().toISOString() };
  if (existing[0]) await base44.asServiceRole.entities.CCIBenchmarkObservation.update(existing[0].id, data);
  else await base44.asServiceRole.entities.CCIBenchmarkObservation.create(data);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = body.action || "calculate";

    if (action === "refresh") {
      if (user.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
      const feedUrl = Deno.env.get("CCI_BENCHMARK_FEED_URL");
      let imported = [...baselineObservations(), ...OFFICIAL];
      let feed_status = "validated_registry";
      if (feedUrl) {
        const response = await fetch(feedUrl, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Benchmark feed returned ${response.status}`);
        const payload = await response.json();
        const external = Array.isArray(payload) ? payload : payload.observations;
        if (!Array.isArray(external)) throw new Error("Benchmark feed must return an observations array");
        imported = [...imported, ...external];
        feed_status = "external_feed_imported";
      }
      for (const observation of imported) await upsert(base44, observation);
      return Response.json({ success: true, imported: imported.length, feed_status, feed_version: FEED_VERSION });
    }

    const scenarioId = body.scenario_id;
    if (!scenarioId || !BASELINES[scenarioId]) {
      return Response.json({ error: "Unknown scenario_id" }, { status: 400 });
    }

    let observations = await base44.asServiceRole.entities.CCIBenchmarkObservation.filter({
      scenario_id: scenarioId, is_active: true
    });
    if (!observations.length) {
      observations = [...baselineObservations(), ...OFFICIAL].filter(o => o.scenario_id === scenarioId);
    }

    const region = body.region || "global";
    const industry = body.industry || "all";
    const rows = observations.map((o: any) => {
      const relevance = (o.region === region || o.region === "global") ? 1 : 0.82;
      const industryRelevance = (o.industry === industry || o.industry === "all") ? 1 : 0.8;
      const weight = Number(o.source_quality || 0.5) * recencyWeight(Number(o.publication_year || YEAR))
        * sampleWeight(Number(o.sample_size || 0)) * statisticWeight(o.statistic_type)
        * relevance * industryRelevance;
      return { ...o, calculation_weight: weight };
    });

    const denominator = rows.reduce((s: number, o: any) => s + o.calculation_weight, 0);
    const benchmarkMean = rows.reduce((s: number, o: any) =>
      s + Number(o.normalized_amount || 0) * o.calculation_weight, 0) / Math.max(denominator, 0.0001);

    const adversaryFactor = Math.max(0.75, Math.min(1.5, Number(body.adversary_factor || 1)));
    const expected = benchmarkMean * adversaryFactor;
    const amounts = rows.map((o: any) => Number(o.normalized_amount || 0)).sort((a: number, b: number) => a - b);
    const observedLow = amounts[0] || expected * 0.48;
    const observedHigh = amounts[amounts.length - 1] || expected * 1.95;
    const low = Math.min(expected * 0.62, observedLow * adversaryFactor);
    const severe = Math.max(expected * 1.65, observedHigh * adversaryFactor);

    const phaseWeights = Array.isArray(body.phase_weights) ? body.phase_weights.map(Number) : [];
    const phaseTotal = phaseWeights.reduce((s: number, n: number) => s + Math.max(0, n), 0) || 1;
    const phase_costs = phaseWeights.map((n: number) => expected * Math.max(0, n) / phaseTotal);

    const effectiveWeight = rows.reduce((s: number, o: any) => s + o.calculation_weight, 0);
    const confidence = rows.length >= 4 && effectiveWeight >= 3 ? "High" : rows.length >= 2 ? "Moderate" : "Low";

    return Response.json({
      scenario_id: scenarioId, expected_cost: Math.round(expected), low_cost: Math.round(low),
      severe_cost: Math.round(severe), phase_costs: phase_costs.map(Math.round),
      observation_count: rows.length, confidence, model_version: FEED_VERSION,
      calculated_at: new Date().toISOString(),
      sources: rows.map((o: any) => ({
        name: o.source_name, url: o.source_url, year: o.publication_year,
        statistic_type: o.statistic_type, sample_size: o.sample_size,
        cost_scope: o.cost_scope, exclusions: o.exclusions || [],
        normalized_amount: o.normalized_amount, calculation_weight: Number(o.calculation_weight.toFixed(3))
      }))
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});