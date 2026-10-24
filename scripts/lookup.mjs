#!/usr/bin/env node
// Component lookup CLI (MASTER_SPEC.md §8.2)
//   node scripts/lookup.mjs <query> [--theme <id>] [--category <id>] [--aesthetic <id>]
//     [--source <id>] [--type local|external] [--json] [--list]
// Exit codes: 0 found · 1 no match · 2 unknown filter id · 64 usage error.
import { parseArgs } from "node:util";
import { loadCatalog, repoRoot, searchEntries, formatEntryText } from "./lib/catalog.mjs";

function usage() {
  console.error(`Usage: node scripts/lookup.mjs <query> [--theme <id>] [--category <id>] [--aesthetic <id>] [--source <id>] [--type local|external] [--json] [--list]

Finds a component by id, alias, search text, aesthetics, or source over the canonical catalog.
  --theme <id>       restrict to an app appearance theme (taxonomy/themes.json)
  --category <id>    restrict to a category id (taxonomy/categories.json)
  --aesthetic <id>   restrict to an aesthetic id (taxonomy/aesthetics.json)
  --source <id>      restrict to a source id (taxonomy/sources.json)
  --type local|external  restrict to entry type
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
      aesthetic: { type: "string" },
      source: { type: "string" },
      type: { type: "string" },
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
const { catalog, themes, categories, aesthetics, sources } = loaded;
const entries = catalog.entries;

const themeIds = themes.themes.map((t) => t.id);
const categoryIds = categories.categories.map((c) => c.id);
const aestheticIds = aesthetics.aesthetics.map((a) => a.id);
const sourceIds = sources.sources.map((s) => s.id);
const entryTypes = ["local", "external"];
if (values.theme && !themeIds.includes(values.theme)) {
  console.error(`Unknown --theme "${values.theme}". Known: ${themeIds.join(", ")}`);
  process.exit(2);
}
if (values.category && !categoryIds.includes(values.category)) {
  console.error(`Unknown --category "${values.category}". Known: ${categoryIds.join(", ")}`);
  process.exit(2);
}
if (values.aesthetic && !aestheticIds.includes(values.aesthetic)) {
  console.error(`Unknown --aesthetic "${values.aesthetic}". Known: ${aestheticIds.join(", ")}`);
  process.exit(2);
}
if (values.source && !sourceIds.includes(values.source)) {
  console.error(`Unknown --source "${values.source}". Known: ${sourceIds.join(", ")}`);
  process.exit(2);
}
if (values.type && !entryTypes.includes(values.type)) {
  console.error(`Unknown --type "${values.type}". Known: ${entryTypes.join(", ")}`);
  process.exit(2);
}

const filters = {
  theme: values.theme,
  category: values.category,
  aesthetic: values.aesthetic,
  source: values.source,
  entryType: values.type,
};

if (values.list) {
  for (const entry of searchEntries(entries, "", filters)) {
    const type = entry.entryType ?? "local";
    console.log(`${entry.id} — ${entry.name} — ${entry.category} — ${entry.status} — ${type}`);
  }
  process.exit(0);
}

const query = positionals[0];
if (!query) {
  usage();
  process.exit(64);
}

const matches = searchEntries(entries, query, filters);

if (matches.length === 0) {
  const scope = [
    values.theme ? `theme "${values.theme}"` : null,
    values.category ? `category "${values.category}"` : null,
    values.aesthetic ? `aesthetic "${values.aesthetic}"` : null,
    values.source ? `source "${values.source}"` : null,
    values.type ? `type "${values.type}"` : null,
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
