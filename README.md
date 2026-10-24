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
| Foundations: catalog schema, theme taxonomy, generator, validator, lookup CLI, AGENTS doc | ✅ working (32/32 tooling tests) |
| App skeleton (M1): catalog-driven list + selection + detail empty state | ✅ working (verify gate green; browser-verified) |
| Component browser (M2): search, taxonomy filters, full detail pane | ✅ working |
| Theme engine + six real components + live previews (M3) | ✅ working |
| Advanced interactions (M4): TabSheet arrow keys, copy-usage, hash deep links | ✅ working |

## Browse features

- Catalog-driven component list with search (`/` to focus, `Esc` to clear) and
  category/theme taxonomy filters, with a resettable empty state.
- Detail pane per component: status chip, description, supported themes, props table,
  aliases, tags, source/demo links, a11y notes.
- Live preview rendered in the active theme; **Copy usage** puts a ready-to-paste
  snippet on your clipboard.
- Hash deep links: `#/component/<id>` restores the selection and cooperates with the
  browser's back/forward buttons.

## Quickstart

```bash
npm install          # after node_modules exist
npm run validate     # validate catalog + taxonomy
npm run generate     # regenerate catalog/index.json (derived — never hand-edit)
npm run lookup -- button          # inspect a component
npm run lookup -- --list          # list everything
npm test             # zero-dependency tooling suites (node --test)
npm run dev          # React app
npm run verify       # full release gate
```

> PowerShell note: pass CLI args after `--`, e.g. `npm run lookup -- btn --json`.

## Catalog at a glance

- Canonical data: `catalog/catalog.json` (schema v1 — `docs/SCHEMA.md`)
- Derived index: `catalog/index.json` (generated)
- Taxonomy: `taxonomy/themes.json` (6 themes), `taxonomy/categories.json` (6 categories)
- Components (6): Alert, Badge, Button, Card, TabSheet, TextInput

## Components

| Component | id | Category | Status |
|---|---|---|---|
| Alert | `alert` | feedback | stable |
| Badge | `badge` | display | stable |
| Button | `button` | buttons | stable |
| Card | `card` | layout | stable |
| TabSheet | `tabs` | navigation | beta |
| TextInput | `text-input` | inputs | stable |

## Working features vs. future work

- **Working now (all gated by `npm run verify`):** canonical catalog + schema validation,
  index generation, lookup CLI (text/JSON/list/filter semantics with exit-code contract),
  32 zero-dependency tooling tests; React app: catalog list, search + taxonomy filters,
  full detail pane, theme engine (6 themes, persisted, auto), six themed components with
  demos, live previews, copy-usage snippet, TabSheet arrow-key navigation, hash deep
  links — plus 54 app tests. Nothing here is faked; every ✅ above has recorded evidence.
- **Future work (explicitly deferred, see checklist §6):** JSON Schema export,
  multi-theme preview grid, richer catalog fields, publishing pipeline.
