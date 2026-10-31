#!/usr/bin/env node
// Component lookup CLI (MASTER_SPEC.md section 8.2)
//   node scripts/lookup.mjs <query> [filters] [--json] [--list]
// Filters are AND across dimensions and OR within a repeated option.
// Exit codes: 0 found - 1 no match - 2 unknown filter id - 64 usage error.
import { parseArgs } from "node:util";
import {
  ENTRY_TYPES,
  PREVIEW_MODES,
  formatEntryText,
  loadCatalog,
  repoRoot,
  searchEntries,
} from "./lib/catalog.mjs";

function usage() {
  console.error(`Usage: node scripts/lookup.mjs <query> [filters] [--json] [--list]

Finds a component by id, alias, search text, or discovery facet over the canonical catalog.
Filters are AND across dimensions and OR within a repeated option.
  --theme <id>           application appearance theme
  --category <id>        structural category
  --type <id>            component type (taxonomy/types.json); legacy local|external accepted
  --entry-type <value>   local | external
  --trigger <id>         animation trigger
  --technique <id>       animation technique
  --vibe <id>            visual vibe (alias: --aesthetic)
  --tech <id>            technical attribute (alias: --attribute)
  --behavior <id>        interaction behavior
  --source <id>          source library or reference (or built-in)
  --preview-mode <mode>  live | snapshot | loop | external | unavailable
  --json                 print exactly one JSON object (entry, or { query, count, matches })
  --list                 print every matching entry (id - name - category - status - type)`);
}

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      list: { type: "boolean", default: false },
      theme: { type: "string", multiple: true },
      category: { type: "string", multiple: true },
      aesthetic: { type: "string", multiple: true },
      vibe: { type: "string", multiple: true },
      behavior: { type: "string", multiple: true },
      source: { type: "string", multiple: true },
      type: { type: "string", multiple: true },
      "entry-type": { type: "string", multiple: true },
      trigger: { type: "string", multiple: true },
      technique: { type: "string", multiple: true },
      attribute: { type: "string", multiple: true },
      tech: { type: "string", multiple: true },
      "preview-mode": { type: "string", multiple: true },
    },
  });
} catch (error) {
  console.error(String(error.message || error));
  usage();
  process.exit(64);
}

const { values, positionals } = parsed;

let loaded;
try {
  loaded = loadCatalog(repoRoot());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const {
  catalog,
  themes,
  categories,
  aesthetics,
  attributes,
  behaviors,
  sources,
  types,
  triggers,
  techniques,
} = loaded;
const entries = catalog.entries;

function asList(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function rejectUnknown(flag, selected, known) {
  for (const value of selected) {
    if (!known.includes(value)) {
      console.error(`Unknown ${flag} "${value}". Known: ${known.join(", ")}`);
      process.exit(2);
    }
  }
}

const themeIds = themes.themes.map((theme) => theme.id);
const categoryIds = categories.categories.map((category) => category.id);
const aestheticIds = aesthetics.aesthetics.map((aesthetic) => aesthetic.id);
const behaviorIds = behaviors.behaviors.map((behavior) => behavior.id);
const sourceIds = [...sources.sources.map((source) => source.id), "built-in"];
const typeIds = types.types.map((type) => type.id);
const triggerIds = triggers.triggers.map((trigger) => trigger.id);
const techniqueIds = techniques.techniques.map((technique) => technique.id);
const techIds = attributes.attributes
  .filter((attribute) => attribute.group === "tech")
  .map((attribute) => attribute.id);

const typeValues = asList(values.type);
const legacyEntryTypes = typeValues.filter((value) => ENTRY_TYPES.includes(value));
const componentTypes = typeValues.filter((value) => !ENTRY_TYPES.includes(value));
const entryTypes = [...asList(values["entry-type"]), ...legacyEntryTypes];
const vibes = [...asList(values.vibe), ...asList(values.aesthetic)];
const techValues = [...asList(values.tech), ...asList(values.attribute)];

rejectUnknown("--theme", asList(values.theme), themeIds);
rejectUnknown("--category", asList(values.category), categoryIds);
rejectUnknown("--type", componentTypes, typeIds);
rejectUnknown("--entry-type", entryTypes, ENTRY_TYPES);
rejectUnknown("--trigger", asList(values.trigger), triggerIds);
rejectUnknown("--technique", asList(values.technique), techniqueIds);
rejectUnknown("--vibe/--aesthetic", vibes, aestheticIds);
rejectUnknown("--tech/--attribute", techValues, techIds);
rejectUnknown("--behavior", asList(values.behavior), behaviorIds);
rejectUnknown("--source", asList(values.source), sourceIds);
rejectUnknown("--preview-mode", asList(values["preview-mode"]), PREVIEW_MODES);

const filters = {
  theme: values.theme,
  category: values.category,
  aesthetic: vibes,
  behavior: values.behavior,
  source: values.source,
  entryType: entryTypes,
  type: componentTypes,
  trigger: values.trigger,
  technique: values.technique,
  tech: techValues,
  previewMode: values["preview-mode"],
};

function scopeLabel(label, selected) {
  if (selected.length === 0) return null;
  return `${label} ${selected.map((value) => `"${value}"`).join(" or ")}`;
}

const scope = [
  scopeLabel("theme", asList(values.theme)),
  scopeLabel("category", asList(values.category)),
  scopeLabel("component type", componentTypes),
  scopeLabel("entry type", entryTypes),
  scopeLabel("trigger", asList(values.trigger)),
  scopeLabel("technique", asList(values.technique)),
  scopeLabel("vibe", vibes),
  scopeLabel("tech", techValues),
  scopeLabel("behavior", asList(values.behavior)),
  scopeLabel("source", asList(values.source)),
  scopeLabel("preview mode", asList(values["preview-mode"])),
].filter(Boolean);

if (values.list) {
  for (const entry of searchEntries(entries, "", filters)) {
    const type = entry.entryType ?? "local";
    console.log(`${entry.id} - ${entry.name} - ${entry.category} - ${entry.status} - ${type}`);
  }
  process.exit(0);
}

const query = positionals[0];
if (!query) {
  usage();
  process.exit(64);
}

const matches = searchEntries(entries, query, filters);

if (matches.length === 0) {
  console.error(
    `No component matches "${query}"${scope.length ? ` within ${scope.join(" and ")}` : ""}. Try 'npm run lookup -- --list'.`,
  );
  process.exit(1);
}

if (values.json) {
  if (matches.length === 1) {
    console.log(JSON.stringify(matches[0], null, 2));
  } else {
    console.log(JSON.stringify({ query, count: matches.length, matches: matches.slice(0, 10) }, null, 2));
  }
  process.exit(0);
}

if (matches.length === 1) {
  console.log(formatEntryText(matches[0]));
} else {
  console.log(`${matches.length} match(es) for "${query}" (showing up to 10):`);
  for (const entry of matches.slice(0, 10)) {
    console.log(`  ${entry.id} - ${entry.name} - ${entry.category} - ${entry.status}`);
  }
  console.log("Refine the query (or use a full id) to print a single record.");
}
process.exit(0);
