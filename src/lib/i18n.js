import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import pl from "../locales/pl.json";

// Extended interface catalogs (navigation, auth, splash, admin, shared vocabulary).
// Kept in their own files so the original page catalogs stay untouched; they are
// deep-merged over the base catalog, with the extended keys winning.
import enUi from "../locales/en.ui.json";
import esUi from "../locales/es.ui.json";
import frUi from "../locales/fr.ui.json";
import plUi from "../locales/pl.ui.json";

import { normalizeLanguage, persistLanguage, currentLanguageCode } from "./language";

const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);

function mergeCatalogs(base, extra) {
  if (!isPlainObject(base) || !isPlainObject(extra)) return extra === undefined ? base : extra;
  const merged = { ...base };
  Object.keys(extra).forEach((key) => {
    merged[key] = isPlainObject(merged[key]) && isPlainObject(extra[key])
      ? mergeCatalogs(merged[key], extra[key])
      : extra[key];
  });
  return merged;
}

const resources = {
  en: { translation: mergeCatalogs(en, enUi) },
  es: { translation: mergeCatalogs(es, esUi) },
  fr: { translation: mergeCatalogs(fr, frUi) },
  pl: { translation: mergeCatalogs(pl, plUi) },
};

i18n.use(initReactI18next).init({
  resources,
  lng: currentLanguageCode(),
  fallbackLng: "en",
  // A missing translation falls back to English, then to the key itself.
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

function applyDocumentLanguage(code) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = normalizeLanguage(code);
}

applyDocumentLanguage(i18n.language);

// Persist every switch (selector, programmatic change) and keep <html lang> in sync
// so screen readers and browser translation heuristics match the visible language.
i18n.on("languageChanged", (code) => {
  const normalized = persistLanguage(code);
  applyDocumentLanguage(normalized);
});

export default i18n;