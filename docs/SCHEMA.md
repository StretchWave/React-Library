# Catalog Schema Reference - v3

Normative source: `MASTER_SPEC.md` section 5. This document carries field rules,
worked examples and change history. The validator in
`scripts/lib/catalog.mjs` is the executable enforcer; if this document and the
validator disagree, the validator and `MASTER_SPEC.md` win.

## Files

| File | Role | Hand-edited? |
|---|---|---|
| `catalog/catalog.json` | Canonical catalog of record | Yes |
| `catalog/index.json` | Derived agent-readable index | Never - run `npm run generate` |
| `taxonomy/themes.json` | Application appearance themes | Yes |
| `taxonomy/categories.json` | Structural component categories | Yes |
| `taxonomy/types.json` | Component type facets (v3) | Yes |
| `taxonomy/triggers.json` | Animation trigger facets (v3) | Yes |
| `taxonomy/techniques.json` | Animation technique facets (v3) | Yes |
| `taxonomy/aesthetics.json` | Visual-vibe classifications | Yes |
| `taxonomy/attributes.json` | Independent appearance/motion/tech attributes | Yes |
| `taxonomy/behaviors.json` | Interaction behaviours (what input drives the animation) | Yes |
| `taxonomy/sources.json` | Source access, licensing and coverage registry | Yes |

## Top level

- `schemaVersion`: integer, currently **3**. The validator rejects other versions.
- `entries`: array sorted lexicographically by `id`.
- `meta`: optional `{ title, description }`.
- Unknown top-level or entry fields are **warnings**, not errors, for forward
  compatibility.

## Entry rules

### Core fields (v1, still enforced)

1. `id`: `^[a-z0-9]+(-[a-z0-9]+)*$`; unique across the catalog.
2. `name`: non-empty display name.
3. `summary`: non-empty, maximum 140 characters.
4. `themes`: at least one id from `taxonomy/themes.json`.
5. `category`: id from `taxonomy/categories.json`; this is the structural bucket.
6. `aliases`: lowercase slugs, globally unique, may not collide with any entry id.
7. `tags`: string array; lowercase slugs are conventional.
8. `status`: `stable | beta | experimental | deprecated`.
9. `version`: semver, `^\d+\.\d+\.\d+([-.+][\w.-]+)?$`.
10. `addedDate`: `YYYY-MM-DD`.
11. `externalDependencies`: array; may be empty. `react` and `react-dom` are implicit
    and must not be listed.
12. `props`: array of `{ name, type, required, default?, description? }`; camelCase
    unique names, string `type`, boolean `required`, optional string `default`.
13. `links`: optional `{ source?, demo?, docs? }`; repo-relative POSIX paths. `source`
    and `demo` are existence-checked when present.
14. `usedFrom`: optional string array of app import sites (documentation only).
15. `a11yNotes`: optional string.

### v2 provenance and availability fields

All v2 fields remain supported. `entryType` is `local | external`; absent means
`local`.

- **local**: implementation files are stored in this repository and may declare
  `localDir`, `manifest` and `implementation`. Every declared path is
  existence-checked.
- **external**: code is not stored or redistributed locally. Required: `source`,
  `sourceUrl` (absolute http(s)), `retrieval` (official CLI/MCP/docs instructions) and
  `license` (object). `localDir`, `manifest` and `implementation` are forbidden.
- `source`: id from `taxonomy/sources.json`.
- `sourceUrl`: absolute `http(s)://` URL.
- `externalId`: stable id inside the upstream source.
- `syncedAt`: `YYYY-MM-DD` last successful synchronization.
- `preview`: legacy render descriptor with `type` =
  `local-demo | static | external | source-link | none`.
  `static`, `external` and `source-link` require an http(s) `url`; `none` requires an
  honest `note`; `local-demo` resolves through the reviewed showcase registry.
- `license`: `{ spdx?, attribution?, note?, url? }`; unknown keys warn. Required for
  external entries.
- `dependencies`: array of `{ name, reason? }` for the target project; duplicates are
  errors and `react`/`react-dom` must not be listed.
- `aesthetics`: ids from `taxonomy/aesthetics.json` (visual vibe).
- `attributes`: ids from `taxonomy/attributes.json`.
- `behaviors`: ids from `taxonomy/behaviors.json`. Every current entry carries at
  least one; the schema keeps the field optional for legacy compatibility.
- `runtime`: optional preview engine classification (`dom`, `gsap`, `motion`,
  `physics`, `webgl`, ...).
- `heavy`: optional boolean; heavy entries are workspace-only and never autoplay in
  the gallery.

### v3 discovery fields (required)

