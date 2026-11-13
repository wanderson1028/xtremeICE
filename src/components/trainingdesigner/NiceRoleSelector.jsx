import React, { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { NICE_CATEGORIES, NICE_WORK_ROLES } from "@/lib/niceDataset";

export default function NiceRoleSelector({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

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
        <Users className="h-4 w-4" /> 4 · Target NICE work role
      </h2>
      <p className="sg-body mt-1" style={{ color: "#404040" }}>
        The exercise is written for the role you pick, in that role's NICE Framework vocabulary.
      </p>

      {value && (
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>
          Selected: <strong>{value.name}</strong> · {value.category}
        </p>
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
          const isOn = value?.id === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange(role)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${isOn ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{role.name}</span>
                <span className="text-[10px]" style={{ color: "#404040" }}>{role.id} · {role.category}</span>
              </span>
              <span className="mt-0.5 block text-[11px]" style={{ color: "#525252" }}>{role.description}</span>
            </button>
          );
        })}
        {!roles.length && <p className="text-xs" style={{ color: "#404040" }}>No work roles match that search.</p>}
      </div>
    </section>
  );
}