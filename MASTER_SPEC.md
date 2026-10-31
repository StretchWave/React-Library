# MASTER_SPEC — Agent-First React Component Library

> **Status:** Active primary specification, v1.7 — authored 2026-10-24, updated 2026-10-29.
> **Provenance:** The kickoff brief referenced a `MASTER_SPEC.md`, but the repository was
> empty and no such file existed anywhere on this machine. Per user approval
> ("Draft spec, then build"), this document was drafted from the kickoff brief and is
> now the canonical specification for this project.
> **Rule:** when behavior or policy changes, this file is updated — not just the code.

---

## 1) Mission

Build a **React component library** that is *agent-first* as well as human-friendly:

- **Agents** consume a canonical, machine-readable **catalog**, a strict **theme
  taxonomy**, a directory structure that is stable and documented, a generated
  **index**, a **validator**, and a **component lookup CLI**.
- **Humans** browse a small React application that renders the same catalog with live,
  themeable component previews.

The foundations (schema, taxonomy, tooling, docs) come **before** the UI, and the UI is
built in verified increments.

## 2) Principles

1. **Agent-first.** Machine-readable truth lives in version-controlled data files with
   documented schema. The website is a *view* of that data, never the source.
2. **Single canonical source.** `catalog/catalog.json` is the catalog of record.
   `catalog/index.json` is **derived** and must never be hand-edited.
3. **Fail loudly, verify everything.** Every milestone ends with a green
   `npm run verify` gate (§11). Anything unverified is not "done".
4. **Minimal dependencies.** §12 lists the exact allowed dependency set; anything else
   requires a spec amendment first.
5. **Incremental, then polish.** Foundations → MVP → milestones; no big-bang features.
6. **Honest status.** Unimplemented work is labeled *placeholder* with a reason in
   `IMPLEMENTATION_CHECKLIST.md`. Working features are demonstrated by tests or builds.

## 3) Glossary

| Term | Meaning |
|---|---|
| **Catalog** | The canonical data file describing every component: `catalog/catalog.json`. |
| **Entry** | One component record inside the catalog. |
| **Index** | Derived, agent-readable summary generated from catalog + taxonomy: `catalog/index.json`. |
| **Taxonomy** | Canonical enum data files under `taxonomy/` (themes, categories). |
| **Theme** | A named set of design tokens (CSS custom properties) defined by the theme taxonomy. |
| **Foundation gate** | `npm run validate && npm run generate && npm test` passing. |
| **Verify gate** | `npm run verify` passing (full chain, §11). |

## 4) Directory structure (canonical)

```
C:\Programs\Website\React Library\
├── MASTER_SPEC.md                  # this file — primary specification
├── AGENTS.md                       # operating guide for AI agents working here
├── IMPLEMENTATION_CHECKLIST.md     # living progress tracker (updated per milestone)
├── README.md                       # human overview + verified command table
├── package.json
├── .gitignore
├── docs/
│   └── SCHEMA.md                   # detailed catalog schema reference
├── taxonomy/                       # canonical enums (source of truth)
│   ├── themes.json
│   └── categories.json
├── catalog/
│   ├── catalog.json                # ⭐ canonical catalog (hand-maintained)
│   └── index.json                  # ⭐ derived index (generated — never hand-edit)
├── scripts/                        # zero-dependency Node.js tooling (ESM, .mjs)
│   ├── lib/catalog.mjs             # shared load/validate/search/build-index library
│   ├── validate-catalog.mjs        # validator CLI
│   ├── generate-index.mjs          # index generator CLI
│   ├── lookup.mjs                  # component lookup CLI
│   └── tests/                      # NOT HERE — node tests live in <root>/tests/
├── tests/                          # zero-dependency `node:test` suites for tooling
├── index.html                      # Vite app entry (M1+)
├── vite.config.ts / tsconfig*.json
└── src/                            # React application (M1+)
    ├── main.tsx / App.tsx
    ├── catalog/types.ts, client.ts, demos.ts
    ├── lib/search.ts               # pure filtering logic (mirrors scripts/lib semantics)
    ├── theme/                      # ThemeProvider (M3+)
    ├── components/browser/         # app UI building blocks (M2+)
    ├── components/<Comp>/<Comp>.tsx + .css   # library components (M3+)
    └── styles/                     # base.css, app.css
```

Rules: Windows-first paths with spaces are fine; npm is the only package manager;
no CSS framework; library components own a `<Comp>.css` file using **only**
`--rl-*` variables for colors/radius/shadow/fonts (§6).

## 5) Catalog schema (canonical, v3)

Detailed reference with examples: `docs/SCHEMA.md`. Summary:

### 5.1 Top level — `catalog/catalog.json`

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | `3` | yes | Integer; bump per §5.5. |
| `meta.title`, `meta.description` | string | no | Free text. |
| `entries` | Entry[] | yes | Must be **sorted by `id`** (lexicographic). |

