// Pure theme logic — no React, no DOM. Everything reads from the taxonomy via
// the catalog client; there are no theme colors defined in source anywhere.
import type { ThemeDoc } from "../catalog/types";

export const THEME_STORAGE_KEY = "rl.theme";
export const AUTO_THEME_ID = "auto";

export function readStoredThemeId(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? AUTO_THEME_ID;
  } catch {
    return AUTO_THEME_ID;
  }
}

export function writeStoredThemeId(id: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Storage unavailable (private mode, etc.) — persistence is best-effort.
  }
}

/** Resolves the user's selection (possibly "auto" or an invalid id like an
 *  extinct theme) to a concrete theme record. Resolution mirrors MASTER_SPEC.md
 *  §10 M3: auto follows prefers-color-scheme; invalid ids behave like auto. */
export function resolveThemeId(
  selected: string,
  themes: ThemeDoc[],
  prefersDark: boolean,
): ThemeDoc {
  const explicit = themes.find((theme) => theme.id === selected);
  if (explicit) return explicit;
  const base = prefersDark ? "dark" : "light";
  return themes.find((theme) => theme.base === base) ?? themes[0];
}

/** Steps through the explicit theme ids (cycling); never lands on "auto". */
export function nextThemeId(currentId: string, themes: ThemeDoc[], delta: 1 | -1): ThemeDoc {
  const current = themes.find((theme) => theme.id === currentId);
  const currentIndex = current
    ? themes.indexOf(current)
    : delta === 1
      ? -1
      : 0;
  const nextIndex = (currentIndex + delta + themes.length) % themes.length;
  return themes[nextIndex] ?? themes[0];
}

/** True when the stored selection names an explicit theme. */
export function isExplicitThemeId(id: string, themes: ThemeDoc[]): boolean {
  return themes.some((theme) => theme.id === id);
}
