# IMPLEMENTATION_CHECKLIST.md — living progress tracker

Status legend: **[x] done (verified)** · **[~] partial** · **[ ] pending** ·
**[P]** placeholder (reason required). Evidence = command/test output noted inline.

## 0) Snapshot

Current state (2026-10-30):

| Area | Status | Evidence |
|---|---|---|
| Foundations + schema v3 | ✅ done | 87 catalog entries validate; generated index schemaVersion 3; lookup text/JSON v3 facets verified |
| Discovery app (M9) | ✅ done | Browse/Collections/Sources/Selected/Table views; AND/OR facets; shareable hashes; favorites, collections, recents, saved filters, compare and annotations |
| Honest previews | ✅ done | 71 ready/live entries with real snapshots, 16 external, 0 unavailable/error; 23 heavy, 18 autoplay-eligible; gallery cards gate live previews and expansion is lazy |
| Source coverage | ✅ done | 12 documented sources; derived counts 88 discovered / 87 imported / 71 preview-ready / 87 usable / 1 locked / 7 blocked / 25 review-needed |
| App tests | ✅ done | 139/139 Vitest tests across 24 files (latest run; includes routing, personal persistence, source coverage, preview decisions, hover previews and discovery integration) |
| Tooling tests | ✅ done | `npm test`: **94/94** pass; includes catalog v3 validation, search AND/OR parity, ingest adapters, classification idempotency and CLI contracts |
| M8 Preview audit + repair | ✅ done | `npm run audit:previews`: 87/87 workspace routes + 87 gallery cards, 0 requires-repair, 0 gallery problems; WebGL, pointer, reduced-motion and 390x844 resize probes |
| Release gate | ✅ done | `npm run verify` green: validate --check-index, generate, **94/94** node tests, **139/139** app tests, typecheck, production build |

Blocked, not placeholders: the saved CodePen Multi-Page View Transition example still
needs an official URL, author and verified license; OriginKit/GetLayers reference imports
need credentials/MCP access. Ditther/Pryzm are reference/effect sources, not React
component registries.

Placeholders: **none**. (TabSheet arrow-key navigation shipped in M4; `--skip-links`
was removed at M3.)

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
- 2026-10-25 — **M6.6 correction recorded (audit-verified):** the "Catalog truth"
  line below this log was written before the M6.6 webgl flip landed. Verified
  actual state: **87 entries, all local records** (shadcn 16 · magic-ui 4 ·
  react-bits 61 · seeded 6). Preview kinds: **65 `local-demo`** (61 react-bits +
  4 Magic UI — including the 21 raw-WebGL variants flipped from `source-link`) +
  6 seeded entries that resolve their previews through the vetted demo registry,
  **16 `external`** official doc pages (~30 live card previews + 16 workspace
  stages; 23 heavy entries poster-state in the gallery). The stale numbers here
  and in the M6.3 entry are corrected in place below.
- 2026-10-25 — **M7 shipped (visual overhaul):** gallery-first default landing,
  preview-first gallery cards (13.5–15rem frames, overlaid selection, in-app
  Preview action replacing card click-through), redesigned preview workspace
  (stage-first canvas `min-height: clamp(420px, 62vh, 720px)`, toolbar with
  Fullscreen, controls hosted in the info rail), prompt studio polish (wrapping
  pane, edit/restore, optional target-project line via `PromptOptions`
  — no new dependencies), shell redesign (identity header, segmented nav,
  single-column main with browser-only two-column opt-in), lazy-preview error
  boundary with retry. Verified: 105/105 app tests, node tests green, typecheck
  green, build main 435.48 kB / 101.51 kB gzip (baseline 431.63 kB / 100.61 —
  +3.9 kB from shell/gallery chrome; showcase chunk unchanged 1,740.88 kB and
  still lazy; workspace chunk 11.28 kB), `npm run verify` green. Browser visual
  QA (see M7 section below) used the accessibility tree and computed-style
  checks; pixel captures were blocked because the desktop client window was not
  drawn during the session.
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
- 2026-10-25 — **M7.1 behavior classification design:** behaviors ship as a
  taxonomy/behaviors.json *behavior* system (entry `behaviors` arrays), not as a
  new category — categories classify what a component is, behaviors classify what
  its animation responds to; the two must not compete. `auto`/`static` are kept as
  first-class ids so the filter can exclude them explicitly. All behavior ids
  validate against the taxonomy (validator hole closed this milestone); every entry
  carries at least one behavior. Behavior labels drive the preview stage's
  interaction cue — the cue describes verified input only (no invented interactions).