### 5.2 Entry

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | slug | yes | `/^[a-z0-9]+(-[a-z0-9]+)*$/`, unique. |
| `name` | string | yes | Display name. |
| `summary` | string | yes | 1 line, ≤ 140 chars. |
| `description` | string | no | Prose, 1–2 paragraphs. |
| `category` | slug | yes | Must exist in `taxonomy/categories.json`. |
| `themes` | slug[] | yes | ≥ 1; each must exist in `taxonomy/themes.json`. |
| `aliases` | slug[] | yes | May be empty; lowercase slugs; globally unique across catalog, may not collide with any entry `id`. |
| `tags` | slug[] | yes | May be empty; lowercase. |
| `status` | enum | yes | `stable` \| `beta` \| `experimental` \| `deprecated`. |
| `version` | semver | yes | `/^\d+\.\d+\.\d+([-.+][\w.-]+)?$/`. |
| `addedDate` | ISO date | yes | `YYYY-MM-DD`. |
| `owner` | string | no | |
| `externalDependencies` | string[] | yes | npm packages required **beyond react/react-dom**; empty list for all CSS-only components. |
| `props` | Prop[] | yes | May be empty; unique `name`s. |
| `links` | object | no* | `{ source?, demo?, docs? }` — repo-relative POSIX paths; **when present, each must exist on disk** (validator enforces). Sections marked *: links are optional from M1 and expected to be filled as files land (M3); `usedFrom` optional. |
| `a11yNotes` | string | no | |
| `usedFrom` | string[] | no | App entry points that import the component (§10.4). |
| `types` | slug[] | yes (v3) | ≥ 1; ids from `taxonomy/types.json`. |
| `triggers` | slug[] | yes (v3) | ≥ 1; ids from `taxonomy/triggers.json`. |
| `techniques` | slug[] | yes (v3) | May be empty; ids from `taxonomy/techniques.json`. |
| `tagMeta` | object | yes (v3) | `{ sourceProvided: string[], inferred: string[], reviewNeeded: boolean }`; values are `facet:id` provenance records. |
| `previewProfile` | object | yes (v3) | Validated preview decision: mode, layout, cost, aspect ratio, dimensions, requirements, assets, autoplay permission, status and failure reason. See §5.4 v3 rules. |

### 5.3 Prop

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | camelCase `/^[a-z][A-Za-z0-9]*$/`. |
| `type` | string | yes | TS-ish type expression, non-empty. |
| `required` | boolean | yes | |
| `default` | string | no | Canonical literal form, e.g. `"\"primary\""`, `"false"`. |
| `description` | string | no | |

### 5.4 Taxonomy files

- `taxonomy/categories.json` → `{ "schemaVersion": 2, "categories": [{ "id", "label", "description?" }] }` (ids unique slugs). The original six buckets are retained; the M5 extended set adds granular component categories (tabs, tooltips, modals, hero-sections, pricing-sections, footers, backgrounds, gradients, text-effects, loaders, cursors, charts, 3d-webgl, scroll-animations, page-sections, page-layouts).
- `taxonomy/themes.json` → `{ "schemaVersion": 1, "themes": [{ "id", "label", "base", "description", "tokens" }] }`
  - `base`: `"light"` | `"dark"`.
  - `tokens`: map of CSS-variable name → value string. It **must** define all nine
    canonical tokens:

    `--rl-surface`, `--rl-surface-alt`, `--rl-text`, `--rl-text-muted`,
    `--rl-accent`, `--rl-accent-contrast`, `--rl-border`, `--rl-radius`, `--rl-font`

  - Common optional tokens: `--rl-shadow`, `--rl-focus` (an `outline` shorthand),
    `--rl-backdrop` (glass blur). Components must treat every optional token as
    optional with a sane inline fallback.
- **v2 (M5)** — three more canonical taxonomies (see `docs/SCHEMA.md` §v2 for the full
  field rules):
  - `taxonomy/aesthetics.json` — component *aesthetic* classifications
    (`{ id, label }`). These describe the visual style of cataloged components and are
    deliberately **distinct from the application appearance themes**, which style the
    React Library app itself.
  - `taxonomy/attributes.json` — independent attributes grouped into
    `appearance | motion | tech` facets; entries may carry many at once.
  - `taxonomy/sources.json` — the component source registry: `{ id, name, url, repo?,
    accessMethod, status ∈ available|partial|reference-only|requires-auth|unavailable,
    license, auth?, limit?, notes }`. An entry `source` must exist here; per-source
    entry counts are derived into `catalog/index.json` only.
- **v2.1 (M7.1)** — `taxonomy/behaviors.json` — canonical *interaction behaviors*
  (`{ id, label, description? }`): `auto`, `cursor-reactive`, `hover`, `click`,
  `draggable`, `scroll`, `gesture`, `interactive-3d`, `interactive-text`,
  `interactive-nav`, `stateful`, `static`. Behaviors classify **what user input drives
  the animation**, aesthetics classify **how it looks** — the two systems stay
  independent (a cursor effect can also be cyberpunk). Classification rule: an
  animation that plays with no user input is `auto`; only components that respond to
  pointer, keyboard, drag, scroll, gesture or state changes carry the matching
  interactive behavior. Entries store behavior ids in the optional `behaviors` array
  (validator-enforced against this file; every entry carries at least one). Filtered
  by the app's "Interaction" select and by `npm run lookup -- --behavior <id>`; listed
  in `catalog/index.json` `taxonomies.behaviors`.
- **v2 entry fields** (all optional; absent ⇒ legacy `local` entry): `entryType`,
  `source`, `sourceUrl`, `externalId`, `retrieval`, `preview`, `localDir`, `manifest`,
  `implementation`, `dependencies`, `license`, `aesthetics`, `attributes`, `syncedAt`,
  `behaviors`. External entries must not declare `localDir`/`manifest`/`implementation`
  — the validator errors when a non-redistributable source is given fabricated local paths.
