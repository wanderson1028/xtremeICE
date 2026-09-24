import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, Gauge, History, Loader2, Plus, Search, Inbox, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SoftGraphiteStyle from "@/components/cfrs/SoftGraphiteStyle";
import SemanticBadge from "@/components/cfrs/SemanticBadge";
import EmptyState from "@/components/cfrs/EmptyState";
import SkeletonGrid from "@/components/cfrs/Skeleton";

const CFRS_VERSION = "CFRS-ASSESS-2026.16";
const CFRS_BASELINE = 600;
const CFRS_MIN = -500;
const CFRS_MAX = 1000;

const evidenceTime = (assessment) => {
  const authoritative = new Date(assessment?.source_assessment_date || "").getTime();
  if (Number.isFinite(authoritative)) return authoritative;
  const dates = Object.values(assessment?.assessment_dates || {})
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  return dates.length ? Math.max(...dates) : new Date(assessment?.analyzed_at || assessment?.created_date || 0).getTime();
};

const assessmentScore = (assessment) =>
  Number(assessment?.scoring_breakdown?.rating?.current_assessment_score ?? assessment?.final_score ?? CFRS_BASELINE);

const ratingFor = (score) =>
  score >= 900 ? "Exceptional" :
  score >= 750 ? "Strong" :
  score >= 600 ? "Good" :
  score >= 450 ? "Fair" :
  score >= 250 ? "Poor" :
  score >= 1 ? "Critical" :
  score >= -249 ? "Distressed" : "Extreme Risk";

// Zone color palette — extends the ScoreBar gradient hues across all 8 rating zones.
const zoneColor = (score) => {
  if (score >= 900) return { color: "#0f9d58", wash: "#0f9d5812" };       // Exceptional — emerald
  if (score >= 750) return { color: "#22c55e", wash: "#22c55e12" };       // Strong — green
  if (score >= 600) return { color: "#84cc16", wash: "#84cc1612" };       // Good — lime
  if (score >= 450) return { color: "#facc15", wash: "#facc1512" };       // Fair — amber
  if (score >= 250) return { color: "#f97316", wash: "#f9731612" };       // Poor — orange
  if (score >= 1)   return { color: "#ef4444", wash: "#ef444412" };       // Critical — red
  if (score >= -249) return { color: "#b91c1c", wash: "#b91c1c12" };      // Distressed — deep red
  return { color: "#7f1d1d", wash: "#7f1d1d12" };                        // Extreme Risk — burgundy
};

const organizationRollup = (history, current) => {
  const organizationRows = history.filter(
    (assessment) => assessment.organization_id === current.organization_id && assessment.status === "completed"
  );
  const versioned = organizationRows.filter((assessment) => assessment.calculation_version === CFRS_VERSION);
  const eligible = versioned.length ? versioned : organizationRows;
  const sorted = [...eligible].sort(
    (a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0)
  );
  const latest = sorted.find((assessment) => assessment.is_current_rating) || sorted[0] || current;
  return Number(latest?.final_score ?? current?.final_score ?? CFRS_BASELINE);
};

const organizationTrend = (history, current) => {
  const orgRows = history.filter((a) => a.organization_id === current.organization_id && a.status === "completed");
  const versioned = orgRows.filter((a) => a.calculation_version === CFRS_VERSION);
  const eligible = versioned.length ? versioned : orgRows;
  const sorted = [...eligible].sort((a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0));
  if (sorted.length < 2) return null;
  return assessmentScore(sorted[0]) - assessmentScore(sorted[1]);
};

