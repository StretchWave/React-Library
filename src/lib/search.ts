// Pure filtering/search logic for the app — semantic mirror of
// scripts/lib/catalog.mjs#searchEntries. Rules: AND across dimensions, OR
// within one dimension. Each dimension may be a single legacy string or an
// array for multi-select facets.
import type { CatalogEntry } from "../catalog/types";
import { entryTypeOf } from "../catalog/types";

/** Default attribute group order used by the UI (see taxonomy/attributes.json). */
export const ATTRIBUTE_GROUPS = ["appearance", "motion", "tech"] as const;

export type FacetValue = string | string[] | null | undefined;

export interface SearchFilters {
  theme?: FacetValue;
  category?: FacetValue;
  aesthetic?: FacetValue;
  /** v3 visual-vibe alias for aesthetic. */
  vibe?: FacetValue;
  source?: FacetValue;
  attribute?: FacetValue;
  /** v3 technical-attribute alias for attribute. */
  tech?: FacetValue;
  /** M7.1 interaction behaviour; independent from the animation trigger. */
  behavior?: FacetValue;
  /** v3 animation-trigger facet. */
  trigger?: FacetValue;
  type?: FacetValue;
  technique?: FacetValue;
  previewMode?: FacetValue;
  availability?: FacetValue;
  entryType?: FacetValue;
  status?: FacetValue;
}

export function valuesOf(value: FacetValue): string[] {
  if (value == null || value === "") return [];
  return (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
}

function includesAny(values: string[] | undefined, wanted: string[]): boolean {
  if (wanted.length === 0) return true;
  return (values ?? []).some((value) => wanted.includes(value));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

/** Field-level relevance. Deliberately avoids arbitrary subsequence hits:
 *  "btn" should not match every "animated content" description just because
 *  those letters occur in order. Typo tolerance is token-based instead. */
function fuzzyScore(query: string, target: string): number {
  if (!target) return 0;
  if (target === query) return 100;
  const compactQuery = query.replace(/\s+/g, "");
  const compactTarget = target.replace(/\s+/g, "");
  if (compactTarget === compactQuery) return 95;
  if (target.startsWith(query)) return 70;
  if (` ${target} `.includes(` ${query} `)) return 60;
  if (target.includes(query)) return 50;
  if (query.length >= 5) {
    for (const token of target.split(/\s+/)) {
      const distance = editDistance(query, token);
      if (distance <= 1) return 32;
      if (query.length >= 7 && distance <= 2) return 22;
    }
  }
  return 0;
}

function byId(a: CatalogEntry, b: CatalogEntry): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function matchesFilters(entry: CatalogEntry, filters: SearchFilters): boolean {
  const themes = valuesOf(filters.theme);
  const categories = valuesOf(filters.category);
  const types = valuesOf(filters.type);
  const triggers = valuesOf(filters.trigger);
  const behaviors = valuesOf(filters.behavior);
  const techniques = valuesOf(filters.technique);
  const vibes = valuesOf(filters.vibe ?? filters.aesthetic);
  const tech = valuesOf(filters.tech ?? filters.attribute);
  const sources = valuesOf(filters.source);
  const entryTypes = valuesOf(filters.entryType);
  const previews = valuesOf(filters.previewMode);
  const availability = valuesOf(filters.availability);
  const statuses = valuesOf(filters.status);

  if (themes.length > 0 && !includesAny(entry.themes, themes)) return false;
  if (categories.length > 0 && !categories.includes(entry.category)) return false;
  if (!includesAny(entry.types, types)) return false;
  if (triggers.length > 0 && !includesAny(entry.triggers, triggers)) return false;
  if (behaviors.length > 0 && !includesAny(entry.behaviors, behaviors)) return false;
  if (!includesAny(entry.techniques, techniques)) return false;
  if (!includesAny(entry.aesthetics, vibes)) return false;
  if (!includesAny(entry.attributes, tech)) return false;
  if (sources.length > 0) {
    const sourceHit = (entry.source ? sources.includes(entry.source) : false) || (!entry.source && sources.includes("built-in"));
    if (!sourceHit) return false;
  }
  if (entryTypes.length > 0 && !entryTypes.includes(entryTypeOf(entry))) return false;
  if (statuses.length > 0 && !statuses.includes(entry.status)) return false;
  if (previews.length > 0 && !previews.includes(entry.previewProfile?.mode ?? "unavailable")) return false;
  if (availability.length > 0) {
    const value = `${entryTypeOf(entry)}:${entry.previewProfile?.previewStatus ?? "unknown"}`;
    if (!availability.includes(value)) return false;
  }
  return true;
}

export function searchEntries(
  entries: CatalogEntry[],
  query: string,
  filters: SearchFilters = {},
): CatalogEntry[] {
  const candidates = entries.filter((entry) => matchesFilters(entry, filters)).sort(byId);
  const q = normalize(query);
  if (q === "") return candidates;

  return candidates
    .map((entry) => {
      const fields: Array<[string, number]> = [
        [entry.id, 100],
        [entry.name, 70],
        [entry.summary, 48],
        [entry.description ?? "", 36],
        [entry.aliases.join(" "), 55],
        [entry.tags.join(" "), 34],
        [entry.types.join(" "), 32],
        [entry.triggers.join(" "), 30],
        [entry.techniques.join(" "), 30],
        [(entry.aesthetics ?? []).join(" "), 24],
        [(entry.attributes ?? []).join(" "), 22],
        [entry.source ?? "", 18],
      ];
      let score = 0;
      for (const [value, weight] of fields) {
        const normalized = normalize(value);
        if (!normalized) continue;
        const fieldScore = fuzzyScore(q, normalized);
        if (fieldScore > 0) score = Math.max(score, Math.round(fieldScore * (weight / 100)));
      }
      // Exact identity signals outrank partial field hits regardless of field
      // order: an alias must beat a longer id that merely contains the query.
      const exactAlias = entry.aliases.some((alias) => normalize(alias) === q);
      if (normalize(entry.id) === q) score = 100;
      else if (exactAlias) score = Math.max(score, 95);
      else if (normalize(entry.name) === q) score = Math.max(score, 90);
      return { entry, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || byId(a.entry, b.entry))
    .map((hit) => hit.entry);
}

/** True when any filter/search value is active. */
export function hasActiveFilters(query: string, filters: SearchFilters): boolean {
  if (query.trim() !== "") return true;
  return Object.values(filters).some((value) => valuesOf(value).length > 0);
}

/** Counts each facet value across the current result set for sidebar hints. */
export function facetCounts(
  entries: CatalogEntry[],
  key: "types" | "triggers" | "techniques" | "aesthetics" | "attributes",
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    for (const value of entry[key] ?? []) counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
