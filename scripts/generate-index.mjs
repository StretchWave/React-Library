#!/usr/bin/env node
// Index generator CLI (MASTER_SPEC.md §8.1)
//   node scripts/generate-index.mjs [--skip-links]
// Validates first (aborts on errors), then rewrites catalog/index.json.
import path from "node:path";
import {
  buildIndex,
  loadCatalog,
  repoRoot,
  validateCatalog,
  validateTaxonomy,
  writeIndex,
} from "./lib/catalog.mjs";

const skipLinks = process.argv.slice(2).includes("--skip-links");
const root = repoRoot();

let loaded;
try {
  loaded = loadCatalog(root);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const { catalog, themes, categories, aesthetics, attributes, behaviors, sources } = loaded;
const taxonomyResult = validateTaxonomy(themes, categories, { aesthetics, attributes, behaviors, sources });
const themesDocForEntries = taxonomyResult.errors.length === 0 ? themes : { themes: [] };
const categoriesDocForEntries = taxonomyResult.errors.length === 0 ? categories : { categories: [] };
const catalogResult = validateCatalog(
  catalog,
  {
    themes: themesDocForEntries,
    categories: categoriesDocForEntries,
    aesthetics: { aesthetics: [] },
    attributes: { attributes: [] },
    behaviors: { behaviors: [] },
    sources: { sources: [] },
  },
  { root, checkLinks: !skipLinks },
);

const errors = [...taxonomyResult.errors, ...catalogResult.errors];
if (errors.length > 0) {
  console.error(`Cannot generate index: ${errors.length} error(s)`);
  for (const error of errors.sort()) console.error(`  ✗ ${error}`);
  process.exit(1);
}

const generatedAt = new Date().toISOString();
const index = buildIndex(catalog, themes, categories, { aesthetics, attributes, behaviors, sources }, generatedAt);
const file = writeIndex(root, index);

const counts = index.counts;
const rel = path.relative(root, file).replace(/\\/g, "/");
console.log(
  `Wrote ${rel} — ` +
    `${counts.entries} entries (${counts.byEntryType.local} local / ${counts.byEntryType.external} external), ` +
    `${counts.themes} themes, ${counts.categories} categories, ` +
    `${counts.aesthetics} aesthetics, ${counts.sources} sources (generatedAt ${generatedAt})`,
);
