#!/usr/bin/env node
// Deterministic assisted classification + preview-profile pass (schema v3).
//
// Every added facet is derived from evidence already present on the entry
// (category, source, behaviours, runtime, summary, vendored attributes) or from
// the component's official name/summary. Values derived this way are recorded
// as `inferred` in tagMeta; values that came with the existing catalog record
// remain `sourceProvided`. The script is idempotent and never overwrites
// unrelated fields. Re-run after ingestion:
//
//   node scripts/classify-catalog.mjs --write
//   npm run generate
//
// `--check` reports drift without writing. It does not invent screenshots: the
// snapshot path is only emitted when the real audit capture already exists.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadCatalog, repoRoot } from "./lib/catalog.mjs";

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log("Usage: node scripts/classify-catalog.mjs [--write|--check]");
  console.log("  --write  update catalog/catalog.json in place");
  console.log("  --check  exit 1 if classification or preview profiles are missing/different (default)");
  process.exit(0);
}
const write = args.has("--write");
const root = repoRoot();
const loaded = loadCatalog(root);
const catalogFile = path.join(root, "catalog", "catalog.json");
const catalog = JSON.parse(readFileSync(catalogFile, "utf8"));
const auditScreenshots = path.join(root, "audit", "screenshots");
const publicSnapshots = path.join(root, "public", "previews");

const CATEGORY_TYPES = {
  buttons: "button",
  inputs: "input",
  layout: "layout",
  display: "display",
  feedback: "feedback",
  navigation: "navigation",
  tabs: "tabs",
  tooltips: "tooltip",
  modals: "modal",
  "hero-sections": "section",
  "pricing-sections": "section",
  footers: "section",
  backgrounds: "background",
  gradients: "gradient",
  "text-effects": "text-effect",
  loaders: "loader",
  cursors: "cursor",
  charts: "chart",
  "3d-webgl": "scene",
  "scroll-animations": "motion",
  "page-sections": "section",
  "page-layouts": "template",
  templates: "template",
  transitions: "transition",
  "visual-effect-recipes": "visual-effect-recipe",
  scenes: "scene",
  motion: "motion",
  "micro-interactions": "micro-interaction",
};

const TYPE_OVERRIDES = {
  "react-bits-animated-content": ["motion", "transition"],
  "react-bits-animated-list": ["layout", "micro-interaction"],
  "react-bits-blob-cursor": ["cursor", "motion"],
  "react-bits-border-glow": ["card"],
  "react-bits-card-nav": ["navigation", "card"],
  "react-bits-chroma-grid": ["card"],
  "react-bits-circular-gallery": ["section", "scene"],
  "react-bits-click-spark": ["micro-interaction"],
  "react-bits-dome-gallery": ["scene"],
  "react-bits-elastic-slider": ["input"],
  "react-bits-fade-content": ["motion", "transition"],
  "react-bits-fluid-glass": ["background", "scene"],
  "react-bits-glare-hover": ["card"],
  "react-bits-glass-surface": ["card"],
  "react-bits-gradient-text": ["text-effect", "gradient"],
  "react-bits-hyperspeed": ["scene", "background"],
  "react-bits-iridescence": ["scene", "visual-effect-recipe"],
  "react-bits-lanyard": ["scene"],
  "react-bits-letter-glitch": ["background", "text-effect"],
  "react-bits-magnet": ["micro-interaction"],
  "react-bits-meta-balls": ["motion", "visual-effect-recipe"],
  "react-bits-metallic-paint": ["background", "visual-effect-recipe"],
  "react-bits-noise": ["background", "visual-effect-recipe"],
  "react-bits-pixel-card": ["card"],
  "react-bits-pixel-transition": ["transition", "card"],
  "react-bits-stack": ["section"],
  "react-bits-star-border": ["card"],
  "react-bits-tilted-card": ["card"],
  "magic-ui-blur-fade": ["motion", "transition"],
  "magic-ui-border-beam": ["card"],
  "magic-ui-dot-pattern": ["background"],
  "magic-ui-word-rotate": ["text-effect"],
  tabs: ["tabs", "navigation"],
  "text-input": ["input"],
};

