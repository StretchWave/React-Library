// Unit tests for scripts/lib/catalog.mjs (node:test, zero dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildIndex,
  formatEntryText,
  loadCatalog,
  repoRoot,
  searchEntries,
  validateCatalog,
  validateTaxonomy,
} from "../scripts/lib/catalog.mjs";

const ROOT = repoRoot();
const seed = loadCatalog(ROOT);
const seedEntries = seed.catalog.entries;
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

/** Full-valid schema-v3 entry template for targeted rule-testing. */
function mkEntry(overrides = {}) {
  return {
    id: "sample",
    name: "Sample",
    summary: "A sample component.",
    category: "display",
    themes: ["classic-clean"],
    aliases: ["smp"],
    tags: ["sample"],
    status: "stable",
    version: "1.0.0",
    addedDate: "2026-10-24",
    externalDependencies: [],
    props: [],
    types: ["display"],
    triggers: ["static"],
    techniques: [],
    tagMeta: { sourceProvided: [], inferred: [], reviewNeeded: false },
    previewProfile: {
      mode: "live",
      layout: "compact",
      cost: "low",
      aspectRatio: "4 / 3",
      minWidth: 180,
      minHeight: 160,
      gridColumnSpan: 1,
      gridRowSpan: 1,
      expandedRecommended: false,
      autoplayAllowed: false,
      requires: [],
      previewStatus: "ready",
    },
    ...overrides,
  };
}

/** Valid external-entry template (external entries carry stricter v2 rules). */
function mkExternal(overrides = {}) {
  return mkEntry({
    id: "sample-ext",
    entryType: "external",
    source: "shadcn",
    sourceUrl: "https://ui.shadcn.com/r/example.json",
    externalId: "example",
    retrieval: "npx shadcn@latest add https://ui.shadcn.com/r/example.json",
    license: { spdx: "MIT", note: "Per-component check required." },
    ...overrides,
  });
}

function validate(entries, opts = {}) {
  return validateCatalog({ schemaVersion: 3, entries }, taxonomies, opts);
}

test("seed catalog and taxonomies validate cleanly", () => {
  const taxonomyResult = validateTaxonomy(seed.themes, seed.categories, {
    aesthetics: seed.aesthetics,
    attributes: seed.attributes,
    sources: seed.sources,
  });
  assert.deepEqual(taxonomyResult.errors, []);
  const result = validateCatalog(seed.catalog, taxonomies, { checkLinks: false });
  assert.deepEqual(result.errors, []);
});

test("seed taxonomy emits optional-token warnings but no errors", () => {
  const result = validateTaxonomy(seed.themes, seed.categories);
  assert.ok(result.warnings.length > 0);
});

test("theme taxonomy: missing canonical token is an error", () => {
  const cloned = structuredClone(seed.themes);
  delete cloned.themes[0].tokens["--rl-radius"];
  const { errors } = validateTaxonomy(cloned, seed.categories);
  assert.ok(errors.some((message) => message.includes("--rl-radius")));
});

test("theme taxonomy: duplicate ids are errors", () => {
  const cloned = structuredClone(seed.themes);
  cloned.themes[1] = { ...cloned.themes[0] };
  const { errors } = validateTaxonomy(cloned, seed.categories);
  assert.ok(errors.some((message) => message.includes("duplicate theme id")));
});

test("category taxonomy: unknown membership surfaces through entry validation", () => {
  const { errors } = validate([mkEntry({ id: "x", category: "not-a-category" })]);
  assert.ok(errors.some((message) => message.includes("not-a-category")));
});

// --- M7.1 interaction behaviors (taxonomy/behaviors.json) -------------------

test("seed behavior taxonomy loads with every M7.1 subcategory and validates", () => {
  const behaviorIds = seed.behaviors.behaviors.map((behavior) => behavior.id);
  for (const required of [
    "cursor-reactive",
    "hover",
    "click",
    "draggable",
    "scroll",
    "gesture",
    "interactive-3d",
    "interactive-text",
    "interactive-nav",
    "stateful",
  ]) {
    assert.ok(behaviorIds.includes(required), `missing behavior id ${required}`);
  }
  // Behavior ids are unique and slugged by the matrix validator (checked in
  // the validateTaxonomy pass inside loadCatalog).
  assert.equal(new Set(behaviorIds).size, behaviorIds.length);
});

