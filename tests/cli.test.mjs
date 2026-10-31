// Integration tests: the catalog CLIs as child processes (node:test, zero dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { repoRoot } from "../scripts/lib/catalog.mjs";

const ROOT = repoRoot();

function run(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: "utf8" });
}

test("lookup finds an exact id and emits pure JSON", () => {
  const result = run("scripts/lookup.mjs", ["text-input", "--json"]);
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.id, "text-input");
  assert.equal(parsed.name, "TextInput");

  // Ambiguous queries fall back to the ranked candidates JSON.
  const ambiguous = run("scripts/lookup.mjs", ["button", "--json"]);
  assert.equal(ambiguous.status, 0);
  const candidates = JSON.parse(ambiguous.stdout);
  assert.ok(candidates.count >= 2);
  assert.equal(candidates.matches[0].id, "button");
});

test("lookup exits 1 for unknown queries", () => {
  const result = run("scripts/lookup.mjs", ["definitely-not-a-component"]);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes("No component matches"));
});

test("lookup --list prints every entry", () => {
  const result = run("scripts/lookup.mjs", ["--list"]);
  assert.equal(result.status, 0);
  for (const id of ["alert", "badge", "button", "card", "tabs", "text-input"]) {
    assert.ok(result.stdout.includes(id));
  }
});

test("lookup --list honors category filters", () => {
  const result = run("scripts/lookup.mjs", ["--list", "--category", "inputs"]);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes("text-input"));
  assert.ok(!result.stdout.includes("button -"));
});

test("lookup renders the human text block", () => {
  const result = run("scripts/lookup.mjs", ["text-input"]);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes("TextInput (text-input)"));
  assert.ok(result.stdout.includes("stable"));
});

test("lookup rejects unknown filters with exit code 2", () => {
  const badTheme = run("scripts/lookup.mjs", ["button", "--theme", "not-a-theme"]);
  assert.equal(badTheme.status, 2);
  const badCategory = run("scripts/lookup.mjs", ["button", "--category", "not-a-category"]);
  assert.equal(badCategory.status, 2);
  const badAesthetic = run("scripts/lookup.mjs", ["button", "--aesthetic", "not-an-aesthetic"]);
  assert.equal(badAesthetic.status, 2);
  const badSource = run("scripts/lookup.mjs", ["button", "--source", "not-a-source"]);
  assert.equal(badSource.status, 2);
  const badType = run("scripts/lookup.mjs", ["button", "--type", "hologram"]);
  assert.equal(badType.status, 2);
  const badBehavior = run("scripts/lookup.mjs", ["button", "--behavior", "hover-into-the-void"]);
  assert.equal(badBehavior.status, 2);
  for (const [flag, value] of [
    ["--trigger", "not-a-trigger"],
    ["--technique", "not-a-technique"],
    ["--vibe", "not-a-vibe"],
    ["--tech", "not-a-tech"],
    ["--preview-mode", "not-a-mode"],
    ["--entry-type", "not-an-entry-type"],
  ]) {
    const result = run("scripts/lookup.mjs", ["button", flag, value]);
    assert.equal(result.status, 2, `${flag} should reject ${value}`);
  }
});

// --- v3 discovery facets ----------------------------------------------------

test("lookup --list combines component type and animation trigger with AND", () => {
  const result = run("scripts/lookup.mjs", ["--list", "--type", "button", "--trigger", "hover"]);
  assert.equal(result.status, 0, result.stderr);
  const ids = result.stdout.trim().split(/\r?\n/).map((line) => line.split(" - ")[0]);
  assert.deepEqual(ids, ["button", "shadcn-button"]);
});

test("lookup --list supports visual vibe and technology facets", () => {
  const result = run("scripts/lookup.mjs", ["--list", "--vibe", "minimal", "--tech", "tailwind"]);
  assert.equal(result.status, 0, result.stderr);
  const ids = result.stdout.trim().split(/\r?\n/).map((line) => line.split(" - ")[0]);
  assert.deepEqual(ids, ["magic-ui-blur-fade", "magic-ui-dot-pattern", "magic-ui-word-rotate", "shadcn-badge"]);
  assert.ok(!ids.includes("button"));
});

