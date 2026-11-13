import React, { useMemo, useState } from "react";
import { Building2, Loader2, RefreshCw, Search } from "lucide-react";

export default function OrganizationPicker({ companies = [], loading, error, selectedId, onSelect, onRefresh }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (company) =>
        String(company.name || "").toLowerCase().includes(q) ||
        String(company.id || "").toLowerCase().includes(q)
    );
  }, [companies, query]);

  return (
    <section className="sg-panel sg-enter p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4" /> 1 · Organization
          </h2>
          <p className="sg-body mt-1" style={{ color: "#404040" }}>
            Choose the vPenTest organization whose results you want to turn into training.
          </p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="sg-btn flex items-center gap-2 px-3 py-2 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh organizations
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{error}</p>}

      <label className="relative mt-4 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#737373" }} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search organizations"
          className="sg-input h-10 w-full pl-9 pr-3 text-sm"
        />
      </label>

      {loading && !companies.length ? (
        <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: "#404040" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading organizations from vPenTest…
        </p>
      ) : filtered.length ? (
        <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelect(company)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${selectedId === company.id ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white hover:border-red-400"}`}
            >
              <span className="block truncate font-semibold">{company.name || company.id}</span>
              <span className="mt-0.5 block truncate text-[10px]" style={{ color: "#404040" }}>{company.id}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs" style={{ color: "#404040" }}>
          No organizations returned. Check the vPenTest connection in secret settings.
        </p>
      )}
    </section>
  );
}