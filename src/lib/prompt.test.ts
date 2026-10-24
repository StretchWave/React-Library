// Master-prompt builder tests (M5.5). Facts in the generated prompt must be
// traceable to the canonical records — verified against the real catalog.
import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "../catalog/types";
import { entries, findEntry } from "../catalog/client";
import { buildMasterPrompt } from "./prompt";

const FULL_ENTRIES = [...entries];

describe("buildMasterPrompt (M5.5)", () => {
  it("returns an honest empty-selection prompt", () => {
    const prompt = buildMasterPrompt([], FULL_ENTRIES);
    expect(prompt).toContain("Selected components: 0");
    expect(prompt).toContain("No components are selected");
  });

  it("documents local entries through their recorded repo paths", () => {
    const button = findEntry("button")!;
    const prompt = buildMasterPrompt(["button"], FULL_ENTRIES);
    expect(prompt).toContain("# Master prompt — React Library component build");
    expect(prompt).toContain("## 1. Button (button) — local");
    expect(prompt).toContain(`- Source path in this repo: ${button.links?.source}`);
    // The six originals record no retrieval channel for local-only delivery.
    expect(button.retrieval).toBeUndefined();
    expect(prompt).not.toContain("Official retrieval (use exactly)");
    expect(prompt).not.toContain("- Manifest:");
  });

  it("documents vendored entries through manifest + implementation + hard facts", () => {
    const entry = findEntry("shadcn-button")!;
    const prompt = buildMasterPrompt(["shadcn-button"], FULL_ENTRIES);
    expect(entry.retrieval).toBeTruthy(); // vendored items still record the official channel
    expect(prompt).toContain(`- Manifest: ${entry.manifest}`);
    expect(prompt).toContain(`- Implementation files (copy verbatim): ${entry.implementation?.join(", ")}`);
    expect(prompt).toContain(`- Official retrieval (alternative channel): ${entry.retrieval}`);
    expect(prompt).toContain("MIT");
    if ((entry.dependencies ?? []).length > 0) {
      expect(prompt).toContain(`— needed by ${entry.name}`);
    }
  });

  it("carries the Commons Clause notice verbatim into vendored react-bits sections", () => {
    const entry = findEntry("react-bits-split-text")!;
    const prompt = buildMasterPrompt(["react-bits-split-text"], FULL_ENTRIES);
    expect(entry.entryType).toBe("local");
    expect(entry.runtime).toBe("gsap");
    expect(prompt).toContain("Split Text (React Bits) (react-bits-split-text) — local");
    expect(prompt).toContain(`- Manifest: ${entry.manifest}`);
    expect(prompt).toContain(`- Implementation files (copy verbatim): ${entry.implementation?.join(", ")}`);
    expect(prompt).toContain(`- Official retrieval (alternative channel): ${entry.retrieval}`);
    expect(prompt).toContain(`notice: ${entry.license?.note}`);
    expect(prompt).toContain("- Requires in the target project: gsap");
    expect(prompt).toContain("- Preview: live in the React Library preview workspace (runtime: gsap)");
  });

  it("never fabricates paths for external-reference records (synthetic catalog)", () => {
    const externalEntry = {
      id: "synthetic-ext",
      name: "Synthetic Ext",
      summary: "s",
      category: "display",
      themes: [],
      aliases: [],
      tags: [],
      status: "stable",
      version: "1.0.0",
      addedDate: "2026-10-24",
      externalDependencies: [],
      props: [],
      entryType: "external",
      source: "aceternity",
      sourceUrl: "https://example.test/a",
      retrieval: "official channel only",
      license: { spdx: "Custom", note: "no redistribution permitted" },
    } as unknown as CatalogEntry;
    const prompt = buildMasterPrompt(["synthetic-ext"], [externalEntry]);
    expect(prompt).toContain("Synthetic Ext (synthetic-ext) — external reference");
    expect(prompt).toContain("- Official retrieval (use exactly): official channel only");
    expect(prompt).toContain("- Preview: external only — rendered demo runs outside this app:");
    expect(prompt).not.toContain("- Source path in this repo:");
    expect(prompt).not.toContain("- Manifest:");
  });

  it("preserves the user-defined selection order and numbers it", () => {
    const prompt = buildMasterPrompt(["text-input", "button"], FULL_ENTRIES);
    const pos1 = prompt.indexOf("## 1. TextInput (text-input)");
    const pos2 = prompt.indexOf("## 2. Button (button)");
    expect(pos1).toBeGreaterThan(-1);
    expect(pos2).toBeGreaterThan(pos1);
  });

  it("reports skipped ids honestly instead of inventing sections", () => {
    const prompt = buildMasterPrompt(["button", "extinct-id"], FULL_ENTRIES);
    expect(prompt).toContain("extinct-id: not in the catalog, skipped");
  });

  it("keeps the standing rules and verification command in every prompt", () => {
    const prompt = buildMasterPrompt(["button"], FULL_ENTRIES);
    expect(prompt).toContain("## Standing rules for the consuming agent");
    expect(prompt).toContain("npm run lookup -- <id> --json");
  });

  it("stays deterministic without a timestamp and records it when provided", () => {
    const a = buildMasterPrompt(["button"], FULL_ENTRIES);
    const b = buildMasterPrompt(["button"], FULL_ENTRIES);
    expect(a).toBe(b);
    expect(a).not.toContain("generated at");
    expect(buildMasterPrompt(["button"], FULL_ENTRIES, { generatedAt: "2026-10-24T12:00:00Z" })).toContain(
      "generated at 2026-10-24T12:00:00Z",
    );
  });

  it("deduplicates shared dependencies across the selection", () => {
    const prompt = buildMasterPrompt(["shadcn-button", "shadcn-tabs"], FULL_ENTRIES);
    const depLines = prompt.split("\n").filter((line) => line.startsWith("- cn"));
    expect(depLines.length).toBe(1);
    expect(depLines[0]).toContain("— needed by");
  });
});
