// TypeScript mirrors of catalog schema v1 (MASTER_SPEC.md §5, docs/SCHEMA.md).
// Keep in exact sync with scripts/lib/catalog.mjs; the validator is the enforcer.

export type EntryStatus = "stable" | "beta" | "experimental" | "deprecated";
export type ThemeBase = "light" | "dark";

export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
}

export interface EntryLinks {
  source?: string;
  demo?: string;
  docs?: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  summary: string;
  category: string;
  themes: string[];
  aliases: string[];
  tags: string[];
  status: EntryStatus;
  version: string;
  addedDate: string;
  externalDependencies: string[];
  props: PropDoc[];
  description?: string;
  owner?: string;
  links?: EntryLinks;
  a11yNotes?: string;
  usedFrom?: string[];
}

export interface CatalogMeta {
  title?: string;
  description?: string;
}

export interface CatalogFile {
  schemaVersion: number;
  meta?: CatalogMeta;
  entries: CatalogEntry[];
}

export interface ThemeDoc {
  id: string;
  label: string;
  base: ThemeBase;
  description: string;
  tokens: Record<string, string>;
}

export interface ThemesFile {
  schemaVersion: number;
  description?: string;
  themes: ThemeDoc[];
}

export interface CategoryDoc {
  id: string;
  label: string;
  description?: string;
}

export interface CategoriesFile {
  schemaVersion: number;
  description?: string;
  categories: CategoryDoc[];
}
