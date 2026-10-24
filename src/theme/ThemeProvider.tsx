// Theme context (M3): reads themes from taxonomy/themes.json via the catalog
// client, persists the selection, and applies the token map on a scoped
// [data-theme] container. No theme colors are defined in this source file.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { themes as themesFromTaxonomy } from "../catalog/client";
import type { ThemeDoc } from "../catalog/types";
import {
  nextThemeId,
  readStoredThemeId,
  resolveThemeId,
  writeStoredThemeId,
} from "./theme";

interface ThemeContextValue {
  /** What the user picked (may be "auto" or an explicit theme id). */
  selection: string;
  /** The concrete, resolved theme record. */
  theme: ThemeDoc;
  /** Explicit theme records straight from the taxonomy. */
  themes: ThemeDoc[];
  setThemeId: (id: string) => void;
  cycleTheme: (delta: 1 | -1) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<string>(() => readStoredThemeId());
  const [prefersDark, setPrefersDark] = useState<boolean>(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setThemeId = (id: string) => {
    setSelection(id);
    writeStoredThemeId(id);
  };

  const contextValue = useMemo<ThemeContextValue>(() => {
    const theme = resolveThemeId(selection, themesFromTaxonomy, prefersDark);
    return {
      selection,
      theme,
      themes: themesFromTaxonomy,
      setThemeId,
      cycleTheme: (delta) => {
        const startId = themesFromTaxonomy.some((option) => option.id === selection)
          ? selection
          : theme.id;
        setThemeId(nextThemeId(startId, themesFromTaxonomy, delta).id);
      },
    };
    // setThemeId is stable per render (plain closure); include selection/prefersDark.
  }, [selection, prefersDark]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <div
        data-theme={contextValue.theme.id}
        className="theme-scope"
        style={contextValue.theme.tokens as unknown as CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
