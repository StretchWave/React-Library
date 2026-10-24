// TypeScript mirrors of catalog schema v2 (MASTER_SPEC.md §5, docs/SCHEMA.md).
// Keep in exact sync with scripts/lib/catalog.mjs; the validator is the enforcer.

export type EntryStatus = "stable" | "beta" | "experimental" | "deprecated";
export type ThemeBase = "light" | "dark";
/** v2: "local" = implementation available in-repo; "external" = metadata + official retrieval only. Absent → "local". */
export type EntryType = "local" | "external";
/** v2: how this entry renders a preview in the app. */
export type PreviewType = "local-demo" | "static" | "external" | "source-link" | "none";

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

export interface EntryPreview {
  type: PreviewType;
  url?: string;
  note?: string;
}

export interface EntryLicense {
  spdx?: string;
  attribution?: string;
  note?: string;
  url?: string;
}

export interface EntryDependency {
  name: string;
  reason?: string;
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
  // --- v2 fields (all optional; absent → legacy local entry)
  entryType?: EntryType;
  source?: string;
  sourceUrl?: string;
  externalId?: string;
  retrieval?: string;
  preview?: EntryPreview;
  localDir?: string;
  manifest?: string;
  implementation?: string[];
  dependencies?: EntryDependency[];
  license?: EntryLicense;
  aesthetics?: string[];
  attributes?: string[];
  syncedAt?: string;
  // --- M6 correction: animation runtime of a vendored component's preview
  // engine ("css" | "dom" | "gsap" | "motion" | "physics" | "webgl" |
  // "tailwind" | "three"); absent for classic in-app demo entries.
  runtime?: string;
  // --- M6 correction: expensive preview — workspace-only auto-play; gallery
  // cards render a placeholder until the preview workspace opens it.
  heavy?: boolean;
}

/** True entry type, applying the "absent means local" default. */
export function entryTypeOf(entry: CatalogEntry): EntryType {
  return entry.entryType ?? "local";
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

export interface AestheticDoc {
  id: string;
  label: string;
}

export interface AestheticsFile {
  schemaVersion: number;
  description?: string;
  aesthetics: AestheticDoc[];
}

export interface AttributeDoc {
  id: string;
  label: string;
  group?: "appearance" | "motion" | "tech";
}

export interface AttributesFile {
  schemaVersion: number;
  description?: string;
  attributes: AttributeDoc[];
}

export interface SourceDoc {
  id: string;
  name: string;
  url: string;
  repo?: string | null;
  accessMethod: string;
  status: "available" | "partial" | "reference-only" | "requires-auth" | "unavailable";
  license: string;
  auth?: string | null;
  limit?: string | null;
  notes: string;
  evaluatedAt?: string;
}

export interface SourcesFile {
  schemaVersion: number;
  description?: string;
  statuses?: SourceDoc["status"][];
  sources: SourceDoc[];
}
