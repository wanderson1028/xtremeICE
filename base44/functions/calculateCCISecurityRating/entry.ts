import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const BASELINE = 650;
const MIN_SCORE = 300;
const MAX_SCORE = 850;
const MODEL_VERSION = "CCI-RATING-2026.1";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeInput = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("Scan scores must be numeric");
  return Math.round(clamp(number, 0, 100) * 10) / 10;
};

const adjustment = (score: number | null, positiveMax: number, negativeMax: number) => {
  if (score === null) return 0;
  return score >= 65
    ? ((score - 65) / 35) * positiveMax
    : ((score - 65) / 65) * negativeMax;
};

const bandFor = (score: number) => {
  if (score >= 800) return "Exceptional";
  if (score >= 740) return "Strong";
  if (score >= 670) return "Good";
  if (score >= 600) return "Fair";
  if (score >= 500) return "High Risk";
  return "Critical";
};

const calculate = (vulscanScore: number | null, vpentestScore: number | null) => {
  const vulscanAdjustment = adjustment(vulscanScore, 110, 190);
  const vpentestAdjustment = adjustment(vpentestScore, 90, 160);
  const finalScore = Math.round(clamp(BASELINE + vulscanAdjustment + vpentestAdjustment, MIN_SCORE, MAX_SCORE));
  return {
    baseline_score: BASELINE,
    final_score: finalScore,
    rating_band: bandFor(finalScore),
    score_change: finalScore - BASELINE,
    factors: {
      vulscan: {
        score: vulscanScore,
        adjustment: Math.round(vulscanAdjustment),
        status: vulscanScore === null ? "pending" : "included",
        weight: "Vulnerability posture · up to +110 / -190 points"
      },
      vpentest: {
        score: vpentestScore,
        adjustment: Math.round(vpentestAdjustment),
        status: vpentestScore === null ? "pending" : "included",
        weight: "Validated attack resilience · up to +90 / -160 points"
      }
    },
    data_completeness: [vulscanScore, vpentestScore].filter(value => value !== null).length / 2
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestedOrganization = String(body.organization_id || "").trim();
    const organizationId = requestedOrganization && user.role === "admin"
      ? requestedOrganization
      : String(user.organization_id || `individual:${user.id}`);
    let organizationName = String(user.full_name || user.email || "My organization");

    if (user.organization_id && !String(organizationId).startsWith("individual:")) {
      try {
        const organizations = await base44.asServiceRole.entities.Organization.filter({ id: organizationId });
        if (organizations[0]?.name) organizationName = organizations[0].name;
      } catch (_) {
        // The rating still works if an organization display name is unavailable.
      }
    }

    const existingRows = await base44.asServiceRole.entities.CCISecurityRating.filter({ organization_id: organizationId });
    const existing = existingRows[0] || null;
    const isSave = body.action === "save";

    const vulscanScore = isSave
      ? normalizeInput(body.vulscan_score)
      : normalizeInput(existing?.vulscan_score);
    const vpentestScore = isSave
      ? normalizeInput(body.vpentest_score)
      : normalizeInput(existing?.vpentest_score);
    const result = calculate(vulscanScore, vpentestScore);
    const calculatedAt = new Date().toISOString();

    if (isSave) {
      const record = {
        organization_id: organizationId,
        organization_name: organizationName,
        vulscan_score: vulscanScore,
        vpentest_score: vpentestScore,
        vulscan_source: vulscanScore === null ? "pending" : "manual",
        vpentest_source: vpentestScore === null ? "pending" : "manual",
        ...result,
        calculation_version: MODEL_VERSION,
        calculated_at: calculatedAt,
        external_references: existing?.external_references || {}
      };
      if (existing) await base44.asServiceRole.entities.CCISecurityRating.update(existing.id, record);
      else await base44.asServiceRole.entities.CCISecurityRating.create(record);
    }

    return Response.json({
      organization_id: organizationId,
      organization_name: existing?.organization_name || organizationName,
      vulscan_score: vulscanScore,
      vpentest_score: vpentestScore,
      vulscan_source: isSave ? (vulscanScore === null ? "pending" : "manual") : (existing?.vulscan_source || "pending"),
      vpentest_source: isSave ? (vpentestScore === null ? "pending" : "manual") : (existing?.vpentest_source || "pending"),
      ...result,
      calculation_version: MODEL_VERSION,
      calculated_at: isSave ? calculatedAt : (existing?.calculated_at || null),
      persisted: Boolean(existing || isSave),
      api_ready: true,
      scale: { minimum: MIN_SCORE, maximum: MAX_SCORE }
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
