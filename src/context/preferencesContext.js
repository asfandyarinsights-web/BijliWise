import { createContext, useContext } from "react";
import { DEFAULT_PREFERENCES } from "../utils/preferences";

export const PreferencesContext = createContext(null);

// Used if a component is ever rendered outside the provider, so it never crashes.
const FALLBACK = {
  preferences: DEFAULT_PREFERENCES,
  resolvedTheme: "dark",
  storageOk: true,
  setPreference: () => {},
  resetPreferences: () => {},
};

export function usePreferences() {
  return useContext(PreferencesContext) ?? FALLBACK;
}