test("entry behaviors validate against the behavior taxonomy (M7.1 hole fixed)", () => {
  // A legal behavior id passes cleanly...
  const ok = validate([mkEntry({ id: "x", behaviors: ["hover"] })]);
  assert.deepEqual(ok.errors, []);
  // ...and an undocumented id is an error (it used to be validated against an
  // empty set, so anything passed silently).
  const bad = validate([mkEntry({ id: "x", behaviors: ["interactive-not-real"] })]);
  assert.ok(bad.errors.some((message) => message.includes("interactive-not-real")));
});

test("multiple behavior classifications are legal and filter independently", () => {
  assert.deepEqual(searchEntries(seedEntries, "", { behavior: "scroll" }).length, 5);
  // Behavior filtering is exact; trigger-only entries do not inflate the count.
  const cursor = searchEntries(seedEntries, "", { behavior: "cursor-reactive" });
  assert.equal(cursor.length, 13);
  // Multi-classification works both ways (cursor-reactive entries also appear
  // under their second behavior where they have one).
  const both = cursor.filter((entry) => (entry.behaviors ?? []).includes("hover"));
  assert.ok(both.length > 0);
  const hoverOnly = searchEntries(seedEntries, "", { behavior: "hover" });
  assert.ok(hoverOnly.some((entry) => entry.id === both[0].id));
});

test("every catalog entry carries at least one behavior classification", () => {
  for (const entry of seedEntries) {
    assert.ok((entry.behaviors ?? []).length > 0, `${entry.id} has no behaviors`);
  }
});

test("entries must be sorted by id", () => {
  const entries = [mkEntry({ id: "zeta" }), mkEntry({ id: "alpha", aliases: ["al"] })];
  const { errors } = validate(entries);
  assert.ok(errors.some((message) => message.includes("sorted by id")));
});

test("duplicate entry ids are errors", () => {
  const { errors } = validate([mkEntry({ id: "dupe" }), mkEntry({ id: "dupe", aliases: ["smp2"] })]);
  assert.ok(errors.some((message) => message.includes('duplicate id "dupe"')));
});

test("duplicate aliases across entries are errors", () => {
  const { errors } = validate([mkEntry({ id: "one" }), mkEntry({ id: "two", aliases: ["smp"] })]);
  assert.ok(errors.some((message) => message.includes('alias "smp" already owned')));
});

test("an alias may not collide with any entry id", () => {
  const { errors } = validate([mkEntry({ id: "collider" }), mkEntry({ id: "other", aliases: ["collider"] })]);
  assert.ok(errors.some((message) => message.includes('alias "collider" collides')));
});

test("schema, status, version and date rules", () => {
  const { catalog: bad } = { catalog: { schemaVersion: 1, entries: [mkEntry({ status: "wip", version: "1.0", addedDate: "10-24-2026" })] } };
  const { errors } = validateCatalog(bad, taxonomies, { checkLinks: false });
  assert.ok(errors.some((message) => message.includes("'schemaVersion' must be 3")));
  assert.ok(errors.some((message) => message.includes("'status' must be one of")));
  assert.ok(errors.some((message) => message.includes("'version' must be valid semver")));
  assert.ok(errors.some((message) => message.includes("'addedDate' must be YYYY-MM-DD")));
});

test("props rules: duplicate names, bad casing, bad required", () => {
  const { errors } = validate([
    mkEntry({
      props: [
        { name: "tone", type: '"a" | "b"', required: false },
        { name: "tone", type: "string", required: false },
        { name: "snake_case", type: "string", required: "no" },
      ],
    }),
  ]);
  assert.ok(errors.some((message) => message.includes('duplicate prop name "tone"')));
  assert.ok(errors.some((message) => message.includes("camelCase")));
  assert.ok(errors.some((message) => message.includes("'required' must be boolean")));
});

test("react/react-dom must not be listed in externalDependencies", () => {
  const { errors } = validate([mkEntry({ externalDependencies: ["react", "left-pad"] })]);
  assert.ok(errors.some((message) => message.includes('"react" is implicit')));
});

test("unknown entry fields are warnings, not errors", () => {
  const result = validate([mkEntry({ futureField: true })]);
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((message) => message.includes("futureField")));
});

