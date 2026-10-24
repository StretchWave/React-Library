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
    expect(searchEntries(entries, "").map((entry) => entry.id)).toEqual([
      "alert",
      "badge",
      "button",
      "card",
      "tabs",
      "text-input",
    ]);
  });

  it("matches across name/summary/tags/aliases", () => {
    // "input" is an exact alias of text-input and must outrank everything.
    expect(searchEntries(entries, "input")[0].id).toBe("text-input");
    expect(searchEntries(entries, "feedback").map((entry) => entry.id)).toEqual(["alert"]);
    // "label": exact alias of badge (80) outranks text-input (summary match, 35).
    expect(searchEntries(entries, "label").map((entry) => entry.id)).toEqual([
      "badge",
      "text-input",
    ]);
  });

  it("filters by category and theme", () => {
    expect(searchEntries(entries, "", { category: "buttons" }).map((e) => e.id)).toEqual(["button"]);
    expect(searchEntries(entries, "btn", { category: "display" })).toEqual([]);
    expect(searchEntries(entries, "", { theme: "retro-terminal" })).toHaveLength(entries.length);
  });
});

describe("hasActiveFilters", () => {
  it("detects text, category, and theme filters", () => {
    expect(hasActiveFilters("", {})).toBe(false);
    expect(hasActiveFilters(" btn ", {})).toBe(true);
    expect(hasActiveFilters("", { category: "display" })).toBe(true);
    expect(hasActiveFilters("", { theme: "classic-clean" })).toBe(true);
  });
});
