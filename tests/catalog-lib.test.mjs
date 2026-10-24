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
const taxonomies = { themes: seed.themes, categories: seed.categories };

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

function validate(entries, opts = {}) {
  return validateCatalog({ schemaVersion: 1, entries }, taxonomies, opts);
}

test("seed catalog and taxonomies validate cleanly", () => {
  const taxonomyResult = validateTaxonomy(seed.themes, seed.categories);
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
  const { catalog: bad } = { catalog: { schemaVersion: 2, entries: [mkEntry({ status: "wip", version: "1.0", addedDate: "10-24-2026" })] } };
  const { errors } = validateCatalog(bad, taxonomies, { checkLinks: false });
  assert.ok(errors.some((message) => message.includes("'schemaVersion' must be 1")));
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
      schemaVersion: 1,
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
  assert.deepEqual(
    matches.map((entry) => entry.id),
    ["alert", "badge", "button", "card", "tabs", "text-input"],
  );
});

test("search: category and theme filters", () => {
  assert.deepEqual(
    searchEntries(seedEntries, "", { category: "buttons" }).map((entry) => entry.id),
    ["button"],
  );
  assert.deepEqual(
    searchEntries(seedEntries, "", { category: "display" }).map((entry) => entry.id),
    ["badge"],
  );
  const pastel = searchEntries(seedEntries, "", { theme: "soft-pastel" });
  assert.equal(pastel.length, seedEntries.length);
  assert.deepEqual(searchEntries(seedEntries, "btn", { category: "display" }), []);
});

test("index: deterministic shape and counts", () => {
  const a = buildIndex(seed.catalog, seed.themes, seed.categories, "2026-10-24T00:00:00.000Z");
  const b = buildIndex(seed.catalog, seed.themes, seed.categories, "2027-01-01T00:00:00.000Z");
  delete a.generatedAt;
  delete b.generatedAt;
  assert.deepEqual(a, b);
  assert.deepEqual(a.counts, { entries: 6, themes: 6, categories: 6 });
  assert.equal(a.generator, "scripts/generate-index.mjs");
  assert.deepEqual(
    a.entries.map((entry) => entry.id),
    ["alert", "badge", "button", "card", "tabs", "text-input"],
  );
  assert.deepEqual(a.taxonomies.categories, ["buttons", "inputs", "layout", "display", "feedback", "navigation"]);
});

test("formatEntryText renders dashes for missing links", () => {
  const text = formatEntryText(mkEntry({}));
  assert.ok(text.includes("Sample (sample)"));
  assert.ok(text.includes("Source: —"));
  const seeded = formatEntryText(seedEntries.find((entry) => entry.id === "button"));
  assert.ok(seeded.includes("src/components/Button/Button.tsx"));
  assert.ok(seeded.includes("Props (4):"));
});
