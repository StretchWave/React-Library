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

  it("matches across name/summary/tags/aliases/classification", () => {
    // "input" is an exact alias of text-input and must outrank everything.
    expect(searchEntries(entries, "input")[0].id).toBe("text-input");
    // "feedback" is a tag on both alerts and a component type on Animated List.
    const feedback = searchEntries(entries, "feedback").map((entry) => entry.id);
    expect(feedback.slice(0, 2)).toEqual(["alert", "shadcn-alert"]);
    expect(feedback).toContain("react-bits-animated-list");
    // "label": exact alias of badge outranks text-input's summary match.
    const labels = searchEntries(entries, "label").map((entry) => entry.id);
    expect(labels[0]).toBe("badge");
    expect(labels).toContain("text-input");
    // Arbitrary letter subsequences are not matches: "btn" is an alias only.
    expect(searchEntries(entries, "btn").map((entry) => entry.id)).toEqual(["button"]);
  });

  it("filters by category and theme", () => {
    expect(searchEntries(entries, "", { category: "buttons" }).map((e) => e.id)).toEqual([
      "button",
      "shadcn-button",
    ]);
    expect(searchEntries(entries, "btn", { category: "display" })).toEqual([]);
    expect(searchEntries(entries, "", { theme: "retro-terminal" })).toHaveLength(entries.length);
  });

  it("applies the v3 facets and AND/OR semantics", () => {
    // With the M6 correction every React Bits item got vendored (local), so the
    // real catalog has no external references left; assert that honestly.
    const externals = searchEntries(entries, "", { entryType: "external" });
    expect(externals).toHaveLength(0);
    // React Bits source filter → the 61 vendored items, all local entries.
    const reactBits = searchEntries(entries, "", { source: "react-bits" });
    expect(reactBits).toHaveLength(61);
    expect(reactBits.every((entry) => (entry.source ?? "").startsWith("react-bits") && entry.entryType === "local")).toBe(
      true,
    );
    expect(searchEntries(entries, "", { source: "shadcn" })).toHaveLength(16);
    expect(searchEntries(entries, "", { source: "built-in" })).toHaveLength(6);
    expect(searchEntries(entries, "", { vibe: "minimal" }).length).toBeGreaterThan(0);
    expect(searchEntries(entries, "", { tech: "particles" })).toEqual([]);

    const cursorBehaviors = searchEntries(entries, "", { behavior: "cursor-reactive" });
    expect(cursorBehaviors).toHaveLength(13);
    expect(cursorBehaviors.every((entry) => (entry.behaviors ?? []).includes("cursor-reactive"))).toBe(true);

    const buttons = searchEntries(entries, "", { type: "button" });
    expect(buttons.map((entry) => entry.id)).toEqual(expect.arrayContaining(["button", "shadcn-button"]));
    const eitherType = searchEntries(entries, "", { type: ["button", "input"] });
    expect(eitherType.length).toBeGreaterThan(buttons.length);
    // OR within one group, AND across groups.
    const hoverButtons = searchEntries(entries, "", { type: "button", trigger: "hover" });
    expect(hoverButtons.length).toBeGreaterThan(0);
    expect(hoverButtons.every((entry) => entry.types.includes("button") && entry.triggers.includes("hover"))).toBe(true);
    expect(hoverButtons.length).toBeLessThanOrEqual(buttons.length);
    const impossible = searchEntries(entries, "", { type: "button", trigger: "drag" });
    expect(impossible).toEqual([]);

    expect(searchEntries(entries, "", { previewMode: "external" })).toHaveLength(16);
    expect(searchEntries(entries, "", { previewMode: "live" })).toHaveLength(71);
  });
});

describe("hasActiveFilters", () => {
  it("detects text, category, and theme filters", () => {
    expect(hasActiveFilters("", {})).toBe(false);
    expect(hasActiveFilters(" btn ", {})).toBe(true);
    expect(hasActiveFilters("", { category: "display" })).toBe(true);
    expect(hasActiveFilters("", { theme: "classic-clean" })).toBe(true);
  });

  it("detects the v3 filters", () => {
    expect(hasActiveFilters("", { vibe: "minimal" })).toBe(true);
    expect(hasActiveFilters("", { source: "shadcn" })).toBe(true);
    expect(hasActiveFilters("", { tech: "tailwind" })).toBe(true);
    expect(hasActiveFilters("", { entryType: "external" })).toBe(true);
    expect(hasActiveFilters("", { type: "buttons" })).toBe(true);
    expect(hasActiveFilters("", { trigger: "mount" })).toBe(true);
    expect(hasActiveFilters("", { behavior: "hover" })).toBe(true);
    expect(hasActiveFilters("", { technique: "stagger" })).toBe(true);
    expect(hasActiveFilters("", { previewMode: "snapshot" })).toBe(true);
    expect(hasActiveFilters("", { type: [] })).toBe(false);
  });
});
