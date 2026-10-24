// Parity tests: the app-side search must rank/filter identically to the
// canonical tooling implementation (scripts/lib/catalog.mjs).
import { describe, expect, it } from "vitest";
import { entries } from "../catalog/client";
import { hasActiveFilters, searchEntries } from "./search";

describe("searchEntries (app side)", () => {
  it("ranks exact alias matches (parity with scripts/lib)", () => {
    expect(searchEntries(entries, "btn").map((entry) => entry.id)).toEqual(["button"]);
  });

  it("returns all entries sorted by id for an empty query", () => {
    const ids = searchEntries(entries, "").map((entry) => entry.id);
    expect(ids).toHaveLength(entries.length);
    expect(ids[0]).toBe("alert");
    expect(ids[ids.length - 1]).toBe("text-input");
    for (let i = 1; i < ids.length; i += 1) {
      expect(ids[i - 1] < ids[i]).toBe(true);
    }
    // v2 ingested entries ride along by id order (M5.2).
    expect(ids).toContain("shadcn-button");
    expect(ids).toContain("magic-ui-dot-pattern");
    expect(ids).toContain("react-bits-split-text");
  });

  it("matches across name/summary/tags/aliases", () => {
    // "input" is an exact alias of text-input and must outrank everything.
    expect(searchEntries(entries, "input")[0].id).toBe("text-input");
    // "feedback": the seeded alert and its ingested shadcn counterpart both match.
    expect(searchEntries(entries, "feedback").map((entry) => entry.id)).toEqual([
      "alert",
      "shadcn-alert",
    ]);
    // "label": exact alias of badge (80) outranks text-input (summary match, 35).
    expect(searchEntries(entries, "label").map((entry) => entry.id)).toEqual([
      "badge",
      "text-input",
    ]);
  });

  it("filters by category and theme", () => {
    expect(searchEntries(entries, "", { category: "buttons" }).map((e) => e.id)).toEqual([
      "button",
      "shadcn-button",
    ]);
    expect(searchEntries(entries, "btn", { category: "display" })).toEqual([]);
    expect(searchEntries(entries, "", { theme: "retro-terminal" })).toHaveLength(entries.length);
  });

  it("applies the v2 filters (aesthetic, source, attribute, entryType)", () => {
    const external = searchEntries(entries, "", { entryType: "external" });
    expect(external).toHaveLength(7);
    expect(external.every((entry) => (entry.source ?? "").startsWith("react-bits"))).toBe(true);
    expect(searchEntries(entries, "", { source: "react-bits" })).toEqual(external);
    expect(searchEntries(entries, "", { source: "shadcn" })).toHaveLength(16);
    expect(searchEntries(entries, "", { aesthetic: "minimal" }).length).toBeGreaterThan(0);
    expect(searchEntries(entries, "", { attribute: "particles" })).toEqual([]);
  });
});

describe("hasActiveFilters", () => {
  it("detects text, category, and theme filters", () => {
    expect(hasActiveFilters("", {})).toBe(false);
    expect(hasActiveFilters(" btn ", {})).toBe(true);
    expect(hasActiveFilters("", { category: "display" })).toBe(true);
    expect(hasActiveFilters("", { theme: "classic-clean" })).toBe(true);
  });

  it("detects the v2 filters", () => {
    expect(hasActiveFilters("", { aesthetic: "minimal" })).toBe(true);
    expect(hasActiveFilters("", { source: "shadcn" })).toBe(true);
    expect(hasActiveFilters("", { attribute: "tailwind" })).toBe(true);
    expect(hasActiveFilters("", { entryType: "external" })).toBe(true);
  });
});