- 2026-10-29 — **M9 schema-v3 discovery decisions:** schema v3 requires `types`,
  `triggers`, `techniques`, `tagMeta` and `previewProfile`. `category` remains the
  structural bucket; `types` answers "what is it", `triggers` "what starts the motion",
  `techniques` "how it moves", `behaviors` "what input drives it", `aesthetics` "visual
  vibe" and `attributes` independent appearance/motion/tech traits. Search is AND across
  dimensions, OR within one. The classifier records source-provided vs inferred
  provenance and never claims behavior without evidence.
- 2026-10-30 — **Preview capture regression fixed:** theme tokens were only applied to
  the inner `.theme-scope`, so overlays portaled to `document.body` (expanded preview,
  inspector, compare) resolved `--rl-*` to nothing and painted transparent. The audit
  then photographed the browse page through the open dialog and those recursive images
  were published as component snapshots. Tokens now apply on `<html>`, and the stage
  canvas keeps an opaque `--rl-surface` base (with `--rl-surface-alt` layered over it)
  so translucent glass themes cannot leak app chrome into captures.
- 2026-10-30 — **Preview legibility (user feedback):** card previews stay compact, but
  a 350ms hover on a hover-capable pointer opens an interactive 700×470 panel beside
  the card and runs the entry at native scale. `preferredPreviewKind`/`canShowLive`
  gain a deliberate `forceLive` option so low/medium local demos can run even when
  gallery autoplay is off; pause, reduced-motion, visibility, high-cost and heavy
  gates still apply. Heavy entries show the real snapshot, external/unavailable ones
  get no panel, and the panel stays open while the pointer is inside it or the card.
  Escape, outside click, page scroll, leaving both surfaces, or the close button
  dismiss it; Expand remains the full workspace for scroll/fullscreen and control-heavy
  cases. New tests: HoverPreview (7) and preview gating (1); full `npm run verify`
  green (94/94 node, 136/136 app, typecheck, build).
- 2026-10-31 — **Keyboard/touch access to the enlarged preview:** each gallery card
  gains an enlarged-preview control (`aria-expanded`/`aria-controls`). It pins the
  panel, moves focus into the `role="region"` preview, ignores pointer movement, and
  returns focus to the control on Escape or close-button dismissal. Expand keeps its
  own unchanged action. The control is hidden below 900×600, where the panel cannot
  fit and Expand remains the route. New GalleryCard tests (2) plus the pinned
  HoverPreview case (1); full `npm run verify` green (94/94 node, 139/139 app,
  typecheck, build).
- 2026-10-30 — **Selection tray compacted (user feedback):** the empty tray no longer
  renders at all, and a non-empty selection collapses to a small sticky dock with the
  count, Generate and Clear. The ordered list, reorder/remove controls and availability
  notes stay behind an expandable chevron, so the M5.4 review workflow is preserved
  without covering the gallery. Focused tests: `SelectionTray` (7) + `App` (18) green;
  typecheck green.
- 2026-10-29 — **Preview honesty decision:** every ready local preview publishes a real
  audit snapshot even when the card may run live. Cards run only low/medium-cost
  autoplay previews that are visible and not paused/reduced-motion; heavy, off-screen,
  paused and static cards use snapshots. External records stay external. Expanded
  workspaces are lazy-loaded. No fallback is presented as successful live content.
- 2026-10-29 — **Personal-data boundary:** favorites, collections, recents, saved
  filters, manual tags and notes live in localStorage and are joined by catalog id.
  They are never duplicated into canonical entries. Browse writes filter/overlay state
  to the hash; inspectors from Collections/Sources/Selected/Table remain local to those
  views.
- 2026-10-29 — **Reference-ingestion boundary:** CodePen writes require an official pen
  URL, author and verified license, and record the official embed URL only. The generic
  reference adapter records metadata/official retrieval only and rejects dedicated
  registries. OriginKit/GetLayers remain blocked without credentials/MCP; Ditther/Pryzm
  remain reference/effect sources, not component registries.
- 2026-10-29 — **Source coverage semantics:** `discovered` means "tracked by this
  project", not complete upstream enumeration. Imported/preview-ready counts derive from
  entries; locked/blocked/review-needed remain explicit so the UI cannot turn a blocked
  source into a successful import.

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

- [x] ThemeProvider reads taxonomy themes (not hardcoded) and applies the token map to
      the document's `[data-theme]` scope (`<html>`), so app chrome, previews and body
      portals all consume `--rl-*`; `.theme-scope` supplies the paint
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

## 5.8) M6 — Correction: animation-first discovery (user redirection) 🚧

Goal (user brief): turn React Library into an animation-first discovery tool for
genuinely interesting animated/interactive React components — real source ingestion,
a dedicated preview workspace, a visual gallery, preserved multi-selection and the
master prompt — with honest handling of what can and cannot run in this app.

