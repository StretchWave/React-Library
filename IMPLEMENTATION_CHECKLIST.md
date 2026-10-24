# IMPLEMENTATION_CHECKLIST.md — living progress tracker

Status legend: **[x] done (verified)** · **[~] partial** · **[ ] pending** ·
**[P]** placeholder (reason required). Evidence = command/test output noted inline.

## 0) Snapshot

| Area | Status | Evidence |
|---|---|---|
| Foundations (schema, taxonomy, tooling, docs) | ✅ done | `node --test tests/*.test.mjs` → 29/29 pass; `validate` OK (6/6/6); `generate` writes index; `lookup` text+JSON verified |
| M1 App skeleton | ✅ done | `npm run verify` full chain green (29 tooling + 5 app tests, typecheck, vite build); dev-server smoke test + screenshots |
| M2 Component browser | ✅ done | 20/20 app tests + 32/32 node tests; dev-server walkthrough: search → "1 of 6 components" → TextInput detail fully rendered (screenshot) |
| M3 Theme engine + previews + components | ✅ done | verify full-chain green **without --skip-links** (32/32 node, 50/50 app, typecheck, build); browser-verified: Midnight Glass scope restyles app + chat-free preview (screenshot) |
| M4 Advanced interactions | ✅ done | verify full-chain green **flagless** (32/32 node, 54/54 app, typecheck, build); browser-verified: `#/component/tabs` deep link, copy-usage "Copied ✓" feedback, TabSheet ←/→/Home/End roving focus + selection-follows-focus (screenshot) |
| M5 Real ingestion + gallery + selection + master prompt | ✅ complete — schema v2; catalog 33 real entries (26 local / 7 external); gallery + honest previews; multi-selection tray; master-prompt studio (`#/prompt`); browser smoke verified; README/AGENTS docs current | verify green: 55/55 node (+9 prompt), 93/93 app, typecheck, build (320.16 kB js); react-bits/aceternity/pryzm → reference-only per license research |

Placeholders: none. (TabSheet arrow-key navigation shipped in M4 — catalog `a11yNotes`
and description updated at v0.3.0; `--skip-links` was removed at M3.)

## Decisions log

- 2026-10-24 — Repo was empty; `MASTER_SPEC.md` absent → drafted v1.0 per user approval
  ("Draft spec, then build"); all subsequent work follows it.
- 2026-10-24 — Tabs component ships as `TabSheet` (id `tabs`) with WAI-ARIA tabs
  pattern; arrow-key roving focus scheduled M4.
- 2026-10-24 — Link existence checks live behind `--skip-links` until M3 files land;
  `npm run verify` then drops the flag.
- 2026-10-24 — npm peer auto-install placed react/react-dom under `dependencies` and the
  toolchain under `devDependencies` (matches §12).
- 2026-10-24 — Accessible entry names: a space text node separates name/status inside
  each entry button (found via RTL test: spans concatenated to "Alertstable").
- 2026-10-24 — Status chip colors will live in `src/styles/status.css` (app-level,
  theme-independent on purpose): status colors convey release semantics, not theme
  personality. `tests/css-theming.test.mjs` (M2) scans `src/components/**` only.
- 2026-10-24 — M4's "filters empty state + reset" is pulled into M2 (smaller, tested
  earlier); M4 keeps deep links, tabs keyboard nav, and copy-snippet.
- 2026-10-24 — Status tokens carry two vocabularies in `src/styles/status.css`:
  release chips (`stable|beta|experimental|deprecated`) and component tones
  (`success|warning|danger`) for Badge/Alert so meaning stays constant across themes.
- 2026-10-24 — M3 shipped: theme engine + 6 components + demos + live preview;
  `npm run verify` is now fully flagless (link checks enforced everywhere).
- 2026-10-24 — M4 shipped: TabSheet arrow-key navigation (roving tabindex,
  selection-follows-focus, Home/End, Arrow keys wrap at both ends), copy-usage snippet
  with clipboard fallback + "Copied ✓" feedback, hash deep links `#/component/<id>`
  synced with `hashchange` (back/forward safe). Catalog `tabs` bumped to v0.3.0.
- 2026-10-24 — `@testing-library/dom` appears as a direct devDependency because it is a
  mandatory peer of `@testing-library/react` v16 (npm auto-installed it); spec §12
  amended accordingly. Otherwise the dependency set matches §12 exactly.