const TECHNIQUES = {
  "magic-ui-blur-fade": ["blur", "fade", "reveal-mask"],
  "magic-ui-border-beam": ["beam", "gradient-shift", "glow"],
  "magic-ui-dot-pattern": ["grid"],
  "magic-ui-word-rotate": ["rotation", "typewriter"],
  "react-bits-animated-content": ["slide", "blur", "flip", "reveal-mask", "stagger"],
  "react-bits-animated-list": ["stagger", "slide", "elastic"],
  "react-bits-aurora": ["gradient-shift", "blur", "shader"],
  "react-bits-ballpit": ["physics", "depth"],
  "react-bits-beams": ["beam", "wave", "shader"],
  "react-bits-blob-cursor": ["liquid", "metallic", "trails", "shader"],
  "react-bits-blur-text": ["blur", "reveal-mask", "stagger"],
  "react-bits-border-glow": ["glow", "gradient-shift", "beam"],
  "react-bits-bubble-menu": ["stagger", "elastic"],
  "react-bits-card-nav": ["slide", "stagger"],
  "react-bits-carousel": ["slide"],
  "react-bits-chroma-grid": ["spotlight", "grid"],
  "react-bits-circular-gallery": ["orbit", "depth"],
  "react-bits-circular-text": ["rotation", "marquee"],
  "react-bits-click-spark": ["particles", "trails"],
  "react-bits-count-up": ["count"],
  "react-bits-counter": ["count", "rotation"],
  "react-bits-decrypted-text": ["scramble", "typewriter"],
  "react-bits-dock": ["magnetic", "stagger"],
  "react-bits-dome-gallery": ["depth", "orbit"],
  "react-bits-dot-grid": ["physics", "grid"],
  "react-bits-elastic-slider": ["elastic"],
  "react-bits-fade-content": ["fade", "blur", "reveal-mask", "stagger"],
  "react-bits-falling-text": ["physics"],
  "react-bits-flowing-menu": ["liquid", "marquee", "slide"],
  "react-bits-fluid-glass": ["glass", "liquid", "shader", "distortion"],
  "react-bits-glare-hover": ["reflection", "spotlight"],
  "react-bits-glass-surface": ["glass", "distortion", "reflection"],
  "react-bits-glitch-text": ["glitch", "scramble"],
  "react-bits-gooey-nav": ["morphing", "liquid", "elastic"],
  "react-bits-gradient-text": ["gradient-shift", "shimmer"],
  "react-bits-grid-motion": ["grid", "parallax", "spotlight"],
  "react-bits-hyperspeed": ["motion-blur", "trails", "depth"],
  "react-bits-iridescence": ["iridescence", "shader", "liquid"],
  "react-bits-lanyard": ["physics", "depth"],
  "react-bits-laser-flow": ["beam", "glow", "shader"],
  "react-bits-letter-glitch": ["glitch", "scramble", "noise"],
  "react-bits-lightning": ["lightning", "glow"],
  "react-bits-magnet": ["magnetic", "elastic"],
  "react-bits-magnet-lines": ["magnetic", "rotation"],
  "react-bits-masonry": ["stagger", "reveal-mask"],
  "react-bits-meta-balls": ["liquid", "physics", "shader"],
  "react-bits-metallic-paint": ["metallic", "liquid", "shader"],
  "react-bits-noise": ["noise"],
  "react-bits-particles": ["particles", "depth", "glow"],
  "react-bits-pixel-card": ["pixelation", "stagger"],
  "react-bits-pixel-transition": ["pixelation", "reveal-mask"],
  "react-bits-ribbons": ["trails", "wave", "elastic"],
  "react-bits-rotating-text": ["rotation", "flip"],
  "react-bits-scrambled-text": ["distortion", "displacement"],
  "react-bits-shiny-text": ["shimmer", "gradient-shift", "reflection"],
  "react-bits-split-text": ["text-splitting", "stagger"],
  "react-bits-spotlight-card": ["spotlight", "glow"],
  "react-bits-stack": ["stack", "elastic"],
  "react-bits-staggered-menu": ["stagger", "slide"],
  "react-bits-star-border": ["glow", "orbit", "trails"],
  "react-bits-stepper": ["slide", "elastic"],
  "react-bits-text-pressure": ["distortion", "morphing"],
  "react-bits-text-type": ["typewriter"],
  "react-bits-tilted-card": ["hover-tilt", "reflection", "depth"],
  "react-bits-waves": ["wave", "shader", "elastic"],
  "shadcn-accordion": ["slide", "reveal-mask"],
  "shadcn-dialog": ["fade", "slide"],
  "shadcn-dropdown-menu": ["fade", "slide"],
  "shadcn-skeleton": ["shimmer"],
  "shadcn-switch": ["slide"],
  "shadcn-tabs": ["fade", "slide"],
  "shadcn-tooltip": ["fade"],
};

