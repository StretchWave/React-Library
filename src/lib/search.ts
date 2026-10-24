// Pure filtering/search logic for the app — semantic mirror of
// scripts/lib/catalog.mjs#searchEntries (MASTER_SPEC.md §8). Keep the two in
// lockstep; both suites must rank identically.
import type { CatalogEntry } from "../catalog/types";
import { entryTypeOf } from "../catalog/types";

/** Default attribute group order used by the UI (see taxonomy/attributes.json). */
export const ATTRIBUTE_GROUPS = ["appearance", "motion", "tech"] as const;

export interface SearchFilters {
  theme?: string | null;
  category?: string | null;
  aesthetic?: string | null;
  source?: string | null;
  attribute?: string | null;
  entryType?: string | null;
}

function rank(entry: CatalogEntry, q: string): number {
  if (entry.id === q) return 100;
  if (entry.aliases.includes(q)) return 80;
  if (entry.id.startsWith(q)) return 60;
  if (entry.id.includes(q)) return 50;
  if (entry.name.toLowerCase().includes(q)) return 40;
  if (entry.summary.toLowerCase().includes(q)) return 35;
  if (entry.tags.some((tag) => tag.includes(q))) return 25;
  if (entry.aliases.some((alias) => alias.includes(q))) return 20;
  if ((entry.aesthetics ?? []).some((a) => a.includes(q))) return 15;
  if ((entry.attributes ?? []).some((a) => a.includes(q))) return 12;
  if ((entry.source ?? "").includes(q)) return 10;
  return 0;
}

function byId(a: CatalogEntry, b: CatalogEntry): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function searchEntries(
  entries: CatalogEntry[],
  query: string,
  filters: SearchFilters = {},
): CatalogEntry[] {
  const candidates = entries
    .filter((entry) => {
      if (filters.theme && !entry.themes.includes(filters.theme)) return false;
      if (filters.category && entry.category !== filters.category) return false;
      if (filters.aesthetic && !(entry.aesthetics ?? []).includes(filters.aesthetic)) return false;
      if (filters.attribute && !(entry.attributes ?? []).includes(filters.attribute)) return false;
      if (filters.source && entry.source !== filters.source) return false;
      if (filters.entryType && entryTypeOf(entry) !== filters.entryType) return false;
      return true;
    })
    .sort(byId);
  const q = query.trim().toLowerCase();
  if (q === "") return candidates;
  return candidates
    .map((entry) => ({ entry, score: rank(entry, q) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || byId(a.entry, b.entry))
    .map((hit) => hit.entry);
}

/** True when any filter is active (drives the "Reset filters" affordance). */
export function hasActiveFilters(query: string, filters: SearchFilters): boolean {
  return (
    query.trim() !== "" ||
    Boolean(filters.category) ||
    Boolean(filters.theme) ||
    Boolean(filters.aesthetic) ||
    Boolean(filters.source) ||
    Boolean(filters.attribute) ||
    Boolean(filters.entryType)
  );
}
