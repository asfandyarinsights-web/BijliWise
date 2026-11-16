// Pure preference logic: defaults, validation and safe localStorage access.
// Display preferences only. Nothing here touches the database.

export const STORAGE_KEY = "bijliwise.preferences.v1";

export const THEMES = ["system", "light", "dark", "oled"];
export const DATE_FORMATS = ["short", "dmy", "iso"];
export const PERIODS = ["3", "6", "12", "all"];

export const DEFAULT_PREFERENCES = Object.freeze({
  theme: "dark",
  dateFormat: "short",
  defaultPeriod: "6",
});

const ALLOWED = {
  theme: THEMES,
  dateFormat: DATE_FORMATS,
  defaultPeriod: PERIODS,
};

// Keeps every valid field and replaces anything missing, outdated or tampered with by its default.
export function sanitizePreferences(raw) {
  const source = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(ALLOWED)) {
    if (ALLOWED[key].includes(source[key])) result[key] = source[key];
  }
  return result;
}

export function samePreferences(a, b) {
  return Object.keys(ALLOWED).every((key) => a[key] === b[key]);
}

// Reading window.localStorage can itself throw (blocked cookies, some private modes).
export function getStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadPreferences(storage = getStorage()) {
  if (!storage) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? sanitizePreferences(JSON.parse(raw)) : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

// Returns true when the value is stored (or already stored), false when the browser refuses.
// Skips the write when nothing changed.
export function savePreferences(preferences, storage = getStorage()) {
  if (!storage) return false;
  try {
    const text = JSON.stringify(sanitizePreferences(preferences));
    if (storage.getItem(STORAGE_KEY) === text) return true;
    storage.setItem(STORAGE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

// "system" follows the operating system; the others are used as chosen.
// The result is always one of "light", "dark" or "oled".
export function resolveTheme(theme, systemPrefersDark) {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme === "light" || theme === "oled" ? theme : "dark";
}

// Non-React code (such as date formatting inside bill mapping) reads the active values here.
let activePreferences = { ...DEFAULT_PREFERENCES };
export const getActivePreferences = () => activePreferences;
export const setActivePreferences = (preferences) => {
  activePreferences = preferences;
};