import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Clock, ChevronRight, X, BookOpen, Filter, Plus } from "lucide-react";
import { LAB_COURSES, VIRTUAL_LABS, LINUX_LABS, POWERSHELL_LABS } from "@/lib/labCatalog";

const DIFFICULTY_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 };

const DIFFICULTY_STYLE = {
  Beginner:     "bg-green-900/30 text-green-400 border-green-700/40",
  Intermediate: "bg-blue-900/30 text-blue-400 border-blue-700/40",
  Advanced:     "bg-orange-900/30 text-orange-400 border-orange-700/40",
  Expert:       "bg-red-900/30 text-red-400 border-red-700/40",
};

// Combine all labs with a "type" label
const ALL_LABS = [
  ...LAB_COURSES.map(l => ({ ...l, type: "Cybersecurity" })),
  ...VIRTUAL_LABS.map(l => ({ ...l, type: "Virtual Lab" })),
  ...LINUX_LABS.map(l => ({ ...l, type: "Linux" })),
  ...POWERSHELL_LABS.map(l => ({ ...l, type: "Windows" })),
];

const ALL_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"];
const ALL_TYPES = ["Cybersecurity", "Virtual Lab", "Linux", "Windows"];
const ALL_CATEGORIES = [...new Set(ALL_LABS.map(l => l.category))].sort();

function LabCard({ lab }) {
  return (
    <Link
      to={lab.route}
      className="group bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:border-red-700/50 hover:bg-gray-900/80 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-gray-100 text-sm font-medium leading-snug group-hover:text-white transition-colors line-clamp-2">
          {lab.title}
        </h3>
        <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-red-400 shrink-0 mt-0.5 transition-colors" />
      </div>
      <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{lab.description}</p>
      <div className="flex items-center gap-2 flex-wrap mt-auto">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_STYLE[lab.difficulty]}`}>
          {lab.difficulty}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
          {lab.type}
        </span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />{lab.duration}m
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {lab.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-800/60 text-gray-500 rounded">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function TrainingCatalog() {
  const [search, setSearch] = useState("");
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState("default");

  const toggleFilter = (value, list, setList) => {
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const filtered = useMemo(() => {
    let labs = ALL_LABS;

    if (search.trim()) {
      const q = search.toLowerCase();
      labs = labs.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q)) ||
        l.category.toLowerCase().includes(q)
      );
    }
    if (selectedDifficulties.length > 0) {
      labs = labs.filter(l => selectedDifficulties.includes(l.difficulty));
    }
    if (selectedTypes.length > 0) {
      labs = labs.filter(l => selectedTypes.includes(l.type));
    }
    if (selectedCategories.length > 0) {
      labs = labs.filter(l => selectedCategories.includes(l.category));
    }

    if (sortBy === "difficulty-asc") labs = [...labs].sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
    if (sortBy === "difficulty-desc") labs = [...labs].sort((a, b) => DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty]);
    if (sortBy === "duration-asc") labs = [...labs].sort((a, b) => a.duration - b.duration);
    if (sortBy === "duration-desc") labs = [...labs].sort((a, b) => b.duration - a.duration);
    if (sortBy === "title") labs = [...labs].sort((a, b) => a.title.localeCompare(b.title));

    return labs;
  }, [search, selectedDifficulties, selectedTypes, selectedCategories, sortBy]);

  const hasActiveFilters = selectedDifficulties.length > 0 || selectedTypes.length > 0 || selectedCategories.length > 0;

  const clearAll = () => {
    setSelectedDifficulties([]);
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100 tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-red-400" />
              Training Catalog
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{ALL_LABS.length} labs across cybersecurity, networking, Linux & Windows</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Showing <span className="text-white font-semibold">{filtered.length}</span> of {ALL_LABS.length} labs
            </div>
            <Link
              to="/lab-builder"
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" /> Create New Lab
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar Filters */}
        <aside className="w-56 shrink-0 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filters
            </span>
            {hasActiveFilters && (
              <button onClick={clearAll} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">Difficulty</p>
            <div className="space-y-1.5">
              {ALL_DIFFICULTIES.map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedDifficulties.includes(d)}
                    onChange={() => toggleFilter(d, selectedDifficulties, setSelectedDifficulties)}
                    className="rounded border-gray-600 bg-gray-800 accent-red-600"
                  />
                  <span className={`text-xs transition-colors ${selectedDifficulties.includes(d) ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>{d}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {ALL_LABS.filter(l => l.difficulty === d).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">Lab Type</p>
            <div className="space-y-1.5">
              {ALL_TYPES.map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleFilter(t, selectedTypes, setSelectedTypes)}
                    className="rounded border-gray-600 bg-gray-800 accent-red-600"
                  />
                  <span className={`text-xs transition-colors ${selectedTypes.includes(t) ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>{t}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {ALL_LABS.filter(l => l.type === t).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">Category</p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {ALL_CATEGORIES.map(c => (
                <label key={c} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c)}
                    onChange={() => toggleFilter(c, selectedCategories, setSelectedCategories)}
                    className="rounded border-gray-600 bg-gray-800 accent-red-600"
                  />
                  <span className={`text-xs transition-colors leading-snug ${selectedCategories.includes(c) ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>{c}</span>
                  <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                    {ALL_LABS.filter(l => l.category === c).length}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search + sort bar */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search labs, tools, topics..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-600 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-red-600"
            >
              <option value="default">Sort: Default</option>
              <option value="title">Title A–Z</option>
              <option value="difficulty-asc">Difficulty: Easy first</option>
              <option value="difficulty-desc">Difficulty: Hard first</option>
              <option value="duration-asc">Duration: Shortest</option>
              <option value="duration-desc">Duration: Longest</option>
            </select>
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[...selectedDifficulties, ...selectedTypes, ...selectedCategories].map(f => (
                <span key={f} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-red-900/30 border border-red-700/40 text-red-300 rounded-full">
                  {f}
                  <button
                    onClick={() => {
                      if (selectedDifficulties.includes(f)) toggleFilter(f, selectedDifficulties, setSelectedDifficulties);
                      else if (selectedTypes.includes(f)) toggleFilter(f, selectedTypes, setSelectedTypes);
                      else toggleFilter(f, selectedCategories, setSelectedCategories);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
              <BookOpen className="h-12 w-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">No labs match your filters.</p>
              <button onClick={clearAll} className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(lab => <LabCard key={lab.id} lab={lab} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}