import React, { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Loader2, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";

export default function OrganizationPicker({ companies = [], loading, error, selectedId, onSelect, onRefresh, scope }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((company) => `${company.name || ""} ${company.id || ""}`.toLowerCase().includes(q));
  }, [companies, query]);

  const selected = companies.find((company) => company.id === selectedId) || null;
  const isAppAdmin = Boolean(scope?.platform_admin);
  const direction = !scope
    ? "Pick the vPenTest organization whose results should become training."
    : isAppAdmin
      ? "Pick the vPenTest organization whose results should become training. App admins can choose any organization."
      : `Pick the vPenTest organization for this exercise. Organization admins only see ${scope?.organization_name ? scope.organization_name : "their own organization"}.`;

  return (
    <section className="sg-panel sg-enter p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4" /> 1 · Organization
          </h2>
          <p className="sg-body mt-1" style={{ color: "#404040" }}>{direction}</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="sg-btn flex items-center gap-2 px-3 py-2 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh organizations
        </button>
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ borderColor: "#d4d4d4", background: "#f5f5f5", color: "#404040" }}>
        {isAppAdmin ? <ShieldCheck className="h-3 w-3" /> : <Users className="h-3 w-3" />}
        {!scope ? "Checking your access" : isAppAdmin ? "App admin · all organizations" : "Organization admin · own organization"}
      </p>

      {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{error}</p>}

      <div className="relative mt-3" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={loading && !companies.length}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="sg-input flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm"
        >
          <span className="min-w-0">
            {selected ? (
              <>
                <span className="block truncate font-semibold">{selected.name}</span>
                <span className="block truncate text-[10px]" style={{ color: "#404040" }}>{selected.id}</span>
              </>
            ) : (
              <span style={{ color: "#737373" }}>
                {loading && !companies.length ? "Loading organizations…" : "Select an organization"}
              </span>
            )}
          </span>
          {loading && !companies.length ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />}
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-xl border bg-white shadow-xl" style={{ borderColor: "#d4d4d4" }}>
            <label className="relative block border-b p-2" style={{ borderColor: "#e5e5e5" }}>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#737373" }} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search organizations"
                className="sg-input h-9 w-full pl-9 pr-3 text-sm"
              />
            </label>
            <div className="max-h-64 overflow-y-auto py-1" role="listbox">
              {filtered.length ? (
                filtered.map((company) => {
                  const isSelected = company.id === selectedId;
                  return (
                    <button
                      key={company.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => { onSelect(company); setOpen(false); setQuery(""); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${isSelected ? "bg-red-50" : "hover:bg-neutral-100"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{company.name || company.id}</span>
                        <span className="block truncate text-[10px]" style={{ color: "#404040" }}>{company.id}</span>
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" style={{ color: "#b91c1c" }} />}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-3 text-xs" style={{ color: "#404040" }}>
                  {companies.length ? "No organization matches that search." : "No organizations available for your account."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {!loading && !companies.length && !error && (
        <p className="mt-3 text-[11px]" style={{ color: "#404040" }}>
          {isAppAdmin ? "No vPenTest organizations were returned. Check the vPenTest connection in secret settings." : "No vPenTest organization is linked to your organization yet. Ask an app admin to link it."}
        </p>
      )}
    </section>
  );
}