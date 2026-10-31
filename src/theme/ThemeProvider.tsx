// Theme context (M3): reads themes from taxonomy/themes.json via the catalog
// client, persists the selection, and applies the token map to the document
// element's [data-theme] scope. Tokens live on <html> (not just the wrapper)
// so portals mounted under document.body inherit them too. No theme colors are
// defined in this source file.
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
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

  // Apply the resolved theme on the document element, not just the wrapper:
  // portals (inspector, expanded preview, compare) mount under document.body
  // and could never see the --rl-* tokens otherwise, which left them with a
  // transparent background. useLayoutEffect applies tokens before first paint.
  const theme = useMemo(
    () => resolveThemeId(selection, themesFromTaxonomy, prefersDark),
    [selection, prefersDark],
  );
  useLayoutEffect(() => {
    const root = document.documentElement;
    const tokens = theme.tokens as unknown as Record<string, string>;
    root.dataset.theme = theme.id;
    for (const [name, value] of Object.entries(tokens)) root.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(tokens)) root.style.removeProperty(name);
      if (root.dataset.theme === theme.id) delete root.dataset.theme;
    };
  }, [theme]);

  const contextValue = useMemo<ThemeContextValue>(() => {
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
    // setThemeId is stable per render (plain closure); theme derives from
    // selection/prefersDark, so those are the dependencies.
  }, [selection, prefersDark]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <div className="theme-scope">{children}</div>
    </ThemeContext.Provider>
  );
}