- **v3 (M9, discovery)** - three discovery taxonomies plus required provenance and
  preview fields (see `docs/SCHEMA.md` for full rules):
  - `taxonomy/types.json` — 23 component types (`button`, `card`, `background`,
    `transition`, ...). Structural `category` stays for navigation; `types` is the
    discovery facet.
  - `taxonomy/triggers.json` — 14 animation triggers (`hover`, `click`, `scroll`,
    `route-transition`, ...).
  - `taxonomy/techniques.json` — 46 techniques (`fade`, `shader`, `particles`, ...).
  - Entry fields `types` (non-empty), `triggers` (non-empty), `techniques` (may be
    empty), `tagMeta` and `previewProfile` are **required** in schema v3.
  - `tagMeta` records `sourceProvided` versus `inferred` facets with evidence and a
    `reviewNeeded` flag. The deterministic classifier is idempotent; it never claims
    behavior without evidence and never invents screenshots.
  - `previewProfile` publishes the honest preview decision. `mode` is
    `live | snapshot | loop | external | unavailable`; `layout` is
    `compact | standard | wide | showcase`; `cost` is `low | medium | high`;
    `previewStatus` is `ready | external | unavailable | error`. The profile also
    carries `aspectRatio`, `minWidth`, `minHeight`, `gridColumnSpan`,
    `gridRowSpan`, `expandedRecommended`, `requires`, `autoplayAllowed`,
    `snapshotPath`, `loopPath` and an honest `failureReason`. External mode/status must
    agree; unavailable mode/status requires a reason; snapshot/loop modes require their
    real asset paths. Paths are repo-relative POSIX and existence-checked.
  - Cards run live only for low/medium-cost autoplay previews that are visible and not
    globally paused or reduced-motion. Heavy, static, off-screen and paused cards use
    published real snapshots. External records render an explicit external state.
  - `taxonomy/sources.json` coverage records may carry `discovered`, `usable`,
    `locked`, `reviewNeeded`, `blocked` and `checkedAt`; imported and preview-ready
    counts are derived from entries, never hard-coded. `discovered` means "tracked by
    this project", not "the upstream library is fully enumerated".

### 5.5 Schema evolution

Additive changes: bump `schemaVersion` minor-wise and record them in the
`docs/SCHEMA.md` changelog. Breaking changes require a new major version plus migration
notes. Schema v3 made `types`, `triggers`, `techniques`, `tagMeta` and
`previewProfile` required; the catalog was migrated in place and the classifier keeps
those fields current. The validator knows exactly the current version, **warns** for
unknown fields (forward-compat), and **errors** on missing/invalid known fields.

## 6) Theme taxonomy (initial, v1)

Six themes; `themes.json` is authoritative. Tokens below are the *character* of each
theme; exact hexes live in the file.

| id | base | vibe |
|---|---|---|
| `classic-clean` | light | default professional light theme, blue accent, soft radius |
| `midnight-glass` | dark | glassmorphism, translucent surfaces, backdrop blur |
| `neon-cyberpunk` | dark | neon green/cyan on near-black, hard edges, glow |
| `brutalist-print` | light | raw print poster: black borders, zero radius, hard shadow |
| `retro-terminal` | dark | phosphor green mono on black, zero radius |
| `soft-pastel` | light | friendly pastel purple, very rounded |

Theme application mechanism: themes are **CSS custom property scopes**. The app sets the
token map on a `[data-theme="<id>"]` element; library components style themselves with
`var(--rl-*)` only. No per-theme component CSS. Fonts are aspiration stacks with system
fallbacks (no webfont/network dependency).

## 7) Category taxonomy (initial, v1)

`buttons`, `inputs`, `layout`, `display`, `feedback`, `navigation`.

## 8) Tooling contract (zero external dependencies — Node ≥ 20, ESM)

Shared library `scripts/lib/catalog.mjs` exposes (all pure unless noted):

- `loadCatalog(root)` → `{ catalog, themes, categories, aesthetics, attributes,
  behaviors, sources, types, triggers, techniques, paths }` (fs).
- `validateTaxonomy(themesDoc, categoriesDoc, { aesthetics, attributes, sources,
  behaviors, types, triggers, techniques })` → `{ errors, warnings }`.
- `validateCatalog(catalog, taxonomies, { root, checkLinks })` → `{ errors, warnings }`
  — enforces §5 fully; link checks require `checkLinks`.
- `searchEntries(entries, query, { theme?, category?, aesthetic?/vibe?, source?,
  attribute?/tech?, trigger?, behavior?, entryType?, type?, technique?, previewMode?,
  availability? })` → ranked matches. `trigger` and `behavior` are independent
  dimensions. Exact `id` > exact `alias` > prefix >
  whole-token > substring > token-level typo. Filters are **AND across dimensions and
  OR within one dimension**; empty query returns all entries sorted by id.
- `buildIndex(catalog, themes, categories, generatedAt, ...)` → index object with
  derived counts, taxonomy listings, source coverage and preview status counts.
- `writeIndex(root, index)` → writes `catalog/index.json` pretty 2-space + `\n` (fs).
- `formatEntryText(entry)` → human text block used by the lookup CLI, including v3
  types/triggers/techniques and preview-profile facts.

