#!/usr/bin/env node
// Magic UI ingestion adapter (MASTER_SPEC §10 M5.2).
//   node scripts/ingest-magicui.mjs [--items a,b,c] [--write]
// Retrieves ONLY via the official registry (https://magicui.design/r/<item>.json),
// vendors the MIT items under catalog/components/magic-ui/<item>/ and merges
// entries into catalog/catalog.json (sorted, never overwriting). Without --write
// it performs a dry run.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  composeMagicUiEntry,
  composeMagicUiManifest,
  fetchMagicUiItem,
  fileBasename,
  mergeEntry,
} from "./lib/ingest.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const itemsArg = args.find((arg) => arg.startsWith("--items="));
const items = itemsArg
  ? itemsArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean)
  : ["dot-pattern", "word-rotate", "blur-fade", "border-beam"];

const root = path.resolve(import.meta.dirname, "..");
const catalogFile = path.join(root, "catalog", "catalog.json");
const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
const fetchedAt = new Date().toISOString().slice(0, 10);

let working = catalog;
let fetched = 0;
let skipped = 0;
let failed = 0;

for (const item of items) {
  try {
    const { registry, url } = await fetchMagicUiItem(item);
    if (!registry) {
      skipped += 1;
      console.warn(`SKIP ${item}: not published (${url})`);
      continue;
    }
    fetched += 1;
    const dir = path.join(root, "catalog", "components", "magic-ui", item);
    if (write) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "component.json"),
        JSON.stringify(composeMagicUiManifest(item, registry, url, { fetchedAt }), null, 2) + "\n",
      );
      for (const file of registry.files ?? []) {
        writeFileSync(path.join(dir, fileBasename(file.path)), `${file.content ?? ""}`, "utf8");
      }
    }
    const entry = composeMagicUiEntry(item, registry, { fetchedAt });
    const result = mergeEntry(working, entry);
    console.log(result.merged ? `ADD ${entry.id}` : `KEEP ${entry.id}: ${result.reason}`);
    if (result.merged) working = result.catalog;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item}: ${error.message}`);
  }
}

if (write && working !== catalog) {
  working.entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  writeFileSync(catalogFile, JSON.stringify(working, null, 2) + "\n", "utf8");
}

console.log(`Magic UI ingestion: fetched ${fetched}, skipped ${skipped}, failed ${failed}${write ? "" : " (dry run — rerun with --write)"}`);
