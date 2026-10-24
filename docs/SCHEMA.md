# Catalog Schema Reference — v2

Normative source: `MASTER_SPEC.md` §5. This document carries the detailed field rules,
worked examples, and the change history of the schema.

## Files

| File | Role | Hand-edited? |
|---|---|---|
| `catalog/catalog.json` | Canonical catalog of record | ✅ yes |
| `catalog/index.json` | Derived agent-readable index | ❌ never — run `npm run generate` |
| `taxonomy/themes.json` | App appearance-theme taxonomy (source of truth) | ✅ yes |
| `taxonomy/categories.json` | Category taxonomy (source of truth) | ✅ yes |
| `taxonomy/aesthetics.json` | Component aesthetic taxonomy (visual style — v2) | ✅ yes |
| `taxonomy/attributes.json` | Independent attribute taxonomy, grouped appearance/motion/tech (v2) | ✅ yes |
| `taxonomy/sources.json` | Component source registry: access methods, statuses, licensing (v2) | ✅ yes |

## v1 rules (enforced by scripts/validate-catalog.mjs)

Renamed "v1 rules (legacy core)" in v2; every rule below still applies unchanged.

### Top level

- `schemaVersion` — integer, currently `2`.
- `entries` — array, sorted lexicographically by `id`.
- `meta` — optional `{ title, description }`.
- Unknown top-level or entry fields produce **warnings**, not errors (forward compat).

### Entry rules

1. `id`: `^[a-z0-9]+(-[a-z0-9]+)*$`; unique across catalog.
2. `summary`: non-empty, ≤ 140 chars.
3. `themes`: ≥ 1; every id must exist in `taxonomy/themes.json`.
4. `category`: must exist in `taxonomy/categories.json`.
5. `aliases`: all lowercase slugs; **globally unique** across the catalog; an alias may
   not equal any entry `id` (avoids ambiguity in `npm run lookup`).
6. `tags`, `version` (`^\d+\.\d+\.\d+([-.+][\w.-]+)?$`), `addedDate` (`YYYY-MM-DD`),
   `status` ∈ `stable | beta | experimental | deprecated`.
7. `externalDependencies`: array (may be empty). Any element that is not
   `react`/`react-dom` is allowed; react/react-dom must **not** be listed (implicit).
8. `props`: array (may be empty); unique `name`s; camelCase names; strings for `type`,
   `default`, `description`; boolean `required`. `default` is required to be a valid
   string form of the value; optional when the prop has no default.
9. `links`: optional; keys `source`, `demo`, `docs`; values are repo-relative POSIX
   paths. When present, `source` and `demo` must exist on disk (validator checks;
   `docs` is not existence-checked). Paths use forward slashes.
10. `usedFrom`: optional string[] of app import sites (documentation only).

## Worked example (copied from the canonical catalog)
```json
{
  "id": "alert",
  "name": "Alert",
  "summary": "Calls out a user-facing message with a tone-aware severity banner.",
  "description": "Use an Alert to deliver a short, important message that belongs in the page flow.",
  "category": "feedback",
  "themes": ["brutalist-print", "classic-clean", "midnight-glass", "neon-cyberpunk", "retro-terminal", "soft-pastel"],
  "aliases": ["banner", "notice"],
  "tags": ["feedback", "message", "status"],
  "status": "stable",
  "version": "1.0.0",
  "addedDate": "2026-10-24",
  "externalDependencies": [],
  "props": [
    {
      "name": "tone",
      "type": "\"info\" | \"success\" | \"warning\" | \"danger\"",
      "required": false,
      "default": "\"info\"",
      "description": "Severity class that drives color and icon."
    },
    { "name": "title", "type": "string", "required": true }
  ],
  "links": {
    "source": "src/components/Alert/Alert.tsx",
    "demo": "src/components/Alert/AlertDemo.tsx"
  },
  "a11yNotes": "role=\"alert\" so content announces on insert.",
  "usedFrom": ["src/catalog/demos.ts"]
}
```

## v2 fields (M5) — multi-source catalog, aesthetics, previews, provenance

All v2 fields are **optional**, so every v1 entry stays valid. An entry without v2
fields is a legacy `local` entry. The six built-in components are exactly that.

### Local vs external (`entryType`)

- `entryType` ∈ `local | external`; absent → `local`.
- **local** — implementation files are stored in this repository under
  `catalog/components/<source>/<category>/<id>/` (or in `src/components/` for the
  built-in ones). May declare `localDir`, `manifest` (usually
  `…/component.json`), and `implementation` (file paths); when present, every path
  is existence-checked by the validator (same rules as `links`).
- **external** — code may **not** be stored/redistributed locally. Required:
  `source` (id from `taxonomy/sources.json`), `sourceUrl` (absolute http(s)),
  `retrieval` (official CLI/MCP/docs retrieval instructions), `license` (an object).
  Forbidden: `localDir`, `manifest`, `implementation` — the validator rejects
  fabricated local paths, and the master-prompt generator relies on that guarantee.

