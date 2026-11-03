import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThemeMode, ThemePaletteName } from "../theme";
interface ThemeState { mode: ThemeMode; resolved: ThemePaletteName; setMode(mode: ThemeMode): void }
const ThemeContext = createContext<ThemeState | null>(null);
export function ThemeProvider({ defaultMode, children }: { projectKey: string; defaultMode: ThemeMode; persist?: boolean; children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <ThemeContext.Provider value={{ mode, resolved: mode === "system" ? systemDark ? "dark" : "light" : mode, setMode }}>{children}</ThemeContext.Provider>;
}
export const useOptionalThemeMode = () => useContext(ThemeContext);
export function useThemeMode(): ThemeState {
  const state = useOptionalThemeMode();
  if (!state) throw new Error("Visual theme provider is missing");
  return state;
}
