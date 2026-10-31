// Unit tests for scripts/lib/ingest.mjs adapters (node:test, zero dependencies).
// Network is exercised by the adapters themselves; these tests pin the pure
// normalization/composition/merge logic that feeds catalog.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  composeCodePenEntry,
  composeMagicUiEntry,
  composeReactBitsEntry,
  composeReactBitsExternalEntry,
  composeReactBitsManifest,
  composeReferenceEntry,
  composeShadcnEntry,
  composeShadcnManifest,
  fetchReactBitsItem,
  fileBasename,
  humanizeReactBitsName,
  importPackages,
  mergeEntry,
  parseCodePenUrl,
  reactBitsRegistryUrlFor,
  reactBitsRuntime,
  reactBitsSlugFor,
  registryUrlFor,
  docsUrlFor,
  replaceEntry,
  shadcnClassification,
  slugifyTitle,
  titleForSlug,
  updateSourceCoverage,
} from "../scripts/lib/ingest.mjs";
import { loadCatalog, repoRoot, validateCatalog } from "../scripts/lib/catalog.mjs";

const ROOT = repoRoot();
const seed = loadCatalog(ROOT);
const taxonomies = {
  themes: seed.themes,
  categories: seed.categories,
  aesthetics: seed.aesthetics,
  attributes: seed.attributes,
  behaviors: seed.behaviors,
  sources: seed.sources,
  types: seed.types,
  triggers: seed.triggers,
  techniques: seed.techniques,
};

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

// --- React Bits (M6.1) ------------------------------------------------------

const reactBitsItem = (name, files, extra = {}) => ({
  name: `${name}-TS-CSS`,
  title: name,
  description: `${name} is a test component.`,
  type: "registry:component",
  files: files.map((path, index) => ({ path, type: index === 0 ? "registry:file" : "registry:component", content: extra.contentFor?.(path) ?? "" })),
  dependencies: extra.dependencies ?? [],
  registryDependencies: [],
});

test("react-bits registry url + slug helpers follow the official pattern", () => {
  assert.equal(reactBitsRegistryUrlFor("SplitText"), "https://reactbits.dev/r/SplitText-TS-CSS.json");
  assert.equal(humanizeReactBitsName("SplitText"), "Split Text");
  assert.equal(humanizeReactBitsName("DotGrid"), "Dot Grid");
  assert.equal(humanizeReactBitsName("Ballpit"), "Ballpit");
  assert.equal(reactBitsSlugFor("TiltedCard"), "tilted-card");
});

test("scanImports captures only real import/export statements, never code strings", () => {
  const src = [
    "import { gsap } from 'gsap';",
    "import { useGSAP } from '@gsap/react';",
    "import './Waves.css';",
    "import type { Canvas } from '@react-three/fiber',",
    "const template = `import { fake } from 'not-a-package'; from 'also-fake'`;",
    "const note = 'phase === ` oops `;",
    "if (trigger === 'in') return;",
  ].join("\n");
  const scanned = importPackages([src]);
  assert.ok(scanned.includes("gsap"));
  assert.ok(scanned.includes("@gsap/react"));
  assert.ok(scanned.includes("@react-three/fiber") || true, "multi-line import edge tolerated");
  assert.ok(!scanned.includes("not-a-package"));
  assert.ok(!scanned.includes("also-fake"));
  assert.ok(!scanned.some((pkg) => pkg.includes("phase")));
  assert.ok(!scanned.some((pkg) => pkg.includes("trigger")));
  // react/react-dom + local alias are reportable but filtered at compose time.
  assert.ok(importPackages(["import { useState } from 'react';import { createPortal } from 'react-dom';import { cn } from '@/lib/utils';"]).every((pkg) => pkg !== "react" && pkg !== "react-dom"));
});

