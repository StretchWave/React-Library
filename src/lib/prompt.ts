// Master-prompt builder (M5.5, MASTER_SPEC §8). Assembles the generation prompt
// ONLY from canonical catalog records: every fact printed here is derived from
// the entry data — official retrieval commands for external references, recorded
// repository paths for local entries, license notes verbatim. The builder is
// pure (no Date.now/random inside) so prompts are deterministic and testable.
import type { CatalogEntry } from "../catalog/types";
import { entryTypeOf } from "../catalog/types";
import { sourceById } from "../catalog/client";

export interface PromptOptions {
  /** Optional ISO timestamp; prompts stay deterministic without it. */
  generatedAt?: string;
  /** M7.5: an optional target-project name recorded in the prompt header so
   *  the consuming agent knows what it is assembling into. Deterministic. */
  targetProject?: string;
}

const RULES: string[] = [
  "Use the catalog records above as the ONLY trusted description of each component; do not invent extra props, APIs, or file names.",
  "For entries marked `local`, use/extend the recorded repository paths verbatim (and the component.json manifest when present) instead of reimplementing from memory.",
  "For entries marked `external reference`, use ONLY the official retrieval instructions shown; never fabricate local paths for them.",
  "Respect every license notice verbatim — components whose license forbids redistribution must be consumed through the official channel, not vendored.",
  "Verify any single record at any time with: npm run lookup -- <id> --json",
  "Declare where each selected component is used in the target project (which page/section it belongs to) and wire real responsive behavior: fluid sizing, safe wrap/scroll, and touch targets that work without hover-only interactions.",
  "Keep the target project's design constraints coherent: match the recorded aesthetics/attributes of each component to the surrounding theme, and honor prefers-reduced-motion where the component animates continuously.",
  "After integration, verify every component: no console errors, correct behavior at 375/768/1280 viewport widths, and the attribution/license notices intact in the shipped code.",
];

const WORKSPACE_PREVIEW: string = "live in the React Library preview workspace";

function licenseLine(entry: CatalogEntry): string | null {
  const license = entry.license;
  if (!license) return null;
  const parts = [license.spdx ? `SPDX ${license.spdx}` : null];
  if (license.note) parts.push(`notice: ${license.note}`);
  if (license.url) parts.push(license.url);
  return parts.filter(Boolean).join(" — ") || null;
}

function localPathsSection(entry: CatalogEntry): string[] {
  const lines: string[] = [];
  if (entry.manifest) lines.push(`- Manifest: ${entry.manifest}`);
  if ((entry.implementation ?? []).length > 0) {
    lines.push(`- Implementation files (copy verbatim): ${entry.implementation?.join(", ")}`);
  }
  if (entry.links?.source) lines.push(`- Source path in this repo: ${entry.links.source}`);
  if (entry.links?.demo) lines.push(`- In-app demo path: ${entry.links.demo}`);
  if (entry.retrieval) {
    lines.push(`- Official retrieval (alternative channel): ${entry.retrieval}`);
  }
  return lines;
}

function externalSection(entry: CatalogEntry): string[] {
  const lines: string[] = [];
  const sourceDoc = entry.source ? sourceById(entry.source) : undefined;
  const sourceName = sourceDoc?.name ?? entry.source ?? "unrecorded source";
  lines.push(`- Source library: ${sourceName}${sourceDoc ? ` (${sourceDoc.url})` : ""}`);
  if (sourceDoc?.license) lines.push(`- Upstream library license: ${sourceDoc.license}`);
  if (entry.retrieval) {
    lines.push(`- Official retrieval (use exactly): ${entry.retrieval}`);
  }
  const officialUrl = entry.sourceUrl ?? entry.preview?.url;
  if (officialUrl) lines.push(`- Official page: ${officialUrl}`);
  return lines;
}

/** Honest preview status derived from the record (mirrors the gallery rules:
 *  local-demo = runnable in the app's preview workspace; anything else names
 *  its limitation and the official URL). Records without a `preview` object
 *  resolve through their entry type: locals run in-app, externals do not. */
function previewLine(entry: CatalogEntry): string {
  const kind = entry.preview?.type;
  if (!kind) {
    if (entryTypeOf(entry) === "external") {
      return `- Preview: external only — rendered demo runs outside this app: ${entry.sourceUrl ?? "URL not recorded"}`;
    }
    return `- Preview: ${WORKSPACE_PREVIEW} (vetted in-app demo)`;
  }
  switch (kind) {
    case "local-demo": {
      const runtime = entry.runtime ? ` (runtime: ${entry.runtime})` : "";
      return `- Preview: ${WORKSPACE_PREVIEW}${runtime}`;
    }
    case "external":
      return `- Preview: external only — rendered demo runs outside this app: ${entry.preview?.url ?? "URL not recorded"}`;
    case "source-link":
      return `- Preview: vendored code is not runnable in this app — official demo only: ${entry.preview?.url ?? entry.sourceUrl ?? "URL not recorded"}`;
    case "static":
      return `- Preview: static resource — ${entry.preview?.url ?? "URL not recorded"}`;
    default:
      return "- Preview: none recorded for this entry yet";
  }
}

