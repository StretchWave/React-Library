// Zero-dependency smoke tests for the repeatable preview audit CLI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { repoRoot } from "../scripts/lib/catalog.mjs";

const ROOT = repoRoot();

test("audit:previews is wired as a package command", () => {
  const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8"));
  assert.equal(pkg.scripts["audit:previews"], "node scripts/audit-previews.mjs");
});

test("audit previews exposes help without launching a browser", () => {
  const result = spawnSync(process.execPath, ["scripts/audit-previews.mjs", "--help"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--only=<ids>/);
  assert.match(result.stdout, /--base-url=<url>/);
  assert.match(result.stdout, /--viewport=<WxH>/);
  assert.match(result.stdout, /--reduced-motion/);
  assert.match(result.stdout, /Node >= 22\.12/);
});

test("audit previews keeps the full workspace, gallery and reduced-motion paths", () => {
  const source = readFileSync(`${ROOT}/scripts/audit-previews.mjs`, "utf8");
  assert.match(source, /#\/preview\/\$\{entry\.id\}/);
  assert.match(source, /#\/gallery/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /Input\.dispatchMouseEvent/);
  assert.match(source, /requires-environment/);
  assert.match(source, /contextLostCanvases/);
});

test("audit distinguishes trigger verification from rendering", () => {
  const source = readFileSync(`${ROOT}/scripts/audit-previews.mjs`, "utf8");
  assert.match(source, /byVerification/);
  assert.match(source, /animation-verified/);
  assert.match(source, /interaction-verified/);
  assert.match(source, /needs-manual-review/);
  assert.match(source, /expectedInteractions/);
  assert.match(source, /exerciseScroll/);
  assert.match(source, /exerciseControl/);
});

test("audit exercises hover previews, rapid pointer movement and component chunks", () => {
  const source = readFileSync(`${ROOT}/scripts/audit-previews.mjs`, "utf8");
  assert.match(source, /data-testid=\\"hover-preview\\"/);
  assert.match(source, /hoverPassed/);
  assert.match(source, /rapidHover/);
  assert.match(source, /maxPanels/);
  assert.match(source, /threeLoaded/);
  assert.match(source, /unexpectedThreeLoads/);
});

test("gallery audit reads the current preview DOM and profile decisions", () => {
  const source = readFileSync(`${ROOT}/scripts/audit-previews.mjs`, "utf8");
  assert.match(source, /data-preview-kind/);
  assert.match(source, /preview-mini-stage/);
  assert.match(source, /preview-frame\.is-snapshot/);
  assert.match(source, /preview-frame\.is-external/);
  assert.match(source, /autoplayAllowed/);
  assert.match(source, /gallery\.snapshot/);
  assert.match(source, /checked: items\.length/);
  assert.match(source, /External preview only/);
  assert.doesNotMatch(source, /preview-mini-play/);
});
