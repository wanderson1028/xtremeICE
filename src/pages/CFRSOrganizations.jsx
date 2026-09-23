import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, Gauge, History, Loader2, Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";

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

export default function CFRSOrganizations() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await base44.functions.invoke("getCCIAssessments", {});
        setHistory(response.data.assessments || []);
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
    <div className="min-h-screen bg-[#070c18] text-slate-100">
      <div className="mx-auto max-w-[1480px] px-4 py-7 lg:px-7">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-cyan-500/20 pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.24em] text-cyan-300">
              <Gauge className="h-4 w-4" /> Capital Intelligence
            </div>
            <h1 className="text-2xl font-semibold lg:text-3xl">Saved CFRS Organizations</h1>
            <p className="mt-1 text-sm text-slate-400">Select an organization to open its dedicated score, history, profile, and evidence workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/CFRS" className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800">
              <ArrowLeft className="h-3.5 w-3.5" /> Main CFRS
            </a>
            <a href="/CFRS?new=1" className="flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300">
              <Plus className="h-3.5 w-3.5" /> Add Organization
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-950/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-cyan-300" /> Organizations
              </div>
              <p className="mt-1 text-xs text-slate-500">One consolidated CFRS card per organization.</p>
            </div>
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search organizations"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          {loading ? (
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading organizations…
            </div>
          ) : organizations.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((organization) => {
                const score = organizationRollup(history, organization);
                const count = new Set(
                  history
                    .filter((assessment) => assessment.organization_id === organization.organization_id)
                    .map((assessment) => assessment.report_fingerprint || assessment.id)
                ).size;
                return (
                  <button
                    key={organization.organization_id}
                    type="button"
                    onClick={() => openOrganization(organization.organization_id)}
                    className="rounded-xl border border-slate-800 bg-slate-900/45 p-4 text-left transition hover:border-cyan-400/60 hover:bg-cyan-950/15"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-cyan-300" />
                          <div className="truncate text-sm font-semibold">{organization.business_name}</div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                          <CalendarDays className="h-3 w-3" /> {new Date(evidenceTime(organization)).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-cyan-300">{score}</div>
                        <div className="text-[9px] uppercase text-slate-500">{ratingFor(score)}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[10px]">
                      <span className="text-emerald-300">{count} assessment{count === 1 ? "" : "s"}</span>
                      <span className="text-cyan-300">Open organization →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-800 p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-600" />
              <div className="mt-3 text-sm font-semibold">No organizations found</div>
              <p className="mt-1 text-xs text-slate-500">Add an organization and complete its first assessment to create its saved CFRS record.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
