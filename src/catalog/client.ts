// Typed read access to the canonical data files.
// The app is a VIEW of the canonical catalog (catalog.json + taxonomy/*.json);
// all mutation lives in the hand-maintained files and stays validator-governed.
import catalogJson from "../../catalog/catalog.json";
import themesJson from "../../taxonomy/themes.json";
import categoriesJson from "../../taxonomy/categories.json";
import type {
  CatalogEntry,
  CatalogFile,
  CategoriesFile,
  CategoryDoc,
  ThemeDoc,
  ThemesFile,
} from "./types";

export const catalog = catalogJson as unknown as CatalogFile;
const themesDoc = themesJson as unknown as ThemesFile;
const categoriesDoc = categoriesJson as unknown as CategoriesFile;

export const entries: CatalogEntry[] = catalog.entries;
export const themes: ThemeDoc[] = themesDoc.themes;
export const categories: CategoryDoc[] = categoriesDoc.categories;

export const catalogCounts = {
  entries: entries.length,
  themes: themes.length,
  categories: categories.length,
} as const;

export function findEntry(id: string): CatalogEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

export function themeById(id: string): ThemeDoc | undefined {
  return themes.find((theme) => theme.id === id);
}

export function categoryById(id: string): CategoryDoc | undefined {
  return categories.find((category) => category.id === id);
}

/** Statuses in display order; drives status badges/chips in the browser UI. */
export const ENTRY_STATUSES = ["stable", "beta", "experimental", "deprecated"] as const;