const TRIGGER_OVERRIDES = {
  "react-bits-animated-list": ["keyboard"],
  "react-bits-ballpit": ["drag", "click"],
  "react-bits-chroma-grid": ["cursor-reactive"],
  "react-bits-fluid-glass": ["cursor-reactive"],
  "react-bits-lanyard": ["physics"],
  "react-bits-scrambled-text": ["cursor-reactive"],
  "react-bits-text-pressure": ["cursor-reactive"],
  tabs: ["keyboard"],
};

const AUTO_LOOP = new Set([
  "magic-ui-border-beam",
  "magic-ui-dot-pattern",
  "magic-ui-word-rotate",
  "react-bits-aurora",
  "react-bits-ballpit",
  "react-bits-beams",
  "react-bits-border-glow",
  "react-bits-circular-text",
  "react-bits-glitch-text",
  "react-bits-gradient-text",
  "react-bits-grid-motion",
  "react-bits-hyperspeed",
  "react-bits-iridescence",
  "react-bits-lanyard",
  "react-bits-laser-flow",
  "react-bits-letter-glitch",
  "react-bits-lightning",
  "react-bits-metallic-paint",
  "react-bits-noise",
  "react-bits-particles",
  "react-bits-ribbons",
  "react-bits-rotating-text",
  "react-bits-scrambled-text",
  "react-bits-shiny-text",
  "react-bits-star-border",
  "react-bits-text-type",
  "react-bits-waves",
]);
const AUTO_MOUNT = new Set([
  "react-bits-animated-list",
  "react-bits-count-up",
  "react-bits-counter",
  "react-bits-split-text",
]);

const VIBE_OVERRIDES = {
  "react-bits-fluid-glass": ["glassmorphism"],
  "react-bits-glass-surface": ["glassmorphism"],
  "react-bits-gradient-text": ["holographic"],
  "react-bits-hyperspeed": ["retrofuturism"],
  "react-bits-iridescence": ["holographic"],
  "react-bits-metallic-paint": ["holographic"],
  "react-bits-pixel-card": ["pixel-art", "y2k"],
  "react-bits-pixel-transition": ["pixel-art", "y2k"],
  "react-bits-text-type": ["retro-terminal"],
};

