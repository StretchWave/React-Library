#!/usr/bin/env node
// Generic external-reference adapter (M7.6) for sources whose material cannot
// be copied into this repository: Aceternity, 21st.dev, OriginKit, Pryzm,
// Ditther, GetLayers and manual Uiverse/HyperUI references. It records official
// metadata only and never fetches or vendors source files.
//
//   node scripts/ingest-reference.mjs --source=<id> --url=<official-url> \
//     --title="..." [--author="..."] [--license=MIT] [--write]
//
// CodePen has its own adapter because it needs an official embed URL and an
// explicit author/license verification step. Dry-run is the default.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadCatalog, repoRoot, validateCatalog } from "./lib/catalog.mjs";
import { composeReferenceEntry, updateSourceCoverage } from "./lib/ingest.mjs";

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const value = (name) => {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
};
const list = (name) =>
  (value(name) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

if (has("help") || has("h")) {
  console.log(`Usage: node scripts/ingest-reference.mjs --source=<id> --url=<url> [options] [--write]

Required:
  --source=<id>        taxonomy/sources.json id (not shadcn/magic-ui/react-bits)
  --url=<url>          official http(s) source URL

Options:
  --title=<text>       official title (default: title-cased URL slug)
  --summary=<text>     catalog summary (<= 140 chars)
  --id=<slug>          explicit entry id (default: <source>-<slug>)
  --external-id=<id>   official source id (default: URL slug)
  --category=<id>      taxonomy category (default: inferred from title)
  --type=a,b           component types
  --trigger=a,b        triggers
  --technique=a,b      techniques
  --vibe=a,b           visual-vibe aesthetics
  --tech=a,b           technical attributes
  --author=<name>      attribution recorded in the license note
  --license=<id>       verified SPDX-like id (default: NOASSERTION)
  --license-url=<url>  official license/terms URL
  --clear-blocked=<label>  clear an exact resolved blocked record
  --write              persist catalog + source coverage
`);
  process.exit(0);
}

const sourceId = value("source");
const url = value("url");
if (!sourceId || !url) {
  console.error("Usage error: --source=<id> and --url=<official URL> are required.");
  process.exit(2);
}
if (sourceId === "codepen") {
  console.error("Use `npm run ingest-codepen -- --url=<pen-url> ...` for CodePen references.");
  process.exit(2);
}
const write = has("write");
const root = repoRoot();
const loaded = loadCatalog(root);
const catalogFile = path.join(root, "catalog", "catalog.json");
const sourcesFile = path.join(root, "taxonomy", "sources.json");
const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
const sourcesDoc = JSON.parse(readFileSync(sourcesFile, "utf8"));
const sourceDoc = loaded.sources.sources.find((source) => source.id === sourceId);
if (!sourceDoc) {
  console.error(`Unknown source "${sourceId}". See taxonomy/sources.json.`);
  process.exit(2);
}

function lastUrlSegment(input) {
  try {
    const parsed = new URL(input);
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "reference");
  } catch {
    return "reference";
  }
}
const externalId = value("external-id") || lastUrlSegment(url);
const title = value("title") || externalId.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const fetchedAt = new Date().toISOString().slice(0, 10);
let entry;
try {
  entry = composeReferenceEntry({
    sourceDoc,
    url,
    title,
    summary: value("summary"),
    id: value("id"),
    category: value("category"),
    types: list("type"),
    triggers: list("trigger"),
    techniques: list("technique"),
    aesthetics: list("vibe"),
    attributes: list("tech"),
    externalId,
    author: value("author"),
    license: value("license"),
    licenseUrl: value("license-url"),
    existingEntries: catalog.entries,
    fetchedAt,
  });
} catch (error) {
  console.error(`Reference rejected: ${error.message}`);
  process.exit(2);
}

const previous = catalog.entries.find((candidate) => candidate.id === entry.id);
if (previous) {
  entry.addedDate = previous.addedDate;
  entry.syncedAt = previous.syncedAt ?? previous.addedDate;
}
const nextEntries = [...catalog.entries.filter((candidate) => candidate.id !== entry.id), entry].sort(
  (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
);
const nextCatalog = { ...catalog, entries: nextEntries };
const taxonomies = {
  themes: loaded.themes,
  categories: loaded.categories,
  aesthetics: loaded.aesthetics,
  attributes: loaded.attributes,
  behaviors: loaded.behaviors,
  sources: loaded.sources,
  types: loaded.types,
  triggers: loaded.triggers,
  techniques: loaded.techniques,
};
const validation = validateCatalog(nextCatalog, taxonomies, { root, checkLinks: true });
if (validation.errors.length > 0) {
  console.error("Reference validation failed; nothing was written:");
  for (const error of validation.errors) console.error(`  - ${error}`);
  process.exit(1);
}

const imported = nextEntries.filter((candidate) => candidate.source === sourceId).length;
const clearBlockedLabel = value("clear-blocked");
const nextSources = updateSourceCoverage(sourcesDoc, sourceId, {
  imported,
  checkedAt: fetchedAt,
  clearBlockedLabel,
});
const catalogChanged = JSON.stringify(nextCatalog) !== JSON.stringify(catalog);
const sourcesChanged = JSON.stringify(nextSources) !== JSON.stringify(sourcesDoc);

console.log(`${previous ? "UPDATE" : "ADD"} ${entry.id} (${sourceId}, external reference)`);
console.log(`Official source: ${entry.sourceUrl}`);
console.log(`License: ${entry.license.spdx}${entry.license.attribution ? ` (${entry.license.attribution})` : ""}`);
console.log(`Facets: ${entry.types.join(", ")} / ${entry.triggers.join(", ")}`);
console.log(
  `Coverage: discovered ${nextSources.sources.find((source) => source.id === sourceId)?.coverage?.discovered ?? 0}, imported ${imported}`,
);
if (!write) {
  console.log("Dry run - rerun with --write after verifying the official URL and terms.");
  process.exit(0);
}
if (catalogChanged) writeFileSync(catalogFile, JSON.stringify(nextCatalog, null, 2) + "\n", "utf8");
if (sourcesChanged) writeFileSync(sourcesFile, JSON.stringify(nextSources, null, 2) + "\n", "utf8");
console.log(
  catalogChanged || sourcesChanged
    ? "Wrote catalog/catalog.json and taxonomy/sources.json. Run `npm run generate`."
    : "No changes; the reference is already current.",
);