These fields make the catalog filterable as a visual discovery tool and record how
preview decisions were made.

| Field | Rules |
|---|---|
| `types` | Non-empty array of ids from `taxonomy/types.json`. Describes what the component is (button, card, background, transition, ...). |
| `triggers` | Non-empty array of ids from `taxonomy/triggers.json`. Describes what starts the motion (hover, click, scroll, route-transition, ...). |
| `techniques` | Array of ids from `taxonomy/techniques.json`; may be empty for genuinely static components. Describes how the motion is made (fade, shader, particles, ...). |
| `tagMeta` | Object recording provenance for assisted classification. See below. |
| `previewProfile` | Object publishing the honest preview decision. See below. |

Facet dimensions are independent: an entry may be a `card` type, use a `hover`
trigger and a `glitch` technique at the same time. Search applies **AND across
dimensions** and **OR within one dimension**.

#### `tagMeta`

```json
{
  "sourceProvided": ["type:card", "trigger:hover"],
  "inferred": ["technique:glitch", "vibe:cyberpunk"],
  "reviewNeeded": true
}
```

- `sourceProvided`: facets present in the upstream source or supplied by a human
  curator.
- `inferred`: facets derived deterministically by `scripts/classify-catalog.mjs` from
  existing evidence (category, behaviours, runtime, summary, vendored source).
- Values use `facet:id` where `facet` is one of
  `type | trigger | technique | vibe | tech | source`.
- A referenced value must be declared on the entry (`type` checks `types`, `trigger`
  checks `triggers`, and so on). Unknown facets and malformed values are errors.
- `reviewNeeded` is a boolean. It means the classification needs human confirmation;
  it never means the component is unusable.

#### `previewProfile`

```json
{
  "mode": "live",
  "layout": "wide",
  "cost": "medium",
  "aspectRatio": "16 / 9",
  "minWidth": 320,
  "minHeight": 220,
  "gridColumnSpan": 2,
  "gridRowSpan": 1,
  "expandedRecommended": true,
  "requires": ["pointer", "reduced-motion"],
  "autoplayAllowed": true,
  "snapshotPath": "public/previews/example.jpg",
  "loopPath": null,
  "previewStatus": "ready",
  "failureReason": null
}
```

| Field | Rules |
|---|---|
| `mode` | `live | snapshot | loop | external | unavailable`. What a card may show. |
| `layout` | `compact | standard | wide | showcase`. Published gallery layout. |
| `cost` | `low | medium | high`. High-cost previews do not autoplay. |
| `aspectRatio` | Positive ratio such as `4 / 3`, `16 / 9` or `1 / 1`. |
| `minWidth`, `minHeight` | Positive integers in CSS pixels. |
| `gridColumnSpan` | Positive integer, maximum 3. |
| `gridRowSpan` | Positive integer, maximum 2. |
| `expandedRecommended` | Boolean; prefer the full workspace over a tiny card. |
| `requires` | Array from `webgl | canvas-2d | pointer | keyboard | scroll | gpu | user-input | reduced-motion`; duplicates warn. |
| `autoplayAllowed` | Boolean; permission, not a promise. Live gating also checks cost, visibility, global pause and reduced motion. |
| `snapshotPath` | Optional repo-relative POSIX path to a real captured image. Required for `mode: snapshot`; existence-checked. |
| `loopPath` | Optional repo-relative POSIX path to a real captured loop. Required for `mode: loop`; existence-checked. |
| `previewStatus` | `ready | external | unavailable | error`. |
| `failureReason` | Non-empty string when present; required for unavailable previews. |

Coupling rules enforced by the validator:

- `previewStatus: external` requires `mode: external`, and vice versa.
- `mode: unavailable` requires `previewStatus: unavailable` and a useful
  `failureReason`.
- `mode: snapshot` requires `snapshotPath`; `mode: loop` requires `loopPath`.
- Paths must be repo-relative with forward slashes and must exist when link checks run.

Project honesty rules on top of the validator:

- Published snapshots come from the real browser audit; they are never invented.
- A card never renders a fallback as successful live content.
- External records render an explicit external state and an official link.
- Heavy, paused, reduced-motion or off-screen previews use the published snapshot.
- The expanded preview is lazy-loaded; the gallery does not mount heavy workspaces.

## Taxonomy files

- `taxonomy/themes.json`: six application appearance themes, each with the nine
  required `--rl-*` tokens and optional shadow/focus/backdrop tokens. These style the
  app, not cataloged components.