### M6.1 — Animation-first ingestion ✅ (2026-10-24)

- [x] Verified every curated React Bits registry item LIVE before vendoring
      (`https://reactbits.dev/r/{Name}-TS-CSS.json`, official shadcn-compatible
      registry; batch verification — 61/61 resolved, 0 fabricated, 0 skipped)
- [x] `scripts/ingest-reactbits.mjs` (+ pure helpers in `scripts/lib/ingest.mjs`):
      fetch → verify shape → vendor `TS-CSS` variant (plain CSS, no Tailwind) →
      manifest → compose entry with runtime detection; `--write` / dry-run /
      `--only=` flags; idempotent re-runs replace same-source entries
- [x] Vendored `catalog/components/react-bits/<slug>/` for all 61 items
      (57 curated + Lanyard, DomeGallery, Hyperspeed, Iridescence which publish
      TS-CSS variants too); entries sorted; `catalog/index.json` regenerated
- [x] Runtime classification is evidence-based: `gsap` 7 · `motion` 6 · `dom` 26 ·
      `physics` (matter-js) 1 · `webgl` 21 (raw WebGL2/vanilla shader code in the
      official CSS variants — react-bits rewrote them dependency-free). WebGL
      vendored for agent delivery but preview stays `source-link` (never
      advertised as live); `AnimatedList` opted out of live preview (needs the
      heavy icon packages we do not bundle) via `overrides.live=false`
- [x] License policy corrected with the source record: react-bits is MIT +
      Commons Clause v1.0 — application use is permitted, sale/sub-licensing of
      the source is not; vendoring for catalog previews + agent delivery is in
      scope with attribution. `taxonomy/sources.json` react-bits updated to
      `available` with the no-resale limit recorded verbatim
- [x] Taxonomy growth: categories `motion` + `micro-interactions` (24 total);
      attributes `gsap`, `motion`, `canvas`, `ogl` (25 total)
- [x] Schema: `runtime` + `heavy` entry fields (validator enum + docs)
- [x] MASTER_SPEC §12 amendment (gsap, @gsap/react, motion, matter-js) +
      M6 milestone + changelog v1.3; AGENTS.md dependency rule + command table
- [x] package.json: `ingest-reactbits` alias; new runtime deps installed after
      the amendment: gsap 3.15, @gsap/react 2.1.2, motion 14.6, matter-js 0.20
- [x] Tests: 10 new node tooling tests for the react-bits helpers (anchored
      import scanning, runtime classification, entry/manifest composition,
      replaceEntry upsert semantics, 404 handling) — 64/64 green; app tests
      updated to the 87-entry reality — 94/94 green; typecheck + build green
- Catalog truth: **87 entries, all local** (per-source: shadcn 16 · magic-ui 4 ·
  react-bits 61 · seeded 6). Preview kinds: 45 `local-demo` (6 seeded demos +
  39 runtime-live react-bits) · 21 `source-link` (react-bits raw-WebGL variants) ·
  21 official link cards (16 shadcn + 4 magic-ui docs + AnimatedList opt-out)

### M6.2–M6.4 — Preview workspace, showcases, gallery motion ✅ (2026-10-24)

- [x] Showcase contract: `src/catalog/showcases/types.tsx` (`Showcase`,
      `ShowcaseControl`, `defineShowcase` — scalar-only defaults/targets) +
      `helpers.tsx` (self-contained SVG data-URI placeholders, `CenteredStage`)
- [x] 40 reviewed wrappers across `text.tsx` (13) · `motion.tsx` (7) · `nav.tsx` (5) ·
      `surfaces.tsx` (5) · `sections.tsx` (7) · `backgrounds.tsx` (2) · `lists.tsx` (1),
      covering exactly the 40 `local-demo` react-bits entries; control option unions
      verified against the vendored sources (e.g. RotatingText `slide|flip|blur|scale|drop`,
      SpotlightCard `circle|beam`, Noise blend modes, FlowingMenu directions) rather
      than guessed; array/ReactNode data stays inside wrapper functions
- [x] `src/components/preview/PreviewWorkspace.tsx` + token-only `preview.css`:
      `#/preview/<id>` route in App (lazy chunk), stage modes neutral/inverted/grid,
      viewports full/1280/768/375, Replay remount, per-entry controls (text/number/
      boolean/select) with a reset, honest kind card for source-link/external entries
      (official link + note), and the info rail (status/type/runtime/heavy/preview
      chips, source + license verbatim, retrieval, target dependencies, vendored
      file paths, related-in-source links, selection toggle, full-record link)
- [x] Registry invariant tested: every `local-demo` react-bits id resolves via
      `getShowcase`, sourced `source-link` records resolve none, ids unique —
      the app renders vendored code only through this registry
