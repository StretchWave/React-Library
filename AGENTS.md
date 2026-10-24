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
   the checklist. The allowed set is exactly §12 (runtime `react`/`react-dom`; dev
   toolchain incl. `@testing-library/dom`, the mandatory peer of
   `@testing-library/react` v16). Test-only `node:test` suites in `tests/` must stay
   zero-dependency.
4. **Components style with `--rl-*` variables only** (see §Theming rules). No hex/rgb
   literals in `src/components/**/*.css`; `tests/css-theming.test.mjs` (M2+) enforces it.
5. **Honest status.** Unimplemented = placeholder, registered in
   `IMPLEMENTATION_CHECKLIST.md` with a reason. Never fake an acceptance criterion.
6. Paths in catalog `links` are repo-relative with forward slashes.

## Commands

| Command | Purpose |
|---|---|
| `npm run validate` | Validate catalog + taxonomy. Exit 1 on error. Flags: `--check-index`; `--skip-links` exists for pre-M3 phases only and is no longer needed now that component files exist. |
| `npm run generate` | Regenerate `catalog/index.json` (validates first). |
| `npm run lookup -- <q>` | Component lookup (see crib sheet). |
| `npm test` | Zero-dep tooling suites (`node --test tests/*.test.mjs`). |
| `npm run dev` / `build` / `preview` / `typecheck` | App toolchain (M1+). |
| `npm run test:app` | Vitest suites for the app (M1+). |
| `npm run verify` | Full release gate (M1+). Since M3 the link checks run everywhere — component files exist. |

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
| `catalog/catalog.json` | Canonical catalog | Update (then `npm run generate`). |
| `catalog/index.json` | Derived index | Never — generated. |
| `scripts/lib/catalog.mjs` | Shared tooling library | Keep 100% dependency-free. |
| `scripts/*.mjs` | CLIs | Keep dependency-free. |
| `tests/*.test.mjs` | Tooling tests (node:test) | Extend with behavior changes. |
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
6. `npm run validate` → `npm run generate` → `npm run lookup -- <id>` (prints correctly).
7. If the app consumes it: wire `src/catalog/demos.ts` + `usedFrom` and add a preview
   test where practical.
8. Update `README.md` component table + `IMPLEMENTATION_CHECKLIST.md`.
9. Run the gate (`npm run verify`). Only then is the component done.

## Lookup CLI crib sheet

```text
npm run lookup -- button                 # text record
npm run lookup -- btn --json             # JSON: single object = full entry
npm run lookup -- inp                    # ambiguous? ranked candidates listed
npm run lookup -- --list                 # all entries
npm run lookup -- --list --category inputs
npm run lookup -- button --theme retro-terminal
```

Exit codes: `0` found · `1` no match · `2` unknown filter id · `64` usage error.
`--json` prints exactly one JSON object on stdout (candidates mode:
`{ query, count, matches }`). Text mode prints the formatted record block.

## Theming rules (library code)

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
Known by design (not placeholders): TabSheet arrow-key navigation is scheduled for M4
(catalog `a11yNotes` states this). `--skip-links` is a scheduled-phase flag, removed at M3.
