#!/usr/bin/env node
// React Bits ingestion adapter (M6 correction: animation-first catalog).
//   node scripts/ingest-reactbits.mjs [--only=slug,slug] [--write]
// Retrieves ONLY via the official registry (https://reactbits.dev/r/<Name>-TS-CSS.json),
// vendors the MIT + Commons Clause items under catalog/components/react-bits/<slug>/
// and composes catalog entries. Existing react-bits reference entries whose id
// matches a vendored item are REPLACED by the vendored entry (use-in-application
// is permitted; the no-resale clause is recorded verbatim in the license note).
// Interactive 3D/WebGL showcases stay external (page-verified links).
// Without --write it performs a dry run and prints the dependency union.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  REACT_BITS_BASE,
  REACT_BITS_CURATED,
  REACT_BITS_EXTERNAL_CURATED,
  composeReactBitsEntry,
  composeReactBitsExternalEntry,
  composeReactBitsManifest,
  fetchReactBitsItem,
  fileBasename,
  reactBitsPageUrlFor,
  reactBitsSlugFor,
  replaceEntry,
} from "./lib/ingest.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const onlyArg = args.find((arg) => arg.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean) : null;

const root = path.resolve(import.meta.dirname, "..");
const catalogFile = path.join(root, "catalog", "catalog.json");
const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
const fetchedAt = new Date().toISOString().slice(0, 10);

let working = catalog;
let vendored = 0;
let kept = 0;
let skipped = 0;
let failed = 0;
const depUnion = new Set();
const runtimeCounts = new Map();

function bumpRuntime(runtime) {
  runtimeCounts.set(runtime, (runtimeCounts.get(runtime) ?? 0) + 1);
}

function trackDeps(entry) {
  for (const dep of entry.dependencies ?? []) depUnion.add(dep.name);
}

// --- Vendored (TS-CSS variant) items ---------------------------------------
for (const curated of REACT_BITS_CURATED) {
  const { name, group, heavy = false } = curated;
  const slug = reactBitsSlugFor(name);
  if (only && !only.includes(slug) && !only.includes(name)) continue;
  try {
    const { registry, url, error } = await fetchReactBitsItem(name);
    if (!registry) {
      skipped += 1;
      console.warn(`SKIP react-bits-${slug}${error ? ` (${error})` : ""}: not published at ${url}`);
      continue;
    }
    const dir = path.join(root, "catalog", "components", "react-bits", slug);
    // The curated item itself is the override source (category, aesthetics,
    // heavy, live:false, summary); its nested `overrides` key is flattened too.
    const entry = composeReactBitsEntry(name, group, registry, {
      fetchedAt,
      overrides: { ...curated.overrides, ...curated, heavy },
    });
    if (write) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "component.json"),
        JSON.stringify(composeReactBitsManifest(name, group, registry, url, { fetchedAt }), null, 2) + "\n",
      );
      for (const file of registry.files ?? []) {
        writeFileSync(path.join(dir, fileBasename(file.path)), `${file.content ?? ""}`, "utf8");
      }
    }
    const result = replaceEntry(working, entry);
    if (result.merged) {
      working = result.catalog;
      vendored += 1;
      bumpRuntime(entry.runtime);
      trackDeps(entry);
      const replaced = String(result.reason ?? "").includes("replaced");
      console.log(
        replaced
          ? `VENDOR ${entry.id} (runtime: ${entry.runtime}, preview: ${entry.preview.type}, replaced reference entry)`
          : `VENDOR ${entry.id} (runtime: ${entry.runtime}, preview: ${entry.preview.type})`,
      );
    } else {
      kept += 1;
      console.log(`KEEP ${entry.id}: ${result.reason}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`FAIL react-bits-${slug}: ${error.message}`);
    if (error && error.stack) console.error(error.stack.split("\n").slice(1, 5).join("\n"));
  }
}

// --- External reference items (3D/WebGL showcases) --------------------------
for (const curated of REACT_BITS_EXTERNAL_CURATED) {
  const { name, group } = curated;
  const slug = reactBitsSlugFor(name);
  if (only && !only.includes(slug) && !only.includes(name)) continue;
  try {
    // Prefer vendoring the TS-CSS variant when the official item publishes one;
    // fall back to an external-reference entry (registry item + page check).
    const res = await fetchReactBitsItem(name);
    if (res.registry) {
      const entry = composeReactBitsEntry(name, group, res.registry, {
        fetchedAt,
        overrides: { ...curated, url: res.url },
      });
      const dir = path.join(root, "catalog", "components", "react-bits", slug);
      if (write) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          path.join(dir, "component.json"),
          JSON.stringify(composeReactBitsManifest(name, group, res.registry, res.url, { fetchedAt }), null, 2) + "\n",
        );
        for (const file of res.registry.files ?? []) {
          writeFileSync(path.join(dir, fileBasename(file.path)), `${file.content ?? ""}`, "utf8");
        }
      }
      const result = replaceEntry(working, entry);
      if (result.merged) {
        working = result.catalog;
        vendored += 1;
        bumpRuntime(entry.runtime);
        trackDeps(entry);
        console.log(`VENDOR ${entry.id} (runtime: ${entry.runtime}, preview: ${entry.preview.type})`);
        continue;
      }
      kept += 1;
      console.log(`KEEP ${entry.id}: ${result.reason}`);
      continue;
    }
    // No TS-CSS variant: verify the Tailwind variant + the official demo page.
    const { registry, url, error } = await fetchReactBitsItem(name, "TS-TW");
    if (!registry) {
      skipped += 1;
      console.warn(`SKIP external react-bits-${slug}${error ? ` (${error})` : ""}: not published at ${url}`);
      continue;
    }
    const pageUrl = reactBitsPageUrlFor(group, slug);
    const page = await fetch(pageUrl, { headers: { accept: "text/html" } });
    if (!page.ok) {
      skipped += 1;
      console.warn(`SKIP external react-bits-${slug}: official page ${pageUrl} returned ${page.status}`);
      continue;
    }
    const entry = composeReactBitsExternalEntry(name, group, {
      fetchedAt,
      overrides: { ...curated.overrides, ...curated },
    });
    const result = replaceEntry(working, entry);
    if (result.merged) {
      working = result.catalog;
      vendored += 1;
      bumpRuntime("external-webgl");
      console.log(`EXTERNAL ${entry.id} (${pageUrl})`);
    } else {
      kept += 1;
      console.log(`KEEP ${entry.id}: ${result.reason}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`FAIL external react-bits-${slug}: ${error.message}`);
  }
}

if (write && working !== catalog) {
  working.entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  writeFileSync(catalogFile, JSON.stringify(working, null, 2) + "\n", "utf8");
}

const runtimeSummary = [...runtimeCounts.entries()].map(([k, v]) => `${k}:${v}`).join(", ");
console.log(
  `React Bits ingestion: vendored/added ${vendored}, kept ${kept}, skipped ${skipped}, failed ${failed}${write ? "" : " (dry run - rerun with --write)"}`,
);
console.log(`Runtimes: ${runtimeSummary}`);
if (!write && depUnion.size > 0) {
  console.log(`Dependency union (app runtime candidates): ${[...depUnion].sort().join(", ")}`);
}
