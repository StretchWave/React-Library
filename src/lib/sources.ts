// Source coverage derived from canonical entries + taxonomy coverage records.
// Counts are never hard-coded in the UI and never claim that an unenumerated
// library is complete: `discovered` means "tracked by this project".
import type { BlockedSourceRecord, CatalogEntry, SourceDoc } from "../catalog/types";
import { sourceById, sources } from "../catalog/client";

export interface SourceStats {
  discovered: number;
  imported: number;
  previewReady: number;
  usable: number;
  locked: number;
  blocked: number;
  reviewNeeded: number;
  checkedAt?: string;
  note?: string;
  blockedRecords: BlockedSourceRecord[];
}

export interface SourceGroup {
  id: string;
  name: string;
  url?: string;
  status: SourceDoc["status"] | "built-in";
  accessMethod: string;
  license: string;
  auth?: string | null;
  limit?: string | null;
  notes: string;
  entries: CatalogEntry[];
  stats: SourceStats;
  source?: SourceDoc;
}

export function computeSourceStats(source: SourceDoc | undefined, entries: CatalogEntry[]): SourceStats {
  const coverage = source?.coverage;
  return {
    discovered: coverage?.discovered ?? entries.length,
    imported: entries.length,
    previewReady: entries.filter((entry) => entry.previewProfile?.previewStatus === "ready").length,
    usable: coverage?.usable ?? entries.length,
    locked: coverage?.locked ?? 0,
    blocked: coverage?.blocked?.length ?? 0,
    reviewNeeded:
      (coverage?.reviewNeeded ?? 0) + entries.filter((entry) => entry.tagMeta?.reviewNeeded).length,
    checkedAt: coverage?.checkedAt,
    note: coverage?.note,
    blockedRecords: coverage?.blocked ?? [],
  };
}

export function sourceGroups(entries: CatalogEntry[], docs: SourceDoc[] = sources): SourceGroup[] {
  const groups: SourceGroup[] = docs.map((source) => {
    const sourceEntries = entries.filter((entry) => entry.source === source.id);
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      status: source.status,
      accessMethod: source.accessMethod,
      license: source.license,
      auth: source.auth,
      limit: source.limit,
      notes: source.notes,
      entries: sourceEntries,
      stats: computeSourceStats(source, sourceEntries),
      source,
    };
  });
  const builtIn = entries.filter((entry) => !entry.source);
  groups.unshift({
    id: "built-in",
    name: "React Library (built-in)",
    status: "built-in",
    accessMethod: "local-source",
    license: "Repository license",
    notes: "Hand-authored components that ship with this app.",
    entries: builtIn,
    stats: computeSourceStats(undefined, builtIn),
  });
  return groups.sort((a, b) => b.stats.imported - a.stats.imported || a.name.localeCompare(b.name));
}

export function coverageTotals(groups: SourceGroup[]): Omit<SourceStats, "checkedAt" | "note" | "blockedRecords"> {
  return groups.reduce(
    (total, group) => ({
      discovered: total.discovered + group.stats.discovered,
      imported: total.imported + group.stats.imported,
      previewReady: total.previewReady + group.stats.previewReady,
      usable: total.usable + group.stats.usable,
      locked: total.locked + group.stats.locked,
      blocked: total.blocked + group.stats.blocked,
      reviewNeeded: total.reviewNeeded + group.stats.reviewNeeded,
    }),
    { discovered: 0, imported: 0, previewReady: 0, usable: 0, locked: 0, blocked: 0, reviewNeeded: 0 },
  );
}

export function sourceLabel(id: string | undefined): string {
  if (!id) return "Built-in";
  return sourceById(id)?.name ?? id;
}

export function sourceStatusLabel(status: SourceGroup["status"]): string {
  if (status === "built-in") return "Built-in";
  if (status === "available") return "Available";
  if (status === "partial") return "Partial access";
  if (status === "reference-only") return "Reference only";
  if (status === "requires-auth") return "Requires auth";
  return "Unavailable";
}
