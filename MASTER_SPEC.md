# MASTER_SPEC — Agent-First React Component Library

> **Status:** Active primary specification, v1.0 — authored 2026-10-24.
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

## 5) Catalog schema (canonical, v1)

Detailed reference with examples: `docs/SCHEMA.md`. Summary:

### 5.1 Top level — `catalog/catalog.json`

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | `1` | yes | Integer; bump per §5.5. |
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

### 5.3 Prop

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | camelCase `/^[a-z][A-Za-z0-9]*$/`. |
| `type` | string | yes | TS-ish type expression, non-empty. |
| `required` | boolean | yes | |
| `default` | string | no | Canonical literal form, e.g. `"\"primary\""`, `"false"`. |
| `description` | string | no | |

### 5.4 Taxonomy files

- `taxonomy/categories.json` → `{ "schemaVersion": 1, "categories": [{ "id", "label", "description?" }] }` (ids unique slugs).
- `taxonomy/themes.json` → `{ "schemaVersion": 1, "themes": [{ "id", "label", "base", "description", "tokens" }] }`
  - `base`: `"light"` | `"dark"`.
  - `tokens`: map of CSS-variable name → value string. It **must** define all nine
    canonical tokens:

    `--rl-surface`, `--rl-surface-alt`, `--rl-text`, `--rl-text-muted`,
    `--rl-accent`, `--rl-accent-contrast`, `--rl-border`, `--rl-radius`, `--rl-font`

  - Common optional tokens: `--rl-shadow`, `--rl-focus` (an `outline` shorthand),
    `--rl-backdrop` (glass blur). Components must treat every optional token as
    optional with a sane inline fallback.

### 5.5 Schema evolution

Additive changes: bump `schemaVersion` minor-wise (e.g. `1` stays; changelog in
`docs/SCHEMA.md`). Breaking changes: new major version + migration notes. The validator
knows exactly the current version and rejects unknown fields? — **only warns** for
unknown fields (forward-compat), **errors** on missing/invalid known fields.

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

- `loadCatalog(root)` → `{ catalog, themes, categories, paths }` (fs).
- `validateTaxonomy(themesDoc, categoriesDoc)` → `{ errors, warnings }`.
- `validateCatalog(catalog, taxonomies, { root, checkLinks })` → `{ errors, warnings }`
  — enforces §5 fully; link checks require `checkLinks` (auto-on when paths present
  under `root` unless the CLI passes `--skip-links`).
- `searchEntries(entries, query, { theme?, category? })` → ranked matches
  (exact `id` > exact `alias` > substring across id/name/summary/tags/aliases;
  case-insensitive; empty query = all, sorted by id).
- `buildIndex(catalog, themes, categories, generatedAt)` → index object.
- `writeIndex(root, index)` → writes `catalog/index.json` pretty 2-space + `\n` (fs).
- `formatEntryText(entry)` → human text block used by the lookup CLI.

### 8.1 Commands

| Command | Contract |
|---|---|
| `npm run validate` | Exits `0` clean, `1` with a sorted error report. Flags: `--check-index` (fail when `catalog/index.json` ≠ freshly derived), `--skip-links`. |
| `npm run generate` | Validates first (aborts on errors), rewrites `catalog/index.json`, prints counts + timestamp. |
| `npm run lookup` | See §8.2. |
| `npm test` | `node --test tests/` — zero-dep suites: catalog lib, validator rules, search, index build, CLI integration, CSS theming scan (M2+). |

### 8.2 Lookup CLI output contract

`npm run lookup -- <query> [--theme <id>] [--category <id>] [--json] [--list]`

- **Text mode** prints one block: name, status, category, summary, themes, aliases,
  tags, version/addedDate, links (or `—` when absent), props.
- **`--json`** prints a single JSON object (the entry or `{ query, matches: [...] }`
  when ambiguous). Nothing else on stdout.
- **`--list`** prints `id — name — [category] — [status]` lines.
- Exit codes: `0` found · `1` no match · `2` unknown `--theme`/`--category` · `64` usage error.
- Matching rank: exact id > exact alias > ranked substring; ambiguous multiple matches
  list candidates (top 10) with a refine hint.

### 8.3 Index contract (`catalog/index.json`)

```json
{
  "schemaVersion": 1,
  "generatedAt": "ISO timestamp",
  "generator": "scripts/generate-index.mjs",
  "counts": { "entries": 0, "themes": 0, "categories": 0 },
  "taxonomies": { "themes": ["…"], "categories": ["…"] },
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
   defined in `src/styles/status.css` — status colors are deliberately
   theme-independent release semantics, the only sanctioned color literals outside the
   taxonomy), description, themes, props table, category tags, links when present.
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
| *(none)* test-Runner for Node script tooling | dev | `node:test` is built-in — zero deps. |

Anything else requires: spec §12 amendment + AGENTS.md update + checklist decision log,
**before** installation. No UI kits, CSS frameworks, routers, state managers, or
center-block libs of any kind.

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
