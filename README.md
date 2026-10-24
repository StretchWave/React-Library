# React Library — agent-first component catalog + themable gallery

An agent-first React component library: a canonical machine-readable catalog, theme
taxonomy, and CLI tooling come first; a small React app browses the same data with live
themable previews. Primary spec: `MASTER_SPEC.md` — see below.

Spec: [`MASTER_SPEC.md`](./MASTER_SPEC.md) · Agent guide: [`AGENTS.md`](./AGENTS.md) ·
Progress: [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) ·
Schema: [`docs/SCHEMA.md`](./docs/SCHEMA.md)

## Status

| Area | Status |
|---|---|
| Foundations: catalog schema, theme taxonomy, generator, validator, lookup CLI, AGENTS doc | ✅ working (29/29 tooling tests) |
| App skeleton (M1): catalog-driven list + selection + detail empty state | ✅ working (verify gate green; browser-verified) |
| Component browser (M2): search, taxonomy filters, full detail pane | ✅ working |
| Theme engine + live previews (M3) | 🚧 in progress |
| Advanced interactions (M4) | ⏳ planned |

## Quickstart

```bash
npm install          # after node_modules exist
npm run validate     # validate catalog + taxonomy
npm run generate     # regenerate catalog/index.json (derived — never hand-edit)
npm run lookup -- button          # inspect a component
npm run lookup -- --list          # list everything
npm test             # zero-dependency tooling suites (node --test)
npm run dev          # React app (once M1 lands)
npm run verify       # full gate (once M1 lands)
```

> PowerShell note: pass CLI args after `--`, e.g. `npm run lookup -- btn --json`.

## Catalog at a glance

- Canonical data: `catalog/catalog.json` (schema v1 — `docs/SCHEMA.md`)
- Derived index: `catalog/index.json` (generated)
- Taxonomy: `taxonomy/themes.json` (6 themes), `taxonomy/categories.json` (6 categories)
- Components (planned 6): Alert, Badge, Button, Card, TabSheet, TextInput

## Components

| Component | id | Category | Status |
|---|---|---|---|
| Alert | `alert` | feedback | stable |
| Badge | `badge` | display | stable |
| Button | `button` | buttons | stable |
| Card | `card` | layout | stable |
| TabSheet | `tabs` | navigation | beta |
| TextInput | `text-input` | inputs | stable |

## Working features vs. planned

- **Working now:** catalog data + schema validation, index generation, lookup CLI
  (text/JSON/list/filter semantics with exit-code contract), 29 zero-dependency tests,
  full agent docs, React app skeleton (catalog list, selection, detail empty state).
- **Planned (see checklist):** search + category/theme filters + full detail pane (M2),
  theme engine + six real components with live previews (M3), advanced interactions
  (M4). Unimplemented work is tracked, never faked.