### 8.1 Commands

| Command | Contract |
|---|---|
| `npm run validate` | Exits `0` clean, `1` with a sorted error report. Flags: `--check-index` (fail when `catalog/index.json` ≠ freshly derived). Link checks run everywhere; the pre-M3 `--skip-links` flag is gone. |
| `npm run generate` | Validates first (aborts on errors), rewrites `catalog/index.json`, prints counts + timestamp. |
| `npm run lookup` | See §8.2. |
| `npm test` | `node --test "tests/*.test.mjs"` — zero-dep suites: catalog lib, validator rules, search, index build, ingest adapters, CLI integration, CSS theming scan. |
| `npm run ingest-shadcn` / `ingest-magicui` / `ingest-reactbits` | Official-registry adapters; dry-run default, `--write` vendors/updates idempotently. |
| `npm run ingest-codepen` | Author-owned CodePen references only. Requires official URL + author + verified license for `--write`; records the official embed URL and never scrapes. |
| `npm run ingest-reference` | Metadata-only adapter for external reference sources; records official URL/terms and never copies source. |
| `npm run classify` | Deterministic assisted classification + preview profiles; `--check` reports drift without writing. |
| `npm run capture:previews` | Publishes real audit snapshots into `public/previews/`; never invents images. |
| `npm run test:app` / `typecheck` / `build` | App test/build chain. |
| `npm run verify` | Full release gate: validate --check-index → generate → node tests → app tests → typecheck → build. |
| `npm run audit:previews` | Optional real-browser audit of every workspace route and gallery card. |

### 8.2 Lookup CLI output contract

`npm run lookup -- <query> [--theme <id>] [--category <id>] [--type <component-type-id>]
[--entry-type <local|external>] [--trigger <id>] [--technique <id>] [--vibe <id>]
[--tech <id>] [--source <id>] [--behavior <id>] [--preview-mode <id>] [--json] [--list]`

- Filters are AND across dimensions and OR within a repeated option (for example
  `--type button --type input`). `--aesthetic` and `--attribute` are aliases for
  `--vibe` and `--tech`; `--type local|external` remains accepted as a legacy
  entry-type alias.
- **Text mode** prints one block: name, status, category, summary, themes, aliases,
  tags, version/addedDate, links (or `—` when absent), props, plus v2 provenance and v3
  classification/preview facts.
- **`--json`** prints a single JSON object (the entry or `{ query, count, matches }`
  when ambiguous). Nothing else on stdout.
- **`--list`** prints `id — name — category — status — entry type` lines.
- Exit codes: `0` found · `1` no match · `2` unknown filter id · `64` usage error.
- Matching rank: exact id > exact alias > ranked fuzzy signals; ambiguous multiple
  matches list candidates (top 10) with a refine hint.

### 8.3 Index contract (`catalog/index.json`)

```json
{
  "schemaVersion": 3,
  "generatedAt": "ISO timestamp",
  "generator": "scripts/generate-index.mjs",
  "counts": {
    "entries": 0,
    "themes": 0,
    "categories": 0,
    "aesthetics": 0,
    "attributes": 0,
    "behaviors": 0,
    "types": 0,
    "triggers": 0,
    "techniques": 0,
    "sources": 0,
    "byEntryType": {},
    "bySource": {},
    "previewStatuses": { "ready": 0, "external": 0, "unavailable": 0, "error": 0 }
  },
  "taxonomies": { "themes": ["…"], "types": ["…"], "triggers": ["…"] },
  "sourceCoverage": [ /* checked-in coverage records */ ],
  "entries": [ /* entry records, sorted by id, links included when present */ ]
}
```

Consumers must treat it as read-only and regenerate after any catalog/taxonomy change.

## 9) Agent operating contract

`AGENTS.md` is normative for agents: commands, add-a-component checklist, styling +
a11y rules, placeholder policy, and the change-verification gate. It references this
spec for schema detail; where they disagree, this spec wins.

## 10) The React application

Build: **Vite + React + TypeScript**. Tests: **Vitest** (jsdom) +
**@testing-library/react**. No router library (hash-based deep links in M4), no state
library, no UI kit, no CSS framework.

### M1 — App skeleton (MVP)

1. `npm run verify` (§11) is green with app build included.
2. App renders: header (title + catalog count), entry list of **all** catalog entries,
   and a detail pane with an empty-state placeholder until an entry is selected.
3. Selecting an entry shows its `name` + `summary` (data straight from the catalog).
4. ≥ 1 Vitest test: app renders all entry names; selecting one updates the detail pane.
5. No runtime dependency beyond react/react-dom.

### M2 — Component browser (MVP)

1. Text search filters by id/name/summary/tags/aliases (pure module `src/lib/search.ts`,
   semantic parity with `scripts/lib/catalog.mjs` — unit-tested for both).
2. Category filter and theme filter (from taxonomy data, not hardcoded lists).
3. Detail pane shows: summary, status badge (color-coded via app-level status tokens
   defined in `src/styles/status.css` — release vocabulary for chips plus a small
   component-level tone vocabulary (`success`/`warning`/`danger`); status colors are
   deliberately theme-independent release semantics, the only sanctioned color literals
   outside the taxonomy), description, themes, props table, category tags, links when
   present.
