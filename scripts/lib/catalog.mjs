// Shared zero-dependency library for the catalog tooling.
// Consumers: scripts/validate-catalog.mjs, scripts/generate-index.mjs, scripts/lookup.mjs
// Spec: MASTER_SPEC.md §5 (schema), §6 (themes), §8 (tooling contract).
import path from "node:path";
import { accessSync, readFileSync, writeFileSync } from "node:fs";

export const SCHEMA_VERSION = 2;

export const STATUSES = ["stable", "beta", "experimental", "deprecated"];
export const ENTRY_TYPES = ["local", "external"];
export const PREVIEW_TYPES = ["local-demo", "static", "external", "source-link", "none"];
export const THEME_BASES = ["light", "dark"];
export const LINK_KEYS = ["source", "demo", "docs"];
/** Independent attribute facets (taxonomy/attributes.json). */
export const ATTRIBUTE_GROUPS = ["appearance", "motion", "tech"];

/** The nine tokens every theme must define (MASTER_SPEC.md §5.4). */
export const CANONICAL_TOKENS = [
  "--rl-surface",
  "--rl-surface-alt",
  "--rl-text",
  "--rl-text-muted",
  "--rl-accent",
  "--rl-accent-contrast",
  "--rl-border",
  "--rl-radius",
  "--rl-font",
];

/** Tokens themes may define; components must fall back when absent. */
export const OPTIONAL_TOKENS = ["--rl-shadow", "--rl-focus", "--rl-backdrop"];

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const ENTRY_ID_RE = SLUG_RE;
export const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CAMEL_RE = /^[a-z][A-Za-z0-9]*$/;

const ENTRY_FIELDS = new Set([
  "id",
  "name",
  "summary",
  "description",
  "category",
  "themes",
  "aliases",
  "tags",
  "status",
  "version",
  "addedDate",
  "owner",
  "externalDependencies",
  "props",
  "links",
  "a11yNotes",
  "usedFrom",
  // --- v2 (M5): multi-source, aesthetic, preview and provenance fields. All
  // optional so schema-v1 entries stay valid; see docs/SCHEMA.md "v2".
  "entryType",
  "source",
  "sourceUrl",
  "externalId",
  "retrieval",
  "preview",
  "localDir",
  "manifest",
  "implementation",
  "dependencies",
  "license",
  "aesthetics",
  "attributes",
  "syncedAt",
]);

const TOP_LEVEL_FIELDS = new Set(["schemaVersion", "meta", "entries"]);

export function repoRoot() {
  // scripts/lib/ -> repo root is two levels up.
  return path.resolve(import.meta.dirname, "..", "..");
}

function readJsonFileSync(file, label) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(`Failed to read ${label} at ${file}: ${error.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} (${file}) is not valid JSON: ${error.message}`);
  }
}

/** Loads catalog + all taxonomy docs. Synchronous; throws on missing/invalid JSON. */
export function loadCatalog(root = repoRoot()) {
  const paths = {
    root,
    catalog: path.join(root, "catalog", "catalog.json"),
    themes: path.join(root, "taxonomy", "themes.json"),
    categories: path.join(root, "taxonomy", "categories.json"),
    aesthetics: path.join(root, "taxonomy", "aesthetics.json"),
    attributes: path.join(root, "taxonomy", "attributes.json"),
    sources: path.join(root, "taxonomy", "sources.json"),
  };
  return {
    catalog: readJsonFileSync(paths.catalog, "catalog"),
    themes: readJsonFileSync(paths.themes, "theme taxonomy"),
    categories: readJsonFileSync(paths.categories, "category taxonomy"),
    aesthetics: readJsonFileSync(paths.aesthetics, "aesthetic taxonomy"),
    attributes: readJsonFileSync(paths.attributes, "attribute taxonomy"),
    sources: readJsonFileSync(paths.sources, "sources taxonomy"),
    paths,
  };
}