test("lookup --list ORs repeated facet values and keeps legacy entry-type aliases", () => {
  const types = run("scripts/lookup.mjs", ["--list", "--type", "button", "--type", "input"]);
  assert.equal(types.status, 0, types.stderr);
  assert.ok(types.stdout.includes("button -"));
  assert.ok(types.stdout.includes("text-input -"));

  const local = run("scripts/lookup.mjs", ["--list", "--type", "local"]);
  assert.equal(local.status, 0, local.stderr);
  assert.equal(local.stdout.trim().split(/\r?\n/).length, 87);

  const explicit = run("scripts/lookup.mjs", ["--list", "--entry-type", "local"]);
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.equal(explicit.stdout.trim().split(/\r?\n/).length, 87);
});

test("lookup --list filters preview profiles honestly", () => {
  const result = run("scripts/lookup.mjs", ["--list", "--preview-mode", "external"]);
  assert.equal(result.status, 0, result.stderr);
  const ids = result.stdout.trim().split(/\r?\n/).map((line) => line.split(" - ")[0]);
  assert.equal(ids.length, 16);
  assert.ok(ids.includes("shadcn-button"));
  assert.ok(!ids.includes("button"));
});

test("lookup --list supports the built-in source alias", () => {
  const result = run("scripts/lookup.mjs", ["--list", "--source", "built-in"]);
  assert.equal(result.status, 0, result.stderr);
  const ids = result.stdout.trim().split(/\r?\n/).map((line) => line.split(" - ")[0]);
  assert.deepEqual(ids, ["alert", "badge", "button", "card", "tabs", "text-input"]);
});

// --- M7.1 interaction-behavior filter (taxonomy/behaviors.json) --------------

test("lookup --list --behavior filters to entries classified with that behavior", () => {
  const result = run("scripts/lookup.mjs", ["--list", "--behavior", "interactive-nav"]);
  assert.equal(result.status, 0);
  // All eight classified entries surface (verified against the canonical records).
  for (const id of [
    "react-bits-bubble-menu",
    "react-bits-dock",
    "react-bits-gooey-nav",
    "shadcn-breadcrumb",
    "shadcn-dropdown-menu",
  ]) {
    assert.ok(result.stdout.includes(id), `expected ${id} in interactive-nav list`);
  }
  // And behaviorless ids stay out: a static entry is not interactive navigation.
  assert.ok(!result.stdout.includes("shadcn-badgetext"));
  assert.ok(!result.stdout.replace(/shadcn-\S*/g, "").includes("button -"));
});

test("lookup emits the Behavior line for a multi-behavior entry", () => {
  const result = run("scripts/lookup.mjs", ["react-bits-dock", "--json"]);
  assert.equal(result.status, 0);
  // Multi-classification: the record keeps the full behavior array intact.
  const parsed = JSON.parse(result.stdout);
  assert.ok(Array.isArray(parsed.behaviors));
  assert.ok(parsed.behaviors.includes("interactive-nav"));
  assert.ok(parsed.behaviors.includes("hover"));
});

test("lookup without arguments is a usage error", () => {
  const result = run("scripts/lookup.mjs");
  assert.equal(result.status, 64);
  assert.ok(result.stderr.includes("Usage:"));
});

test("generate writes the index; validate --check-index accepts it", () => {
  const generated = run("scripts/generate-index.mjs");
  assert.equal(generated.status, 0, generated.stderr);
  assert.ok(generated.stdout.includes("87 entries"));

  const validated = run("scripts/validate-catalog.mjs", ["--check-index"]);
  assert.equal(validated.status, 0, validated.stdout);
  assert.ok(validated.stdout.includes("Catalog valid"));
  assert.ok(validated.stdout.includes("index up to date"));
});

test("validate --check-index fails when the index is behind the catalog", () => {
  assert.equal(run("scripts/generate-index.mjs").status, 0);

  const stale = run("--input-type=module", ["-e", `import { readFileSync, writeFileSync } from "node:fs";
    const file = "catalog/index.json";
    const index = JSON.parse(readFileSync(file, "utf8"));
    index.counts.entries = 999;
    index.entries = index.entries.filter((entry) => entry.id !== "button");
    writeFileSync(file, JSON.stringify(index, null, 2));
  `]);
  assert.equal(stale.status, 0, stale.stderr);

  const validated = run("scripts/validate-catalog.mjs", ["--check-index"]);
  assert.equal(validated.status, 1);
  assert.ok(validated.stdout.includes("stale or divergent"));

  // Self-heal the working tree: the index is a derived artifact, regenerate it.
  assert.equal(run("scripts/generate-index.mjs").status, 0);
});