4. Keyboard: `/` focuses search; `Esc` clears it — covered by tests.
5. Accessibility baseline: labeled search input, listbox/option semantics or
   button-based list, focus outlines via `--rl-focus`.

### M3 — Theme engine + live previews

1. `ThemeProvider` reads themes from `taxonomy/themes.json` (via the catalog client) and
   applies the token map to a `[data-theme]` scoped container — **no colors hardcoded in
   app CSS for theming**; the app's own chrome also consumes `--rl-*`.
2. Theme switcher: labeled select + next/previous cycle buttons.
3. Persistence: `localStorage["rl.theme"]`; default value `auto` follows
   `prefers-color-scheme`; invalid stored ids fall back to `auto`.
4. All six taxonomies themes apply cleanly (all nine canonical tokens present —
   validator-enforced).
5. **Component suite implemented** (the six cataloged components: Alert, Badge, Button,
   Card, TabSheet, TextInput) with `links.source`/`links.demo` filled in the catalog;
   each demo renders in the live preview pane inside the themed scope; `usedFrom` lists
   real app import sites.
6. Component CSS uses only `--rl-*` (tooling test `tests/css-theming.test.mjs` rejects
   raw color literals in `src/components/**/*.css`).
7. Tests: theme token injection, persistence behavior, at least one themed preview test.

### M4 — Advanced interactions & hardening

1. TabSheet: WAI-ARIA tabs with arrow-key navigation and roving tabindex.
2. Copy-to-clipboard for the selected component's install/usage snippet.
3. Hash-based deep links `#/component/<id>` (back/forward via `hashchange`).
4. Empty state when filters match nothing, with "Reset filters" action (tested).
5. Full `npm run verify` (no `--skip-links`) is green — the release gate.
6. README + checklist reflect final status; remaining ideas listed as future work.

### Explicitly out of scope (non-goals)

SSR, Storybook, npm publishing, per-theme alternate component layouts, i18n, visual
regression by screenshot, component-level CSS variants decoupled from themes.

### M5 — Real component ingestion, visual preview gallery, multi-selection,
### master prompt generation (2026-10-24, in progress)

Staged; see `IMPLEMENTATION_CHECKLIST.md` §5.x for per-stage status.

1. **M5.1 Schema + source research** — catalog schema v2 (local/external model,
   aesthetics/attributes/sources taxonomies, preview + license + provenance fields);
   research-based source registry with verified access methods and licensing
   (`taxonomy/sources.json`); validator, generator, lookup CLI, tests extended
   together.
2. **M5.2 Real ingestion** — adapters/curators that retrieve source data only
   through officially supported channels; populate real verified entries across
   categories and aesthetic themes; store local implementations only where the
   license/permitted-use check passes; everything else is `reference-only` metadata
   with official retrieval instructions.
3. **M5.3 Gallery + previews** — component card grid with aesthetic/source/type
   filters; honest preview modes (`local-demo | static | external | source-link |
   none`); untrusted ingested code is never executed in the main app context.
4. **M5.4 Multi-selection** — stable-id selection with accessible controls,
   select-all-visible, clear-all, a selection tray, persistence across filters and
   refreshes, and unavailable/missing-metadata detection.
5. **M5.5 Master prompt generation** — target-project settings; prompt assembled
   from canonical records only (exact local paths for local entries; official
   retrieval instructions for external ones); editable preview + clipboard copy with
   fallback.
6. **M5.6 Validation + release** — schema/ingestion/selection/prompt/clipboard tests;
   `npm run verify` full flagless gate remains the release gate; docs match reality.

### M6 — Correction: animation-first discovery (2026-10-24, in progress)

User correction on top of M5: turn the app into an animation-first discovery tool for
genuinely interesting React UI components, with a real preview workspace and honest
preview-class handling. Staged; see `IMPLEMENTATION_CHECKLIST.md` §6.x.

1. **M6.1 Animation-first ingestion** — React Bits (MIT + Commons Clause v1.0) items
   vendored from the official registry (`https://reactbits.dev/r/{Name}-TS-CSS.json`,
   official channel). Commons Clause bars selling/sub-licensing the component source;
   application use is permitted, so vendoring for catalog previews and agent delivery
   is in scope with attribution in every entry. Items whose vendored variant is raw
   WebGL/three.js are vendored for the target project, but their previews stay
   `source-link` (official demo) — never advertised as live. 3D showcases without a
   plain-CSS variant stay external-reference entries. Taxonomy growth: categories
   `motion`, `micro-interactions`; attributes `gsap`, `motion`, `canvas`, `ogl`;
   entry fields `runtime` (preview engine class), `heavy` (workspace-only auto-play).
2. **M6.2 Preview workspace** — dedicated `#/preview/<id>` route: big live canvas for
   entries whose vendored implementation runs in this app (runtime `dom`, `gsap`,
   `motion`, `physics`), with replay, viewport widths, background modes, per-entry
   property controls, source/dependency/retrieval/license info, related components,
   and the selection toggle. Non-runnable previews show their honest kind plus the
   official link button. Untrusted-code policy: vendored component code runs only
   through reviewed per-entry showcase wrappers in `src/catalog/showcases/`; the app
   never executes arbitrary ingested code.
3. **M6.3 Visual gallery** — preview-first cards with on-demand play (Intersection
   Observer), a global motion toggle, heavy entries gated behind the workspace, and
   honest source-link/external cards for non-runnable previews.