- [x] `react-bits-animated-list` flipped from its M6.1 opt-out to a live record:
      its exclusion basis (`@hugeicons/*` not allowed) is gone after the §12
      extension, so it was re-vendored without `live:false` and given the last
      wrapper (`lists.tsx`) — one entry, honest kind `local-demo`
- [x] §12 amendment extension + installs: `@hugeicons/react`, `@hugeicons/core-free-icons`
      (declared by Card Nav, Carousel, Flowing Menu, Elastic Slider, AnimatedList),
      `@use-gesture/react` (declared by Dome Gallery); AGENTS.md rule 3 updated
- [x] Vendored-code review banner: the ingestion adapter stamps
      `// @ts-nocheck /* eslint-disable */` onto the code files it writes
      (automated, never a hand edit); the app keeps strict TypeScript on its own
      code while third-party sources stay byte-verbatim otherwise
- [x] M6.3 gallery motion: `src/lib/motion.ts` preference store
      (`rl-motion-play`, default playing, external store), toolbar
      "Pause previews"/"Play previews" (`aria-pressed`), `PreviewBox` MiniStage for
      the 65 local-demo cards plus the 6 seeded demo previews (M7 correction of
      the historical "46 local-demo" figure: 65 showcase stages + 6 seeded demos,
      71 live-preview total; the 21 raw-WebGL `source-link` variants were later
      flipped to local wrappers in M6.6) — auto-play via IntersectionObserver when
      visible + playing, manual Play fallback, unmount off-screen; the 16 shadcn
      doc-page cards keep their official-preview links
- [x] Heavy gating: Stack + Falling Text show workspace-bound placeholders in the
      gallery (`data-heavy="true"`); only the workspace runs them
- [x] M6.2 workspace shipped lazy: React.lazy + Suspense split the animation
      engines into an on-demand chunk (main 432 kB / 100 kB gzip; workspace chunk
      782 kB / 266 kB gzip) — browsing and gallery don't pay for gsap/motion/matter-js
- [x] Tests: workspace (stage + controls + rail facts + honest card + seeded reuse +
      registry invariant + unknown id) and gallery motion (manual play fallback,
      heavy placeholder, persisted pause) suites added; gallery counts updated to the
      AnimatedList flip — app suite 104/104; tooling 64/64; typecheck + build green;
      flagless `npm run verify` green
- [x] Browser smoke (5173): `#/preview/react-bits-shiny-text` mounts the lazy stage
      with no console errors; `#/gallery` shows 87 cards with live/poster/external
      states per the corrected kind counts below, and the motion toggle persists
      (M7 DOM re-check: pause zeroes every `.preview-mini-stage`, `rl-motion-play`
      flips to "paused", resume restores the Play affordances)
- [x] M7.1 audit (2026-10-25, before any redesign edit): HEAD = `7e98d8c` (M6.6
      code-splitting committed); baseline `npm run verify` green; baseline build
      main 431.63 kB / 100.61 gzip, showcases chunk 1,740.88 kB / 541.31 gzip lazy,
      workspace chunk 10.86 kB. Defect list drove the M7 backlog:
      (1) default view was the text browser, not the gallery;
      (2) `.app-main` forced `280px + 1fr` — preview/prompt views rendered inside
      the 280px sidebar column;
      (3) gallery preview frames 7.5rem tall with a 0.6 scaler — effects
      unrecognizable;
      (4) cards were chrome-heavy with no hover/focus affordances;
      (5) clicking an external card navigated off-site with no in-app inspect
      action;
      (6) heavy cards were near-empty boxes;
      (7) prompt pane used `white-space: pre` forcing page-wide horizontal
      scrolling on mobile;
      (8) no fullscreen in the workspace; controls sat under the stage;
      (9) a failed lazy import had no error boundary;
      (10) filter rail stacked vertically in a 280px column;
      (11) docs carried pre-M6.6 counts (46 live previews, "View at source"
      links) and MASTER_SPEC's changelog listed v1.5 before v1.4.
- [x] M7.2–M7.5 shipped (details in the Decisions log): shell art direction,
      gallery-first default, preview-first cards + frames, workspace redesign,
      prompt studio (wrapping pane, edit/restore, target-project line), tray
      compression, lazy-load error boundary with Retry
- [x] M7.6 visual QA (browser, 5173): fresh launch lands in the gallery; a
      lightweight card's mini stage mounts and plays ("Blur Text" verified live);
      the heavy entry `react-bits-falling-text` runs in the workspace (stage
      `min-height` 558px present, 4 rail controls, Replay/grid/375px viewport
      exercised); `shadcn-accordion` shows the honest external card with its
      `ui.shadcn.com` link; every catalog theme id switches `
data-theme` scope
      (6/6); global pause zeroes stages and persists; prompt pane wraps
      (`pre-wrap`/`break-word`) and edit/restore works; no horizontal overflow at
      390px (fixed the tagline ellipsis shrink). Pixel screenshots unavailable
      during the session (client window not drawn) — recorded as a limitation
      rather than a claim.
