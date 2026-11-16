import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES, normalizeLanguage } from "@/lib/language";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const active = normalizeLanguage(i18n.language);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === active) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Persistence and <html lang> are handled by the languageChanged listener in lib/i18n.
  const switchLang = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("a11y.languageSelector")}
        title={t("nav.language")}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:text-white hover:text-red-400 transition-all"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current.flag} {current.code.toUpperCase()}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("a11y.languageSelector")}
          className="absolute right-0 top-full mt-1 w-44 bg-gray-950 border border-red-900/40 rounded-xl shadow-xl z-50 py-1 overflow-hidden"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={active === lang.code}
              onClick={() => switchLang(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                ${active === lang.code
                  ? "bg-red-950/50 text-white font-medium"
                  : "text-gray-200 hover:text-white hover:bg-red-950/50"
                }`}
            >
              <span>{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {active === lang.code && <Check className="h-3.5 w-3.5 text-red-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}