4. **M6.4 App runtime for animation** — `gsap`, `@gsap/react`, `motion`, `matter-js`
   added (§12 amendment) to run the vendored live components; the M6.2 extension of
   the amendment adds the icon runtime declared by four live sources
   (`@hugeicons/react`, `@hugeicons/core-free-icons`) and the pointer-gesture
   runtime declared by Dome Gallery (`@use-gesture/react`). The vendored sources
   are scanned before bundling: none of the live-previewable files import
   `@/lib/utils`, so the previously planned `cn` alias/shim is not needed and is
   intentionally dropped. three.js/OGL are deliberately not bundled.
5. **M6.5 Tests, docs, release** — metadata/lookup tests, workspace/gallery/prompt
   app tests, README/checklist/spec sync, full flagless `npm run verify`.
6. **M6.6 Everything-local previews** — no external preview redirects remain: the
   21 raw-WebGL React Bits variants run in-app (18 hand-rolled WebGL2 with
   null-context bail-outs; Blob Cursor, Hyperspeed, and the fully procedural
   Lanyard on three.js), all marked `heavy` so the gallery shows workspace-bound
   placeholders and only the preview workspace mounts them one at a time;
   the 16 vendored shadcn items and 4 Magic UI items get reviewed wrappers too.
   Evidence gates: null-gl bail scan, full multi-file import audit (only `three`
   is added), and a GPU smoke in a real browser before the flip is claimed.

### M7 — Visual overhaul: gallery-first product (2026-10-25)

M6 made the previews honest; M7 makes the product a visual motion-design laboratory
while preserving every working behavior (catalog client, selection store, prompt
builder, showcase isolation, lazy loading, hash routing, six appearance themes).

1. **M7.1 Audit first** — verify HEAD vs `7e98d8c`, run the gate, reconcile the
   documented counts against the live registry (recorded in the checklist), and
   produce the defect list that scopes M7.2–M7.6.
2. **M7.2 Art direction + shell** — gallery is the default landing view (`#/component`
   deep links and the browser switch keep it one click away); identity header with a
   mark, global search stays per-view, compact segmented navigation, single-column
   main layout with the two-column split scoped to the browser view only.
3. **M7.3 Gallery redesign** — preview-first cards (13.5–15rem preview frames vs the
   old 7.5rem, scaler 0.72), overlaid always-visible selection checkbox, explicit
   in-app `#/preview/<id>` action as the default inspect path (off-site links remain
   separately labeled), distinctive heavy-poster states, hover/focus elevation,
   reduced-motion-respecting entrance animation, no layout shift on stage mount.
4. **M7.4 Preview workspace redesign** — stage-first canvas
   (`min-height: clamp(420px, 62vh, 720px)`), compact toolbar (stage modes,
   viewports, replay, fullscreen with graceful degradation), verified per-entry
   controls hosted in the information rail, honest-card canvas presence, and an
   app-level error boundary with Retry around the lazy workspace chunk.
5. **M7.5 Selection + prompt studio** — tray compresses to a sticky single row on
   desktop; prompt pane wraps (`pre-wrap`) and gains an explicit edit/restore mode
   that never mutates the canonical selection; optional target-project name
   (deterministic line via `PromptOptions.targetProject`).
6. **M7.6 QA + docs** — full suite + build + flagless verify; DOM-based browser QA
   of the §13 acceptance flows at 1440/1280/390 widths; README/checklist counts
   corrected to the audited truth; changelog order fixed (v1.4 now precedes v1.5).
   Pixel-screenshot evidence that was blocked by an undrawn client window is
   recorded as a limitation, never claimed.

**M7.1 refinement (2026-10-25).** Post-M7 refinement pass, superseding M7.3/M7.4 where
they conflict:

- **Minimal gallery** — cards shrink to exactly three visible elements: the preview,
  the component name, and a selection checkbox. All metadata (summary, source,
  category, aesthetics, dependencies, status) stays in the preview workspace rail and
  the browser detail pane. Card previews are 14rem (16rem on large desktops, inside
  the 220–300px band), grid gaps widen to 1.4rem, and the unchecked checkbox is
  unobtrusive (55% opacity, full on card hover/focus-within and when selected — never
  hover-only, the ~40px touch target stays tappable). Selection and preview-open
  remain independent actions (checkbox is a sibling, not a child, of the stretched
  open link).
- **Interactive animation taxonomy** — `taxonomy/behaviors.json` as specified above,
  with every entry classified from its verified showcase implementation. Behavior ids
  now validate against the real taxonomy set (the validator previously enforced entry
  aesthetics/attributes/behaviors/sources against empty sets, which let an
  undocumented id slip through silently).
- **Immersive preview stage** — the workspace rail gains behavior chips and the stage
  shows a behavior-derived interaction cue (cursor-reactive → move the pointer,
  draggable → drag & release, scroll → scroll inside the stage, …) capped at two cues;
  existing stage modes, viewports, replay, fullscreen, controls, and honest fallback
  states are unchanged.

**M7.2 refinement (2026-10-25).** Preview-experience polish on top of M7.1, no schema
or dependency changes:

- **Every card opens in-app** — the stretched `gallery-card-open` link exists on all
  cards and always targets `#/preview/<id>`; `PreviewBox` no longer renders off-site
  anchors inside the grid. External records are quiet honest tiles (↗ cue + short
  label); their official URL appears only in the workspace honest card and detail
  pane. Selection stays a sibling of the open action.
