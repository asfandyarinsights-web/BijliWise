import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PreferencesContext } from "./preferencesContext";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  resolveTheme,
  samePreferences,
  sanitizePreferences,
  savePreferences,
  setActivePreferences,
} from "../utils/preferences";

const DARK_QUERY = "(prefers-color-scheme: dark)";

// Follows the operating system's light/dark setting live, with no reload.
function subscribeToSystemTheme(callback) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(DARK_QUERY);
  if (query.addEventListener) {
    query.addEventListener("change", callback);
    return () => query.removeEventListener("change", callback);
  }
  query.addListener(callback); // older Safari
  return () => query.removeListener(callback);
}

const systemPrefersDark = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia) && window.matchMedia(DARK_QUERY).matches;

export default function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    const loaded = loadPreferences();
    setActivePreferences(loaded);
    return loaded;
  });
  const [storageOk, setStorageOk] = useState(true);
  const latest = useRef(preferences);

  const systemDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark, () => true);
  const resolvedTheme = resolveTheme(preferences.theme, systemDark);

  // The one place the page's theme is applied. The CSS reads this attribute.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const commit = useCallback((next) => {
    if (samePreferences(latest.current, next)) return;
    latest.current = next;
    setActivePreferences(next);
    setPreferences(next);
    setStorageOk(savePreferences(next));
  }, []);

  const setPreference = useCallback(
    (key, value) => commit(sanitizePreferences({ ...latest.current, [key]: value })),
    [commit]
  );
  const resetPreferences = useCallback(() => commit({ ...DEFAULT_PREFERENCES }), [commit]);

  const value = useMemo(
    () => ({ preferences, resolvedTheme, storageOk, setPreference, resetPreferences }),
    [preferences, resolvedTheme, storageOk, setPreference, resetPreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}