import { useCallback, useMemo, useState } from "react";
import { DemoModeContext } from "./demoModeContext";
import { isDemoActive, setDemoActive } from "../services/demoSwitch";

export default function DemoModeProvider({ children }) {
  const [isDemo, setIsDemo] = useState(() => isDemoActive());

  const enterDemo = useCallback(() => { setDemoActive(true); setIsDemo(true); }, []);
  const exitDemo = useCallback(() => { setDemoActive(false); setIsDemo(false); }, []);

  const value = useMemo(() => ({ isDemo, enterDemo, exitDemo }), [isDemo, enterDemo, exitDemo]);
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}