- Catalog truth (true as of M7, verified live): **87 entries, all local records**
  (shadcn 16 · magic-ui 4 · react-bits 61 · seeded 6). Preview kinds:
  **65 `local-demo`** (61 react-bits + 4 Magic UI) + 6 seeded entries resolving
  via the vetted demos = **71 runnable live previews** (23 heavy) ·
  **16 `external`** (official doc pages) · 0 `source-link` remaining

## 5.9) M7.1 — Minimal gallery + interaction taxonomy + immersive stage ✅

- [x] Minimal gallery: every ordinary card shows exactly three elements — preview,
      name, checkbox. Metadata (summary, source chips, status, kind chips) stays in
      the preview rail/detail pane; dead card CSS removed. Covered by
      `App (M7.1 minimal gallery + behaviors)` tests.
- [x] Spacious layout: previews 14rem (224px) at rest / 16rem (256px) on large
      desktops, grid min column 18rem, gutters 1.4rem, quiet card chrome.
- [x] Interactive animation taxonomy: `taxonomy/behaviors.json` (12 behaviors), all
      87 entries classified from verified showcase implementations (44 entries carry
      multiple behaviors); `--behavior` lookup filter; "Interaction" filter select in
      browser + gallery; index `taxonomies.behaviors`; cursor/hover/click/draggable/
      scroll/gesture/3D/text/nav/stateful/auto/static — aesthetics stay independent.
- [x] Validator integrity fix: entry `behaviors`/`aesthetics`/`attributes`/`sources`
      validated against the real taxonomy sets (previously behaviors validated against
      an empty set, letting the undocumented `interactive-nav` slip past silently);
      `interactive-nav` added to the taxonomy (1 new behavior id).
- [x] Immersive stage: behavior chips in the info rail + behavior-derived interaction
      cue under the stage (capped at two cues; classified from `entry.behaviors`).
- [x] Tests: catalog-lib (taxonomy membership, multi-behavior filtering, full
      coverage), cli (`--behavior` list/JSON/multi-behavior), App (card minimality,
      checkbox isolation, open action, behavior filter counts, rail behavior chips +
      interaction cue); FilterBar option counts updated (13 interaction options).
- [x] Gate + build size: `npm run verify` green (50/50 node tests, 110/110 app
      tests, typecheck, build). Main bundle 439.26 kB / 102.52 kB gzip
      (M7 baseline 435.48 / 101.51 — +3.8 kB from behavior chips, cue logic, and
      behavior filter); showcase chunk unchanged and still lazy
      (1,740.89 kB / 541.31 gzip); workspace chunk 12.60 kB.
- [x] Visual QA (browser, HMR dev server): 1440×900 gallery — three-element cards,
      subdued unchecked checkboxes, 14rem previews, spacious 1.4rem gutters;
      `#/preview/react-bits-magnet` — stage-first canvas with the "Cursor-reactive"
      behavior chip in the rail and the cue "Move the pointer across the stage — the
      effect follows the cursor." under the stage; 390×844 mobile — toolbar wraps,
      workspace full-bleed, tray compact; live checkbox/isolation check: toggling the
      Alert checkbox keeps `#/gallery`, clicking the card overlay navigates to
      `#/preview/alert`; live behavior filter check: Interaction=cursor-reactive →
      "13 of 87 entries". Evidence: `screenshots/m71-gallery-1440.png`,
      `screenshots/m71-workspace-magnet-1440.png`, `screenshots/m71-gallery-390-mobile.png`,
      `screenshots/m71-workspace-alert-390-mobile.png`,
      `screenshots/m71-gallery-1280-laptop.png`.

## 5.10) M7.2 — Preview experience refinement & interactive gallery polish ✅

- [x] In-app routing for every card (M7.2 core fix): the stretched open link
      lives on every `GalleryCard` regardless of preview kind — local demos, heavy
      posters, external records, static images, and non-runnable entries all route
      to `#/preview/<id>`. `PreviewBox` no longer hosts any off-site anchor: the
      official URL stays in the workspace's honest fallback card / detail pane, so
      clicking a card never navigates away and never pretends a remote page is
      running locally. Keyboard: the overlay link is the first tab stop on the card;
      the hash deep links and back/forward behavior are untouched.