const COMPACT_IDS = new Set([
  "alert",
  "badge",
  "button",
  "card",
  "tabs",
  "text-input",
  "shadcn-alert",
  "shadcn-avatar",
  "shadcn-badge",
  "shadcn-breadcrumb",
  "shadcn-button",
  "shadcn-card",
  "shadcn-input",
  "shadcn-progress",
  "shadcn-skeleton",
  "shadcn-switch",
  "shadcn-tooltip",
]);
const WIDE_IDS = new Set([
  "react-bits-animated-content",
  "react-bits-animated-list",
  "react-bits-carousel",
  "react-bits-circular-text",
  "react-bits-fade-content",
  "react-bits-flowing-menu",
  "react-bits-masonry",
  "react-bits-stack",
  "react-bits-staggered-menu",
  "shadcn-accordion",
  "shadcn-dialog",
  "shadcn-dropdown-menu",
  "shadcn-table",
  "shadcn-tabs",
]);
const SHOWCASE_IDS = new Set([
  "react-bits-circular-gallery",
  "react-bits-dome-gallery",
  "react-bits-fluid-glass",
  "react-bits-hyperspeed",
  "react-bits-iridescence",
  "react-bits-lanyard",
  "react-bits-meta-balls",
]);
const REVIEW_IDS = new Set([
  "magic-ui-blur-fade",
  "magic-ui-border-beam",
  "magic-ui-dot-pattern",
  "magic-ui-word-rotate",
  ...loaded.catalog.entries.filter((entry) => entry.source === "shadcn").map((entry) => entry.id),
]);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function baseTypes(entry) {
  const base = CATEGORY_TYPES[entry.category] || "display";
  const sourceTypes = [base];
  const all = unique([...sourceTypes, ...(TYPE_OVERRIDES[entry.id] || [])]);
  return { sourceTypes, all };
}

function inferTriggers(entry) {
  const behaviors = entry.behaviors || [];
  const triggers = [];
  for (const behavior of behaviors) {
    if (behavior === "static") triggers.push("static");
    if (behavior === "auto") {
      if (AUTO_LOOP.has(entry.id)) triggers.push("automatic-loop");
      if (AUTO_MOUNT.has(entry.id)) triggers.push("mount");
      if (!AUTO_LOOP.has(entry.id) && !AUTO_MOUNT.has(entry.id)) {
        triggers.push(entry.category === "backgrounds" || entry.category === "3d-webgl" ? "automatic-loop" : "mount");
      }
    }
    if (behavior === "hover") triggers.push("hover");
    if (behavior === "click") triggers.push("click");
    if (behavior === "cursor-reactive") triggers.push("cursor-reactive");
    if (behavior === "scroll") triggers.push("scroll", "viewport-entry");
    if (behavior === "draggable") triggers.push("drag");
    if (behavior === "gesture") triggers.push("gesture");
    if (behavior === "stateful") triggers.push("state-change");
  }
  triggers.push(...(TRIGGER_OVERRIDES[entry.id] || []));
  if (triggers.length === 0) triggers.push("static");
  return unique(triggers);
}

function inferTechniques(entry) {
  if (TECHNIQUES[entry.id]) return TECHNIQUES[entry.id];
  if ((entry.behaviors || []).includes("static")) return [];
  // Evidence fallback: only use an effect whose term is already in the entry's
  // official summary/name. Never invent a technique for a generic record.
  const text = `${entry.name} ${entry.summary}`.toLowerCase();
  const rules = [
    ["fade", "fade"],
    ["slide", "slide"],
    ["blur", "blur"],
    ["glitch", "glitch"],
    ["scroll", "scroll"],
    ["rotate", "rotation"],
    ["grain", "noise"],
    ["particle", "particles"],
    ["gradient", "gradient-shift"],
    ["glow", "glow"],
    ["shimmer", "shimmer"],
    ["stagger", "stagger"],
    ["mask", "reveal-mask"],
    ["elastic", "elastic"],
  ];
  return unique(rules.filter(([term]) => text.includes(term)).map(([, technique]) => technique));
}

function layoutFor(entry) {
  if (SHOWCASE_IDS.has(entry.id) || ["backgrounds", "gradients", "3d-webgl"].includes(entry.category)) {
    return "showcase";
  }
  if (WIDE_IDS.has(entry.id) || ["navigation", "page-sections", "hero-sections", "pricing-sections", "footers", "scroll-animations", "templates", "page-layouts", "transitions"].includes(entry.category)) {
    return "wide";
  }
  if (COMPACT_IDS.has(entry.id) || ["buttons", "inputs", "feedback", "display", "tooltips", "modals", "tabs"].includes(entry.category)) {
    return "compact";
  }
  return "standard";
}

