# Catalog Schema Reference — v1

Normative source: `MASTER_SPEC.md` §5. This document carries the detailed field rules,
worked examples, and the change history of the schema.

## Files

| File | Role | Hand-edited? |
|---|---|---|
| `catalog/catalog.json` | Canonical catalog of record | ✅ yes |
| `catalog/index.json` | Derived agent-readable index | ❌ never — run `npm run generate` |
| `taxonomy/themes.json` | Theme taxonomy (source of truth) | ✅ yes |
| `taxonomy/categories.json` | Category taxonomy (source of truth) | ✅ yes |

## v1 rules (enforced by scripts/validate-catalog.mjs)

### Top level

- `schemaVersion` — integer, currently `1`.
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
