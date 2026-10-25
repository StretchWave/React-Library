# React Library — agent-first component catalog + themable gallery

An agent-first React component library: a canonical machine-readable catalog, theme
taxonomy, and CLI tooling come first; a React app browses the same data with a
themable component browser, a visual gallery with honest previews, multi-selection,
and a master-prompt generator. Primary spec: `MASTER_SPEC.md` — see below.

Spec: [`MASTER_SPEC.md`](./MASTER_SPEC.md) · Agent guide: [`AGENTS.md`](./AGENTS.md) ·
Progress: [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) ·
Schema: [`docs/SCHEMA.md`](./docs/SCHEMA.md)

## Status

| Area | Status |
|---|---|
| Foundations: catalog schema v2, theme taxonomy, generator, validator, lookup CLI, AGENTS doc | ✅ working (55/55 tooling tests) |
| App skeleton (M1): catalog-driven list + selection + detail empty state | ✅ working (verify gate green; browser-verified) |
| Component browser (M2): search, taxonomy filters, full detail pane | ✅ working |
| Theme engine + six real components + live previews (M3) | ✅ working |
| Advanced interactions (M4): TabSheet arrow keys, copy-usage, hash deep links | ✅ working |
| Catalog ingestion (M5.1–M5.2): schema v2, 9-source registry, 16 shadcn + 4 Magic UI vendored, 7 verified react-bits references | ✅ working — 33 real entries (26 local / 7 external) |
| Gallery + honest previews (M5.3), multi-selection (M5.4), master prompt (M5.5) | ✅ working |
| Animation-first correction (M6): 87 real entries (all local records), 61 React Bits + 4 Magic UI items vendored from the official registries, 71 runnable live previews (65 showcase stages + 6 seeded demos, audit-verified M7), preview workspace `#/preview/<id>` with per-entry controls (lazy-loaded), gallery mini stages with a persisted play/pause toggle, heavy entries gated to the workspace | ✅ working (verify gate green; browser-verified) |
| Visual overhaul (M7): gallery-first landing, preview-first cards, redesigned preview workspace with fullscreen, editable prompt pane, six restored appearance themes | ✅ working (105/105 app tests; DOM-based visual QA — see IMPLEMENTATION_CHECKLIST M7) |
| Minimal gallery + interaction taxonomy (M7.1): three-element cards (preview · name · checkbox), 14–16rem previews in a spacious 1.4rem-gutter grid, 12 `taxonomy/behaviors.json` interaction behaviors classified on all 87 entries with an "Interaction" filter, `--behavior` lookup flag, and behavior-derived preview-stage cues | ✅ working (see IMPLEMENTATION_CHECKLIST M7.1) |

## Browse features

- Catalog-driven component list with search (`/` to focus, `Esc` to clear) and
  category/theme/behavior/aesthetic/source/availability filters, with a resettable empty state.
- Detail pane per component: status chip, description, supported themes, props table,
  aliases, tags, source/demo links, a11y notes — plus v2 provenance (entry type,
  source library + official link, license, retrieval command, runtime dependencies,
  manifest/implementation paths, aesthetics/attributes, interaction behaviors).
- Live preview rendered in the active theme; **Copy usage** puts a ready-to-paste
  snippet on your clipboard.
