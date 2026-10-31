#!/usr/bin/env node
// Publishes the real preview screenshots captured by scripts/audit-previews.mjs
// into public/previews/ so the adaptive gallery can use honest fallbacks.
//
// The audit drives a real installed Chrome/Edge and captures the component stage,
// not an invented illustration. Re-run the audit first when the implementation
// changes, then run this command. Missing screenshots are reported and skipped;
// no placeholder image is ever fabricated.
//
// Usage:
//   npm run capture:previews
//   npm run capture:previews -- --check
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { loadCatalog, repoRoot } from "./lib/catalog.mjs";

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log("Usage: node scripts/capture-previews.mjs [--check]");
  console.log("  --check  verify expected snapshots exist without copying");
  process.exit(0);
}
const checkOnly = args.has("--check");
const root = repoRoot();
const loaded = loadCatalog(root);
const sourceDir = path.join(root, "audit", "screenshots");
const targetDir = path.join(root, "public", "previews");

if (!checkOnly) mkdirSync(targetDir, { recursive: true });

const localEntries = loaded.catalog.entries.filter(
  (entry) => entry.previewProfile?.snapshotPath && entry.previewProfile.previewStatus === "ready",
);
const missingAudit = [];
const missingPublic = [];
let copied = 0;
let unchanged = 0;

for (const entry of localEntries) {
  const source = path.join(sourceDir, `${entry.id}.jpg`);
  const target = path.join(targetDir, `${entry.id}.jpg`);
  if (!existsSync(source)) {
    missingAudit.push(entry.id);
    continue;
  }
  if (!checkOnly) {
    const targetExists = existsSync(target);
    const same =
      targetExists && statSync(source).size === statSync(target).size && statSync(source).mtimeMs <= statSync(target).mtimeMs;
    if (!same) {
      copyFileSync(source, target);
      copied += 1;
    } else {
      unchanged += 1;
    }
  }
  if (!existsSync(target)) missingPublic.push(entry.id);
}

if (missingAudit.length > 0) {
  console.error(`Missing audit screenshots (${missingAudit.length}): ${missingAudit.join(", ")}`);
  console.error("Run 'npm run audit:previews' first; this tool never invents a fallback image.");
  process.exitCode = 1;
}
if (checkOnly && missingPublic.length > 0) {
  console.error(`Missing published previews (${missingPublic.length}): ${missingPublic.join(", ")}`);
  process.exitCode = 1;
}
if (!checkOnly) {
  console.log(
    `Published ${localEntries.length} preview snapshots to public/previews/ ` +
      `(${copied} copied, ${unchanged} unchanged).`,
  );
}
if (missingPublic.length > 0 && !checkOnly) process.exitCode = 1;