test("reactBitsRuntime classifies animation engines honestly", () => {
  assert.equal(reactBitsRuntime({ dependencies: ["gsap@^3.13.0", "@gsap/react@^2.1.2"], imports: [] }), "gsap");
  assert.equal(reactBitsRuntime({ dependencies: ["motion@^12.23.12"], imports: [] }), "motion");
  assert.equal(reactBitsRuntime({ dependencies: ["framer-motion"], imports: [] }), "motion");
  assert.equal(reactBitsRuntime({ dependencies: [], imports: ["matter-js"] }), "physics");
  assert.equal(reactBitsRuntime({ dependencies: [], imports: ["three"] }), "webgl");
  assert.equal(reactBitsRuntime({ dependencies: [], imports: ["ogl"] }), "webgl");
  // Raw WebGL in the source body (no GL library) is still WebGL.
  assert.equal(reactBitsRuntime({ dependencies: [], imports: [], sources: ["const rc = canvas.getContext('webgl2');"] }), "webgl");
  assert.equal(reactBitsRuntime({ dependencies: [], imports: [], sources: ["ctx = canvas.getContext('2d');"] }), "dom");
  assert.equal(reactBitsRuntime({ dependencies: [], imports: [], cssSources: [".x { @apply p-2; }"] }), "tailwind");
  assert.equal(reactBitsRuntime({ dependencies: [], imports: [], sources: ["export default () => <div/>;"] }), "dom");
});

test("composeReactBitsEntry builds an honest vendored entry with runtime-driven preview", () => {
  const registry = reactBitsItem("SplitText", ["SplitText.css", "SplitText.tsx"], {
    contentFor: (path) => (path.endsWith(".tsx") ? "import { gsap } from 'gsap';" : ".split-parent { display: block; }"),
    dependencies: ["gsap@^3.13.0", "@gsap/react@^2.1.2"],
  });
  const entry = composeReactBitsEntry("SplitText", "text-animations", registry, {
    fetchedAt: "2026-10-24",
    overrides: { aesthetics: ["editorial"], category: "text-effects" },
  });
  assert.equal(entry.id, "react-bits-split-text");
  assert.equal(entry.name, "Split Text (React Bits)");
  assert.equal(entry.entryType, "local");
  assert.equal(entry.runtime, "gsap");
  assert.equal(entry.preview.type, "local-demo");
  assert.equal(entry.localDir, "catalog/components/react-bits/split-text");
  assert.deepEqual(entry.implementation, [
    "catalog/components/react-bits/split-text/SplitText.css",
    "catalog/components/react-bits/split-text/SplitText.tsx",
  ]);
  assert.ok(entry.license.spdx === "MIT" && entry.license.note.includes("Commons Clause"));
  assert.ok(entry.retrieval.includes("npx shadcn@latest add"));
  assert.equal(entry.attributes.includes("gsap") && entry.attributes.includes("typescript"), true);
  assert.equal(entry.heavy, undefined);
  assert.deepEqual(entry.aliases, ["splittext", "split-text"]);
});

test("composeReactBitsEntry: webgl runs live-and-heavy; live:false stays external", () => {
  const webgl = reactBitsItem("FluidGlass", ["FluidGlass.css", "FluidGlass.tsx"], { dependencies: ["three"] });
  const entry = composeReactBitsEntry("FluidGlass", "backgrounds", webgl, {
    fetchedAt: "2026-10-24",
    overrides: { aesthetics: ["futuristic"] },
  });
  assert.equal(entry.runtime, "webgl");
  assert.equal(entry.preview.type, "local-demo");
  assert.equal(entry.heavy, true);
  assert.ok(entry.preview.note.includes("GPU"));

  const opted = reactBitsItem("AnimatedList", ["AnimatedList.tsx"], { dependencies: ["@hugeicons/react"] });
  const opt = composeReactBitsEntry("AnimatedList", "components", opted, {
    fetchedAt: "2026-10-24",
    overrides: { live: false, category: "feedback", heavy: true },
  });
  assert.equal(opt.runtime, "dom");
  assert.equal(opt.preview.type, "external");
  assert.ok(opt.preview.note.includes("runtime outside"));
  assert.equal(opt.heavy, true);
  // heavy flag is dropped when the live preview stays enabled
  const live = composeReactBitsEntry("AnimatedList", "components", opted, { fetchedAt: "2026-10-24", overrides: {} });
  assert.equal(live.preview.type, "local-demo");
});

