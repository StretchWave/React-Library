// Typed read access to the canonical data files.
// The app is a VIEW of the canonical catalog (catalog.json + taxonomy/*.json);
// all mutation lives in the hand-maintained files and stays validator-governed.
import catalogJson from "../../catalog/catalog.json";
import themesJson from "../../taxonomy/themes.json";
import categoriesJson from "../../taxonomy/categories.json";
import aestheticsJson from "../../taxonomy/aesthetics.json";
import attributesJson from "../../taxonomy/attributes.json";
import sourcesJson from "../../taxonomy/sources.json";
import type {
  AestheticDoc,
  AestheticsFile,
  AttributeDoc,
  AttributesFile,
  CatalogEntry,
  CatalogFile,
  CategoriesFile,
  CategoryDoc,
  SourceDoc,
  SourcesFile,
  ThemeDoc,
  ThemesFile,
} from "./types";

export const catalog = catalogJson as unknown as CatalogFile;
const themesDoc = themesJson as unknown as ThemesFile;
const categoriesDoc = categoriesJson as unknown as CategoriesFile;
const aestheticsDoc = aestheticsJson as unknown as AestheticsFile;
const attributesDoc = attributesJson as unknown as AttributesFile;
const sourcesDoc = sourcesJson as unknown as SourcesFile;

export const entries: CatalogEntry[] = catalog.entries;
export const themes: ThemeDoc[] = themesDoc.themes;
export const categories: CategoryDoc[] = categoriesDoc.categories;
export const aesthetics: AestheticDoc[] = aestheticsDoc.aesthetics;
export const attributes: AttributeDoc[] = attributesDoc.attributes;
export const sources: SourceDoc[] = sourcesDoc.sources;

export const catalogCounts = {
  entries: entries.length,
  themes: themes.length,
  categories: categories.length,
  aesthetics: aesthetics.length,
  sources: sources.length,
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

export function aestheticById(id: string): AestheticDoc | undefined {
  return aesthetics.find((aesthetic) => aesthetic.id === id);
}

export function sourceById(id: string): SourceDoc | undefined {
  return sources.find((source) => source.id === id);
}

/** Statuses in display order; drives status badges/chips in the browser UI. */
export const ENTRY_STATUSES = ["stable", "beta", "experimental", "deprecated"] as const;