- **Pointer-interactive mini stages** — when a playing live stage's entry carries a
  verified pointer-capable behavior (`cursor-reactive`, `hover`, `gesture`,
  `interactive-text`, `interactive-nav`, `stateful`), it publishes
  `data-interactive="true"`; gallery CSS then passes the pointer through and retracts
  the open link to the title strip. Click/drag-driven entries keep the full-card
  overlay so a click still opens the workspace consistently.
- **Workspace hierarchy** — provenance (source, license, retrieval, dependencies,
  vendored files, related) collapses behind an accessible `<details>` in the rail;
  identity, selection, classification chips, and verified controls stay primary.
- **Scroll-aware stage** — entries classified `scroll` get an inner-scrollable stage
  wrap (`data-scroll="true"`, full viewport only) so viewport entrances trigger inside
  the canvas; Replay resets the inner scroll position.

**Preview legibility refinement (2026-10-30).** Cards stay compact. After a 350ms
hover on a hover-capable pointer, an interactive 700×470 panel opens beside the
card (above/below when neither side fits) and runs the entry at native scale instead
of the card's 0.72 shrink. Low/medium-cost local entries may run even when gallery
autoplay is off; pause, reduced-motion, visibility, high-cost and heavy gates still
apply. Heavy entries show their real snapshot, and external/unavailable entries get
no panel. The panel is interactive and stays open while the pointer is inside it or
the card; it dismisses on Escape, outside click, page scroll, leaving both surfaces,
or its close button. A per-card enlarged-preview control (aria-expanded/aria-controls)
opens the same panel for keyboard and touch users without replacing Expand: the panel
is pinned, receives focus, ignores pointer-leave, and returns focus to the control when
dismissed. The control is hidden below 900×600, where Expand remains the route. Expand
remains the full-workspace route for scroll/fullscreen and control-heavy cases.

### M9 — Visual discovery workspace (2026-10-29)

User brief: make the library a personal, agent-first visual discovery tool rather than
a component list. M9 keeps `catalog/catalog.json` canonical and extends the schema,
tooling, app and docs together.

1. **Schema v3 discovery facets** — required `types`, `triggers`, `techniques`,
   `tagMeta` and `previewProfile`; new `taxonomy/types.json`, `triggers.json` and
   `techniques.json`; deterministic assisted classification with evidence/provenance
   and `reviewNeeded`; source coverage records for discovered/imported/preview-ready/
   usable/locked/blocked/review-needed counts. No parallel catalog.
2. **Honest preview profiles** — compact/standard/wide/showcase layouts, real aspect
   ratios and dimensions, cost/autoplay permission, runtime requirements, real
   snapshot/loop paths, preview status and failure reasons. Cards run only safe live
   previews; heavy/off-screen/paused/reduced-motion cards use published real snapshots;
   expansion lazily loads the workspace. External and unavailable states are explicit.
   The capture script publishes real audit screenshots; no thumbnail is invented.
3. **Discovery shell** — Browse/Collections/Sources/Selected/Table views; collapsible
   desktop facets and mobile drawer; `/` search focus; AND-across/OR-within facet
   search; bulk selection, compare, favorites, recents, named collections, saved
   filters, local tags/notes and shareable hash/query state. Inspector overlays preserve
   the current view, filters and scroll.
4. **Source coverage and reference adapters** — shadcn/Magic UI/React Bits official
   ingestion remains idempotent; `ingest-codepen` records author-owned pens only after
   URL/author/license verification and never scrapes; `ingest-reference` records
   metadata only for restricted sources. CodePen, OriginKit, GetLayers, Ditther and
   Pryzm remain blocked/reference until their required access or metadata exists.
5. **Prompt studio** — selected components, dependencies, local paths vs official
   retrieval, licenses, constraints, preview notes and local annotations; no invented
   behavior or source claims.
6. **Release** — schema/validator/index/lookup/ingestion/tooling tests, app tests for
   routing/persistence/coverage/preview decisions, responsive QA, real-browser audit
   and full `npm run verify`.

## 11) Verification gates

```text
npm run verify
  ├─ npm run validate -- --check-index [--skip-links until M3]
  ├─ npm run generate
  ├─ npm test              (node --test — tooling)
  ├─ npm run test:app      (vitest run)
  ├─ npm run typecheck     (tsc --noEmit)
  └─ npm run build         (vite build)
```

- **Foundation gate** (before M1 exists): `validate` → `generate` → `test`.
- Every milestone AC ends with its gate; commits happen only on green.
- Failures fail loudly with ExitCode ≥ 1 so CI can consume them.

## 12) Dependency policy (allowed set)

