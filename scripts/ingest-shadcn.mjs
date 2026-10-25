#!/usr/bin/env node
// shadcn/ui ingestion adapter (MASTER_SPEC §10 M5.2).
//   node scripts/ingest-shadcn.mjs [--items a,b,c] [--all] [--write] [--skip-catalog]
// Retrieves ONLY via the official registry JSON API (https://ui.shadcn.com),
// vendors per-item files under catalog/components/shadcn/<item>/, records a
// component.json manifest per item, and merges entries into catalog/catalog.json
// (sorted by id, never overwriting). Without --write it performs a dry run.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  SHADCN_STYLE,
  composeShadcnEntry,
  composeShadcnManifest,
  fetchShadcnItem,
  fileBasename,
  replaceEntry,
  registryUrlFor,
} from "./lib/ingest.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const skipCatalog = args.includes("--skip-catalog");
const itemsArg = args.find((arg) => arg.startsWith("--items="));
const DEFAULT_ITEMS = process.env.SHADCN_ITEMS?.split(",").map((s) => s.trim()).filter(Boolean)
  ?? [
    "badge", "button", "card", "alert", "input", "switch", "accordion", "tabs",
    "dialog", "tooltip", "skeleton", "progress", "avatar", "breadcrumb",
    "dropdown-menu", "table",
  ];
const items = itemsArg ? itemsArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_ITEMS;

const root = path.resolve(import.meta.dirname, "..");
const catalogFile = path.join(root, "catalog", "catalog.json");
const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));

const fetchedAt = new Date().toISOString().slice(0, 10);
const report = { fetched: [], skipped: [], failed: [], merged: [] };
let working = catalog;

for (const item of items) {
  try {
    const { registry, url } = await fetchShadcnItem(item);
    if (!registry) {
      report.skipped.push(`${item}: 404 on ${url}`);
      console.warn(`SKIP ${item}: not published in style ${SHADCN_STYLE} (${url})`);
      continue;
    }
    report.fetched.push(item);
    const dir = path.join(root, "catalog", "components", "shadcn", item);
    if (write) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "component.json"), JSON.stringify(composeShadcnManifest(item, registry, url, { fetchedAt }), null, 2) + "\n");
      for (const file of registry.files ?? []) {
        const target = path.join(dir, fileBasename(file.path));
        writeFileSync(target, `${file.content ?? ""}`, "utf8");
      }
    }
    const entry = composeShadcnEntry(item, registry, { fetchedAt });
    const result = replaceEntry(working, entry);
    report.merged.push(entry.id);
    if (!write && result.merged) result.reason = `dry run: entry ${entry.id} would be added`;
    console.log(result.merged ? `ADD ${entry.id} (${(registry.files ?? []).length} file(s))` : `KEEP ${entry.id}: ${result.reason}`);
    if (result.merged) working = result.catalog;
  } catch (error) {
    report.failed.push(`${item}: ${error.message}`);
    console.error(`FAIL ${item}: ${error.message}`);
  }
}

if (write && !skipCatalog && working !== catalog) {
  working.entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  writeFileSync(catalogFile, JSON.stringify(working, null, 2) + "\n", "utf8");
}

console.log(
  `shadcn ingestion: fetched ${report.fetched.length}, skipped ${report.skipped.length}, failed ${report.failed.length}${write ? "" : " (dry run — rerun with --write)"}`,
);
