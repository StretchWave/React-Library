# IMPLEMENTATION_CHECKLIST.md — living progress tracker

Status legend: **[x] done (verified)** · **[~] partial** · **[ ] pending** ·
**[P]** placeholder (reason required). Evidence = command/test output noted inline.

## 0) Snapshot

| Area | Status | Evidence |
|---|---|---|
| Foundations (schema, taxonomy, tooling, docs) | ✅ done | `node --test tests/*.test.mjs` → 29/29 pass; `validate` OK (6/6/6); `generate` writes index; `lookup` text+JSON verified |
| M1 App skeleton | ✅ done | `npm run verify` full chain green (29 tooling + 5 app tests, typecheck, vite build); dev-server smoke test + screenshots |
| M2 Component browser | ✅ done | 20/20 app tests + 32/32 node tests; dev-server walkthrough: search → "1 of 6 components" → TextInput detail fully rendered (screenshot) |
| M3 Theme engine + previews + components | ⏳ in progress | — |
| M4 Advanced interactions | ⏳ pending | — |

Placeholders: none registered (TabSheet arrow-key navigation is *scheduled M4*, declared
in catalog `a11yNotes`; `--skip-links` is a scheduled-phase flag, removed at M3).

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

## 4) M3 — Theme engine + live previews + component suite ⏳

- [ ] ThemeProvider reads taxonomy themes (not hardcoded) and applies tokens to a
      `[data-theme]` scope; app chrome consumes `--rl-*`
- [ ] Theme switcher: labeled select + prev/next cycle; `localStorage["rl.theme"]`
      persistence; `auto` respects `prefers-color-scheme`; invalid ids fall back (tests)
- [ ] Implement library components: Alert, Badge, Button, Card, TabSheet, TextInput
      (+ CSS) — token-only theming, class prefix `rl-`
- [ ] Demos `src/catalog/demos.ts`; catalog `links` files exist; drop `--skip-links`
      from verify chain
- [ ] `tests/css-theming.test.mjs`: no raw color literals in component CSS
- [ ] Live preview pane renders selected demo inside themed scope (test: themed preview)
- [ ] `npm run verify` green (full chain, no skip flags after link files land)

## 5) M4 — Advanced interactions & hardening ⏳

- [ ] TabSheet arrow-key navigation + roving tabindex (close the scheduled M4 item)
- [ ] Copy-usage-snippet button (clipboard + fallback, tested via mocked clipboard)
- [ ] Hash deep links `#/component/<id>` incl. back/forward
- [ ] Filter empty state with reset action (tested)
- [ ] README/checklist/AGENTS final sweep to match reality; future-work list
- [ ] Final `npm run verify` (full gate) recorded as release evidence

## 6) Future work (explicitly not now)

- Catalog JSON Schema file for cross-tool validation
- Multi-theme preview grid (all six themes side by side)
- Extended catalog fields (visual example image, example usage snippets per theme)
- Publishing pipeline / versioned releases