- 2026-10-24 — **M5.1 schema v2 shipped** (all new fields optional; the six original
  entries stay valid untouched): `entryType local|external`, `source`, `sourceUrl`,
  `externalId`, `retrieval`, `preview`, `localDir`, `manifest`, `implementation`,
  `dependencies`, `license`, `aesthetics`, `attributes`, `syncedAt`; new taxonomies
  aesthetics/attributes/sources; 16 new categories (22 total); lookup CLI gained
  `--aesthetic/--source/--type` (exit-2 contract preserved); no new dependencies.
- 2026-10-24 — **Source licensing decisions (M5.1 research, verified 2026-10-24):**
  react-bits is **MIT + Commons Clause v1.0** (raw LICENSE.md fetched): free to use in
  applications, but redistributing the components themselves is forbidden →
  **reference-only** (metadata + official retrieval; no vendored code). Aceternity's
  own license bars source redistribution → **reference-only**. shadcn/ui (MIT;
  registry JSON verified live), Magic UI (MIT; shadcn-registry compatible), Uiverse
  (MIT; community attribution respected), HyperUI (MIT; repo-retrieval, no API) →
  **available** for hand-curated local vendoring. 21st.dev and Originkit →
  **partial** (per-creator/per-component license verification required). Pryzm →
  **reference-only** (generator studio; gallery is a remix reference, not a code
  registry). All recorded in `taxonomy/sources.json`.
- 2026-10-24 — The two theme systems stay strictly separate: application appearance
  themes (6, `--rl-*` tokens, unchanged) vs component aesthetic classifications
  (`taxonomy/aesthetics.json`, new). UI copy must not conflate them.

## 1) Foundations — agent-first base (milestone complete ✅)

- [x] Draft `MASTER_SPEC.md` (mission, schema v1, theme/category taxonomies, tooling
      contracts, milestone AC, gates, dependency policy, placeholder policy)
- [x] `docs/SCHEMA.md` — detailed schema reference + change history
- [x] `taxonomy/themes.json` — 6 themes × 9 canonical tokens (+optionals)
- [x] `taxonomy/categories.json` — 6 canonical categories
- [x] `catalog/catalog.json` — canonical seed: alert, badge, button, card, tabs, text-input
- [x] `scripts/lib/catalog.mjs` — shared load/validate/search/build-index/format
- [x] `scripts/validate-catalog.mjs` — validator CLI (`--check-index`, `--skip-links`)
- [x] `scripts/generate-index.mjs` — index generator (validates first)
- [x] `scripts/lookup.mjs` — lookup CLI (text/JSON/list + filters + exit contract)
- [x] `tests/catalog-lib.test.mjs` + `tests/cli.test.mjs` — 29 zero-dep node tests
- [x] `AGENTS.md` — agent operating contract (commands, add-component checklist, rules)
- [x] `README.md`, `package.json`, `.gitignore`
- Evidence: `npm test` → 29 pass / 0 fail; `npm run validate -- --skip-links` → valid;
  `npm run generate -- --skip-links` → wrote index (6/6/6); `npm run lookup -- button`
  + `npm run lookup -- btn --json` → correct output; filter & exit-code checks green.

## 2) M1 — App skeleton (MVP) ✅

