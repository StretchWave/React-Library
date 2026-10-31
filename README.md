# React Library - agent-first visual component discovery

An agent-first React component catalog: canonical machine-readable data, strict
taxonomies and zero-dependency tooling come first; the React app is a view of that
data. The app is a gallery-first discovery workspace for real animated and interactive
UI components, with honest previews, faceted search, collections, source coverage and
a build-prompt studio.

Spec: [`MASTER_SPEC.md`](./MASTER_SPEC.md) | Agent guide: [`AGENTS.md`](./AGENTS.md) |
Progress: [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) |
Schema: [`docs/SCHEMA.md`](./docs/SCHEMA.md)

## Status

| Area | State |
|---|---|
| Canonical catalog | Schema **v3**, 87 real entries, sorted by id; `catalog/index.json` generated |
| Discovery app | Browse gallery, Collections, Sources, Selected for AI and a table view with deep links |
| Search + facets | Types, triggers, techniques, vibes, tech, category, source, entry type, preview mode and status; **AND across dimensions, OR within one** |
| Previews | 71 published live previews, 16 honest external-preview records, 23 heavy workspace-only entries, 18 autoplay-eligible cards |
| Personal data | Favorites, named collections, recents, manual tags, notes, saved filters and compare state in localStorage |
| Sources | 12 documented sources with access/license/coverage records; reference-only ingestion never vendors restricted code |
| Verification | `npm run verify` is the release gate; the browser audit is a separate real-Chrome/Edge check |

## Quickstart

```bash
npm install
npm run validate                 # catalog + taxonomies + path checks
npm run generate                 # regenerate catalog/index.json (never hand-edit it)
npm run lookup -- button         # inspect one record
npm run lookup -- --list         # list all records
npm run lookup -- --list --type button --trigger hover  # v3 facets
npm test                         # zero-dependency tooling suites
npm run dev                      # React app
npm run test:app                 # Vitest app suites
npm run verify                   # validate + generate + node tests + app tests + typecheck + build
npm run audit:previews           # real-browser preview + gallery audit (Node >= 22.12, Chrome/Edge)
```

PowerShell: pass flags after `--`, for example
`npm run lookup -- btn --json` or `npm run ingest-codepen -- --url=...`.

## What the app does

### Browse

- Gallery-first wall with adaptive cards. Preview profiles publish compact, standard,
  wide and showcase layouts, real aspect ratios and minimum dimensions.
- `/` focuses search; `Esc` clears it or closes the mobile facet drawer.
- Collapsible desktop facets and a mobile drawer. Every checkbox has an explicit
  accessible name and result count.
- Search combines exact id/alias/name signals with prefix, whole-token, substring and
  token-level typo matching. It does not use arbitrary letter-subsequence matching.
- Bulk selection, select-all-visible, compare, expand/collapse and a persistent
  selection tray.
- Favorites, recents, named collections and saved filters. Personal data is joined by
  catalog id and never written back to the canonical catalog.

### Previews

- Every catalog entry carries a validated `previewProfile`: mode, layout, cost, aspect
  ratio, dimensions, runtime requirements, snapshot/loop paths, autoplay permission,
  status and an honest failure reason when relevant.
- Cards run live only for low/medium-cost previews that allow autoplay and are visible.
  Heavy, paused, reduced-motion, off-screen and static cards use published real
  snapshots instead. Expansion lazily loads the full workspace.
- Hovering a card for 350ms opens a larger native-scale preview beside it (700×470 on
  desktop), so compact demos stay legible without leaving the wall. The panel is
  interactive and stays open while you move into it; it dismisses on Escape, outside
  click, page scroll, leaving both surfaces, or its close button. The card's
  enlarged-preview control opens the same panel for keyboard and touch users: focus
  moves into the panel, pointer movement no longer closes it, and Escape or the close
  button returns focus to that control. Below 900×600 the control is hidden and Expand
  remains the route. Low/medium entries
  may run there even when gallery autoplay is off, while pause/reduced-motion/heavy
  gates remain honest. External references get no panel, and Expand remains the full
  workspace for scroll/fullscreen/control-heavy cases.
- Real audit screenshots are published to `public/previews/`; no thumbnail is invented.
- External references render an explicit external state, never a fake stage.
- A global pause control, per-card retry/regeneration affordances, error boundaries and
  explicit unavailable/external/error labels keep fallback content from pretending to
  be successful live content.

### Inspect and collect

- Inspector overlays preserve the gallery route, filters and scroll position.
- Browse filters and overlays are encoded in shareable hashes. Collections, Sources,
  Selected and Table inspectors stay local to their view; only Browse writes
  component/preview hashes.
- Routes include `#/browse`, `#/component/:id`, `#/preview/:id`,
  `#/collections/:id`, `#/sources/:id`, `#/selected`, `#/prompt`,
  `#/browser/:id` and `#/filters` (mobile drawer).
- Favorites, collections, recents, manual tag edits and notes persist locally.

### Sources

- Source coverage is derived from canonical entries plus the checked-in coverage
  records in `taxonomy/sources.json`.
- Counts expose discovered, imported, preview-ready, usable, locked, blocked and
  review-needed states. `discovered` means "tracked by this project", not "the upstream
  library is fully enumerated". Overall totals include built-in entries; review-needed
  sums source-level records and entry-level `tagMeta.reviewNeeded` flags.
- Reference-only sources link to the official channel and never claim a local import.

### Selected for AI