test("link existence: present files pass, missing files error (fs)", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "rl-catalog-"));
  try {
    mkdirSync(path.join(tmp, "src"), { recursive: true });
    writeFileSync(path.join(tmp, "src", "exists.tsx"), "export default () => null;\n");
    const catalog = {
      schemaVersion: 3,
      entries: [mkEntry({ links: { source: "src/exists.tsx", demo: "src/missing.tsx" } })],
    };
    const { errors } = validateCatalog(catalog, taxonomies, { root: tmp, checkLinks: true });
    assert.deepEqual(
      errors.filter((message) => !message.includes("src/missing.tsx")),
      [],
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("search: exact alias ranking", () => {
  const matches = searchEntries(seedEntries, "btn");
  assert.deepEqual(matches.map((entry) => entry.id), ["button"]);
});

test("search: exact alias inside unknown query stays ranked first", () => {
  const matches = searchEntries(seedEntries, "input");
  assert.equal(matches[0].id, "text-input");
});

test("search: empty query returns every entry sorted by id", () => {
  const matches = searchEntries(seedEntries, "");
  assert.equal(matches.length, seedEntries.length);
  const ids = matches.map((entry) => entry.id);
  for (const legacy of ["alert", "badge", "button", "card", "tabs", "text-input"]) {
    assert.ok(ids.includes(legacy));
  }
  for (let i = 1; i < ids.length; i += 1) {
    assert.ok(ids[i - 1] < ids[i], "entries must come back sorted by id");
  }
  assert.equal(ids.includes("shadcn-button"), true);
  assert.equal(ids.includes("react-bits-split-text"), true);
});

test("search: category and theme filters", () => {
  const buttons = searchEntries(seedEntries, "", { category: "buttons" }).map((entry) => entry.id);
  assert.ok(buttons.includes("button") && buttons.includes("shadcn-button"));
  const display = searchEntries(seedEntries, "", { category: "display" }).map((entry) => entry.id);
  assert.ok(display.includes("badge") && display.includes("magic-ui-border-beam"));
  const pastel = searchEntries(seedEntries, "", { theme: "soft-pastel" });
  assert.equal(pastel.length, seedEntries.length);
  assert.deepEqual(searchEntries(seedEntries, "btn", { category: "display" }), []);
});

test("search: v2 filters (aesthetic, source, attribute, entryType)", () => {
  const entries = [
    mkEntry({ id: "aaa", aesthetics: ["cyberpunk", "gaming"], attributes: ["dark", "tailwind"], source: "shadcn" }),
    mkEntry({ id: "bbb", aliases: ["b2"], entryType: "external", aesthetics: ["minimal"], attributes: ["static", "css"], source: "react-bits" }),
  ];
  assert.deepEqual(searchEntries(entries, "", { aesthetic: "cyberpunk" }).map((e) => e.id), ["aaa"]);
  assert.deepEqual(searchEntries(entries, "", { source: "react-bits" }).map((e) => e.id), ["bbb"]);
  assert.deepEqual(searchEntries(entries, "", { attribute: "tailwind" }).map((e) => e.id), ["aaa"]);
  assert.deepEqual(searchEntries(entries, "", { entryType: "external" }).map((e) => e.id), ["bbb"]);
  assert.deepEqual(searchEntries(entries, "", { entryType: "local" }).map((e) => e.id), ["aaa"]);
  assert.deepEqual(searchEntries(entries, "", { aesthetic: "nope" }), []);
  // aesthetics rank in text search (below legacy signals but present)
  assert.deepEqual(searchEntries(entries, "cyberpunk").map((e) => e.id), ["aaa"]);
});

test("index: deterministic shape and counts", () => {
  const extras = {
    aesthetics: seed.aesthetics,
    attributes: seed.attributes,
    behaviors: seed.behaviors,
    sources: seed.sources,
    types: seed.types,
    triggers: seed.triggers,
    techniques: seed.techniques,
  };
  const a = buildIndex(seed.catalog, seed.themes, seed.categories, extras, "2026-10-24T00:00:00.000Z");
  const b = buildIndex(seed.catalog, seed.themes, seed.categories, extras, "2027-01-01T00:00:00.000Z");
  delete a.generatedAt;
  delete b.generatedAt;
  assert.deepEqual(a, b);
  assert.equal(a.schemaVersion, 3);
  assert.deepEqual(a.counts, {
    entries: 87,
    themes: 6,
    categories: 28,
    aesthetics: 22,
    attributes: 29,
    behaviors: 12,
    types: 23,
    triggers: 14,
    techniques: 46,
    sources: 12,
    byEntryType: { local: 87, external: 0 },
    bySource: { shadcn: 16, "magic-ui": 4, "react-bits": 61 },
    previewStatuses: { ready: 71, external: 16, unavailable: 0, error: 0 },
  });
  assert.equal(a.generator, "scripts/generate-index.mjs");
  assert.equal(a.entries.length, 87);
  assert.equal(a.entries[0].id, "alert");
  assert.equal(a.entries[a.entries.length - 1].id, "text-input");
  assert.ok(a.entries.some((entry) => entry.id === "shadcn-button"));
  assert.ok(a.entries.some((entry) => entry.id === "magic-ui-dot-pattern"));
  assert.ok(
    a.entries.some(
      (entry) =>
        entry.id === "react-bits-split-text" &&
        entry.entryType === "local" &&
        entry.runtime === "gsap" &&
        entry.preview.type === "local-demo" &&
        entry.previewProfile.snapshotPath === "public/previews/react-bits-split-text.jpg",
    ),
  );
  assert.ok(
    a.entries.some(
      (entry) =>
        entry.id === "react-bits-fluid-glass" &&
        entry.runtime === "webgl" &&
        entry.preview.type === "local-demo" &&
        entry.heavy === true,
    ),
  );
  assert.deepEqual(a.taxonomies.categories.slice(0, 6), ["buttons", "inputs", "layout", "display", "feedback", "navigation"]);
  assert.deepEqual(a.taxonomies.aesthetics, [
    "professional", "casual", "minimal", "luxury", "cyberpunk", "retro-synthwave",
    "brutalist", "organic", "futuristic", "gaming", "editorial", "playful",
    "tron", "vaporwave", "retro-terminal", "retrofuturism", "y2k", "holographic",
    "glassmorphism", "fantasy", "horror", "pixel-art",
  ]);
  assert.ok(a.taxonomies.sources.some((source) => source.id === "shadcn" && source.status === "available"));
  assert.equal(a.sourceCoverage["react-bits"].imported, 61);
  assert.equal(a.sourceCoverage["react-bits"].previewReady, 61);
});

test("index: counts external entries and per-source tally", () => {
  const catalog = {
    schemaVersion: 2,
    entries: [
      mkEntry({ id: "a-local", source: "shadcn", aesthetics: ["minimal"], attributes: ["tailwind"] }),
      mkExternal({ id: "b-ext", source: "react-bits", aesthetics: ["cyberpunk"], attributes: ["animated"] }),
      mkEntry({ id: "c-local", source: "shadcn" }),
    ],
  };
  const extras = { aesthetics: seed.aesthetics, attributes: seed.attributes, sources: seed.sources };
  const index = buildIndex(catalog, seed.themes, seed.categories, extras, "STAMP");
  assert.deepEqual(index.counts.byEntryType, { local: 2, external: 1 });
  assert.deepEqual(index.counts.bySource, { shadcn: 2, "react-bits": 1 });
});

test("formatEntryText renders dashes for missing links", () => {
  const text = formatEntryText(mkEntry({}));
  assert.ok(text.includes("Sample (sample)"));
  assert.ok(text.includes("Source: —"));
  const seeded = formatEntryText(seedEntries.find((entry) => entry.id === "button"));
  assert.ok(seeded.includes("src/components/Button/Button.tsx"));
  assert.ok(seeded.includes("Props (4):"));
});

// --- v2 (M5): local/external model, aesthetics, attributes, source, preview, license

test("external entries require source, sourceUrl, retrieval and license", () => {
  const { errors } = validate([mkExternal({ source: undefined, sourceUrl: undefined, retrieval: undefined, license: undefined })]);
  assert.ok(errors.some((message) => message.includes("'source' is required for external entries")));
  assert.ok(errors.some((message) => message.includes("'sourceUrl' (http(s)) is required for external entries")));
  assert.ok(errors.some((message) => message.includes("'retrieval' is required for external entries")));
  assert.ok(errors.some((message) => message.includes("'license' is required for external entries")));
});

test("external entries must not declare local paths", () => {
  const { errors } = validate([mkExternal({ localDir: "catalog/components/x", manifest: "catalog/components/x/component.json", implementation: ["catalog/components/x/example.tsx"] })]);
  assert.ok(errors.some((message) => message.includes("must not declare local implementation paths")));
});

test("absent entryType defaults to local (legacy v1 entries stay valid)", () => {
  const { errors } = validate([mkEntry({ source: "shadcn" })]);
  assert.deepEqual(errors.filter((message) => message.includes("required for external")), []);
});

test("entry source must exist in the sources taxonomy", () => {
  const { errors } = validate([mkEntry({ source: "not-a-source" })]);
  assert.ok(errors.some((message) => message.includes('source "not-a-source" is not in the sources taxonomy')));
});

test("aesthetics and attributes must reference taxonomy ids", () => {
  const { errors } = validate([mkEntry({ aesthetics: ["cyberpunk", "nope"], attributes: ["dark", "also-nope"] })]);
  assert.ok(errors.some((message) => message.includes('aesthetic "nope" is not in the aesthetics taxonomy')));
  assert.ok(errors.some((message) => message.includes('attribute "also-nope" is not in the attributes taxonomy')));
  const ok = validate([mkEntry({ aesthetics: ["cyberpunk"], attributes: ["dark"] })]);
  assert.deepEqual(ok.errors, []);
});

test("sourceUrl must be an absolute http(s) URL", () => {
  const { errors } = validate([mkExternal({ sourceUrl: "not a url" })]);
  assert.ok(errors.some((message) => message.includes("'sourceUrl' must be an absolute http(s) URL")));
});

test("preview rules: url for external/static/source-link; none requires a note", () => {
  const missingUrl = validate([mkEntry({ preview: { type: "external" } })]);
  assert.ok(missingUrl.errors.some((message) => message.includes('requires an http(s) \'url\'')));
  const badNone = validate([mkEntry({ preview: { type: "none" } })]);
  assert.ok(badNone.errors.some((message) => message.includes("requires a 'note'")));
  const badType = validate([mkEntry({ preview: { type: "hologram" } })]);
  assert.ok(badType.errors.some((message) => message.includes("preview 'type' must be one of")));
  const ok = validate([mkEntry({ preview: { type: "none", note: "No reuse-safe visual reference verified yet." } })]);
  assert.deepEqual(ok.errors, []);
});

test("license structure rules", () => {
  const badSpdx = validate([mkExternal({ license: { spdx: "not a spdx!" } })]);
  assert.ok(badSpdx.errors.some((message) => message.includes("SPDX-like id")));
  const unknownKey = validate([mkExternal({ license: { spdx: "MIT", clause: "nope" } })]);
  assert.ok(unknownKey.warnings.some((message) => message.includes('unknown license key "clause"')));
});

test("dependencies rules: shape, duplicates, react implicit", () => {
  const { errors } = validate([mkEntry({
    dependencies: [
      "not-an-object",
      { name: "framer-motion" },
      { name: "framer-motion", reason: "dup" },
      { name: "react" },
    ].filter((d) => typeof d === "object"),
  })]);
  // The string is filtered out, so expect duplicate + implicit errors.
  assert.ok(errors.some((message) => message.includes('duplicate dependency "framer-motion"')));
  assert.ok(errors.some((message) => message.includes('"react" is implicit')));
});

test("local paths (localDir/manifest/implementation) are existence-checked (fs)", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "rl-catalog-v2-"));
  try {
    mkdirSync(path.join(tmp, "catalog", "components", "demo"), { recursive: true });
    writeFileSync(path.join(tmp, "catalog", "components", "demo", "component.json"), "{}\n");
    writeFileSync(path.join(tmp, "catalog", "components", "demo", "example.tsx"), "export default () => null;\n");
    const base = "catalog/components/demo";
    const ok = validate([mkEntry({ localDir: base, manifest: `${base}/component.json`, implementation: [`${base}/example.tsx`] })], { root: tmp, checkLinks: true });
    assert.deepEqual(ok.errors, []);
    const bad = validate([mkEntry({ localDir: base, manifest: `${base}/nope.json`, implementation: [`${base}/nope.tsx`] })], { root: tmp, checkLinks: true });
    assert.ok(bad.errors.some((message) => message.includes("nope.json")));
    assert.ok(bad.errors.some((message) => message.includes("nope.tsx")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("sources taxonomy: duplicate ids and bad status are errors", () => {
  const cloned = structuredClone(seed.sources);
  cloned.sources[1] = { ...cloned.sources[0], status: "nope" };
  const { errors } = validateTaxonomy(seed.themes, seed.categories, { sources: cloned });
  assert.ok(errors.some((message) => message.includes("duplicate source id")));
  assert.ok(errors.some((message) => message.includes("'status' must be one of")));
});

test("aesthetics taxonomy: duplicate ids are errors", () => {
  const cloned = structuredClone(seed.aesthetics);
  cloned.aesthetics[1] = { ...cloned.aesthetics[0] };
  const { errors } = validateTaxonomy(seed.themes, seed.categories, { aesthetics: cloned });
  assert.ok(errors.some((message) => message.includes("duplicate aesthetic id")));
});

test("formatEntryText surfaces v2 provenance for external entries", () => {
  const text = formatEntryText(mkExternal({
    preview: { type: "external", url: "https://example.com/demo" },
    aesthetics: ["cyberpunk"],
    attributes: ["dark", "animated"],
  }));
  assert.ok(text.includes("Availability: external"));
  assert.ok(text.includes("Library source: shadcn (https://ui.shadcn.com"));
  assert.ok(text.includes("License:"));
  assert.ok(text.includes("External ID: example"));
  assert.ok(text.includes("Retrieval: npx shadcn@latest add"));
  assert.ok(text.includes("Preview: external https://example.com/demo"));
  assert.ok(text.includes("Aesthetics: cyberpunk"));
  assert.ok(text.includes("Attributes: dark, animated"));
});

// --- Schema v3: discovery facets, provenance and preview profiles ----------

function withPreview(overrides = {}) {
  const base = mkEntry().previewProfile;
  return mkEntry({ previewProfile: { ...base, ...overrides } });
}

test("schema v3 requires types, triggers, tagMeta and previewProfile", () => {
  const missing = mkEntry();
  delete missing.types;
  delete missing.triggers;
  delete missing.tagMeta;
  delete missing.previewProfile;
  const { errors } = validate([missing]);
  assert.ok(errors.some((message) => message.includes("'types' must be an array")));
  assert.ok(errors.some((message) => message.includes("'triggers' must be an array")));
  assert.ok(errors.some((message) => message.includes("'tagMeta' is required")));
  assert.ok(errors.some((message) => message.includes("'previewProfile' is required")));
});

test("v3 facet arrays reject unknown ids, duplicates and empty required dimensions", () => {
  const { errors } = validate([
    mkEntry({
      types: ["display", "not-a-type", "display"],
      triggers: [],
      techniques: ["not-a-technique", "fade"],
    }),
  ]);
  assert.ok(errors.some((message) => message.includes('types "not-a-type" is not in the taxonomy')));
  assert.ok(errors.some((message) => message.includes('duplicate types id "display"')));
  assert.ok(errors.some((message) => message.includes("'triggers' must not be empty")));
  assert.ok(errors.some((message) => message.includes('techniques "not-a-technique" is not in the taxonomy')));
});

test("tagMeta provenance must reference facets the entry actually declares", () => {
  const bad = validate([
    mkEntry({
      aesthetics: ["minimal"],
      tagMeta: {
        sourceProvided: ["type:display", "trigger:static"],
        inferred: ["vibe:minimal", "vibe:professional", "tech:dark"],
        reviewNeeded: false,
      },
    }),
  ]);
  assert.ok(bad.errors.some((message) => message.includes('references vibe "professional"')));
  assert.ok(bad.errors.some((message) => message.includes('references tech "dark"')));
  const badShape = validate([
    mkEntry({ tagMeta: { sourceProvided: ["Display"], inferred: [], reviewNeeded: "no" } }),
  ]);
  assert.ok(badShape.errors.some((message) => message.includes('must look like "facet:id"')));
  assert.ok(badShape.errors.some((message) => message.includes("'reviewNeeded' must be boolean")));
});

test("previewProfile validates enums, dimensions, requirements and paths", () => {
  const bad = validate([
    withPreview({
      mode: "hologram",
      layout: "giant",
      cost: "free",
      previewStatus: "broken",
      aspectRatio: "wide",
      minWidth: 0,
      minHeight: -1,
      gridColumnSpan: 4,
      gridRowSpan: 3,
      expandedRecommended: "yes",
      autoplayAllowed: "no",
      requires: ["webgl", "magic"],
      snapshotPath: "C:\\previews\\button.jpg",
      failureReason: "",
    }),
  ]);
  for (const expected of [
    "'mode' must be one of",
    "'layout' must be one of",
    "'cost' must be one of",
    "'previewStatus' must be one of",
    "'aspectRatio' must look like",
    "'minWidth' must be a positive integer",
    "'minHeight' must be a positive integer",
    "'gridColumnSpan' must be <= 3",
    "'gridRowSpan' must be <= 2",
    "'expandedRecommended' must be boolean",
    "'autoplayAllowed' must be boolean",
    'requirement "magic" is unknown',
    "repo-relative with POSIX separators",
    "'failureReason' must be a non-empty string",
  ]) {
    assert.ok(bad.errors.some((message) => message.includes(expected)), expected);
  }
});

test("previewProfile couples mode, status, assets and failure reasons", () => {
  const snapshot = validate([withPreview({ mode: "snapshot", previewStatus: "ready", snapshotPath: undefined })]);
  assert.ok(snapshot.errors.some((message) => message.includes("snapshot preview mode requires 'snapshotPath'")));
  const loop = validate([withPreview({ mode: "loop", previewStatus: "ready", loopPath: undefined })]);
  assert.ok(loop.errors.some((message) => message.includes("loop preview mode requires 'loopPath'")));
  const external = validate([withPreview({ mode: "external", previewStatus: "ready" })]);
  assert.ok(external.errors.some((message) => message.includes('mode "external" requires previewStatus "external"')));
  const unavailable = validate([withPreview({ mode: "unavailable", previewStatus: "unavailable" })]);
  assert.ok(unavailable.errors.some((message) => message.includes("unavailable previews require a useful 'failureReason'")));
});

test("previewProfile duplicate requirements are warnings and missing assets fail link checks (fs)", () => {
  const duplicate = validate([withPreview({ requires: ["webgl", "webgl"] })]);
  assert.deepEqual(duplicate.errors, []);
  assert.ok(duplicate.warnings.some((message) => message.includes('duplicate preview requirement "webgl"')));

  const tmp = mkdtempSync(path.join(tmpdir(), "rl-preview-profile-"));
  try {
    mkdirSync(path.join(tmp, "public", "previews"), { recursive: true });
    writeFileSync(path.join(tmp, "public", "previews", "sample.jpg"), "not-a-real-jpeg\n");
    const present = validate([withPreview({ snapshotPath: "public/previews/sample.jpg" })], {
      root: tmp,
      checkLinks: true,
    });
    assert.deepEqual(present.errors, []);
    const missing = validate([withPreview({ snapshotPath: "public/previews/missing.jpg" })], {
      root: tmp,
      checkLinks: true,
    });
    assert.ok(missing.errors.some((message) => message.includes("points to a missing file")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("assisted classification and preview profiles are current and idempotent", () => {
  const catalogFile = path.join(ROOT, "catalog", "catalog.json");
  const before = readFileSync(catalogFile, "utf8");
  const run = spawnSync(process.execPath, ["scripts/classify-catalog.mjs", "--check"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /classification|preview/i);
  assert.equal(readFileSync(catalogFile, "utf8"), before, "--check must not write the catalog");
});

test("search facets: OR within a dimension and AND across dimensions", () => {
  const types = searchEntries(seedEntries, "", { type: ["button", "input"] });
  assert.ok(types.some((entry) => entry.types.includes("button")));
  assert.ok(types.some((entry) => entry.types.includes("input")));

  const triggers = searchEntries(seedEntries, "", { trigger: ["click", "hover"] });
  const clickOnly = searchEntries(seedEntries, "", { trigger: "click" });
  const hoverOnly = searchEntries(seedEntries, "", { trigger: "hover" });
  assert.ok(triggers.length > clickOnly.length);
  assert.ok(triggers.length > hoverOnly.length);

  const narrowed = searchEntries(seedEntries, "", { type: ["button", "input"], trigger: "click" });
  assert.ok(narrowed.length < types.length);
  for (const entry of narrowed) {
    assert.ok(entry.types.some((type) => type === "button" || type === "input"), entry.id);
    assert.ok(entry.triggers.includes("click"), entry.id);
  }

  // Trigger and behavior are independent dimensions. A trigger filter must
  // not leak entries that only carry the same value as a behavior (or vice versa).
  const separated = [
    mkEntry({ id: "trigger-click", triggers: ["click"], behaviors: ["hover"] }),
    mkEntry({ id: "behavior-click", triggers: ["hover"], behaviors: ["click"] }),
  ];
  assert.deepEqual(
    searchEntries(separated, "", { trigger: "click" }).map((entry) => entry.id),
    ["trigger-click"],
  );
  assert.deepEqual(
    searchEntries(separated, "", { behavior: "click" }).map((entry) => entry.id),
    ["behavior-click"],
  );
});
