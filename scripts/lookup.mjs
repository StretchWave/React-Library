#!/usr/bin/env node
// Component lookup CLI (MASTER_SPEC.md §8.2)
//   node scripts/lookup.mjs <query> [--theme <id>] [--category <id>] [--json] [--list]
// Exit codes: 0 found · 1 no match · 2 unknown --theme/--category · 64 usage error.
import { parseArgs } from "node:util";
import { loadCatalog, repoRoot, searchEntries, formatEntryText } from "./lib/catalog.mjs";

function usage() {
  console.error(`Usage: node scripts/lookup.mjs <query> [--theme <id>] [--category <id>] [--json] [--list]

Finds a component by id, alias, or search text over the canonical catalog.
  --theme <id>       restrict to a theme id from taxonomy/themes.json
  --category <id>    restrict to a category id from taxonomy/categories.json
  --json             print exactly one JSON object (entry, or { query, matches })
  --list             print every entry (id — name — category — status)`);
}

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      list: { type: "boolean", default: false },
      theme: { type: "string" },
      category: { type: "string" },
    },
  });
} catch (error) {
  console.error(String(error.message || error));
  usage();
  process.exit(64);
}

const { values, positionals } = parsed;

let loaded;
try {
  loaded = loadCatalog(repoRoot());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const { catalog, themes, categories } = loaded;
const entries = catalog.entries;

const themeIds = themes.themes.map((t) => t.id);
const categoryIds = categories.categories.map((c) => c.id);
if (values.theme && !themeIds.includes(values.theme)) {
  console.error(`Unknown --theme "${values.theme}". Known: ${themeIds.join(", ")}`);
  process.exit(2);
}
if (values.category && !categoryIds.includes(values.category)) {
  console.error(`Unknown --category "${values.category}". Known: ${categoryIds.join(", ")}`);
  process.exit(2);
}

if (values.list) {
  const filters = { theme: values.theme, category: values.category };
  for (const entry of searchEntries(entries, "", filters)) {
    console.log(`${entry.id} — ${entry.name} — ${entry.category} — ${entry.status}`);
  }
  process.exit(0);
}

const query = positionals[0];
if (!query) {
  usage();
  process.exit(64);
}

const matches = searchEntries(entries, query, { theme: values.theme, category: values.category });

if (matches.length === 0) {
  const scope = [
    values.theme ? `theme "${values.theme}"` : null,
    values.category ? `category "${values.category}"` : null,
  ].filter(Boolean);
  console.error(
    `No component matches "${query}"${scope.length ? ` within ${scope.join(" and ")}` : ""}. Try 'npm run lookup -- --list'.`,
  );
  process.exit(1);
}

if (values.json) {
  if (matches.length === 1) {
    console.log(JSON.stringify(matches[0], null, 2));
  } else {
    console.log(JSON.stringify({ query, count: matches.length, matches: matches.slice(0, 10) }, null, 2));
  }
  process.exit(0);
}

if (matches.length === 1) {
  console.log(formatEntryText(matches[0]));
} else {
  console.log(`${matches.length} match(es) for "${query}" (showing up to 10):`);
  for (const entry of matches.slice(0, 10)) {
    console.log(`  ${entry.id} — ${entry.name} — ${entry.category} — ${entry.status}`);
  }
  console.log(`Refine the query (or use a full id) to print a single record.`);
}
process.exit(0);