- [x] Install app toolchain: react, react-dom (runtime); vite, @vitejs/plugin-react,
      typescript, @types/*, vitest, jsdom, @testing-library/react (dev)
- [x] Add app scripts to `package.json` + `npm run verify` chain (§11 spec)
- [x] Scaffold: `index.html`, `vite.config.ts`, `tsconfig.json`(+node tsconfig),
      `src/main.tsx`, `src/App.tsx`, `src/styles/{base,app}.css`
- [x] Catalog client: `src/catalog/types.ts`, `src/catalog/client.ts` (imports
      `catalog/index.json` + taxonomy with typed accessors)
- [x] UI: header w/ catalog count, entry list, detail empty-state placeholder
- [x] Vitest: render all entry names + click-select updates detail pane
      (`src/App.test.tsx` — 5 tests)
- [x] `npm run verify` green (validate --check-index --skip-links → generate → node
      tests → vitest → typecheck → build)
- [x] Dev-server smoke test in a real browser: entry list renders, selection works
      (screenshots in session; accessible names verified via a11y snapshot)

M1 evidence recap: `npm run verify` → catalog valid (6/6/6, index up to date) ·
`node --test` 29/29 · vitest 5/5 · `tsc --noEmit` clean · `vite build` ✓ (231 kB js).

## 3) M2 — Component browser ✅

- [x] Pure search module `src/lib/search.ts` (parity with scripts/lib) + unit tests
      (`src/lib/search.test.ts` — ranking/filters/active-filters, incl. corrected
      "label" expectation: exact alias badge outranks text-input summary match)
- [x] Text search input wired; `/` focus + `Esc` clear shortcuts (tested)
- [x] Category filter + theme filter driven by taxonomy data (`FilterBar`)
- [x] Detail pane: summary, status badge (color-coded via `--rl-status-*`), description,
      themes, props table, tags, aliases, links, a11y notes (`DetailPane`)
- [x] A11y baseline: labeled controls, chips carry accessible names,
      focus-visible via `--rl-focus`
- [x] Filter empty state with "Reset filters" pulled forward from M4 (tested)
- [x] `tests/css-theming.test.mjs`: guard against raw color literals outside
      `var(--rl-*, fallback)` in src/components css (3 tests; 32/32 node tests)
- [x] Component-render tests (App 5 + browser groups 6 + FilterBar 2 + DetailPane 2 +
      search 5); `npm run verify` green (32/32 node, 20/20 app, typecheck, build)

M2 evidence: browser walkthrough — search "text" → "1 of 6 components" → TextInput
detail shows chip/meta/themes/props table (screenshot recorded).

## 4) M3 — Theme engine + live previews + component suite ✅

- [x] ThemeProvider reads taxonomy themes (not hardcoded) and applies the token map to a
      `[data-theme]` scoped container; app chrome + components consume `--rl-*`
      (`src/theme/ThemeProvider.tsx`, `.theme-scope` paint in base.css)
- [x] Theme switcher: labeled select (Auto + 6 themes) + prev/next cycle buttons
      (`src/theme/ThemePicker.tsx`)
- [x] Persistence: `localStorage["rl.theme"]`; `auto` follows `prefers-color-scheme`;
      invalid stored ids fall back to auto (tests cover bootstrap + failure)
- [x] All six themes apply (validator enforces the 9 canonical tokens per theme)
- [x] Component suite implemented (Alert, Badge, Button, Card, TabSheet, TextInput)
      with demos; catalog `links.source`/`links.demo` files exist → **verify runs
      without `--skip-links` now** (package.json + AGENTS updated)
- [x] Component CSS token-only: `tests/css-theming.test.mjs` extended concept holds —
      new component css uses `--rl-*` + `--rl-status-*` only; guard stays green
- [x] Live preview pane renders the selected demo inside the themed scope
      (`PreviewPanel` + `src/catalog/demos.ts`; test: preview swaps per selection)
- [x] `npm run verify` green (flagless): validate+check-index → generate → 32/32 node
      → 50/50 app → typecheck → build; browser screenshots (Midnight Glass showcase)

M3 semantic decision: status.css carries two vocabularies — release chips
(stable/beta/experimental/deprecated) and component tones (success/warning/danger, used
by Badge/Alert). Documented in AGENTS + status.css header.

## 5) M4 — Advanced interactions & hardening ✅

- [x] TabSheet arrow-key navigation + roving tabindex (closes the scheduled M4 item) —
      ArrowRight/ArrowLeft wrap at both ends, Home/End jump; selection follows focus;
      catalog `tabs` bumped to **v0.3.0** with updated description + `a11yNotes`
      (`TabSheet.tsx` + tests; index regenerated via `npm run generate`)
- [x] Copy-usage-snippet button — `src/lib/clipboard.ts` (async clipboard API with a
      hidden-textarea `execCommand("copy")` fallback for non-secure contexts/jsdom);
      button announces "Copied ✓"; tested with a mocked clipboard in
      `PreviewPanel.test.tsx`
- [x] Hash deep links `#/component/<id>` — App syncs selection ↔ `location.hash`,
      listens to `hashchange` (back/forward safe); jsdom's async hashchange handled via
      `waitFor` in tests (`App.test.tsx`, 2 dedicated tests)
- [x] Filter empty state with reset action — shipped early in M2 (tested there)
- [x] README/checklist/AGENTS/spec final sweep to match reality; future-work list
      refreshed (M4 features documented, status tables flipped, docs consistent)
- [x] Final `npm run verify` (full flagless gate) recorded as release evidence

M4 evidence recap: `npm run verify` → catalog valid (6/6/6, index up to date) ·
`node --test` 32/32 · vitest 54/54 · `tsc --noEmit` clean · `vite build` ✓
(248.72 kB js / 12.29 kB css). Browser walkthrough on `#/component/tabs`: deep link
restored TabSheet selection; Copy usage → "Copied ✓"; ArrowRight → Accessibility panel,
End → API, Home → Overview, ArrowLeft from first wraps to API — all while rendered in
Midnight Glass (screenshot recorded).

## 5.5) M5 — Real component ingestion, visual preview gallery, multi-selection, master prompt generation 🚧

Staged per MASTER_SPEC §10 M5. Sources researched & documented in
`taxonomy/sources.json` (evaluatedAt 2026-10-24).

### M5.1 — Schema and source research ✅
- [x] Repository + spec inspected; baseline `npm run verify` green at `1623f89`
- [x] Catalog schema v2: local/external entry model + optional
      aesthetic/preview/license/provenance fields (validator-enforced; external
      entries cannot declare local paths)
- [x] `taxonomy/aesthetics.json` — 12 aesthetic classifications (stable ids, friendly labels)
- [x] `taxonomy/attributes.json` — grouped independent attributes (appearance/motion/tech, 21 ids)
- [x] `taxonomy/sources.json` — 9 sources with verified access method, status,
      license, auth + limits (shadcn registry JSON fetched live; react-bits LICENSE.md
      fetched raw; others checked against official pages/repos)
- [x] `taxonomy/categories.json` extended with 16 granular categories (22 total)
- [x] Index v2 (`counts.byEntryType`/`bySource`, taxonomy listings); lookup filters
      `--aesthetic/--source/--type`; `formatEntryText` shows provenance
- [x] App-side mirror (types/client/search) kept in parity
- [x] Node tests 47/47 (+15 new); app tests 54/54; full `npm run verify` green
- Evidence: `npm run verify` output recorded below; index regenerated
  (6 entries, 22 categories, 12 aesthetics, 9 sources).

### M5.2 — Real catalog ingestion ✅
- [x] Ingestion adapters (zero-dependency, official channels only):
      `scripts/ingest-shadcn.mjs` + `scripts/ingest-magicui.mjs` over
      `scripts/lib/ingest.mjs` (fetch → vendor files → `component.json` manifest →
      sorted-id merge into `catalog/catalog.json`, never overwriting)
- [x] 16 shadcn/ui items vendored from the official registry
      (`ui.shadcn.com/r/styles/new-york-v4/*.json`, verified live): button, badge,
      card, alert, input, switch, accordion, tabs, dialog, tooltip, skeleton,
      progress, avatar, breadcrumb, dropdown-menu, table
- [x] 4 Magic UI items vendored (`magicui.design/r/*.json`, verified live):
      dot-pattern, word-rotate, blur-fade, border-beam — dependency detection from
      the vendored file body (motion, cn)
- [x] 7 react-bits reference-only entries (registry slugs verified 200 live:
      SplitText, Ballpit, FluidGlass, MetallicPaint, CircularGallery, LaserFlow,
      Ribbons; one dead slug GooeyText-404 honestly skipped) — Commons-Clause-aware
      license notes, no fabricated local paths
- [x] Catalog grew 6 → **33 real entries (26 local / 7 external)**; full validate
      with existence checks passes; index regenerated (`counts.bySource`:
      shadcn 16, magic-ui 4, react-bits 7)
- [x] +9 tooling tests (ingest composition/merge/provenance); app-side parity
      tests updated to the populated-catalog reality
- [ ] UI reporting of counts → M5.3 (gallery)

### M5.3 — Gallery and visual previews ✅
- [x] `src/components/gallery/` — Gallery (card grid over the shared filters),
      GalleryCard (name/status/type/source/license chips + aesthetic & attribute
      chips + Details), PreviewBox (`local-demo | external | source-link |
      static | none` honest modes; `previewKind()` resolver)
- [x] Honest previews: seeded six render the vetted demo registry live; the 20
      Tailwind-based vendored items link to their official doc pages
      ("Open official preview"); the 7 Commons-Clause-bound react-bits items
      show "View at source" — zero fabricated embeds, no ingested code executed
      in the app bundle (previews come only from `src/catalog/demos.ts` records
      or record-verified URLs)
- [x] M5 filters added to FilterBar (aesthetic / source library / catalog
      availability) and wired through the app-side search mirror
- [x] DetailPane v2 provenance: catalog type, source library + link, license,
      retrieval instructions, runtime dependencies (with reasons), manifest +
      implementation paths, aesthetic/attribute chips, preview link
- [x] `#/gallery` deep link; filters/shared view state persists across the
      Browser ⇄ Gallery switch
- [x] gallery.css is `--rl-*` token-only (css-theming guard passes)
- [x] Tests: +3 App gallery tests (honest kinds; source filtering; deep link +
      filter persistence), FilterBar option assertions updated; verify gate green
      (55/55 node, 59/59 app, typecheck, build)
- Note: "unavailable" preview fallback path is covered by PreviewBox's `none`
  branch (note renderer); no current entries use it since every record carries a
  verified link — exercised via unit tests in M5.6.

### M5.4 — Multi-selection ✅
- [x] `src/lib/selection.ts` pure store: stable-id lists, toggle / append-order
      add / up-down reorder (`moveById`), persistence helpers that prune
      unknown + duplicate ids from stale payloads
      (`rl.selection.v1` localStorage key)
- [x] GalleryCard selection checkboxes ("Select <name> for the master prompt")
      with an `is-selected` outline that never hides the preview; selection
      survives filters, sorting, view switches, and reloads
- [x] "Select all visible results" toolbar control (respects the active
      filters) + "Clear all"; header chip shows `local/external/selected` counts
- [x] `SelectionTray`: reviews every selected entry in one place regardless of
      filters — reusable remove control, ↑/↓ reorder, per-item status/type
      chips, and honest availability flags computed from the record
      (`availabilityNotes`: missing retrieval, missing local extension point,
      unavailable preview) raised BEFORE prompt generation
- [x] Selection toggle also available in the browser detail pane
- [x] "Generate master prompt" navigates to `#/prompt` (studio ships in M5.5;
      the interim placeholder honestly reports the stored selection count)
- [x] Tests: +5 selection-store unit tests, +6 tray tests, +7 App integration
      tests (toggle, select-all-visible under filters, persistence + pruning,
      tray reorder/remove, detail toggle, prompt navigation, empty-selection
      honesty); verify gate green (55/55 node, 78/78 app, typecheck, build)

### M5.5 — Master prompt generation ✅
- [x] `src/lib/prompt.ts` — deterministic pure builder (`buildMasterPrompt`):
      standing rules for the consuming agent, license notices pulled verbatim
      from records (Commons Clause text travels with react-bits items),
      aggregated `— needed by` dependency rows (deduplicated across the
      selection), per-entry sections in USER-DEFINED SELECTION ORDER with
      local ⇄ external distinction (repo paths + manifest for local; official
      retrieval + official page only for external), honest skip notes for ids
      missing from the catalog, `npm run lookup -- <id> --json` verification line
- [x] `src/components/prompt/PromptStudio.tsx` — `#/prompt` view: prominent
      "Copy master prompt to clipboard" (disables at 0 selected), readable
      pre-formatted prompt (`aria-label="Generated master prompt"`), selection
      count status line, readiness warnings surfaced above the text, honest
      empty state, "Back to selection"
- [x] Prompt reflects the live selection at all times (recomputed from the
      selection store, survives view switches); nothing is fabricated — every
      fact is record-derived (verified by 9 unit tests against the real catalog)
- [x] PreviewPanel usage snippet now derives valid identifiers for sourced
      names and falls back to recorded implementation paths for vendored
      entries (tested)
- [x] App tests: end-to-end studio test (select react-bits entry → generate →
      retrieval command + Commons Clause present), empty-selection honesty,
      navigation round-trip; verify gate green (55/55 node, 93/93 app,
      typecheck, build 320.16 kB js)

### M5.6 — Validation and release ✅
- [x] Gate: `npm run verify` flagless green — 55/55 node tooling tests,
      93/93 app tests, typecheck, production build (320 kB js / 87 kB gzip)
- [x] Browser-verified on the dev build (Chromium, localhost:5174):
      gallery renders all 33 cards with honest preview kinds; checkbox
      selection updates the tray + header counts; `rl.selection.v1` storage
      matches the tray content; reorder edge-controls disable at the ends;
      "Generate master prompt" opens `#/prompt` with selection order preserved;
      the generated prompt carries the official retrieval line, the react-bits
      Commons Clause notice, official page URL, vendored local paths, and the
      deduplicated `— needed by` dependency row; copy button reports `Copied ✓`
      (clipboard write verified); gallery restyles live under the
      retro-terminal theme; console clean (no warnings/errors)
- [x] README rewritten for M5: status table, browse features (gallery +
      selection + prompt), catalog-at-a-glance (33 entries, schema v2, the two
      theme systems), in-app components vs catalog-only data, sources &
      licensing table, ingestion commands
- [x] `package.json` gains `ingest-shadcn` / `ingest-magicui` script aliases
      (documented in AGENTS.md command table; no new dependencies)
- [x] Back-navigation hash coherence: "Back to selection" now returns to
      `#/gallery` instead of leaving `#/prompt` in the URL

## 6) Future work (explicitly not now)

- Catalog JSON Schema file for cross-tool validation
- Multi-theme preview grid (all six themes side by side)
- Extended catalog fields (visual example image, example usage snippets per theme)
- Publishing pipeline / versioned releases