- Gallery view (the app's default landing view since M7): minimal card grid
  (M7.1) over the same filters — each card is exactly the preview, the component
  name, and a selection checkbox, with honest previews per entry — live mini stages
  for all
  65 showcase-wrapped items plus the 6 seeded demos (auto-play on visibility, manual
  Play fallback), large 224–256px preview frames, and a deliberate poster state for
  the 23 heavy entries (they run only in the preview workspace). The 16 shadcn
  doc-page items show a clearly labeled off-site tile ("Open official preview") —
  inspecting any card opens the in-app `#/preview/<id>` workspace instead of
  navigating away, and the selection checkbox is a sibling of the open action so
  selection never navigates. A persisted **Pause previews** toggle stops every mini stage.
  Ingested third-party code is never executed in the app outside the reviewed
  showcase wrappers (M6.6: the registry loads on demand from a code-split chunk).
- Preview workspace (`#/preview/<id>`, M7 redesign): full-stage live preview for
  every runnable entry with stage background modes (neutral/inverted/grid),
  viewport widths (full/1280/768/375), Replay, Fullscreen, per-entry controls
  verified against the vendored sources (hosted in the information rail), an
  information rail (classification chips incl. interaction behaviors, source,
  license verbatim, retrieval, dependencies, vendored
  paths, related components), the selection toggle, and a behavior-derived
  interaction cue under the stage (e.g. cursor-reactive entries tell you to move the
  pointer across the stage). Non-runnable records show
  an honest kind card with the official link instead of a fake stage.
- Multi-selection (M5.4): card checkboxes, "Select all visible", persistent
  `rl.selection.v1` store (stale ids pruned), reorderable selection tray with
  availability flags; selection survives filters, view switches, and reloads.
- Master prompt (M5.5): `#/prompt` studio assembling the build prompt only from
  canonical records — selection order, license notices verbatim (e.g. react-bits'
  MIT + Commons Clause), dependency union, local paths vs official retrieval, honest
  skips — with one-click clipboard copy.
- Hash deep links: `#/component/<id>`, `#/preview/<id>`, `#/gallery`, `#/prompt`
  cooperate with the browser's back/forward buttons.

## Quickstart

```bash
npm install          # after node_modules exist
npm run validate     # validate catalog + taxonomy (incl. path existence)
npm run generate     # regenerate catalog/index.json (derived — never hand-edit)
npm run lookup -- button          # inspect a component
npm run lookup -- --list          # list everything
npm run lookup -- button --source shadcn --aesthetic minimal   # v2 filtered lookup
npm run lookup -- --list --behavior scroll   # M7.1 interaction-behavior filter
npm test             # zero-dependency tooling suites (node --test)
npm run dev          # React app
npm run verify       # full release gate
```

> PowerShell note: pass CLI args after `--`, e.g. `npm run lookup -- btn --json`.

## Catalog at a glance

- Canonical data: `catalog/catalog.json` (schema v2 — `docs/SCHEMA.md`)
- Derived index: `catalog/index.json` (generated)
- Taxonomy: `taxonomy/themes.json` (6 appearance themes), `taxonomy/categories.json`
  (24 categories), `taxonomy/aesthetics.json` (12 aesthetics), `taxonomy/behaviors.json`
  (12 interaction behaviors — M7.1), `taxonomy/attributes.json`
  (25 attributes), `taxonomy/sources.json` (9 researched sources + access/licensing facts)
- Entries (87 total — 87 local / 0 external, M6.6-audited): the six in-app components,
  61 vendored React Bits items and 4 Magic UI items (all live through showcases), and
  16 shadcn doc-page items under `catalog/components/{shadcn,magic-ui,react-bits}/`.
- The two theme systems are separate: the six `--rl-*` themes style this app;
  `taxonomy/aesthetics.json` classifies the visual style of cataloged components and
  `taxonomy/behaviors.json` classifies what user input drives their animation — a
  cursor effect can be cursor-reactive and cyberpunk at once.

## Components (in-app, themeable demos)

| Component | id | Category | Status |
|---|---|---|---|
| Alert | `alert` | feedback | stable |
| Badge | `badge` | display | stable |
| Button | `button` | buttons | stable |
| Card | `card` | layout | stable |
| TabSheet | `tabs` | navigation | beta |
| TextInput | `text-input` | inputs | stable |

All other entries are catalog data only: vendored implementations
(`catalog/components/**` + `component.json` manifests, never rendered by the app
bundle) or external references (official retrieval commands only).

## Data sources & licensing

| Source | Access | License | Catalog treatment |
|---|---|---|---|
| shadcn/ui | official registry JSON + CLI | MIT | vendored (16 items) |
| Magic UI | official shadcn-compatible registry | MIT | vendored (4 items) |
| React Bits | official registry `reactbits.dev/r/{name}.json` | MIT + Commons Clause v1.0 | **reference-only** (7 entries) (no redistribution of the component source) |
| Aceternity, Pryzm, 21st.dev, Originkit, Uiverse, HyperUI | see `taxonomy/sources.json` | mixed | researched; not yet ingested (checklist §6) |

Research facts (verified 2026-10-24, with live URL evidence) live in
`taxonomy/sources.json`; adapters: `npm run ingest-shadcn -- --write`,
`npm run ingest-magicui -- --write` (dry-run default, idempotent).

## Working features vs. future work

- **Working now (all gated by `npm run verify`):** canonical catalog schema v2 +
  validation (incl. external-ref rules and path existence), index generation,
  lookup CLI (text/JSON/list/filters/exit-code contract), ingestion adapters,
  55 zero-dependency tooling tests; React app: browser + gallery views over shared
  filters, detail pane, theme engine (6 themes, persisted, auto), six themed
  components with demos, live previews, copy-usage snippet, TabSheet arrow-key
  navigation, deep links, multi-selection tray, master-prompt studio — plus 93 app
  tests. Nothing here is faked; every ✅ above has recorded evidence.
- **Future work (explicitly deferred, see checklist §6):** JSON Schema export,
  multi-theme preview grid, further source ingestion (Uiverse/HyperUI etc.),
  publishing pipeline.
