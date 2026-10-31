#!/usr/bin/env node
// CodePen reference adapter (M7.6). CodePen pens are author-owned; this script
// NEVER scrapes or copies a pen. It records only a verified official URL, the
// official embed URL, attribution and license metadata, and refuses --write
// until both the author and license have been supplied.
//
//   node scripts/ingest-codepen.mjs --url=<official-pen-url> --title="..." \
//     --author="..." --license=MIT [--write]
//
// Dry-run is the default. After a write, run `npm run generate` so the derived
// index and source coverage stay in sync.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadCatalog, repoRoot, validateCatalog } from "./lib/catalog.mjs";
import { composeCodePenEntry, updateSourceCoverage } from "./lib/ingest.mjs";

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
  console.log(`Usage: node scripts/ingest-codepen.mjs --url=<pen-url> [options] [--write]

Required for --write:
  --url=<url>          official https://codepen.io/<user>/pen/<slug> URL
  --author=<name>      pen author attribution
  --license=<id>       verified license id (e.g. MIT) or NOASSERTION

Options:
  --title=<text>       official pen title (default: title-cased URL slug)
  --summary=<text>     catalog summary (<= 140 chars)
  --id=<slug>          explicit entry id (default: codepen-<slug>)
  --category=<id>      taxonomy category (default: transitions)
  --type=a,b           component types (default: transition)
  --trigger=a,b        triggers (default: route-transition)
  --technique=a,b      techniques
  --vibe=a,b           visual-vibe aesthetics
  --tech=a,b           technical attributes
  --license-url=<url>  official license/terms URL
  --keep-blocked       keep the saved-example blocked record after import
  --write              persist catalog + source coverage
`);
  process.exit(0);
}

const url = value("url");
if (!url) {
  console.error("Usage error: --url=<official CodePen pen URL> is required.");
  process.exit(2);
}
const write = has("write");
const root = repoRoot();
const loaded = loadCatalog(root);
const catalogFile = path.join(root, "catalog", "catalog.json");
const sourcesFile = path.join(root, "taxonomy", "sources.json");
const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
const sourcesDoc = JSON.parse(readFileSync(sourcesFile, "utf8"));
const sourceDoc = loaded.sources.sources.find((source) => source.id === "codepen");
if (!sourceDoc) {
  console.error("taxonomy/sources.json has no codepen source record.");
  process.exit(1);
}
const author = value("author");
const license = value("license");
if (write && (!author || !license)) {
  console.error(
    "Refusing to write an unverified CodePen reference. Supply --author=<name> and --license=<verified id>.",
  );
  process.exit(2);
}

const fetchedAt = new Date().toISOString().slice(0, 10);
let composed;
try {
  composed = composeCodePenEntry({
    sourceDoc,
    url,
    title: value("title"),
    summary: value("summary"),
    id: value("id"),
    category: value("category"),
    types: list("type"),
    triggers: list("trigger"),
    techniques: list("technique"),
    aesthetics: list("vibe"),
    attributes: list("tech"),
    author,
    license,
    licenseUrl: value("license-url"),
    existingEntries: catalog.entries,
    fetchedAt,
  });
} catch (error) {
  console.error(`CodePen reference rejected: ${error.message}`);
  process.exit(2);
}

const entry = composed.entry;
const previous = catalog.entries.find((candidate) => candidate.id === entry.id);
if (previous) {
  // Idempotent re-runs keep the original catalog dates unless a human edits
  // them explicitly; only the reference metadata is refreshed.
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
  console.error("CodePen reference validation failed; nothing was written:");
  for (const error of validation.errors) console.error(`  - ${error}`);
  process.exit(1);
}

const imported = nextEntries.filter((candidate) => candidate.source === "codepen").length;
const clearBlockedLabel = has("keep-blocked") ? undefined : "Saved Multi-Page View Transition example";
const nextSources = updateSourceCoverage(sourcesDoc, "codepen", {
  imported,
  checkedAt: fetchedAt,
  clearBlockedLabel,
  note:
    "Author-verified CodePen reference metadata is tracked. Pens remain author-owned; only official embed/export paths may be used.",
});
const catalogChanged = JSON.stringify(nextCatalog) !== JSON.stringify(catalog);
const sourcesChanged = JSON.stringify(nextSources) !== JSON.stringify(sourcesDoc);

console.log(`${previous ? "UPDATE" : "ADD"} ${entry.id} (${entry.source}, external reference)`);
console.log(`Official pen: ${entry.sourceUrl}`);
console.log(`Official embed: ${composed.info.embedUrl}`);
console.log(`Attribution: ${author || "(not supplied; write refused)"}`);
console.log(`License: ${license || "(not supplied; write refused)"}`);
console.log(
  `Coverage: discovered ${nextSources.sources.find((source) => source.id === "codepen")?.coverage?.discovered ?? 0}, ` +
    `imported ${imported}, blocked ${nextSources.sources.find((source) => source.id === "codepen")?.coverage?.blocked?.length ?? 0}`,
);
if (!write) {
  console.log("Dry run - rerun with --write after verifying the author and license.");
  process.exit(0);
}
if (catalogChanged) writeFileSync(catalogFile, JSON.stringify(nextCatalog, null, 2) + "\n", "utf8");
if (sourcesChanged) writeFileSync(sourcesFile, JSON.stringify(nextSources, null, 2) + "\n", "utf8");
console.log(
  catalogChanged || sourcesChanged
    ? "Wrote catalog/catalog.json and taxonomy/sources.json. Run `npm run generate`."
    : "No changes; the reference is already current.",
);