- [x] De-cluttered preview frames: external/source-link tiles lost the hostname
      and both explanatory lines (now one ↗ cue + one short label); heavy posters
      lost the bold title + paragraph (now the poster background, one "Heavy
      preview" chip, and a subtle ↗ glyph — the card link is the open affordance);
      static tiles render the verified image without link chrome; unavailable
      previews keep one restrained line. All explanatory copy lives in the workspace.
- [x] Pointer-interactive mini stages: when a live stage is playing and the
      entry's verified behaviors include a pointer-capable interaction
      (cursor-reactive, hover, gesture, interactive-text, interactive-nav,
      stateful), the stage publishes `data-interactive="true"`; gallery.css passes
      pointer events through the scaler and retracts the card-open link to the
      title strip (`:has` selector), so hover/cursor demos demonstrate themselves.
      Click-triggered (e.g. Click Spark) and draggable effects keep the full-card
      overlay — a click still opens the workspace consistently. Verified
      implementations only; no invented interactions.
- [x] Workspace hierarchy: provenance facts (source, license, retrieval,
      dependencies, vendored files, related) collapsed behind an accessible
      `<details>"Provenance & retrieval"` in the rail; identity, selection,
      classification chips, and verified controls stay in the primary layer.
- [x] Scroll-triggered treatment: scroll-stage entries get
      `data-scroll="true"` on the stage wrap (inner-scrollable, full-viewport mode
      only) with extra frame height so the entrance triggers inside the canvas;
      Replay also resets the inner scroll position.
- [x] Tests: every card routes in-app incl. external/no-anchor-in-card; heavy
      poster has no duplicated title/note; interactive stage publishes
      `data-interactive` (Glare Hover) while click-only stages do not (Click
      Spark); scroll stage publishes `data-scroll` + scroll cue (Animated Content);
      draggable cue fidelity (Elastic Slider); provenance `<details>` collapsed.
      App suite grew 54 → 59 tests, all passing.
- [x] Gate + evidence: `npm run verify` green (70/70 node tooling tests, 116/116
      app tests, typecheck, build). Main bundle 439.16 kB / 102.44 gzip (M7.1
      baseline 439.26 / 102.52 — net −0.1 kB: the de-cluttered tiles removed more
      markup than the routing/interactive logic added). Showcase chunk unchanged and
      still lazy (1,740.89 kB / 541.31 gzip); workspace chunk 12.96 kB / 3.69 gzip
      (+0.36 kB for the provenance `<details>` and scroll-stage logic). No new
      dependencies.

- [x] Visual QA (browser, HMR dev server 5173 — DOM-level assertions):
      desktop 1440×900 — 87/87 cards each with exactly one in-app `gallery-card-open`
      link; external tile renders ↗ + "Open official preview" with no hostname and no
      paragraph; heavy poster renders "Heavy preview" chip + ↗ with no title/note
      paragraphs; a live Glare Hover stage after manual Play publishes
      `data-interactive="true"`, stage computed `pointer-events: auto`, and the
      card-open overlay's computed inset retracts to the 49.6px title strip (the
      `:has` pipeline works in real Chromium); workspace `#/preview/shadcn-accordion`
      — clicking the external card routes in-app (`#/preview/<id>`), honest card is
      compact with the official link, provenance `<details>` closed by default and
      containing the facts; `#/preview/react-bits-animated-content` — stage wrap
      `data-scroll="true"` and inner-scrollable (clientHeight 574 < scrollHeight),
      cue "Scroll inside the stage…", Replay resets the inner scroll from 725.6px
      to 0; checkbox on an external card toggles selection while the hash stays
      `#/gallery` (isolation on external tiles verified live). Mobile 390×844 — no
      horizontal overflow, card fits (344.8px), tray compact. Laptop 1280×800 —
      3-column grid, no overflow, fullscreen enabled, details collapsed. Pixel
      screenshots were again blocked by an undrawn client window — recorded as a
      limitation, never claimed.

## 5.11) M8 - Preview audit and repair (2026-10-28)

- [x] Repeatable zero-dependency audit: `npm run audit:previews` starts Vite,
      drives installed Chrome/Edge over CDP, visits every local runnable
      `#/preview/<id>` route, checks mount/runtime/network/console failures,
      blank or collapsed stages, clipping, broken images, WebGL context loss,
      screenshot stability and pointer response; then checks all 87 gallery
      mini-stages (playable, heavy poster, external tile). Node >= 22.12 is
      required for the built-in WebSocket; no package dependency was added.
- [x] Audit output: `audit/preview-audit.json` (machine), `audit/PREVIEW_AUDIT.md`
      (human report), `audit/screenshots/<id>.jpg` (workspace frame). Binary
      screenshots and contact sheets are ignored; the report stays reviewable.