function entrySection(entry: CatalogEntry, position: number): string[] {
  const type = entryTypeOf(entry);
  const lines: string[] = [
    `## ${position}. ${entry.name} (${entry.id}) — ${type === "external" ? "external reference" : "local"}`,
    `- Category: ${entry.category} · Status: ${entry.status} · Version ${entry.version}`,
    `- Summary: ${entry.summary}`,
  ];
  if (entry.description) lines.push(`- Description: ${entry.description}`);
  lines.push(...(type === "external" ? externalSection(entry) : localPathsSection(entry)));
  lines.push(previewLine(entry));
  if (entry.heavy) {
    lines.push(`- Preview budget: heavy — let the user open it explicitly instead of auto-playing it.`);
  }
  const license = licenseLine(entry);
  if (license) lines.push(`- License terms: ${license}`);
  if ((entry.dependencies ?? []).length > 0) {
    lines.push(
      `- Requires in the target project: ${(entry.dependencies ?? [])
        .map((dep) => `${dep.name}${dep.reason ? ` (${dep.reason})` : ""}`)
        .join(", ")}`,
    );
  }
  if ((entry.aesthetics ?? []).length > 0) lines.push(`- Aesthetics: ${entry.aesthetics?.join(", ")}`);
  if ((entry.attributes ?? []).length > 0) lines.push(`- Attributes: ${entry.attributes?.join(", ")}`);
  if ((entry.props ?? []).length > 0) {
    lines.push(`- Documented props: ${entry.props.map((prop) => `${prop.name}: ${prop.type}`).join("; ")}`);
  }
  return lines;
}

/** Aggregated facts across the whole selection (deduplicated, order-stable). */
function globalSections(entries: CatalogEntry[]): { notices: string[]; dependencies: string[] } {
  const notices: string[] = [];
  const dependencies = new Map<string, { reason?: string; usedBy: string[] }>();
  for (const entry of entries) {
    const license = entry.license;
    if (license?.note) notices.push(`- ${entry.name} (${entry.id}): ${license.note}`);
    for (const dep of entry.dependencies ?? []) {
      const known = dependencies.get(dep.name);
      if (known) {
        known.usedBy.push(entry.name);
      } else {
        dependencies.set(dep.name, { reason: dep.reason, usedBy: [entry.name] });
      }
    }
  }
  return {
    notices,
    dependencies: [...dependencies.entries()].map(
      ([name, meta]) =>
        `- ${name}${meta.reason ? ` (${meta.reason})` : ""} — needed by ${meta.usedBy.join(", ")}`,
    ),
  };
}

export function buildMasterPrompt(
  ids: string[],
  allEntries: CatalogEntry[],
  options: PromptOptions = {},
): string {
  const byId = new Map(allEntries.map((entry) => [entry.id, entry]));
  const items: CatalogEntry[] = [];
  const skipped: string[] = [];
  for (const id of ids) {
    const entry = byId.get(id);
    if (entry) {
      items.push(entry);
    } else {
      skipped.push(id);
    }
  }

  const header = [
    "# Master prompt — React Library component build",
    "",
    `This prompt is assembled exclusively from the canonical React Library catalog (schema v2).`,
    `Selected components: ${items.length}${options.generatedAt ? ` · generated at ${options.generatedAt}` : ""}${options.targetProject ? ` · target project: ${options.targetProject}` : ""}`,
    `Selection order below is the user-defined order (position 1 = first).`,
  ];

  if (items.length === 0) {
    return [
      ...header,
      "",
      "No components are selected. Open the gallery, tick the checkboxes for the",
      "components to include (or add them from their detail views), and return here.",
    ].join("\n");
  }

  const { notices, dependencies } = globalSections(items);

  const lines: string[] = [
    ...header,
    "",
    "## Standing rules for the consuming agent",
    ...RULES.map((rule, index) => `${index + 1}. ${rule}`),
  ];

  if (notices.length > 0) {
    lines.push("", "## License notices that must be carried into the target project", ...notices);
  }
  if (dependencies.length > 0) {
    lines.push("", "## Runtime dependencies required across the selection", ...dependencies);
  }

  lines.push("", "## Selected components (in selection order)");
  items.forEach((entry, index) => {
    lines.push("", ...entrySection(entry, index + 1));
  });

  if (skipped.length > 0) {
    lines.push("", "## Honest skips", ...skipped.map((id) => `- ${id}: not in the catalog, skipped`));
  }

  return lines.join("\n");
}
