import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-lg border border-red-900/40 bg-gray-950/60 p-0.5 shadow-sm">
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
          theme === "dark"
            ? "bg-gray-800 text-white shadow-sm"
            : "text-gray-400 hover:text-gray-200"
        }`}
        title="Dark theme"
      >
        <Moon className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Dark</span>
      </button>
      <button
        onClick={() => setTheme("soft-graphite")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
          theme === "soft-graphite"
            ? "bg-gradient-to-b from-cyan-500 to-cyan-600 text-white shadow-sm"
            : "text-gray-400 hover:text-gray-200"
        }`}
        title="Soft Graphite theme"
      >
        <Sun className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Soft Graphite</span>
      </button>
    </div>
  );
}