- [x] Latest full run: 87 entries - 43 working, 28 workspace-only, 16 external
      references, **0 requires-repair**; gallery - 18 live, 30 snapshots, 23 heavy
      posters, 16 external, **0 problems**. Machine-specific WebGL availability is a
      separate `requires-environment` status, never folded into code repair.
- [x] Repairs verified in-browser: scroll-stage placement; Dome Gallery, Grid
      Motion, Dock and Stack stage sizing; Bubble Menu and Card Nav ReactNode
      logos; Staggered Menu logo/colors/height; Ribbons idle motion and seeded
      trail; Text Pressure sizing; readable Magnet Lines, Beams, Particles,
      Waves, Shiny Text, Letter Glitch and Word Rotate colors; and deferred
      `WEBGL_lose_context` cleanup in Aurora, Ballpit, Beams, Circular Gallery,
      Letter Glitch, Particles and Waves so StrictMode remounts do not reuse a
      lost context.
- [x] Reduced-motion run (12 representative animation/WebGL entries) and
      390x844 mobile run (11 layout/nav/text entries) both returned
      `0 requires-repair`; the reduced-motion entries render static frames
      rather than blank canvases.
- [x] Tests: `tests/audit-previews.test.mjs` covers the package command, help
      contract, workspace/gallery/reduced-motion/WebGL audit paths.
- [x] Gate: `npm run verify` green - validate+check-index, generate, 73/73 node
      tests, 116/116 app tests, typecheck, production build.

## 5.12) M9 - Visual discovery workspace + schema v3 (2026-10-29)

Goal (user brief): turn the library into an agent-first visual discovery tool - not a
component list - with real previews, faceted discovery, collections, source coverage and
accurate prompt generation. `catalog/catalog.json` stays canonical; schema and tooling
extend in place.

### Schema and classification

- [x] Bumped `catalog/catalog.json` to `schemaVersion: 3` and added required
      `types`, `triggers`, `techniques`, `tagMeta` and `previewProfile` to all 87
      entries. `types` and `triggers` must be non-empty; every taxonomy id is
      validated.
- [x] Added `taxonomy/types.json` (23), `taxonomy/triggers.json` (14) and
      `taxonomy/techniques.json` (46). Kept `category` structural, `aesthetics` as
      visual vibe and `behaviors` as interaction input; all four dimensions remain
      independent.
- [x] `scripts/classify-catalog.mjs` deterministically derives missing facets and
      preview profiles from existing evidence (category, behavior, runtime, summary,
      vendored source) and records `sourceProvided` vs `inferred` provenance plus
      `reviewNeeded`. `npm run classify --check` exits 0 and does not write the
      catalog; the test suite asserts this idempotency.
- [x] `tagMeta` references must be declared on the entry (`facet:id` format), so
      provenance can never point at a facet the record does not actually have.
- [x] Extended `taxonomy/sources.json` with coverage records: discovered, usable,
      locked, review-needed, blocked and checkedAt. Imported and preview-ready counts
      are derived from entries. `discovered` means "tracked by this project", not
      complete upstream enumeration.
- [x] Validator covers v3 facets, provenance, preview enums/coupling, dimensions,
      runtime requirements and real snapshot/loop path existence. `npm run validate
      -- --check-index` passes; `catalog/index.json` is generated with v3 counts,
      taxonomies, source coverage and preview statuses.

### Honest previews

- [x] `previewProfile` publishes mode (`live|snapshot|loop|external|unavailable`),
      layout (`compact|standard|wide|showcase`), cost, aspect ratio, min dimensions,
      grid spans, expansion recommendation, runtime requirements, autoplay permission,
      real snapshot/loop paths, preview status and failure reason.
- [x] `scripts/capture-previews.mjs` published **71 real audit screenshots** into
      `public/previews/`; no thumbnail or poster was invented. All 71 ready entries
      have `mode: live`, a real `.jpg` snapshot and `previewStatus: ready`; 16 shadcn
      entries are honest external previews; 0 unavailable and 0 error.
- [x] Gallery cards run live only for low/medium-cost autoplay previews that are
      visible, not globally paused and not reduced-motion. 23 heavy entries use real
      snapshots; 18 entries are autoplay-eligible. Expanded previews are lazy-loaded
      and never mounted by the gallery.
- [x] External records render an explicit external state, never a fake stage.
      Error boundaries, retry/regeneration controls and explicit unavailable/error
      labels prevent fallback content from being presented as successful live content.
- [x] Layout distribution: compact 20 / standard 25 / wide 21 / showcase 21; cost
      low 48 / medium 16 / high 23.

### Discovery shell

- [x] Browse is the default visual wall; Collections, Sources, Selected for AI and a
      table view are first-class routes. The inspector and expanded preview are
      overlays that preserve the current view, filters and scroll.