### Common optional fields

| Field | Rules |
|---|---|
| `source` | id from `taxonomy/sources.json` (validator enforces membership). |
| `sourceUrl` | absolute `http(s)://` URL. |
| `externalId` | stable id inside the source's own registry, when one exists. |
| `syncedAt` | `YYYY-MM-DD` — last successful synchronization with the source. |
| `preview` | object: `type` ∈ `local-demo | static | external | source-link | none`; `static/external/source-link` require an http(s) `url`; `none` requires an honest `note`; `local-demo` previews render in-app from the demo registry. |
| `license` | object: `spdx` (SPDX-like id), `attribution`, `note`, `url`; unknown keys warn. Required for external entries. |
| `dependencies` | array of `{ name, reason? }`; `react`/`react-dom` must not be listed (implicit); duplicate names error. These are the component's own requirements for the *target* project — they never become app dependencies. |
| `aesthetics` | array of ids from `taxonomy/aesthetics.json`; an entry may carry many. |
| `attributes` | array of ids from `taxonomy/attributes.json` (`appearance | motion | tech` groups); an entry may carry many. |

### Taxonomy files (v2)

- `taxonomy/aesthetics.json`: `aesthetics: [{ id, label }]` — twelve canonical visual
  styles (professional … playful). Distinct from `taxonomy/themes.json`, which styles
  the **application**, not the cataloged components.
- `taxonomy/attributes.json`: `attributes: [{ id, label, group }]` with groups
  `appearance / motion / tech`.
- `taxonomy/sources.json`: `sources: [{ id, name, url, repo?, accessMethod, status,
  license, auth?, limit?, notes }]`, plus a `statuses` vocabulary
  (`available | partial | reference-only | requires-auth | unavailable`) and an
  `evaluatedAt` stamp. Derived per-source entry counts live in `catalog/index.json`
  (`counts.bySource`), never in this file.
- `taxonomy/categories.json`: the original six buckets (kept for the built-in
  library) plus the extended granular set (tabs, tooltips, modals, hero-sections,
  pricing-sections, footers, backgrounds, gradients, text-effects, loaders, cursors,
  charts, 3d-webgl, scroll-animations, page-sections, page-layouts) — 22 total.

### Worked example (external entry, hypothetical id)

```json
{
  "id": "ext-example-hero",
  "name": "External Animated Hero",
  "summary": "Reference to an animated hero section.",
  "category": "hero-sections",
  "themes": ["classic-clean"],
  "aliases": [],
  "tags": ["hero", "animation"],
  "status": "beta",
  "version": "0.1.0",
  "addedDate": "2026-10-24",
  "externalDependencies": [],
  "props": [],
  "entryType": "external",
  "source": "aceternity",
  "sourceUrl": "https://ui.aceternity.com/components/hero-…",
  "externalId": "hero-…",
  "retrieval": "Copy from the official component page. Do not look for local files.",
  "preview": { "type": "external", "url": "https://ui.aceternity.com/components/…" },
  "license": { "note": "Custom free license; source redistribution forbidden." },
  "dependencies": [{ "name": "motion", "reason": "Animation runtime." }],
  "aesthetics": ["futuristic", "editorial"],
  "attributes": ["dark", "animated", "tailwind"]
}
```

The illustrative URLs above describe the required format; only URLs verified against
an official source may ship in real entries.

## Canonical theme tokens

Required in every theme's `tokens` map:

```
--rl-surface        page / component background
--rl-surface-alt    raised or alternate surface
--rl-text           primary text
--rl-text-muted     secondary text
--rl-accent         accent fill
--rl-accent-contrast  readable text on accent
--rl-border         border color
--rl-radius         border-radius token
--rl-font           font stack
```

Optional (with inline fallbacks in component CSS): `--rl-shadow`, `--rl-focus`
(full `outline` shorthand), `--rl-backdrop`.

## Change history

| Version | Date | Change |
|---|---|---|
| v1 | 2026-10-24 | Initial schema: 21 entry fields, taxonomy-linked enums, link existence rules. |
| v2 | 2026-10-24 | M5: multi-source catalog. New optional entry fields (`entryType`, `source`, `sourceUrl`, `externalId`, `retrieval`, `preview`, `localDir`, `manifest`, `implementation`, `dependencies`, `license`, `aesthetics`, `attributes`, `syncedAt`); `taxonomy/aesthetics.json`, `taxonomy/attributes.json`, `taxonomy/sources.json`; 16 new categories (22 total); local-path existence checks; strict external-entry rules (no fabricated paths); index gains `counts.byEntryType`/`counts.bySource` and taxonomy listings. |
