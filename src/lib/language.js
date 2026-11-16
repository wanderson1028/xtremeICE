/**
 * Single source of truth for the languages Xtreme I.C.E. supports.
 *
 * `promptName` is the English language name handed to content-generation
 * functions so generated text comes back in the language the user is
 * currently working in. Add a language here (plus its locale catalogs) and
 * the selector, persistence and generation prompts follow automatically.
 */
export const LANGUAGE_STORAGE_KEY = "lang";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", promptName: "English" },
  { code: "es", label: "Español", flag: "🇪🇸", promptName: "Spanish" },
  { code: "fr", label: "Français", flag: "🇫🇷", promptName: "French" },
  { code: "pl", label: "Polski", flag: "🇵🇱", promptName: "Polish" },
];

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((language) => language.code);

/** Coerce anything (browser locale, stale storage value, API echo) to a supported code. */
export function normalizeLanguage(code) {
  if (!code) return "en";
  const base = String(code).trim().toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_CODES.includes(base) ? base : "en";
}

/** The language the user last chose, read outside of React. */
export function currentLanguageCode() {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

/** English language name for generation prompts ("Spanish", "Polish", …). */
export function promptLanguageName(code) {
  const match = SUPPORTED_LANGUAGES.find((language) => language.code === normalizeLanguage(code));
  return (match || SUPPORTED_LANGUAGES[0]).promptName;
}

/** Persist the choice and hand back the normalised code. */
export function persistLanguage(code) {
  const normalized = normalizeLanguage(code);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // Private-mode storage failures must never block a language switch.
  }
  return normalized;
}