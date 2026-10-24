// Unit tests for scripts/lib/catalog.mjs (node:test, zero dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
  sources: seed.sources,
};

/** Full-valid entry template for targeted rule-testing. */
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
  return validateCatalog({ schemaVersion: 2, entries }, taxonomies, opts);
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
  assert.ok(errors.some((message) => message.includes("'schemaVersion' must be 2")));
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
      schemaVersion: 2,
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
  const extras = { aesthetics: seed.aesthetics, attributes: seed.attributes, sources: seed.sources };
  const a = buildIndex(seed.catalog, seed.themes, seed.categories, extras, "2026-10-24T00:00:00.000Z");
  const b = buildIndex(seed.catalog, seed.themes, seed.categories, extras, "2027-01-01T00:00:00.000Z");
  delete a.generatedAt;
  delete b.generatedAt;
  assert.deepEqual(a, b);
  assert.equal(a.schemaVersion, 2);
  assert.deepEqual(a.counts, {
    entries: 33,
    themes: 6,
    categories: 22,
    aesthetics: 12,
    sources: 9,
    byEntryType: { local: 26, external: 7 },
    bySource: { shadcn: 16, "magic-ui": 4, "react-bits": 7 },
  });
  assert.equal(a.generator, "scripts/generate-index.mjs");
  assert.equal(a.entries.length, 33);
  assert.equal(a.entries[0].id, "alert");
  assert.equal(a.entries[a.entries.length - 1].id, "text-input");
  assert.ok(a.entries.some((entry) => entry.id === "shadcn-button"));
  assert.ok(a.entries.some((entry) => entry.id === "magic-ui-dot-pattern"));
  assert.ok(a.entries.some((entry) => entry.id === "react-bits-split-text" && entry.entryType === "external"));
  assert.deepEqual(a.taxonomies.categories.slice(0, 6), ["buttons", "inputs", "layout", "display", "feedback", "navigation"]);
  assert.deepEqual(a.taxonomies.aesthetics, [
    "professional", "casual", "minimal", "luxury", "cyberpunk", "retro-synthwave",
    "brutalist", "organic", "futuristic", "gaming", "editorial", "playful",
  ]);
  assert.ok(a.taxonomies.sources.some((source) => source.id === "shadcn" && source.status === "available"));
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
  assert.ok(text.includes("Type: external"));
  assert.ok(text.includes("Library source: shadcn (https://ui.shadcn.com"));
  assert.ok(text.includes("License:"));
  assert.ok(text.includes("External ID: example"));
  assert.ok(text.includes("Retrieval: npx shadcn@latest add"));
  assert.ok(text.includes("Preview: external https://example.com/demo"));
  assert.ok(text.includes("Aesthetics: cyberpunk"));
  assert.ok(text.includes("Attributes: dark, animated"));
});
