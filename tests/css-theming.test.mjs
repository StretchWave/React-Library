// CSS theming guard (M2+): library/UI css under src/components must theme via
// --rl-* tokens only. Inline fallbacks inside var(--rl-*, fallback) stay
// allowed (documented pattern); any other raw color literal fails (M2).
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { repoRoot } from "../scripts/lib/catalog.mjs";

const ROOT = repoRoot();
const BROWSER_DIR = path.join(ROOT, "src", "components");

/** Recursively collects every .css file under src/components. */
function collectCssFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) collectCssFiles(full, acc);
    else if (name.endsWith(".css")) acc.push(full);
  }
  return acc;
}

/** Removes allowed var(...) fallback payloads (up to one nesting level), so
 *  var(--rl-border, #d8dee6) stays legal while #d8dee6 outside var() does not. */
function stripAllowedFallbacks(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // comments
    .replace(/var\(--rl-[\w-]+\s*,[^()]*(?:\([^()]*\)[^()]*)*\)/g, "var()");
}

const RAW_COLOR_PATTERNS = [
  { name: "hex", re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "rgb", re: /\brgba?\(/ },
  { name: "hsl", re: /\bhsla?\(/ },
];

const cssFiles = collectCssFiles(BROWSER_DIR);

test("found at least one component css file to guard", () => {
  assert.ok(cssFiles.length >= 1, `expected css files under src/components, found ${cssFiles.length}`);
});

test("component css uses theme tokens (--rl-*) somewhere", () => {
  for (const file of cssFiles) {
    const css = readFileSync(file, "utf8");
    assert.ok(
      /var\(\s*--rl-[\w-]+/.test(css),
      `${path.relative(ROOT, file)}: expected at least one var(--rl-*) usage (theming contract)`,
    );
  }
});

test("component css contains no raw color literals outside var() fallbacks", () => {
  const violations = [];
  for (const file of cssFiles) {
    const stripped = stripAllowedFallbacks(readFileSync(file, "utf8"));
    for (const { name, re } of RAW_COLOR_PATTERNS) {
      if (re.test(stripped)) {
        violations.push(`${path.relative(ROOT, file)}: raw ${name}() color outside var() fallback`);
      }
    }
  }
  assert.deepEqual(violations, []);
});