| Dependency | Type | Reason |
|---|---|---|
| `react`, `react-dom` | runtime | UI runtime (only runtime deps). |
| `vite`, `@vitejs/plugin-react` | dev | Build toolchain. |
| `typescript` | dev | Type safety. |
| `@types/react`, `@types/react-dom` | dev | React types. |
| `vitest`, `jsdom`, `@testing-library/react` | dev | App-side testing. |
| `@testing-library/dom` | dev | Mandatory peer of `@testing-library/react` v16 (npm auto-installed). *Amendment 2026-10-24.* |
| *(none)* test-Runner for Node script tooling | dev | `node:test` is built-in — zero deps. |
| `gsap`, `@gsap/react` | runtime | Animation engine for vendored React Bits previews (declared by those sources). *Amendment 2026-10-24, M6.4.* |
| `motion` | runtime | Framer Motion class API via `motion/react`, used by vendored sources. *Amendment 2026-10-24, M6.4.* |
| `matter-js` | runtime | 2D physics for vendored physics-based previews (e.g. Falling Text). *Amendment 2026-10-24, M6.4.* |
| `@hugeicons/react`, `@hugeicons/core-free-icons` | runtime | Icon runtime + free icon data declared by the vendored sources (Card Nav, Carousel, Flowing Menu, Elastic Slider, Animated List). *Amendment 2026-10-24, M6.4.* |
| `@use-gesture/react` | runtime | Pointer-drag gestures declared by the vendored Dome Gallery source. *Amendment 2026-10-24, M6.4.* |
| `three` | runtime | three.js engine declared by the vendored Blob Cursor / Hyperspeed / Lanyard sources (both render locally; Lanyard is fully procedural — no external model assets). *Amendment 2026-10-25, M6.6.* |

Anything else requires: spec §12 amendment + AGENTS.md update + checklist decision log,
**before** installation. No UI kits, CSS frameworks, routers, state managers, or
center-block libs of any kind. Animation engines are allowed **only** because
M6 previews render officially-vendored component sources that declare them;
`src/catalog/showcases/` must not pull in further engines (three.js/OGL remain
excluded) without a new §12 amendment.

## 13) Placeholder policy

Unwritten features are allowed only as **explicit placeholders**: listed in
`IMPLEMENTATION_CHECKLIST.md` (status column + reason) and surfaced in-app when
relevant ("Placeholder" chip pattern reserved for future entries); a placeholder never
masquerades as working. When done, status flips to *working* with the evidence
(command output / test) recorded in the checklist.

## 14) Definition of done (project)

1. Foundations: schema + taxonomy + directory + AGENTS + generator + validator + lookup
   — all gated by §11 foundation gate. ✅ then ✅ app milestones M1–M4 green.
2. `npm run verify` passes fully (no skip flags).
3. Docs (spec, AGENTS, README, checklist, SCHEMA) match reality.
4. Dependency set = §12 exactly.

---

*Change log:*
- **v1.0 — 2026-10-24:** Drafted from kickoff brief (spec file missing → user-approved
  draft); established foundations-first milestone plan.
- **v1.1 — 2026-10-24:** §12 amended to add `@testing-library/dom` (mandatory peer of
  `@testing-library/react` v16, npm auto-installed). No other changes; M4 complete.
- **v1.2 — 2026-10-24:** M5 milestone added (real ingestion, gallery, multi-selection,
  master prompt generation); §5.4 extended with schema v2 taxonomies
  (aesthetics/attributes/sources) and v2 entry fields.
- **v1.3 — 2026-10-24:** M6 milestone added (animation-first correction: React Bits
  ingestion, preview workspace, visual gallery, prompt/status extensions); §12
  amended to allow the animation runtimes (`gsap`, `@gsap/react`, `motion`,
  `matter-js`) and entry fields `runtime`/`heavy`.
- **v1.4 — 2026-10-24:** M6.2–M6.4 shipped: preview workspace `#/preview/<id>`
  (stage modes, viewports, replay, per-entry verified controls, honest kind card),
  40 reviewed showcase wrappers, the `react-bits-animated-list` record flipped to a
  live preview once its icon runtime was allowed, §12 extended with
  `@hugeicons/react`, `@hugeicons/core-free-icons`, `@use-gesture/react`; vendored
  files carry an adapter-stamped review banner; gallery mini stages with an
  IntersectionObserver play policy, a persisted global pause toggle, and heavy
  gating; the workspace view is lazy-loaded so gallery users never pay for the
  animation engines.
- **v1.5 — 2026-10-25:** M6.6 everything-local previews shipped; §12 extended with
  `three` (Blob Cursor, Hyperspeed, procedural Lanyard). All 21 raw-WebGL React
  Bits variants plus the 16 shadcn and 4 Magic UI vendored items render live
  through reviewed wrappers; webgl entries auto-`heavy`; zero preview redirects
  remain in the catalog.
- **v1.6 — 2026-10-25:** M7 visual overhaul milestone added (§10): gallery-first
  default landing, preview-first gallery cards, redesigned preview workspace with
  fullscreen and rail-hosted controls, prompt studio polish (editable copy,
  wrapping pane, optional target-project line via `PromptOptions.targetProject`),
  shell art direction with the six appearance themes preserved, and a
  lazy-preview error boundary. No dependency-policy change.
- **v1.7 — 2026-10-29:** M9 visual discovery workspace added; schema v3 required
  `types`, `triggers`, `techniques`, `tagMeta` and `previewProfile`; new type/trigger/
  technique taxonomies and source coverage records; deterministic assisted
  classification; real snapshot publication and honest preview gating; Browse/
  Collections/Sources/Selected/Table discovery views, AND/OR facets, shareable state,
  favorites, collections, recents, saved filters, compare and local annotations;
  lookup CLI v3 facet filters with repeated-option OR and independent trigger/
  behavior dimensions; CodePen/reference ingestion adapters with verified-metadata
  refusal rules. No dependency-policy change.