export default function CFRSOrganizations() {
  const [history, setHistory] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await base44.functions.invoke("getCCIAssessments", {});
        setHistory(response.data.assessments || []);
        setRatings(response.data.ratings || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const organizations = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => evidenceTime(b) - evidenceTime(a) || new Date(b.analyzed_at || 0) - new Date(a.analyzed_at || 0)
    );
    const cards = Array.from(new Map(sorted.map((assessment) => [assessment.organization_id, assessment])).values());
    const query = search.trim().toLowerCase();
    return query ? cards.filter((assessment) => assessment.business_name?.toLowerCase().includes(query)) : cards;
  }, [history, search]);

  const openOrganization = (organizationId) => {
    window.location.href = `/CFRS?organization=${encodeURIComponent(organizationId)}`;
  };

  return (
    <div className="cfrs-sg min-h-screen">
      <SoftGraphiteStyle />
      <div className="mx-auto max-w-[1480px] px-4 py-7 lg:px-7">
        <header className="sg-enter mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "#d6dae2" }}>
          <div>
            <div className="sg-micro mb-2 flex items-center gap-2" style={{ color: "#0EA5C7" }}>
              <Gauge className="h-4 w-4" /> Capital Intelligence
            </div>
            <h1 className="text-2xl font-semibold lg:text-3xl">Saved CFRS Organizations</h1>
            <p className="sg-body mt-1" style={{ color: "#6b7280" }}>Select an organization to open its dedicated score, history, profile, and evidence workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/CFRS" className="sg-btn flex items-center gap-2 px-3 py-2 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Main CFRS
            </a>
            <a href="/CFRS?new=1" className="sg-btn-primary flex items-center gap-2 px-3 py-2 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add Organization
            </a>
          </div>
        </header>

        <section className="sg-panel sg-panel-hover sg-enter p-5" style={{ animationDelay: ".1s" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" style={{ color: "#0EA5C7" }} /> Organizations
              </div>
              <p className="sg-body mt-1" style={{ color: "#6b7280" }}>One consolidated CFRS card per organization.</p>
            </div>
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9aa1ad" }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search organizations"
                className="sg-input h-10 w-full pl-9 pr-3 text-sm"
              />
            </label>
          </div>

          {loading ? (
            <div className="mt-5"><SkeletonGrid count={6} /></div>
          ) : organizations.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((organization) => {
                const officialRating = ratings.find((rating) => rating.organization_id === organization.organization_id);
                const score = Number(officialRating?.final_score ?? organizationRollup(history, organization));
                const count = new Set(
                  history
                    .filter((assessment) => assessment.organization_id === organization.organization_id)
                    .map((assessment) => assessment.report_fingerprint || assessment.id)
                ).size;
                const zone = zoneColor(score);
                const trend = organizationTrend(history, organization);
                const TrendIcon = trend === null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
                const trendColor = trend === null ? "" : trend > 0 ? "#0f9d58" : trend < 0 ? "#dc2626" : "#9aa1ad";
                return (
                  <button
                    key={organization.organization_id}
                    type="button"
                    onClick={() => openOrganization(organization.organization_id)}
                    className="sg-panel sg-panel-hover p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0" style={{ color: "#0EA5C7" }} />
                          <div className="truncate text-sm font-semibold">{organization.business_name}</div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: "#6b7280" }}>
                          <CalendarDays className="h-3 w-3" /> {new Date(evidenceTime(organization)).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right rounded-lg px-3 py-2 -m-1" style={{ background: zone.wash }}>
                        <div className="flex items-center justify-end gap-1">
                          <div className="text-2xl font-semibold sg-tabular" style={{ color: zone.color }}>{score}</div>
                          {TrendIcon && <TrendIcon className="h-4 w-4 shrink-0" style={{ color: trendColor }} />}
                        </div>
                        <div className="sg-micro" style={{ color: zone.color }}>{ratingFor(score)}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-[10px]" style={{ borderColor: "#d6dae2" }}>
                      <SemanticBadge tone="success">{count} assessment{count === 1 ? "" : "s"}</SemanticBadge>
                      <span style={{ color: "#0EA5C7" }}>Open organization →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={Inbox}
                title="No organizations found"
                message="Add an organization and complete its first assessment to create its saved CFRS record."
                action={<a href="/CFRS?new=1" className="sg-btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Add Organization</a>}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}