const LAYOUT_METRICS = {
  compact: { minWidth: 180, minHeight: 160, aspectRatio: "4 / 3", gridColumnSpan: 1, gridRowSpan: 1, expandedRecommended: false },
  standard: { minWidth: 240, minHeight: 220, aspectRatio: "4 / 3", gridColumnSpan: 1, gridRowSpan: 1, expandedRecommended: false },
  wide: { minWidth: 360, minHeight: 280, aspectRatio: "16 / 9", gridColumnSpan: 2, gridRowSpan: 1, expandedRecommended: true },
  showcase: { minWidth: 440, minHeight: 360, aspectRatio: "16 / 9", gridColumnSpan: 2, gridRowSpan: 2, expandedRecommended: true },
};

function inferRequirements(entry, triggers) {
  const requirements = [];
  if (entry.runtime === "webgl") requirements.push("webgl", "gpu");
  if (triggers.some((trigger) => ["hover", "cursor-reactive", "click", "drag"].includes(trigger))) requirements.push("pointer");
  if (triggers.some((trigger) => ["drag", "gesture"].includes(trigger))) requirements.push("user-input");
  if (triggers.includes("scroll")) requirements.push("scroll");
  if (triggers.includes("keyboard")) requirements.push("keyboard");
  return unique(requirements);
}

function inferPreviewProfile(entry, layout) {
  const metrics = LAYOUT_METRICS[layout];
  const previewType = entry.preview?.type ?? "local-demo";
  const external = previewType === "external";
  const unavailable = previewType === "none";
  const status = external ? "external" : unavailable ? "unavailable" : "ready";
  const mode = external ? "external" : unavailable ? "unavailable" : "live";
  const snapshotFile = path.join(auditScreenshots, `${entry.id}.jpg`);
  const snapshotPath = !external && !unavailable && existsSync(snapshotFile) ? `public/previews/${entry.id}.jpg` : undefined;
  const heavy = Boolean(entry.heavy);
  const cost = heavy || entry.runtime === "webgl" ? "high" : ["gsap", "motion", "physics"].includes(entry.runtime) || layout === "showcase" ? "medium" : "low";
  const triggers = entry.triggers || [];
  const autoplayAllowed =
    !heavy &&
    !external &&
    !unavailable &&
    triggers.some((trigger) => ["automatic-loop", "mount"].includes(trigger));
  const profile = {
    mode,
    layout,
    cost,
    aspectRatio: metrics.aspectRatio,
    minWidth: metrics.minWidth,
    minHeight: metrics.minHeight,
    gridColumnSpan: metrics.gridColumnSpan,
    gridRowSpan: metrics.gridRowSpan,
    expandedRecommended: metrics.expandedRecommended || heavy || external,
    requires: external || unavailable ? [] : inferRequirements(entry, triggers),
    snapshotPath,
    autoplayAllowed,
    previewStatus: status,
  };
  if (unavailable) {
    profile.failureReason = entry.preview?.note || "No local runtime preview is available for this entry.";
  } else if (external) {
    profile.failureReason =
      entry.preview?.note ||
      "External reference preview - the official source is linked instead of being run in this app.";
  }
  return profile;
}

