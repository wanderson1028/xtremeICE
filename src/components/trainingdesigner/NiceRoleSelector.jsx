import React, { useMemo, useState } from "react";
import { Check, Search, Users, X } from "lucide-react";
import { NICE_CATEGORIES, NICE_WORK_ROLES } from "@/lib/niceDataset";

export default function NiceRoleSelector({ values = [], onToggle, onClear }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const selectedIds = useMemo(() => new Set(values.map((role) => role.id)), [values]);

  const roles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NICE_WORK_ROLES.filter((role) => {
      if (category && role.category !== category) return false;
      if (!q) return true;
      return (
        role.name.toLowerCase().includes(q) ||
        role.description.toLowerCase().includes(q) ||
        role.id.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <section className="sg-panel sg-enter p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4" /> 4 · Target NICE work roles
      </h2>
      <p className="sg-body mt-1" style={{ color: "#404040" }}>
        Pick one or more roles. The exercise is written across all of them, in their NICE Framework vocabulary.
      </p>

      {values.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold" style={{ color: "#7f1d1d" }}>
              {values.length} role{values.length === 1 ? "" : "s"} selected
            </span>
            <button type="button" onClick={onClear} className="sg-btn flex items-center gap-1 px-2 py-1 text-[10px]">
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {values.map((role) => (
              <span
                key={role.id}
                className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px]"
                style={{ borderColor: "#d4d4d4", color: "#171717" }}
              >
                <strong className="font-semibold">{role.name}</strong>
                <span style={{ color: "#525252" }}>· {role.category}</span>
                <button
                  type="button"
                  onClick={() => onToggle(role)}
                  aria-label={`Remove ${role.name}`}
                  className="rounded-full p-0.5 hover:bg-red-100"
                >
                  <X className="h-3 w-3" style={{ color: "#b91c1c" }} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#737373" }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search NICE work roles"
            className="sg-input h-10 w-full pl-9 pr-3 text-sm"
          />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="sg-input h-10 px-3 text-sm">
          <option value="">All categories</option>
          {NICE_CATEGORIES.map((item) => (
            <option key={item.id} value={item.name}>{item.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
        {roles.map((role) => {
          const isOn = selectedIds.has(role.id);
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onToggle(role)}
              aria-pressed={isOn}
              className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${isOn ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isOn ? "border-red-600 bg-red-600" : "border-[#a3a3a3] bg-white"}`}
              >
                {isOn && <Check className="h-3 w-3" style={{ color: "#fff" }} />}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{role.name}</span>
                  <span className="text-[10px]" style={{ color: "#404040" }}>{role.id} · {role.category}</span>
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: "#525252" }}>{role.description}</span>
              </span>
            </button>
          );
        })}
        {!roles.length && <p className="text-xs" style={{ color: "#404040" }}>No work roles match that search.</p>}
      </div>
    </section>
  );
}