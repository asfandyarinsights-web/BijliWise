import { createContext, useContext } from "react";

export const DemoModeContext = createContext(null);

const FALLBACK = { isDemo: false, enterDemo: () => {}, exitDemo: () => {} };

export function useDemoMode() {
  return useContext(DemoModeContext) ?? FALLBACK;
}