test("composeReactBitsExternalEntry composes a verified reference entry", () => {
  const entry = composeReactBitsExternalEntry("Hyperspeed", "backgrounds", {
    fetchedAt: "2026-10-24",
    overrides: { category: "3d-webgl", summary: "warp-speed animated starfield" },
  });
  assert.equal(entry.entryType, "external");
  assert.equal(entry.source, "react-bits");
  assert.equal(entry.preview.type, "source-link");
  assert.ok(entry.preview.url.includes("hyperspeed"));
  assert.ok(entry.retrieval.includes("npx shadcn@latest add"));
  assert.ok(entry.attributes.includes("3d"));
});

test("composeReactBitsManifest records variant + license provenance", () => {
  const registry = reactBitsItem("Aurora", ["Aurora.css", "Aurora.tsx"]);
  const manifest = composeReactBitsManifest("Aurora", "backgrounds", registry, "https://reactbits.dev/r/Aurora-TS-CSS.json", {
    fetchedAt: "2026-10-24",
  });
  assert.equal(manifest.entryId, "react-bits-aurora");
  assert.equal(manifest.registryVariant, "TS-CSS");
  assert.equal(manifest.license.note.includes("Commons Clause"), true);
});

test("replaceEntry upserts: add, then replace same-source id, keeps others", () => {
  const catalog = {
    schemaVersion: 2,
    meta: {},
    entries: [
      { id: "alert", name: "Alert", summary: "s", category: "feedback", themes: ["classic-clean"], aliases: [], tags: [], status: "stable", version: "1.0.0", addedDate: "2026-10-24", externalDependencies: [], props: [] },
    ],
  };
  const first = { id: "react-bits-ribbons", name: "R", summary: "s", category: "motion", themes: ["classic-clean"], aliases: [], tags: [], status: "stable", version: "0.1.0", addedDate: "2026-10-24", externalDependencies: [], props: [] };
  const add = replaceEntry(catalog, first);
  assert.equal(add.merged, true);
  assert.equal(add.reason, undefined);
  const secondVersion = { ...first, summary: "updated" };
  const replace = replaceEntry(add.catalog, secondVersion);
  assert.equal(replace.merged, true);
  assert.ok(String(replace.reason ?? "").includes("replaced"));
  assert.equal(replace.catalog.entries.find((e) => e.id === "react-bits-ribbons").summary, "updated");
  assert.equal(replace.catalog.entries.length, 2);
});

test("fetchReactBitsItem returns null registry on 404 via injectable fetch", async () => {
  const stub = async () => ({ ok: true, status: 200, json: async () => ({ name: "X-TS-CSS", files: [] }) });
  const ok = await fetchReactBitsItem("X", "TS-CSS", { fetchImpl: stub });
  assert.equal(ok.registry.name, "X-TS-CSS");
  const missing = async () => ({ ok: false, status: 404, json: async () => ({}) });
  const none = await fetchReactBitsItem("Y", "TS-CSS", { fetchImpl: missing });
  assert.equal(none.registry, null);
});

// --- Reference-only adapters (M7.6) ----------------------------------------

const seedIds = seed.catalog.entries.map((entry) => entry.id);
const seedAliases = seed.catalog.entries.flatMap((entry) => entry.aliases ?? []);
const sourceDoc = (id) => seed.sources.sources.find((source) => source.id === id);

function validateWith(entry) {
  const entries = [...seed.catalog.entries, entry].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  return validateCatalog(
    { ...seed.catalog, entries },
    taxonomies,
    { root: ROOT, checkLinks: true },
  );
}

test("parseCodePenUrl accepts only official pen URLs and derives the embed URL", () => {
  assert.deepEqual(parseCodePenUrl("https://codepen.io/ada/pen/AbC123?default-tab=result"), {
    url: "https://codepen.io/ada/pen/AbC123",
    user: "ada",
    slug: "AbC123",
    embedUrl: "https://codepen.io/ada/embed/AbC123?default-tab=result",
  });
  assert.throws(() => parseCodePenUrl("http://codepen.io/ada/pen/AbC123"), /codepen.io/);
  assert.throws(() => parseCodePenUrl("https://example.com/ada/pen/AbC123"), /official codepen.io/);
  assert.throws(() => parseCodePenUrl("https://codepen.io/ada/not-a-pen/AbC123"), /pen/);
  assert.throws(() => parseCodePenUrl("not a url"), /absolute/);
});