The prompt studio assembles a build prompt from canonical records only: selection order,
license notices verbatim, dependency union, local paths vs official retrieval
instructions, preview limitations, runtime constraints and local annotations. External
entries are constrained to official retrieval channels.

## Catalog at a glance

- Canonical data: `catalog/catalog.json` (schema v3; see `docs/SCHEMA.md`).
- Derived index: `catalog/index.json` (generated; never hand-edit).
- 87 entries: 6 built-in components, 61 vendored React Bits items, 4 Magic UI items and
  16 shadcn/ui items.
- Preview status: **71 ready/live**, **16 external**, **0 unavailable**, **0 error**.
  Costs: 48 low, 16 medium, 23 high. Layouts: 20 compact, 25 standard, 21 wide,
  21 showcase. 23 entries are heavy and workspace-only in the gallery.
- Taxonomies:
  - 6 application appearance themes in `taxonomy/themes.json`
  - 28 structural categories
  - 23 component types
  - 14 animation triggers
  - 46 techniques
  - 22 visual vibes (`taxonomy/aesthetics.json`)
  - 29 technical/appearance attributes
  - 12 interaction behaviors
  - 12 sources with access, license, auth and coverage records
- Two separate theme systems: the six `--rl-*` themes style the app; aesthetic/vibe
  classifications describe cataloged components. They are never conflated in UI copy.

## Components (in-app, themeable demos)

| Component | id | Category | Status |
|---|---|---|---|
| Alert | `alert` | feedback | stable |
| Badge | `badge` | display | stable |
| Button | `button` | buttons | stable |
| Card | `card` | layout | stable |
| TabSheet | `tabs` | navigation | beta |
| TextInput | `text-input` | inputs | stable |

All other entries are catalog data: vendored implementations under
`catalog/components/**` with manifests, or external references with official retrieval
instructions. Vendored third-party code runs only through reviewed showcase wrappers,
never as arbitrary code in the app shell.

## Data sources and licensing

| Source | Access | License | Catalog treatment |
|---|---|---|---|
| shadcn/ui | official registry JSON | MIT | 16 vendored items; official doc-page previews |
| Magic UI | official registry | MIT | 4 vendored items with live previews |
| React Bits | official registry `reactbits.dev/r/{Name}-TS-CSS.json` | MIT + Commons Clause v1.0 | 61 vendored items with attribution; no resale/sub-licensing |
| Uiverse | repo-curated | MIT, per-element attribution | reference/curation only |
| HyperUI | repo-vendored | MIT | reference/curation only |
| Aceternity UI | official docs | custom free license; source redistribution forbidden | reference-only; no vendoring |
| 21st.dev | official registry | varies per component/creator | partial; verify per entry |
| OriginKit | MCP | custom free tier | partial; credentials/MCP access not configured |
| Pryzm | official docs | generator tool; exports belong to the user | reference-only |
| CodePen | official embed/export | varies per author-owned pen | reference-only; saved example waiting on URL/author/license |
| Ditther | effect generator | generator exports belong to the user | reference-only |
| GetLayers | MCP | custom terms; source files/prompts/templates may not be redistributed | reference-only; credentials not configured |

The checked-in truth, including blocked reasons and coverage dates, is
`taxonomy/sources.json`. The app never turns a blocked or unverified source into a
successful import.

### Ingestion commands

All adapters are zero-dependency Node scripts. Dry-run is the default; `--write`
persists and remains idempotent. After any catalog write, run `npm run generate`.

```bash
npm run ingest-shadcn -- --write
npm run ingest-magicui -- --write
npm run ingest-reactbits -- --write
npm run ingest-codepen -- --url=<verified-pen-url> --author=<name> --license=<id> --write
npm run ingest-reference -- --source=getlayers --url=<official-url> --title="<title>" --write
npm run classify -- --check          # classification/preview-profile drift check
npm run capture:previews             # publish real audit snapshots
```

CodePen writes refuse until the author and verified license are supplied. The generic
reference adapter records metadata only and never fetches or copies source files.

## Preview audit

`npm run audit:previews` self-starts Vite, drives installed Chrome/Edge headlessly over
the DevTools protocol, and checks every workspace route plus every gallery card. It
reports mount/runtime errors, failed requests, blank or collapsed stages, clipping,
WebGL/context loss, pointer response and gallery state. Outputs:
`audit/preview-audit.json`, `audit/PREVIEW_AUDIT.md` and per-entry screenshots under
`audit/screenshots/`.

Useful flags: `--only=<id,...>`, `--base-url=http://127.0.0.1:5173`,
`--viewport=390x844`, `--reduced-motion` and `--help`. The audit is not part of
`npm run verify` because it needs a real browser.

## Working vs. future work

Working now, with tests and the release gate: schema-v3 validation and index generation,
lookup with v3 facets, deterministic assisted classification, real preview snapshots,
shadcn/Magic UI/React Bits ingestion, CodePen/reference adapters, gallery discovery,
collections, source coverage, compare, local annotations, prompt generation and the six
themed in-app components.

Explicitly deferred or blocked:

- The saved CodePen Multi-Page View Transition example cannot be ingested until its
  official URL, author and license are supplied.
- OriginKit and GetLayers reference imports require credentials/MCP access that is not
  configured.
- Ditther and Pryzm are reference/effect sources, not React component registries.
- JSON Schema export and a publishing pipeline remain future work.

Nothing in this README is a placeholder claim: unimplemented or blocked work is named
above and in `IMPLEMENTATION_CHECKLIST.md`.
