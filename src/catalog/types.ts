// TypeScript mirrors of catalog schema v3 (MASTER_SPEC.md §5, docs/SCHEMA.md).
// Keep in exact sync with scripts/lib/catalog.mjs; the validator is the enforcer.

export type EntryStatus = "stable" | "beta" | "experimental" | "deprecated";
export type ThemeBase = "light" | "dark";
/** v2: "local" = implementation available in-repo; "external" = metadata + official retrieval only. Absent → "local". */
export type EntryType = "local" | "external";
/** v2: how this entry renders a preview in the app. */
export type PreviewType = "local-demo" | "static" | "external" | "source-link" | "none";

export type PreviewMode = "live" | "snapshot" | "loop" | "external" | "unavailable";
export type PreviewLayout = "compact" | "standard" | "wide" | "showcase";
export type PreviewCost = "low" | "medium" | "high";
export type PreviewStatus = "ready" | "external" | "unavailable" | "error";
export type PreviewRequirement =
  | "webgl"
  | "canvas-2d"
  | "pointer"
  | "keyboard"
  | "scroll"
  | "gpu"
  | "user-input"
  | "reduced-motion";

/** v3: validated preview profile. The mode describes what a card can show;
 *  layout/cost are published by the canonical catalog, not guessed in the UI. */
export interface PreviewProfile {
  mode: PreviewMode;
  layout: PreviewLayout;
  cost: PreviewCost;
  aspectRatio: string;
  minWidth: number;
  minHeight: number;
  gridColumnSpan: number;
  gridRowSpan: number;
  expandedRecommended: boolean;
  requires: PreviewRequirement[];
  snapshotPath?: string;
  loopPath?: string;
  autoplayAllowed: boolean;
  previewStatus: PreviewStatus;
  failureReason?: string;
}

/** v3: provenance for assisted tags. Values are `facet:id` strings. */
export interface TagMeta {
  sourceProvided: string[];
  inferred: string[];
  reviewNeeded: boolean;
}

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
  /** M7.1: verified interaction behaviors (ids from taxonomy/behaviors.json).
   *  Absent → not yet classified (separate from `runtime`/`heavy`). */
  behaviors?: string[];
  syncedAt?: string;
  // --- M6 correction: animation runtime of a vendored component's preview
  // engine ("css" | "dom" | "gsap" | "motion" | "physics" | "webgl" |
  // "tailwind" | "three"); absent for classic in-app demo entries.
  runtime?: string;
  // --- M6 correction: expensive preview — workspace-only auto-play; gallery
  // cards render a placeholder until the preview workspace opens it.
  heavy?: boolean;
  // --- v3 discovery: independent multi-value facets, provenance and the
  // validated preview profile. Required by the v3 validator for every entry.
  types: string[];
  triggers: string[];
  techniques: string[];
  tagMeta: TagMeta;
  previewProfile: PreviewProfile;
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

/** M7.1: canonical interaction-behavior classification (taxonomy/behaviors.json).
 *  Describes what a component DOES with user input, separate from aesthetics
 *  (how it looks) and source/category; entries may carry many. */
export interface BehaviorDoc {
  id: string;
  label: string;
  description?: string;
}

export interface BehaviorsFile {
  schemaVersion: number;
  description?: string;
  behaviors: BehaviorDoc[];
}

/** v3 simple facet docs: component types, animation triggers and techniques. */
export interface FacetDoc {
  id: string;
  label: string;
  description?: string;
}

export interface ComponentTypesFile {
  schemaVersion: number;
  description?: string;
  types: FacetDoc[];
}
export interface TriggersFile {
  schemaVersion: number;
  description?: string;
  triggers: FacetDoc[];
}
export interface TechniquesFile {
  schemaVersion: number;
  description?: string;
  techniques: FacetDoc[];
}

export interface BlockedSourceRecord {
  label: string;
  reason: string;
  url?: string;
}

export interface SourceCoverage {
  discovered: number;
  usable: number;
  locked: number;
  reviewNeeded: number;
  blocked: BlockedSourceRecord[];
  checkedAt?: string;
  note?: string;
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
  coverage?: SourceCoverage;
}

export interface SourcesFile {
  schemaVersion: number;
  description?: string;
  statuses?: SourceDoc["status"][];
  sources: SourceDoc[];
}
