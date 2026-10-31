// Source coverage is derived, never hand-typed. These tests pin the semantics:
// `discovered` means "tracked by this project", not "the library is complete".
import { describe, expect, it } from "vitest";
import { entries, sources } from "../catalog/client";
import type { CatalogEntry, SourceDoc } from "../catalog/types";
import {
  computeSourceStats,
  coverageTotals,
  sourceGroups,
  sourceLabel,
  sourceStatusLabel,
} from "./sources";

describe("computeSourceStats", () => {
  it("derives imported/preview-ready counts from entries and coverage from the taxonomy", () => {
    const source = sources.find((item) => item.id === "react-bits") as SourceDoc;
    const sourceEntries = entries.filter((entry) => entry.source === "react-bits");
    const stats = computeSourceStats(source, sourceEntries);
    expect(stats).toMatchObject({
      discovered: 61,
      imported: 61,
      previewReady: 61,
      usable: 61,
      locked: 0,
      blocked: 0,
      reviewNeeded: 0,
      checkedAt: "2026-10-28",
    });
    expect(stats.note).toContain("Sixty-one curated React Bits items");
    expect(stats.blockedRecords).toEqual([]);
  });

  it("keeps external previews out of preview-ready while retaining import coverage", () => {
    const source = sources.find((item) => item.id === "shadcn") as SourceDoc;
    const sourceEntries = entries.filter((entry) => entry.source === "shadcn");
    expect(sourceEntries).toHaveLength(16);
    expect(computeSourceStats(source, sourceEntries)).toMatchObject({
      discovered: 16,
      imported: 16,
      previewReady: 0,
      usable: 16,
      locked: 0,
      blocked: 0,
    });
  });

  it("counts review-needed entries in addition to coverage review flags", () => {
    const source = sources.find((item) => item.id === "codepen") as SourceDoc;
    const stats = computeSourceStats(source, []);
    expect(stats).toMatchObject({
      discovered: 1,
      imported: 0,
      previewReady: 0,
      usable: 0,
      locked: 1,
      blocked: 1,
      reviewNeeded: 1,
    });
    expect(stats.blockedRecords[0]?.label).toBe("Saved Multi-Page View Transition example");

    const shadcn = sources.find((item) => item.id === "shadcn") as SourceDoc;
    const shadcnEntries = entries.filter((entry) => entry.source === "shadcn");
    expect(computeSourceStats(shadcn, shadcnEntries).reviewNeeded).toBe(16);
  });

  it("falls back to entry counts for undocumented sources", () => {
    const entry = entries.find((item) => item.id === "button") as CatalogEntry;
    expect(computeSourceStats(undefined, [entry])).toMatchObject({
      discovered: 1,
      imported: 1,
      previewReady: 1,
      usable: 1,
      locked: 0,
      blocked: 0,
      reviewNeeded: 0,
      checkedAt: undefined,
      note: undefined,
    });
  });
});

describe("sourceGroups", () => {
  it("includes a derived built-in group and sorts by imported count", () => {
    const groups = sourceGroups(entries, sources);
    expect(groups.map((group) => group.id).slice(0, 4)).toEqual([
      "react-bits",
      "shadcn",
      "built-in",
      "magic-ui",
    ]);
    const builtIn = groups.find((group) => group.id === "built-in");
    expect(builtIn?.entries).toHaveLength(6);
    expect(builtIn?.status).toBe("built-in");
    expect(builtIn?.stats.imported).toBe(6);
    expect(builtIn?.stats.previewReady).toBe(6);
    expect(builtIn?.source).toBeUndefined();
  });

  it("totals discovered, imported, preview-ready, usable, locked, blocked and review-needed", () => {
    const totals = coverageTotals(sourceGroups(entries, sources));
    expect(totals).toEqual({
      discovered: 88,
      imported: 87,
      previewReady: 71,
      usable: 87,
      locked: 1,
      blocked: 7,
      reviewNeeded: 25,
    });
  });

  it("keeps every documented source even when nothing is imported", () => {
    const groups = sourceGroups(entries, sources);
    expect(groups).toHaveLength(sources.length + 1);
    for (const source of sources) {
      const group = groups.find((item) => item.id === source.id);
      expect(group, source.id).toBeTruthy();
      expect(group?.entries.every((entry) => entry.source === source.id)).toBe(true);
    }
  });

  it("reports blocked records without pretending an import exists", () => {
    const groups = sourceGroups(entries, sources);
    const getLayers = groups.find((group) => group.id === "getlayers");
    expect(getLayers?.stats.imported).toBe(0);
    expect(getLayers?.stats.blocked).toBeGreaterThan(0);
    expect(getLayers?.stats.blockedRecords[0]?.reason).toMatch(/redistribut/i);
    const uiverse = groups.find((group) => group.id === "uiverse");
    expect(uiverse?.stats.blockedRecords[0]?.reason).toMatch(/bulk/i);
  });
});

describe("source labels", () => {
  it("labels source ids and status values", () => {
    expect(sourceLabel(undefined)).toBe("Built-in");
    expect(sourceLabel("react-bits")).toBe("React Bits");
    expect(sourceLabel("unknown-source")).toBe("unknown-source");
    expect(sourceStatusLabel("built-in")).toBe("Built-in");
    expect(sourceStatusLabel("available")).toBe("Available");
    expect(sourceStatusLabel("partial")).toBe("Partial access");
    expect(sourceStatusLabel("reference-only")).toBe("Reference only");
    expect(sourceStatusLabel("requires-auth")).toBe("Requires auth");
    expect(sourceStatusLabel("unavailable")).toBe("Unavailable");
  });
});