- `taxonomy/categories.json`: 28 structural categories.
- `taxonomy/types.json`: 23 component types.
- `taxonomy/triggers.json`: 14 animation triggers.
- `taxonomy/techniques.json`: 46 techniques.
- `taxonomy/aesthetics.json`: 22 visual-vibe classifications.
- `taxonomy/attributes.json`: 29 independent attributes grouped into
  `appearance | motion | tech`.
- `taxonomy/behaviors.json`: 12 interaction behaviours. Behaviours describe what user
  input drives an animation; triggers describe the event that starts it. Both may
  coexist and are validated separately.
- `taxonomy/sources.json`: source registry with `id`, `name`, `url`, `repo?`,
  `accessMethod`, `status` (`available | partial | reference-only | requires-auth |
  unavailable`), `license`, `auth?`, `limit?`, `notes` and an optional `coverage`
  record. Coverage records may include `discovered`, `usable`, `locked`,
  `reviewNeeded`, `blocked` and `checkedAt`; imported/preview-ready counts are derived
  from entries and never hard-coded in the app.

## Worked v3 entry (abbreviated)

```json
{
  "id": "example-spotlight-card",
  "name": "Spotlight Card",
  "summary": "A card whose border follows the pointer with a soft spotlight.",
  "category": "display",
  "themes": ["classic-clean", "midnight-glass"],
  "aliases": ["spotlight-card"],
  "tags": ["card", "pointer", "spotlight"],
  "status": "stable",
  "version": "0.1.0",
  "addedDate": "2026-10-29",
  "externalDependencies": [],
  "props": [],
  "types": ["card"],
  "triggers": ["hover", "cursor-reactive"],
  "techniques": ["spotlight", "glow"],
  "behaviors": ["hover", "cursor-reactive"],
  "aesthetics": ["futuristic"],
  "attributes": ["dark", "animated"],
  "tagMeta": {
    "sourceProvided": ["type:card", "trigger:hover"],
    "inferred": ["trigger:cursor-reactive", "technique:spotlight", "vibe:futuristic"],
    "reviewNeeded": false
  },
  "previewProfile": {
    "mode": "live",
    "layout": "standard",
    "cost": "low",
    "aspectRatio": "4 / 3",
    "minWidth": 240,
    "minHeight": 200,
    "gridColumnSpan": 1,
    "gridRowSpan": 1,
    "expandedRecommended": false,
    "requires": ["pointer", "reduced-motion"],
    "autoplayAllowed": false,
    "snapshotPath": "public/previews/example-spotlight-card.jpg",
    "previewStatus": "ready"
  }
}
```

The illustrative id and snapshot path above are examples; only verified catalog
records and real capture files may ship.

## Search semantics

`searchEntries(entries, query, filters)` (tooling) and `searchEntries` in
`src/lib/search.ts` (app) implement the same contract:

- Empty query returns all entries sorted by id.
- Exact id and exact alias matches outrank prefix, whole-token, substring and
  token-level typo matches.
- Facet filters are ANDed across dimensions and ORed within one dimension:
  `{ type: ["button", "input"], trigger: "click" }` means
  `(button OR input) AND click`.
- `trigger` filters the animation trigger and `behavior` filters the independent
  interaction behavior; `vibe`/`aesthetic` and `tech`/`attribute` are paired aliases.
- Availability and preview-mode filters read `previewProfile` when present and fall
  back honestly for legacy records.

## Validation and generated index

`npm run validate` checks the catalog and every taxonomy, including link/path
existence. `--check-index` fails when `catalog/index.json` is stale.
`npm run generate` validates first and then rewrites the derived index.

The generated index contains entry records plus derived counts:

- `counts.entries`, `themes`, `categories`, `aesthetics`, `attributes`, `behaviors`,
  `types`, `triggers`, `techniques`, `sources`
- `counts.byEntryType` and `counts.bySource`
- `counts.previewStatuses` (`ready | external | unavailable | error`)
- taxonomy id listings for tooling and the app

`catalog/index.json` is never edited by hand.

## Change history

| Version | Date | Change |
|---|---|---|
| v1 | 2026-10-24 | Initial schema: core entry fields, themes/categories, link existence rules. |
| v2 | 2026-10-24 | M5: local/external model, source/aesthetic/attribute taxonomies, preview/license/provenance fields, 16 new categories. |
| v2.1 | 2026-10-25 | M7.1: interaction `behaviors` taxonomy and entry field; real taxonomy membership checks. |
| v3 | 2026-10-29 | Discovery schema: required `types`, `triggers`, `techniques`, `tagMeta` and `previewProfile`; new type/trigger/technique taxonomies; validated preview modes/layouts/costs/requirements/assets/statuses; source coverage records; deterministic assisted classification and real snapshot publication. |
