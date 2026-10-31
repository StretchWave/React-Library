# AGENTS.md — Operating guide for AI agents (and humans)

This repository is **agent-first**: the catalog data is the source of truth, the CLI is
the agent interface, and the React app is a view. Normative specs:
`MASTER_SPEC.md` (schema, milestones, dependencies) and `docs/SCHEMA.md` (field detail).
Where docs disagree, `MASTER_SPEC.md` wins.

## Golden rules

1. **Run the gate before claiming done.** Foundations: `npm run validate && npm run generate && npm test`.
   From M1 on: `npm run verify`. A milestone is not "done" with a red gate.
2. **`catalog/catalog.json` is canonical.** `catalog/index.json` is generated — never
   hand-edit it; run `npm run generate` after any data change.
3. **No new dependencies** without first amending `MASTER_SPEC.md` §12, this file, and
   the checklist. The allowed set is exactly §12 (runtime `react`/`react-dom` plus the
   M6 animation/interaction runtimes `gsap`, `@gsap/react`, `motion`, `matter-js`,
   `@hugeicons/react`, `@hugeicons/core-free-icons`, `@use-gesture/react`, `three`; dev toolchain
   incl. `@testing-library/dom`, the mandatory peer of `@testing-library/react` v16).
   Test-only `node:test` suites in `tests/` must stay zero-dependency.
4. **Components style with `--rl-*` variables only** (see §Theming rules). No hex/rgb
   literals in `src/components/**/*.css`; `tests/css-theming.test.mjs` (M2+) enforces it.
5. **Honest status.** Unimplemented = placeholder, registered in
   `IMPLEMENTATION_CHECKLIST.md` with a reason. Never fake an acceptance criterion.
6. **Honest previews.** Every schema-v3 entry publishes a validated `previewProfile`.
   Never present a snapshot, external link or fallback as live content; heavy/paused/
   off-screen previews use real captured snapshots, and external records stay external.
7. Paths in catalog `links` and `previewProfile.snapshotPath`/`loopPath` are
   repo-relative with forward slashes.

## Commands

| Command | Purpose |
|---|---|
| `npm run validate` | Validate catalog + taxonomies + link paths. Exit 1 on error. Flag: `--check-index`. The pre-M3 `--skip-links` flag is gone. |
| `npm run generate` | Regenerate `catalog/index.json` (validates first). |
| `npm run lookup -- <q>` | Component lookup (see crib sheet). |
| `npm test` | Zero-dep tooling suites (`node --test "tests/*.test.mjs"`). |
| `npm run dev` / `build` / `preview` / `typecheck` | App toolchain. |
| `npm run test:app` | Vitest suites for the app. |
| `npm run audit:previews` | Headless-browser audit of all preview routes + gallery cards (Node >= 22.12, Chrome/Edge). Flags: `--only=`, `--base-url=`, `--viewport=`, `--reduced-motion`. Writes `audit/`. |
| `npm run ingest-shadcn` / `npm run ingest-magicui` | Official-registry ingestion adapters. Dry-run default; `--write` vendors files + merges entries idempotently. |
| `npm run ingest-reactbits` | React Bits animation-first adapter: vendors the official `TS-CSS` variant of curated items and composes entries. Dry-run default; `--write` vendors + updates; `--only=slug,...` narrows the run. |
| `npm run ingest-codepen` | Author-owned CodePen references only. `--write` requires `--url`, `--author` and a verified `--license`; records the official embed URL and never scrapes. |
| `npm run ingest-reference` | Metadata-only adapter for restricted external sources. Never copies source files; records official URL, terms and attribution. |
| `npm run classify` | Deterministic assisted classification + preview profiles. `--check` reports drift without writing; `--write` updates in place. |
| `npm run capture:previews` | Publish real audit snapshots into `public/previews/`; never invent thumbnails. |
| `npm run verify` | Full release gate: validate --check-index → generate → node tests → app tests → typecheck → build. |

> PowerShell: pass CLI flags with `npm run x -- --flag`, lookup args with
> `npm run lookup -- button --json`.

## Repository map / edit policy

| Path | Role | Edit? |
|---|---|---|
| `MASTER_SPEC.md` | Primary specification | Only for schema/behavior/policy changes. |
| `AGENTS.md` (this file) | Agent operating contract | Update alongside behavior changes. |
| `IMPLEMENTATION_CHECKLIST.md` | Progress + decision log + placeholders | Update every work session. |
| `docs/SCHEMA.md` | Schema reference | Update when schema changes. |
| `taxonomy/*.json` | Canonical enums | Update (then `npm run generate`). |
| `catalog/components/**` | Ingested third-party component code + manifests | Written by ingestion adapters, not by hand. |
| `catalog/catalog.json` | Canonical catalog | Update (then `npm run generate`). |
| `catalog/index.json` | Derived index | Never — generated. |
| `public/previews/**` | Real published preview snapshots | Written by `capture:previews`; never fabricate. |
| `scripts/lib/catalog.mjs` | Shared catalog/validation/search/index library | Keep 100% dependency-free. |
| `scripts/lib/ingest.mjs` | Shared ingestion/reference composition helpers | Keep 100% dependency-free. |
| `scripts/*.mjs` | CLIs | Keep dependency-free. |
| `tests/*.test.mjs` | Tooling tests (node:test) | Extend with behavior changes. |
| `src/lib/*` | Routing, search, personal persistence, sources, prompt builder | Keep pure/tested where possible. |
| `src/**` | React app + library components | Follow theme/a11y rules. |