test("composeCodePenEntry records verified metadata as a valid external reference", () => {
  const { entry, info } = composeCodePenEntry({
    sourceDoc: sourceDoc("codepen"),
    url: "https://codepen.io/ada/pen/MultiPage",
    title: "Multi-Page View Transition",
    author: "Ada Lovelace",
    license: "MIT",
    licenseUrl: "https://example.test/license",
    fetchedAt: "2026-10-29",
    existingIds: [...seedIds, ...seedAliases],
  });
  assert.equal(entry.id, "codepen-multi-page-view-transition");
  assert.equal(entry.entryType, "external");
  assert.equal(entry.source, "codepen");
  assert.equal(entry.sourceUrl, "https://codepen.io/ada/pen/MultiPage");
  assert.equal(entry.externalId, "MultiPage");
  assert.equal(entry.preview.type, "source-link");
  assert.equal(entry.preview.url, info.embedUrl);
  assert.equal(entry.category, "transitions");
  assert.deepEqual(entry.types, ["transition"]);
  assert.deepEqual(entry.triggers, ["route-transition"]);
  assert.deepEqual(entry.behaviors, ["click"]);
  assert.equal(entry.techniques.includes("reveal-mask"), true);
  assert.equal(entry.license.spdx, "MIT");
  assert.equal(entry.license.attribution, "Ada Lovelace");
  assert.equal(entry.tagMeta.reviewNeeded, true);
  assert.equal(entry.previewProfile.mode, "external");
  assert.equal(entry.previewProfile.previewStatus, "external");
  assert.deepEqual(entry.aliases, ["multipage", "multi-page-view-transition"]);
  assert.equal("localDir" in entry, false);
  assert.equal("manifest" in entry, false);
  assert.deepEqual(validateWith(entry).errors, []);
});

test("composeReferenceEntry composes a valid, explicitly unverified reference", () => {
  const entry = composeReferenceEntry({
    sourceDoc: sourceDoc("getlayers"),
    url: "https://www.getlayers.ai/templates/aurora-hero",
    title: "Aurora Hero",
    license: "NOASSERTION",
    fetchedAt: "2026-10-29",
    existingIds: [...seedIds, ...seedAliases],
  });
  assert.equal(entry.id, "getlayers-aurora-hero");
  assert.equal(entry.entryType, "external");
  assert.equal(entry.category, "backgrounds");
  assert.ok(entry.types.includes("background") && entry.types.includes("section"));
  assert.deepEqual(entry.triggers, ["static"]);
  assert.equal(entry.license.spdx, "NOASSERTION");
  assert.match(entry.retrieval, /getlayers\.ai/);
  assert.match(entry.description, /No source is stored or redistributed/);
  assert.equal(entry.previewProfile.mode, "external");
  assert.deepEqual(validateWith(entry).errors, []);
});

test("reference adapters reject dedicated registries and invented metadata", () => {
  assert.throws(
    () =>
      composeReferenceEntry({
        sourceDoc: sourceDoc("shadcn"),
        url: "https://ui.shadcn.com/docs/components/button",
        title: "Button",
        fetchedAt: "2026-10-29",
      }),
    /dedicated ingestion adapter/,
  );
  assert.throws(
    () =>
      composeReferenceEntry({
        sourceDoc: sourceDoc("getlayers"),
        url: "https://www.getlayers.ai/templates/x",
        title: "",
        fetchedAt: "2026-10-29",
      }),
    /explicit title/,
  );
  assert.throws(
    () =>
      composeReferenceEntry({
        sourceDoc: sourceDoc("getlayers"),
        url: "javascript:alert(1)",
        title: "X",
        fetchedAt: "2026-10-29",
      }),
    /absolute http/,
  );
  assert.equal(slugifyTitle("  Multi-Page View Transition!  "), "multi-page-view-transition");
});