export function validateTaxonomy(themesDoc, categoriesDoc, extras = {}) {
  const errors = [];
  const warnings = [];

  const themes = themesDoc && themesDoc.themes;
  if (!Array.isArray(themes) || themes.length === 0) {
    errors.push("taxonomy/themes.json: 'themes' must be a non-empty array");
  } else {
    const seen = new Map();
    themes.forEach((theme, i) => {
      const where = `taxonomy/themes.json themes[${i}]`;
      if (!isPlainObject(theme)) {
        errors.push(`${where}: theme must be an object`);
        return;
      }
      const label = `theme ${str(theme.id) || `#${i}`}`;
      if (!isSlugValue(theme.id)) errors.push(`${where}: invalid id slug "${str(theme.id)}"`);
      if (seen.has(theme.id)) errors.push(`${where}: duplicate theme id "${theme.id}"`);
      seen.set(theme.id, true);
      if (!isNonEmptyString(theme.label)) errors.push(`${label}: 'label' must be a non-empty string`);
      if (!THEME_BASES.includes(theme.base)) {
        errors.push(`${label}: 'base' must be one of ${THEME_BASES.join(" | ")}`);
      }
      if (!isNonEmptyString(theme.description)) {
        errors.push(`${label}: 'description' must be a non-empty string`);
      }
      const tokens = theme.tokens;
      if (!isPlainObject(tokens)) {
        errors.push(`${label}: 'tokens' must be an object of CSS-variable definitions`);
        return;
      }
      for (const token of CANONICAL_TOKENS) {
        if (!isNonEmptyString(tokens[token])) {
          errors.push(`${label}: missing canonical token ${token}`);
        }
      }
      for (const [key, value] of Object.entries(tokens)) {
        if (!key.startsWith("--rl-")) {
          warnings.push(`${label}: token "${key}" uses no theme namespace (expected --rl-*)`);
        }
        if (typeof value !== "string" || value.trim() === "") {
          errors.push(`${label}: token "${key}" must be a non-empty string`);
        }
      }
      const missingOptional = OPTIONAL_TOKENS.filter((t) => !(t in tokens));
      if (missingOptional.length > 0) {
        warnings.push(`${label}: no optional token(s) ${missingOptional.join(", ")} (components must fall back)`);
      }
    });
  }

  const categories = categoriesDoc && categoriesDoc.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    errors.push("taxonomy/categories.json: 'categories' must be a non-empty array");
  } else {
    const seen = new Set();
    categories.forEach((category, i) => {
      const where = `taxonomy/categories.json categories[${i}]`;
      if (!isPlainObject(category)) {
        errors.push(`${where}: category must be an object`);
        return;
      }
      if (!isSlugValue(category.id)) errors.push(`${where}: invalid id slug "${str(category.id)}"`);
      if (seen.has(category.id)) errors.push(`${where}: duplicate category id "${category.id}"`);
      seen.add(category.id);
      if (!isNonEmptyString(category.label)) errors.push(`${where}: 'label' must be a non-empty string`);
      if ("description" in category && !isNonEmptyString(category.description)) {
        errors.push(`${where}: 'description' must be a non-empty string when present`);
      }
    });
  }

  // --- v2 taxonomies: aesthetics, attributes, sources (optional args for compat).
  const aesthetics = extras.aesthetics && extras.aesthetics.aesthetics;
  if (extras.aesthetics) {
    if (!Array.isArray(aesthetics) || aesthetics.length === 0) {
      errors.push("taxonomy/aesthetics.json: 'aesthetics' must be a non-empty array");
    } else {
      const seen = new Set();
      aesthetics.forEach((aesthetic, i) => {
        const where = `taxonomy/aesthetics.json aesthetics[${i}]`;
        if (!isPlainObject(aesthetic)) {
          errors.push(`${where}: aesthetic must be an object`);
          return;
        }
        if (!isSlugValue(aesthetic.id)) errors.push(`${where}: invalid id slug "${str(aesthetic.id)}"`);
        if (seen.has(aesthetic.id)) errors.push(`${where}: duplicate aesthetic id "${aesthetic.id}"`);
        seen.add(aesthetic.id);
        if (!isNonEmptyString(aesthetic.label)) errors.push(`${where}: 'label' must be a non-empty string`);
      });
    }
  }

  const attributes = extras.attributes && extras.attributes.attributes;
  if (extras.attributes) {
    if (!Array.isArray(attributes) || attributes.length === 0) {
      errors.push("taxonomy/attributes.json: 'attributes' must be a non-empty array");
    } else {
      const seen = new Set();
      attributes.forEach((attribute, i) => {
        const where = `taxonomy/attributes.json attributes[${i}]`;
        if (!isPlainObject(attribute)) {
          errors.push(`${where}: attribute must be an object`);
          return;
        }
        if (!isSlugValue(attribute.id)) errors.push(`${where}: invalid id slug "${str(attribute.id)}"`);
        if (seen.has(attribute.id)) errors.push(`${where}: duplicate attribute id "${attribute.id}"`);
        seen.add(attribute.id);
        if (!isNonEmptyString(attribute.label)) errors.push(`${where}: 'label' must be a non-empty string`);
        if ("group" in attribute && !ATTRIBUTE_GROUPS.includes(attribute.group)) {
          errors.push(`${where}: 'group' must be one of ${ATTRIBUTE_GROUPS.join(" | ")}`);
        }
      });
    }
  }

  const sources = extras.sources && extras.sources.sources;
  if (extras.sources) {
    const knownStatuses = Array.isArray(extras.sources.statuses) ? extras.sources.statuses : SOURCE_STATUSES;
    if (!Array.isArray(sources) || sources.length === 0) {
      errors.push("taxonomy/sources.json: 'sources' must be a non-empty array");
    } else {
      const seen = new Set();
      sources.forEach((source, i) => {
        const where = `taxonomy/sources.json sources[${i}]`;
        if (!isPlainObject(source)) {
          errors.push(`${where}: source must be an object`);
          return;
        }
        const label = `source ${str(source.id) || `#${i}`}`;
        if (!isSlugValue(source.id)) errors.push(`${where}: invalid id slug "${str(source.id)}"`);
        if (seen.has(source.id)) errors.push(`${where}: duplicate source id "${source.id}"`);
        seen.add(source.id);
        if (!isNonEmptyString(source.name)) errors.push(`${label}: 'name' must be a non-empty string`);
        if (!isHttpUrl(source.url)) errors.push(`${label}: 'url' must be an http(s) URL (got "${str(source.url)}")`);
        if ("repo" in source && source.repo !== null && !isHttpUrl(source.repo)) {
          errors.push(`${label}: 'repo' must be http(s) or null when present`);
        }
        if (!knownStatuses.includes(source.status)) {
          errors.push(`${label}: 'status' must be one of ${knownStatuses.join(" | ")} (got "${str(source.status)}")`);
        }
        if (!isNonEmptyString(source.license)) errors.push(`${label}: 'license' must be a non-empty string`);
        if (!isNonEmptyString(source.notes)) errors.push(`${label}: 'notes' must be a non-empty string`);
        if ("limit" in source && source.limit !== null && !isNonEmptyString(source.limit)) {
          errors.push(`${label}: 'limit' must be a non-empty string or null when present`);
        }
        if ("auth" in source && source.auth !== null && !isNonEmptyString(source.auth)) {
          errors.push(`${label}: 'auth' must be a non-empty string or null when present`);
        }
        if ("evaluatedAt" in extras.sources && !/^\d{4}-\d{2}-\d{2}$/.test(str(extras.sources.evaluatedAt))) {
          errors.push("taxonomy/sources.json: 'evaluatedAt' must be YYYY-MM-DD when present");
        }
      });
    }
  }

  return { errors, warnings };
}