function classify(entry) {
  const { sourceTypes, all: types } = baseTypes(entry);
  const triggers = inferTriggers(entry);
  const techniques = inferTechniques(entry);
  const vibeOverrides = VIBE_OVERRIDES[entry.id] || [];
  const existingVibes = (entry.aesthetics || []).filter((vibe) => !vibeOverrides.includes(vibe));
  const vibes = unique([...existingVibes, ...vibeOverrides]);
  const existingTech = entry.attributes || [];
  const tech = [...existingTech];

  const sourceProvided = [
    ...sourceTypes.map((type) => `type:${type}`),
    ...existingVibes.map((vibe) => `vibe:${vibe}`),
    ...existingTech.map((item) => `tech:${item}`),
  ];
  const inferred = [
    ...types.filter((type) => !sourceTypes.includes(type)).map((type) => `type:${type}`),
    ...triggers.map((trigger) => `trigger:${trigger}`),
    ...techniques.map((technique) => `technique:${technique}`),
    ...vibes.filter((vibe) => !existingVibes.includes(vibe)).map((vibe) => `vibe:${vibe}`),
    ...tech.filter((item) => !existingTech.includes(item)).map((item) => `tech:${item}`),
  ];
  return {
    types,
    triggers,
    techniques,
    aesthetics: vibes,
    attributes: tech,
    tagMeta: {
      sourceProvided: unique(sourceProvided),
      inferred: unique(inferred),
      reviewNeeded: REVIEW_IDS.has(entry.id),
    },
    previewProfile: inferPreviewProfile({ ...entry, triggers }, layoutFor(entry)),
  };
}

const idMap = new Map(loaded.catalog.entries.map((entry) => [entry.id, entry]));
const taxonomy = {
  types: new Set((loaded.types.types || []).map((item) => item.id)),
  triggers: new Set((loaded.triggers.triggers || []).map((item) => item.id)),
  techniques: new Set((loaded.techniques.techniques || []).map((item) => item.id)),
  aesthetics: new Set((loaded.aesthetics.aesthetics || []).map((item) => item.id)),
  attributes: new Set((loaded.attributes.attributes || []).map((item) => item.id)),
};

const errors = [];
let changed = 0;
const nextEntries = catalog.entries.map((entry) => {
  if (!idMap.has(entry.id)) return entry;
  const result = classify(entry);
  for (const [key, values] of [
    ["types", result.types],
    ["triggers", result.triggers],
    ["techniques", result.techniques],
  ]) {
    for (const value of values) {
      if (!taxonomy[key].has(value)) errors.push(`${entry.id}: unknown ${key} "${value}"`);
    }
  }
  for (const value of result.aesthetics) {
    if (!taxonomy.aesthetics.has(value)) errors.push(`${entry.id}: unknown aesthetic "${value}"`);
  }
  const next = {
    ...entry,
    types: result.types,
    triggers: result.triggers,
    techniques: result.techniques,
    aesthetics: result.aesthetics,
    attributes: result.attributes,
    tagMeta: result.tagMeta,
    previewProfile: result.previewProfile,
  };
  if (JSON.stringify(next) !== JSON.stringify(entry)) changed += 1;
  return next;
});

if (errors.length > 0) {
  console.error(`Classification aborted: ${errors.length} taxonomy error(s)`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

if (JSON.stringify(nextEntries) !== JSON.stringify(catalog.entries)) {
  if (write) {
    const nextCatalog = {
      ...catalog,
      schemaVersion: 3,
      meta: {
        ...catalog.meta,
        description:
          "Canonical, hand-maintained component catalog. Schema v3 adds multi-dimensional types/triggers/techniques, tag provenance and validated preview profiles. catalog/index.json is derived - run 'npm run generate' after editing this file; never hand-edit the index.",
      },
      entries: nextEntries,
    };
    writeFileSync(catalogFile, JSON.stringify(nextCatalog, null, 2) + "\n", "utf8");
    console.log(`Updated ${changed} entr${changed === 1 ? "y" : "ies"} in catalog/catalog.json (schema v3).`);
  } else {
    console.error(`${changed} entr${changed === 1 ? "y" : "ies"} would change. Re-run with --write.`);
    process.exitCode = 1;
  }
} else {
  console.log("Catalog classification and preview profiles are current.");
}

const missingSnapshots = nextEntries
  .filter((entry) => entry.previewProfile?.snapshotPath && !existsSync(path.join(publicSnapshots, `${entry.id}.jpg`)))
  .map((entry) => entry.id);
if (missingSnapshots.length > 0) {
  console.log(
    `Preview snapshots still need publishing (${missingSnapshots.length}): ${missingSnapshots.join(", ")}. ` +
      "Run 'npm run capture:previews'.",
  );
}