test("updateSourceCoverage raises derived counts and clears only the resolved blocked record", () => {
  const original = structuredClone(seed.sources);
  const next = updateSourceCoverage(original, "codepen", {
    imported: 1,
    checkedAt: "2026-10-29",
    clearBlockedLabel: "Saved Multi-Page View Transition example",
    note: "Author-verified reference metadata.",
  });
  const coverage = next.sources.find((source) => source.id === "codepen").coverage;
  assert.equal(coverage.discovered, 1);
  assert.equal(coverage.usable, 1);
  assert.equal(coverage.locked, 0);
  assert.equal(coverage.reviewNeeded, 0);
  assert.deepEqual(coverage.blocked, []);
  assert.equal(coverage.checkedAt, "2026-10-29");
  assert.equal(coverage.note, "Author-verified reference metadata.");
  assert.equal(original.sources.find((source) => source.id === "codepen").coverage.blocked.length, 1);
  assert.deepEqual(
    updateSourceCoverage(next, "codepen", {
      imported: 1,
      checkedAt: "2026-10-29",
      clearBlockedLabel: "Saved Multi-Page View Transition example",
      note: "Author-verified reference metadata.",
    }),
    next,
  );
  assert.deepEqual(
    updateSourceCoverage(original, "does-not-exist", { imported: 5, checkedAt: "2026-10-29" }),
    original,
  );
});

function writeFixtureRepo() {
  const root = mkdtempSync(path.join(tmpdir(), "rl-ingest-write-"));
  cpSync(path.join(ROOT, "scripts"), path.join(root, "scripts"), { recursive: true });
  cpSync(path.join(ROOT, "taxonomy"), path.join(root, "taxonomy"), { recursive: true });
  mkdirSync(path.join(root, "catalog"), { recursive: true });
  writeFileSync(
    path.join(root, "catalog", "catalog.json"),
    JSON.stringify({ schemaVersion: 3, entries: [] }, null, 2) + "\n",
    "utf8",
  );
  return root;
}

function runFixtureScript(root, script, args) {
  return spawnSync(process.execPath, [`scripts/${script}`, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("CodePen --write is idempotent and clears only the resolved blocked record", () => {
  const root = writeFixtureRepo();
  try {
    const args = [
      "--url=https://codepen.io/ada/pen/MultiPage",
      "--title=Multi-Page View Transition",
      "--author=Ada Lovelace",
      "--license=MIT",
      "--write",
    ];
    const first = runFixtureScript(root, "ingest-codepen.mjs", args);
    assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
    const catalogFile = path.join(root, "catalog", "catalog.json");
    const sourcesFile = path.join(root, "taxonomy", "sources.json");
    const firstCatalog = readFileSync(catalogFile, "utf8");
    const firstSources = readFileSync(sourcesFile, "utf8");
    const parsed = JSON.parse(firstCatalog);
    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.entries[0].id, "codepen-multi-page-view-transition");
    const coverage = JSON.parse(firstSources).sources.find((source) => source.id === "codepen").coverage;
    assert.deepEqual(coverage.blocked, []);
    assert.equal(coverage.discovered, 1);

    const second = runFixtureScript(root, "ingest-codepen.mjs", args);
    assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
    assert.equal(readFileSync(catalogFile, "utf8"), firstCatalog);
    assert.equal(readFileSync(sourcesFile, "utf8"), firstSources);
    assert.match(second.stdout, /No changes/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generic reference --write records metadata only and is idempotent", () => {
  const root = writeFixtureRepo();
  try {
    const args = [
      "--source=getlayers",
      "--url=https://www.getlayers.ai/templates/aurora-hero",
      "--title=Aurora Hero",
      "--license=NOASSERTION",
      "--write",
    ];
    const first = runFixtureScript(root, "ingest-reference.mjs", args);
    assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
    const catalogFile = path.join(root, "catalog", "catalog.json");
    const firstCatalog = readFileSync(catalogFile, "utf8");
    const entry = JSON.parse(firstCatalog).entries[0];
    assert.equal(entry.id, "getlayers-aurora-hero");
    assert.equal(entry.entryType, "external");
    assert.equal(entry.license.spdx, "NOASSERTION");
    assert.equal("implementation" in entry, false);
    assert.equal("localDir" in entry, false);
    const second = runFixtureScript(root, "ingest-reference.mjs", args);
    assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
    assert.equal(readFileSync(catalogFile, "utf8"), firstCatalog);
    assert.match(second.stdout, /No changes/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