- [x] Faceted search uses AND across dimensions and OR within one dimension. Facets:
      type, trigger, technique, vibe, tech, category, source, entry type, preview mode
      and availability. Search combines exact id/alias/name, prefix, whole-token,
      substring and token-level typo signals; arbitrary letter-subsequence matching
      was removed. `btn` resolves to `button`; `input` ranks `text-input` first.
- [x] Lookup CLI exposes the same v3 dimensions (`--type`, `--entry-type`,
      `--trigger`, `--technique`, `--vibe`, `--tech`, `--preview-mode`); repeated
      flags OR within a dimension, and trigger/behavior remain independent.
- [x] Collapsible desktop facet sidebar, mobile drawer, `/` search focus, Escape
      clearing/closing, explicit accessible names with counts (for example
      `Button (2)`), bulk selection, select-all-visible, compare, expand/collapse and
      a persistent selection tray.
- [x] Favorites, named collections, recents, saved filters, manual tags, notes and
      compare state persist in localStorage and join catalog data by id. They never
      mutate `catalog/catalog.json`.
- [x] Shareable hash routes: `#/browse`, `#/component/:id`, `#/preview/:id`,
      `#/collections/:id`, `#/sources/:id`, `#/selected`, `#/prompt`,
      `#/browser/:id` and `#/filters`. Browse encodes filters/overlays; inspectors
      opened from Collections/Sources/Selected/Table stay local to those views.
      Malformed percent escapes no longer crash routing.
- [x] Sources view exposes derived coverage and source limits. Collections view
      supports named groups and `Open ... details` actions. Selected view is the
      prompt input surface.

### Ingestion and prompt

- [x] `scripts/ingest-codepen.mjs` records author-owned CodePen references only:
      official `https://codepen.io/<user>/pen/<slug>` URLs, official embed URLs,
      attribution and a verified license. `--write` refuses without `--author` and
      `--license`; re-runs preserve `addedDate`/`syncedAt`, filter aliases against
      existing ids/aliases, and clear the saved blocked record unless
      `--keep-blocked` is passed.
- [x] `scripts/ingest-reference.mjs` is metadata-only: official URL, terms,
      attribution and preview link; it never fetches or redistributes source files.
      It rejects dedicated adapters (`shadcn`, `magic-ui`, `react-bits`) and redirects
      CodePen to the dedicated adapter.
- [x] Dry runs verified: `codepen-multi-page-view-transition` (external reference),
      `getlayers-aurora-hero` (external reference) and rejection of `shadcn` with the
      dedicated-adapter message. No fake record was written to the catalog.
- [x] `src/lib/prompt.ts` includes selected components, dependencies, local paths vs
      official retrieval instructions, licenses, constraints, preview limitations and
      local annotations. External entries are constrained to official channels.
- [x] Tests: `tests/ingest.test.mjs` covers CodePen URL parsing, external composition,
      alias filtering, validation and source-coverage updates. A temp-repo `--write`
      integration proves the CodePen and generic reference adapters are byte-idempotent,
      preserve the target entry's own aliases and never write source files. Tooling
      tests cover schema-v3 validation, AND/OR search parity, independent
      trigger/behavior facets, v3 lookup filters (component type, entry type, trigger,
      technique, vibe, tech, source and preview mode), classification idempotency and
      the CLI contract (**94/94**). App tests cover routing, personal persistence,
      source coverage, preview decisions and discovery integration: **128/128 tests in
      22 files**.

### Documentation and release

- [x] Updated `README.md`, `docs/SCHEMA.md`, `MASTER_SPEC.md` (M9 + changelog v1.7),
      `AGENTS.md` and this checklist for schema v3, discovery views, preview honesty
      and reference-only ingestion.
- [x] Source command copy corrected to require author/license for CodePen writes.
- [x] Final `npm run verify` green after all code/docs changes: validate
      --check-index, generate, **94/94** node tests, **128/128** app tests, typecheck
      and production build. Real-browser audit rerun: **87/87** workspace routes
      (43 working, 28 workspace-only, 16 external-reference, **0 requires-repair**);
      gallery **18 live / 23 heavy posters / 30 snapshots / 16 external**, **0
      problems**. Mobile 390x844 spot-check (button, Aurora, Dome Gallery,
      shadcn-button, tabs) also 0 repairs. Evidence:
      `audit/preview-audit.json`, `audit/PREVIEW_AUDIT.md`,
      `audit/verify-final.log`, `audit/audit-final.log`.

## 6) Future work (explicitly not now)

- Catalog JSON Schema file for cross-tool validation
- Multi-theme preview grid (all six themes side by side)
- Extended catalog fields (visual example image, example usage snippets per theme)
- Publishing pipeline / versioned releases
