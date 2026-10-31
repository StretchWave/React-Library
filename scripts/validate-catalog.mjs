#!/usr/bin/env node
// Validator CLI (MASTER_SPEC.md §8.1)
//   node scripts/validate-catalog.mjs [--check-index] [--skip-links]
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildIndex,
  loadCatalog,
  repoRoot,
  validateCatalog,
  validateTaxonomy,
} from "./lib/catalog.mjs";

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log("Usage: node scripts/validate-catalog.mjs [--check-index] [--skip-links]");
  process.exit(0);
}
const checkIndex = args.has("--check-index");
const skipLinks = args.has("--skip-links");

const root = repoRoot();
const errors = [];
const warnings = [];

function fail(message) {
  console.error("Validation could not run:");
  console.error(`  ${message}`);
  process.exit(1);
}

let loaded;
try {
  loaded = loadCatalog(root);
} catch (error) {
  fail(error.message);
}

const { catalog, themes, categories, aesthetics, attributes, behaviors, sources, types, triggers, techniques } = loaded;

// Validate taxonomies first so category/theme references resolve against full sets.
const taxonomyResult = validateTaxonomy(themes, categories, {
  aesthetics,
  attributes,
  behaviors,
  sources,
  types,
  triggers,
  techniques,
});
errors.push(...taxonomyResult.errors);
warnings.push(...taxonomyResult.warnings);

const themesDocForEntries = taxonomyResult.errors.length === 0
  ? themes
  : { themes: [] };
const categoriesDocForEntries = taxonomyResult.errors.length === 0
  ? categories
  : { categories: [] };

const entryOptions = { root, checkLinks: !skipLinks };
// All v2 taxonomies pass real documented sets: the schema enforces that entry
// aesthetic/attribute/behavior/source references resolve against the taxonomy
// files (M7.1 — behaviors was previously validated against an empty set, which
// let a misclassified id slip through silently). Themes/categories stay behind
// the taxonomy-error gate as before because their entry checks are strict.
const entryTaxonomies = {
  themes: themesDocForEntries,
  categories: categoriesDocForEntries,
  aesthetics,
  attributes,
  behaviors,
  sources,
  types,
  triggers,
  techniques,
};
const catalogResult = validateCatalog(catalog, entryTaxonomies, entryOptions);
errors.push(...catalogResult.errors);
warnings.push(...catalogResult.warnings);

// Sanity guard: never report against empty taxonomy sets silently.
if (taxonomyResult.errors.length > 0) {
  warnings.push("taxonomy errors present - entry category/theme checks ran against empty sets");
}

if (checkIndex) {
  const indexFile = path.join(root, "catalog", "index.json");
  if (!existsSync(indexFile)) {
    errors.push("catalog/index.json is missing - run 'npm run generate'");
  } else {
    let stored;
    try {
      stored = JSON.parse(readFileSync(indexFile, "utf8"));
      delete stored.generatedAt;
    } catch (error) {
      stored = null;
      errors.push(`catalog/index.json is not valid JSON: ${error.message}`);
    }
    if (stored) {
      const derived = buildIndex(
        catalog,
        themes,
        categories,
        {
          aesthetics,
          attributes,
          behaviors,
          sources,
          types,
          triggers,
          techniques,
        },
        "STAMP",
      );
      delete derived.generatedAt;
      if (JSON.stringify(derived) !== JSON.stringify(stored)) {
        errors.push("catalog/index.json is stale or divergent - run 'npm run generate'");
      }
    }
  }
}

if (errors.length > 0) {
  console.log(`Catalog invalid: ${errors.length} error(s)${skipLinks ? " (link checks skipped)" : ""}`);
  for (const error of errors.sort()) console.log(`  ✗ ${error}`);
} else {
  const counts = `entries ${catalog.entries.length}, themes ${themes.themes.length}, categories ${categories.categories.length}, aesthetics ${(aesthetics.aesthetics || []).length}, types ${(types.types || []).length}, triggers ${(triggers.triggers || []).length}, techniques ${(techniques.techniques || []).length}, behaviors ${(behaviors.behaviors || []).length}, sources ${(sources.sources || []).length}`;
  console.log(
    `Catalog valid — ${counts}${checkIndex ? ", index up to date" : ""}${skipLinks ? " (link checks skipped)" : ""}`,
  );
}

if (warnings.length > 0) {
  console.log(`Warnings (${warnings.length}):`);
  for (const warning of warnings.sort()) console.log(`  ! ${warning}`);
}

process.exitCode = errors.length > 0 ? 1 : 0;