## Adding a component — the agent checklist

1. Pick a unique id (kebab slug). Reserve the directory name (PascalCase) and files:
   `src/components/<Name>/<Name>.tsx`, `<Name>.css`, `<Name>Demo.tsx`.
2. Structure the component around theme tokens: colors/radius/shadow/font **only** from
   `var(--rl-*)` (with inline fallbacks for optional tokens). Class names prefixed `rl-`.
3. Meet the a11y baseline: native element or correct ARIA pattern; programmatically
   associated labels; visible focus via `--rl-focus`; no mouse-only interactions.
4. Author the demo component (themeable showcase of the cataloged API).
5. Add the catalog entry to `catalog/catalog.json` **keeping `entries` sorted by id**:
   id, name, summary ≤ 140 chars, description, category/themes from taxonomy only,
   aliases (unique, no id collisions), tags, status, semver version, addedDate,
   empty `externalDependencies` unless truly needed, props (camelCase, typed),
   links (`source`/`demo` paths must exist once the files land), a11yNotes, usedFrom.
6. Add the required schema-v3 discovery fields: non-empty `types`, non-empty
   `triggers`, `techniques`, `tagMeta` (source/inferred provenance + review flag) and a
   validated `previewProfile`. Use real snapshot paths from `capture:previews`; never
   invent a preview state or thumbnail. External references use mode/status
   `external` and an official retrieval path.
7. `npm run validate` → `npm run generate` → `npm run lookup -- <id>` (prints correctly).
8. If the app consumes it: wire `src/catalog/demos.ts` + `usedFrom` and add a preview
   test where practical.
9. Update `README.md` component table + `IMPLEMENTATION_CHECKLIST.md`.
10. Run the gate (`npm run verify`). Only then is the component done.

## Lookup CLI crib sheet

```text
npm run lookup -- button                 # text record
npm run lookup -- btn --json             # JSON: single object = full entry
npm run lookup -- inp                    # ambiguous? ranked candidates listed
npm run lookup -- --list                 # all entries
npm run lookup -- --list --category inputs
npm run lookup -- --list --type button --trigger hover
npm run lookup -- shadcn-badge --vibe minimal --tech tailwind
npm run lookup -- --list --preview-mode external
npm run lookup -- --list --entry-type local
npm run lookup -- button --theme retro-terminal
```

Filters are AND across dimensions and OR within a repeated flag. `trigger` and
`behavior` are independent dimensions; `--aesthetic`/`--attribute` alias
`--vibe`/`--tech`, and `--type local|external` remains a legacy entry-type alias.

Exit codes: `0` found · `1` no match · `2` unknown filter id · `64` usage error.
`--json` prints exactly one JSON object on stdout (candidates mode:
`{ query, count, matches }`). Text mode prints the formatted record block.

## Theming rules (library code)

**Two separate theme systems (M5+).** Do not conflate them anywhere in code or UI copy:

1. **Application appearance themes** — the six `--rl-*` token themes in
   `taxonomy/themes.json` styling this React Library app itself.
2. **Component aesthetic classifications** — `taxonomy/aesthetics.json` entries that
   classify the *visual style of cataloged components*; plus independent attributes
   in `taxonomy/attributes.json` and the source registry `taxonomy/sources.json`.
   Discovery facets are separate too: `types` (what it is), `triggers` (what starts
   the motion), `techniques` (how it moves) and `behaviors` (what input drives it).

- Themes live **only** in `taxonomy/themes.json`. Required tokens:
  `--rl-surface, --rl-surface-alt, --rl-text, --rl-text-muted, --rl-accent,
  --rl-accent-contrast, --rl-border, --rl-radius, --rl-font`.
- Optional (must inline-fallback): `--rl-shadow`, `--rl-focus`, `--rl-backdrop`.
- App assigns tokens via `[data-theme="<id>"]`; nothing else may declare colors outside
  taxonomy tokens — one exception: `src/styles/status.css` defines app-level status
  semantics (`--rl-status-stable|beta|experimental|deprecated` for release chips and
  `--rl-status-success|warning|danger` for tone-aware components, each with a `-bg`
  companion token), deliberately theme-independent (see MASTER_SPEC.md §10 M2 + checklist).
- App chrome consumes the same tokens.

## Placeholders

Registered in `IMPLEMENTATION_CHECKLIST.md` ("Placeholders" section). A placeholder is
allowed only behind an explicit registration; flip to working with evidence once done.
Current placeholders: **none**. The saved CodePen Multi-Page View Transition example is
**blocked**, not a placeholder: it needs an official URL, author and license before
`ingest-codepen` will write. OriginKit/GetLayers reference imports also remain blocked
until credentials/MCP access is configured. TabSheet arrow-key navigation shipped in M4.