/** Validates the catalog against the taxonomy. `checkLinks` verifies that
 *  `links.source`/`links.demo` files exist on disk. */
export function validateCatalog(catalog, taxonomies, { root = repoRoot(), checkLinks = true } = {}) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(catalog)) {
    errors.push("catalog: top level must be an object");
    return { errors, warnings };
  }
  if (catalog.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`catalog: 'schemaVersion' must be ${SCHEMA_VERSION} (got ${str(catalog.schemaVersion)})`);
  }
  for (const key of Object.keys(catalog)) {
    if (!TOP_LEVEL_FIELDS.has(key)) warnings.push(`catalog: unknown top-level field "${key}"`);
  }

  const entries = catalog.entries;
  if (!Array.isArray(entries)) {
    errors.push("catalog: 'entries' must be an array");
    return { errors, warnings };
  }

  const themeIds = new Set((taxonomies.themes && taxonomies.themes.themes || []).map((t) => t.id));
  const categoryIds = new Set((taxonomies.categories && taxonomies.categories.categories || []).map((c) => c.id));
  const themeLabel = (id) => (themeIds.has(id) ? `theme "${id}"` : `unknown theme "${id}"`);
  // v2 taxonomies: enforced only when provided; legacy callers may omit them.
  const aestheticIds = new Set((taxonomies.aesthetics && taxonomies.aesthetics.aesthetics || []).map((a) => a.id));
  const attributeIds = new Set((taxonomies.attributes && taxonomies.attributes.attributes || []).map((a) => a.id));
  const sourceIds = new Set((taxonomies.sources && taxonomies.sources.sources || []).map((s) => s.id));

  const entryIds = new Set();
  const aliasOwners = new Map();
  let prevId;

  entries.forEach((entry, index) => {
    const at = `catalog.entries[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`${at}: entry must be an object`);
      return;
    }
    const id = entry.id;
    const label = `${at} (${str(id) || "<no id>"})`;

    const unknown = Object.keys(entry).filter((key) => !ENTRY_FIELDS.has(key));
    if (unknown.length > 0) warnings.push(`${label}: unknown field(s) ${unknown.map(f => `"${f}"`).join(", ")}`);

    if (!isSlugValue(id)) {
      errors.push(`${label}: invalid id slug (got "${str(id)}")`);
    }
    if (entryIds.has(id)) errors.push(`${label}: duplicate id "${id}"`);
    if (id) entryIds.add(id);

    if (!isNonEmptyString(entry.name)) errors.push(`${label}: 'name' must be a non-empty string`);
    if (!isNonEmptyString(entry.summary)) {
      errors.push(`${label}: 'summary' must be a non-empty string`);
    } else if (entry.summary.length > 140) {
      errors.push(`${label}: 'summary' exceeds 140 characters (${entry.summary.length})`);
    }
    if ("description" in entry && !isNonEmptyString(entry.description)) {
      errors.push(`${label}: 'description' must be a non-empty string when present`);
    }

    if (!isNonEmptyString(entry.category) || !categoryIds.has(entry.category)) {
      errors.push(
        `${label}: 'category' must be a taxonomy category (got "${str(entry.category)}"; known: ${[...categoryIds].join(", ")})`,
      );
    }

    if (!Array.isArray(entry.themes) || entry.themes.length === 0) {
      errors.push(`${label}: 'themes' must be a non-empty array of taxonomy theme ids`);
    } else {
      for (const theme of entry.themes) {
        if (!isNonEmptyString(theme) || !themeIds.has(theme)) {
          errors.push(`${label}: ${themeLabel(str(theme))} is not in the theme taxonomy`);
        }
      }
    }

    if (!Array.isArray(entry.aliases)) {
      errors.push(`${label}: 'aliases' must be an array`);
    } else {
      for (const alias of entry.aliases) {
        if (!isSlugValue(alias)) errors.push(`${label}: invalid alias slug "${str(alias)}"`);
        if (aliasOwners.has(alias)) {
          errors.push(`${label}: alias "${alias}" already owned by ${aliasOwners.get(alias)}`);
        } else {
          aliasOwners.set(alias, `"${str(id)}"`);
        }
      }
    }

    if (!Array.isArray(entry.tags)) {
      errors.push(`${label}: 'tags' must be an array`);
    } else {
      for (const tag of entry.tags) {
        if (!isSlugValue(tag)) errors.push(`${label}: tags must be lowercase slugs (got "${str(tag)}")`);
      }
    }

    if (!STATUSES.includes(entry.status)) {
      errors.push(`${label}: 'status' must be one of ${STATUSES.join(" | ")} (got "${str(entry.status)}")`);
    }
    if (!isNonEmptyString(entry.version) || !SEMVER_RE.test(entry.version)) {
      errors.push(`${label}: 'version' must be valid semver (got "${str(entry.version)}")`);
    }
    if (!isNonEmptyString(entry.addedDate) || !ISO_DATE_RE.test(entry.addedDate)) {
      errors.push(`${label}: 'addedDate' must be YYYY-MM-DD (got "${str(entry.addedDate)}")`);
    }
    if ("owner" in entry && !isNonEmptyString(entry.owner)) {
      errors.push(`${label}: 'owner' must be a non-empty string when present`);
    }

    const deps = entry.externalDependencies;
    if (!Array.isArray(deps)) {
      errors.push(`${label}: 'externalDependencies' must be an array`);
    } else {
      for (const dep of deps) {
        if (typeof dep !== "string" || dep.trim() === "") {
          errors.push(`${label}: externalDependencies entries must be non-empty strings (got ${str(dep)})`);
        } else if (dep === "react" || dep === "react-dom") {
          errors.push(`${label}: "${dep}" is implicit and must not be listed (react/react-dom come for free)`);
        }
      }
    }

    const props = entry.props;
    if (!Array.isArray(props)) {
      errors.push(`${label}: 'props' must be an array`);
    } else {
      const propNames = new Set();
      props.forEach((prop, propIndex) => {
        const propAt = `${label} props[${propIndex}]`;
        if (!isPlainObject(prop)) {
          errors.push(`${propAt}: prop must be an object`);
          return;
        }
        if (!CAMEL_RE.test(String(prop.name))) {
          errors.push(`${propAt}: 'name' must be camelCase (got "${str(prop.name)}")`);
        }
        if (prop.name && propNames.has(prop.name)) errors.push(`${propAt}: duplicate prop name "${prop.name}"`);
        if (prop.name) propNames.add(prop.name);
        if (!isNonEmptyString(prop.type)) errors.push(`${propAt}: 'type' must be a non-empty string`);
        if (typeof prop.required !== "boolean") errors.push(`${propAt}: 'required' must be boolean`);
        if ("default" in prop && !isNonEmptyString(prop.default)) {
          errors.push(`${propAt}: 'default' must be a non-empty string when present`);
        }
        if ("description" in prop && !isNonEmptyString(prop.description)) {
          errors.push(`${propAt}: 'description' must be a non-empty string when present`);
        }
      });
    }

    if ("links" in entry) {
      const links = entry.links;
      if (!isPlainObject(links)) {
        errors.push(`${label}: 'links' must be an object`);
      } else {
        for (const [key, value] of Object.entries(links)) {
          if (!LINK_KEYS.includes(key)) {
            warnings.push(`${label}: unknown link "${key}" (known: ${LINK_KEYS.join(", ")})`);
            continue;
          }
          if (typeof value !== "string" || !isNonEmptyString(value)) {
            errors.push(`${label}: link "${key}" must be a non-empty string`);
            continue;
          }
          if (value.includes("\\")) {
            warnings.push(`${label}: link "${key}" should use POSIX separators (${value})`);
          }
          if (path.isAbsolute(value) || value.startsWith("/")) {
            errors.push(`${label}: link "${key}" must be repo-relative (got "${value}")`);
            continue;
          }
          if (checkLinks && (key === "source" || key === "demo")) {
            try {
              accessSync(path.resolve(root, value));
            } catch {
              errors.push(`${label}: link "${key}" points to a missing file (${value})`);
            }
          }
        }
      }
    }

    if ("a11yNotes" in entry && !isNonEmptyString(entry.a11yNotes)) {
      errors.push(`${label}: 'a11yNotes' must be a non-empty string when present`);
    }
    if ("usedFrom" in entry) {
      if (!Array.isArray(entry.usedFrom) || entry.usedFrom.some((u) => !isNonEmptyString(u))) {
        errors.push(`${label}: 'usedFrom' must be an array of non-empty strings`);
      }
    }

    // --- v2 fields (M5). Absent v2 fields default to a legacy "local" entry.
    const entryType = entry.entryType ?? "local";
    if ("entryType" in entry && !ENTRY_TYPES.includes(entry.entryType)) {
      errors.push(`${label}: 'entryType' must be one of ${ENTRY_TYPES.join(" | ")} (got "${str(entry.entryType)}")`);
    }

    if (entryType === "external") {
      // External entries carry metadata + retrieval instructions only; fabricating
      // a local file path for code we were not permitted to store is prohibited.
      if (!isNonEmptyString(entry.source)) errors.push(`${label}: 'source' is required for external entries`);
      if (!isHttpUrl(entry.sourceUrl)) errors.push(`${label}: 'sourceUrl' (http(s)) is required for external entries`);
      if (!isNonEmptyString(entry.retrieval)) errors.push(`${label}: 'retrieval' is required for external entries`);
      if (!isPlainObject(entry.license)) {
        errors.push(`${label}: 'license' is required for external entries (state the reuse terms)`);
      }
      if (entry.localDir || entry.manifest || entry.implementation) {
        errors.push(`${label}: external entries must not declare local implementation paths (localDir/manifest/implementation)`);
      }
    }

    if ("source" in entry && entry.source != null) {
      if (!isNonEmptyString(entry.source)) {
        errors.push(`${label}: 'source' must be a non-empty string when present`);
      } else if (sourceIds.size > 0 && !sourceIds.has(entry.source)) {
        errors.push(`${label}: source "${entry.source}" is not in the sources taxonomy (taxonomy/sources.json)`);
      }
    }
    if ("sourceUrl" in entry && entry.sourceUrl != null && !isHttpUrl(entry.sourceUrl)) {
      errors.push(`${label}: 'sourceUrl' must be an absolute http(s) URL (got "${str(entry.sourceUrl)}")`);
    }
    if ("externalId" in entry && !isNonEmptyString(entry.externalId)) {
      errors.push(`${label}: 'externalId' must be a non-empty string when present`);
    }
    if ("retrieval" in entry && !isNonEmptyString(entry.retrieval)) {
      errors.push(`${label}: 'retrieval' must be a non-empty string when present`);
    }
    if ("syncedAt" in entry && !/^\d{4}-\d{2}-\d{2}$/.test(str(entry.syncedAt))) {
      errors.push(`${label}: 'syncedAt' must be YYYY-MM-DD when present`);
    }

    if ("localDir" in entry) {
      if (!isNonEmptyString(entry.localDir)) {
        errors.push(`${label}: 'localDir' must be a non-empty string when present`);
      } else {
        if (entry.localDir.includes("\\")) warnings.push(`${label}: 'localDir' should use POSIX separators (${entry.localDir})`);
        if (checkLinks) {
          try {
            accessSync(path.resolve(root, entry.localDir));
          } catch {
            errors.push(`${label}: 'localDir' points to a missing directory (${entry.localDir})`);
          }
        }
      }
    }
    if ("manifest" in entry) {
      if (!isNonEmptyString(entry.manifest)) {
        errors.push(`${label}: 'manifest' must be a non-empty string when present`);
      } else if (checkLinks) {
        try {
          accessSync(path.resolve(root, entry.manifest));
        } catch {
          errors.push(`${label}: 'manifest' points to a missing file (${entry.manifest})`);
        }
      }
    }
    if ("implementation" in entry) {
      if (!Array.isArray(entry.implementation)) {
        errors.push(`${label}: 'implementation' must be an array of file paths`);
      } else {
        for (const file of entry.implementation) {
          if (!isNonEmptyString(file)) {
            errors.push(`${label}: implementation entries must be non-empty strings (got ${str(file)})`);
            continue;
          }
          if (!checkLinks) continue;
          try {
            accessSync(path.resolve(root, file));
          } catch {
            errors.push(`${label}: implementation points to a missing file (${file})`);
          }
        }
      }
    }

    if ("preview" in entry) {
      const preview = entry.preview;
      if (!isPlainObject(preview)) {
        errors.push(`${label}: 'preview' must be an object ({ type, url, note })`);
      } else {
        if (!PREVIEW_TYPES.includes(preview.type)) {
          errors.push(`${label}: preview 'type' must be one of ${PREVIEW_TYPES.join(" | ")} (got "${str(preview.type)}")`);
        }
        const needsUrl = ["static", "external", "source-link"].includes(preview.type);
        if (needsUrl && !isHttpUrl(preview.url)) {
          errors.push(`${label}: preview type "${preview.type}" requires an http(s) 'url'`);
        }
        if (preview.type === "none" && !isNonEmptyString(preview.note)) {
          errors.push(`${label}: preview type "none" requires a 'note' explaining why honestly`);
        }
        if ("url" in preview && preview.url != null && !isHttpUrl(preview.url)) {
          errors.push(`${label}: preview 'url' must be an absolute http(s) URL (got "${str(preview.url)}")`);
        }
        if ("note" in preview && preview.note != null && !isNonEmptyString(preview.note)) {
          errors.push(`${label}: preview 'note' must be a non-empty string when present`);
        }
      }
    }

    const license = entry.license;
    if ("license" in entry) {
      if (!isPlainObject(license)) {
        errors.push(`${label}: 'license' must be an object ({ spdx, attribution, note, url })`);
      } else {
        for (const key of Object.keys(license)) {
          if (!["spdx", "attribution", "note", "url"].includes(key)) {
            warnings.push(`${label}: unknown license key "${key}" (known: spdx, attribution, note, url)`);
          }
        }
        if ("spdx" in license && !/^[A-Za-z0-9.+-]+$/.test(str(license.spdx))) {
          errors.push(`${label}: license 'spdx' must be an SPDX-like id (got "${str(license.spdx)}")`);
        }
        for (const key of ["attribution", "note"]) {
          if (key in license && license[key] != null && !isNonEmptyString(license[key])) {
            errors.push(`${label}: license '${key}' must be a non-empty string when present`);
          }
        }
        if ("url" in license && license.url != null && !isHttpUrl(license.url)) {
          errors.push(`${label}: license 'url' must be an absolute http(s) URL`);
        }
      }
    }

    if ("dependencies" in entry) {
      const deps2 = entry.dependencies;
      if (!Array.isArray(deps2)) {
        errors.push(`${label}: 'dependencies' must be an array of { name, reason }`);
      } else {
        const depNames = new Set();
        deps2.forEach((dep, depIndex) => {
          const depAt = `${label} dependencies[${depIndex}]`;
          if (!isPlainObject(dep)) {
            errors.push(`${depAt}: dependency must be an object`);
            return;
          }
          if (!isNonEmptyString(dep.name)) {
            errors.push(`${depAt}: 'name' must be a non-empty string`);
          } else {
            if (dep.name === "react" || dep.name === "react-dom") {
              errors.push(`${depAt}: "${dep.name}" is implicit and must not be listed`);
            }
            if (depNames.has(dep.name)) errors.push(`${depAt}: duplicate dependency "${dep.name}"`);
            depNames.add(dep.name);
          }
          if ("reason" in dep && dep.reason != null && !isNonEmptyString(dep.reason)) {
            errors.push(`${depAt}: 'reason' must be a non-empty string when present`);
          }
        });
      }
    }

    if ("aesthetics" in entry) {
      if (!Array.isArray(entry.aesthetics)) {
        errors.push(`${label}: 'aesthetics' must be an array of taxonomy aesthetic ids`);
      } else if (aestheticIds.size > 0) {
        for (const aesthetic of entry.aesthetics) {
          if (!isNonEmptyString(aesthetic) || !aestheticIds.has(aesthetic)) {
            errors.push(`${label}: aesthetic "${str(aesthetic)}" is not in the aesthetics taxonomy (taxonomy/aesthetics.json)`);
          }
        }
      }
    }
    if ("attributes" in entry) {
      if (!Array.isArray(entry.attributes)) {
        errors.push(`${label}: 'attributes' must be an array of taxonomy attribute ids`);
      } else if (attributeIds.size > 0) {
        for (const attribute of entry.attributes) {
          if (!isNonEmptyString(attribute) || !attributeIds.has(attribute)) {
            errors.push(`${label}: attribute "${str(attribute)}" is not in the attributes taxonomy (taxonomy/attributes.json)`);
          }
        }
      }
    }

    if (prevId && prevId > id) {
      errors.push(`${label}: entries must be sorted by id ("${prevId}" appears before "${id}")`);
    }
    if (typeof id === "string") prevId = id;
  });

  for (const [alias, owner] of aliasOwners) {
    if (entryIds.has(alias)) {
      errors.push(`catalog: alias "${alias}" collides with an entry id (declared by ${owner})`);
    }
  }

  return { errors, warnings };
}

/** Ranked search: exact id > exact alias > id-prefix/id-substring > name > summary > tags > aliases.
 *  v2: optional filters aesthetic/source/attribute/entryType; aesthetics/attributes/source also rank in text search. */
export function searchEntries(entries, query, { theme, category, aesthetic, source, attribute, entryType } = {}) {
  const all = [...entries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const filtered = all.filter((entry) => {
    if (theme && !entry.themes.includes(theme)) return false;
    if (category && entry.category !== category) return false;
    if (aesthetic && !(entry.aesthetics || []).includes(aesthetic)) return false;
    if (attribute && !(entry.attributes || []).includes(attribute)) return false;
    if (source && entry.source !== source) return false;
    if (entryType && (entry.entryType ?? "local") !== entryType) return false;
    return true;
  });
  const q = String(query ?? "").trim().toLowerCase();
  if (q === "") return filtered;

  const scored = [];
  for (const entry of filtered) {
    let score = 0;
    if (entry.id === q) score = 100;
    else if (entry.aliases.includes(q)) score = 80;
    else if (entry.id.startsWith(q)) score = 60;
    else if (entry.id.includes(q)) score = 50;
    else if (entry.name.toLowerCase().includes(q)) score = 40;
    else if (entry.summary.toLowerCase().includes(q)) score = 35;
    else if (entry.tags.some((t) => t.includes(q))) score = 25;
    else if (entry.aliases.some((a) => a.includes(q))) score = 20;
    else if ((entry.aesthetics || []).some((a) => a.includes(q))) score = 15;
    else if ((entry.attributes || []).some((a) => a.includes(q))) score = 12;
    else if (String(entry.source ?? "").includes(q)) score = 10;
    else continue;
    scored.push({ score, entry });
  }
  scored.sort((a, b) => b.score - a.score || (a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0));
  return scored.map((s) => s.entry);
}

/** Builds the derived agent-readable index (MASTER_SPEC.md §8.3). v2 adds
 *  aesthetic/attribute/source taxonomies and local/external counts. */
export function buildIndex(catalog, themesDoc, categoriesDoc, extras, generatedAt) {
  const entries = catalog.entries;
  const sourcesList = (extras.sources && extras.sources.sources) || [];
  const byEntryType = { local: 0, external: 0 };
  const bySource = {};
  for (const entry of entries) {
    if ((entry.entryType ?? "local") === "external") byEntryType.external += 1;
    else byEntryType.local += 1;
    if (entry.source) bySource[entry.source] = (bySource[entry.source] ?? 0) + 1;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    generator: "scripts/generate-index.mjs",
    counts: {
      entries: entries.length,
      themes: themesDoc.themes.length,
      categories: categoriesDoc.categories.length,
      aesthetics: (extras.aesthetics && extras.aesthetics.aesthetics || []).length,
      sources: sourcesList.length,
      byEntryType,
      bySource,
    },
    taxonomies: {
      themes: themesDoc.themes.map((t) => t.id),
      categories: categoriesDoc.categories.map((c) => c.id),
      aesthetics: (extras.aesthetics && extras.aesthetics.aesthetics || []).map((a) => a.id),
      attributes: (extras.attributes && extras.attributes.attributes || []).map((a) => a.id),
      sources: sourcesList.map((s) => ({ id: s.id, name: s.name, status: s.status, url: s.url })),
    },
    entries: structuredClone(entries),
  };
}

export function writeIndex(root, index) {
  const file = path.join(root, "catalog", "index.json");
  writeFileSync(file, JSON.stringify(index, null, 2) + "\n", "utf8");
  return file;
}

export function indexPath(root = repoRoot()) {
  return path.join(root, "catalog", "index.json");
}

/** Human-readable block for lookup CLI (MASTER_SPEC.md §8.2). */
export function formatEntryText(entry) {
  const dash = "—";
  const entryType = entry.entryType ?? "local";
  const lines = [];
  lines.push(`${entry.name} (${entry.id}) v${entry.version} — ${entry.status} — added ${entry.addedDate}`);
  lines.push(`Category: ${entry.category}`);
  lines.push(`Type: ${entryType}`);
  lines.push(`Summary: ${entry.summary}`);
  if (entry.description) lines.push(`Description: ${entry.description}`);
  lines.push(`Themes: ${entry.themes.join(", ")}`);
  if (Array.isArray(entry.aesthetics) && entry.aesthetics.length > 0) {
    lines.push(`Aesthetics: ${entry.aesthetics.join(", ")}`);
  }
  if (Array.isArray(entry.attributes) && entry.attributes.length > 0) {
    lines.push(`Attributes: ${entry.attributes.join(", ")}`);
  }
  if (entry.source) {
    lines.push(`Library source: ${entry.source}${entry.sourceUrl ? ` (${entry.sourceUrl})` : ""}`);
  }
  const licenseText = licenseSummary(entry.license);
  if (licenseText) lines.push(`License: ${licenseText}`);
  if (entry.externalId) lines.push(`External ID: ${entry.externalId}`);
  if (entry.retrieval) lines.push(`Retrieval: ${entry.retrieval}`);
  if (entry.localDir) lines.push(`Local dir: ${entry.localDir}`);
  if (entry.manifest) lines.push(`Manifest: ${entry.manifest}`);
  if (Array.isArray(entry.implementation) && entry.implementation.length > 0) {
    lines.push(`Implementation: ${entry.implementation.join(", ")}`);
  }
  if (entry.preview) lines.push(`Preview: ${describePreview(entry.preview)}`);
  lines.push(`Aliases: ${entry.aliases.length ? entry.aliases.join(", ") : dash}`);
  lines.push(`Tags: ${entry.tags.length ? entry.tags.join(", ") : dash}`);
  const links = entry.links ?? {};
  if (entryType === "local") lines.push(`Source: ${links.source ?? dash}`);
  if (links.demo) lines.push(`Demo: ${links.demo}`);
  if (links.docs) lines.push(`Docs: ${links.docs}`);
  const props = entry.props ?? [];
  if (props.length === 0) {
    lines.push("Props: (none)");
  } else {
    lines.push(`Props (${props.length}):`);
    for (const prop of props) {
      const req = prop.required ? "required" : "optional";
      const def = "default" in prop ? `, default ${prop.default}` : "";
      lines.push(` - ${prop.name}: ${prop.type} (${req}${def})`);
      if (prop.description) lines.push(`   ${prop.description}`);
    }
  }
  if (entry.a11yNotes) lines.push(`A11y: ${entry.a11yNotes}`);
  if (Array.isArray(entry.usedFrom) && entry.usedFrom.length > 0) {
    lines.push(`usedFrom: ${entry.usedFrom.join(", ")}`);
  }
  return lines.join("\n");
}

function licenseSummary(license) {
  if (!isPlainObject(license)) return "";
  const parts = [];
  if (license.spdx) parts.push(`SPDX ${license.spdx}`);
  if (license.note) parts.push(license.note);
  return parts.join(" — ");
}

function describePreview(preview) {
  const u = preview.url ? ` ${preview.url}` : "";
  const n = preview.note ? ` — ${preview.note}` : "";
  return `${preview.type}${u}${n}`;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
function isSlugValue(value) {
  return typeof value === "string" && SLUG_RE.test(value);
}
function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value);
}
function str(value) {
  return typeof value === "string" ? value : String(value);
}
