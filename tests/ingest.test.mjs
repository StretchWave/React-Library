// Unit tests for scripts/lib/ingest.mjs adapters (node:test, zero dependencies).
// Network is exercised by the adapters themselves; these tests pin the pure
// normalization/composition/merge logic that feeds catalog.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composeMagicUiEntry,
  composeShadcnEntry,
  composeShadcnManifest,
  fileBasename,
  mergeEntry,
  registryUrlFor,
  docsUrlFor,
  shadcnClassification,
  titleForSlug,
} from "../scripts/lib/ingest.mjs";

const STAMP = { fetchedAt: "2026-10-24" };

const shadcnLike = (name, files, extra = {}) => ({
  name,
  type: "registry:ui",
  files: files.map((path) => ({ path, type: "registry:ui" })),
  dependencies: ["cn", "radix-ui"],
  registryDependencies: [],
  ...extra,
});

test("titleForSlug and fileBasename normalize registry metadata", () => {
  assert.equal(titleForSlug("dropdown-menu"), "Dropdown Menu");
  assert.equal(titleForSlug("button"), "Button");
  assert.equal(fileBasename("registry/new-york-v4/ui/button.tsx"), "button.tsx");
  assert.equal(fileBasename("registry\\magicui\\dot-pattern.tsx"), "dot-pattern.tsx");
});

test("shadcn registry url follows the official pattern", () => {
  assert.equal(registryUrlFor("button"), "https://ui.shadcn.com/r/styles/new-york-v4/button.json");
  assert.equal(docsUrlFor("button"), "https://ui.shadcn.com/docs/components/button");
});

test("composeShadcnEntry builds a valid local entry shape", () => {
  const entry = composeShadcnEntry("button", shadcnLike("button", ["registry/new-york-v4/ui/button.tsx"]), STAMP);
  assert.equal(entry.id, "shadcn-button");
  assert.equal(entry.entryType, "local");
  assert.equal(entry.source, "shadcn");
  assert.equal(entry.externalId, "button");
  assert.equal(entry.localDir, "catalog/components/shadcn/button");
  assert.equal(entry.manifest, "catalog/components/shadcn/button/component.json");
  assert.deepEqual(entry.implementation, ["catalog/components/shadcn/button/button.tsx"]);
  assert.equal(entry.category, "buttons");
  assert.deepEqual(entry.aesthetics, ["professional"]);
  assert.ok(entry.attributes.includes("tailwind") && entry.attributes.includes("typescript"));
  assert.equal(entry.preview.type, "external");
  assert.equal(entry.retrieval.includes("npx shadcn@latest add"), true);
  assert.deepEqual(entry.dependencies, [{ name: "cn" }, { name: "radix-ui" }]);
});

test("composeShadcnEntry refuses a registry item without files", () => {
  assert.throws(() => composeShadcnEntry("ghost", { name: "ghost", files: [] }, STAMP), /no files/);
});

test("tabs maps to the tabs category; tooltip family maps to tooltips", () => {
  assert.equal(shadcnClassification("tabs").category, "tabs");
  assert.equal(shadcnClassification("tooltip").category, "tooltips");
  assert.equal(shadcnClassification("dialog").category, "modals");
  assert.equal(shadcnClassification("skeleton").category, "loaders");
  assert.equal(shadcnClassification("slider").category, "inputs");
  assert.ok(shadcnClassification("tabs").attributes.includes("animated"));
  assert.equal(shadcnClassification("button").attributes.includes("static"), true);
});

test("composeShadcnManifest records registry provenance", () => {
  const registry = shadcnLike("tooltip", ["registry/new-york-v4/ui/tooltip.tsx"]);
  const manifest = composeShadcnManifest("tooltip", registry, registryUrlFor("tooltip"), STAMP);
  assert.equal(manifest.entryId, "shadcn-tooltip");
  assert.equal(manifest.registryUrl, registryUrlFor("tooltip"));
  assert.equal(manifest.license.spdx, "MIT");
  assert.deepEqual(manifest.files, [{ path: "tooltip.tsx", type: "registry:ui" }]);
  assert.equal(manifest.fetchedAt, "2026-10-24");
});

test("composeMagicUiEntry detects runtime deps from the vendored file body", () => {
  const files = [
    { path: "registry/magicui/dot-pattern.tsx", type: "registry:ui", content: 'import { motion } from "motion/react"\nimport { cn } from "@/lib/utils"' },
  ];
  const entry = composeMagicUiEntry(
    "dot-pattern",
    { name: "dot-pattern", title: "Dot Pattern", type: "registry:ui", files, dependencies: [], registryDependencies: [] },
    STAMP,
  );
  assert.equal(entry.id, "magic-ui-dot-pattern");
  assert.equal(entry.entryType, "local");
  assert.equal(entry.category, "backgrounds");
  assert.deepEqual(
    entry.dependencies.map((dep) => dep.name),
    ["motion", "cn"],
  );
  assert.equal(entry.dependencies[0].reason.includes("motion/react"), true);
  assert.deepEqual(entry.implementation, ["catalog/components/magic-ui/dot-pattern/dot-pattern.tsx"]);
});

test("mergeEntry appends sorted and never overwrites an existing id", () => {
  const catalog = {
    schemaVersion: 2,
    meta: {},
    entries: [
      { id: "alert", name: "Alert", summary: "s", category: "feedback", themes: ["classic-clean"], aliases: [], tags: [], status: "stable", version: "1.0.0", addedDate: "2026-10-24", externalDependencies: [], props: [] },
      { id: "tabs", name: "TabSheet", summary: "s", category: "navigation", themes: ["classic-clean"], aliases: [], tags: [], status: "beta", version: "0.3.0", addedDate: "2026-10-24", externalDependencies: [], props: [] },
    ],
  };
  const entry = composeShadcnEntry("badge", shadcnLike("badge", ["registry/new-york-v4/ui/badge.tsx"]), STAMP);
  const first = mergeEntry(catalog, entry);
  assert.equal(first.merged, true);
  assert.deepEqual(first.catalog.entries.map((e) => e.id), ["alert", entry.id, "tabs"]);

  const second = mergeEntry(first.catalog, composeShadcnEntry("badge", shadcnLike("badge", ["x"]), STAMP));
  assert.equal(second.merged, false);
  assert.ok(second.reason.includes("already exists"));
  assert.deepEqual(second.catalog.entries.map((e) => e.id), ["alert", entry.id, "tabs"]);
});
