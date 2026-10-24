// Pure ingestion helpers for source adapters (zero dependencies).
// Network lives in the scripts/*.mjs adapters; tests exercise the pure parts.
// Policy (MASTER_SPEC §10 M5, taxonomy/sources.json): local vendoring only from
// permissive, officially-published code; everything else stays reference-only.
export const SHADCN_STYLE = "new-york-v4";
export const SHADCN_REGISTRY_BASE = `https://ui.shadcn.com/r/styles/${SHADCN_STYLE}`;

/** Fetches one registry item over the official JSON API. Returns null on 404. */
export async function fetchShadcnItem(item, { fetchImpl = fetch } = {}) {
  const url = registryUrlFor(item);
  const response = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (response.status === 404) return { registry: null, url };
  if (!response.ok) {
    throw new Error(`shadcn registry returned ${response.status} for ${url}`);
  }
  const registry = await response.json();
  if (!registry || typeof registry !== "object" || !Array.isArray(registry.files)) {
    throw new Error(`shadcn registry payload for ${item} is not a registry-item object`);
  }
  return { registry, url };
}

export function registryUrlFor(item) {
  return `${SHADCN_REGISTRY_BASE}/${item}.json`;
}

export function docsUrlFor(item) {
  return `https://ui.shadcn.com/docs/components/${item}`;
}

/** Title-case display name for a registry slug: "dropdown-menu" -> "Dropdown Menu". */
export function titleForSlug(slug) {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/** Basename of a registry file path, POSIX-safe: "registry/x/ui/button.tsx" -> "button.tsx". */
export function fileBasename(registryPath) {
  const normalized = String(registryPath).replace(/\\/g, "/");
  const name = normalized.split("/").pop() || normalized;
  return name;
}

/** Curated classification for ingested shadcn items.
 *  anything missing falls back to the professional default. */
const ANIMATED_ITEMS = new Set([
  "accordion", "dialog", "dropdown-menu", "hover-card", "navigation-menu", "popover",
  "progress", "skeleton", "slider", "sonner", "switch", "tabs", "tooltip",
]);

export function shadcnClassification(item) {
  const category = item === "tabs" ? "tabs"
    : item === "dialog" || item === "sheet" ? "modals"
    : ["tooltip", "hover-card", "popover"].includes(item) ? "tooltips"
    : item === "skeleton" || item === "progress" || item === "sonner" ? "loaders"
    : ["breadcrumb", "dropdown-menu", "navigation-menu", "command"].includes(item) ? "navigation"
    : ["input", "textarea", "select", "checkbox", "switch", "slider", "label", "form"].includes(item) ? "inputs"
    : ["button", "toggle", "pagination"].includes(item) ? "buttons"
    : ["avatar", "badge", "calendar", "carousel"].includes(item) ? "display"
    : item === "alert" ? "feedback"
    : "layout";
  return {
    category,
    aesthetics: item === "badge" ? ["professional", "minimal"] : ["professional"],
    attributes: [
      "react", "typescript", "tailwind", "light", "dark",
      ANIMATED_ITEMS.has(item) ? "animated" : "static", "rounded",
    ],
  };
}

/** Composes the on-disk component.json manifest for one vendored registry item. */
export function composeShadcnManifest(item, registry, url, { fetchedAt }) {
  return {
    entryId: `shadcn-${item}`,
    source: "shadcn",
    externalId: item,
    registryItem: registry.name ?? item,
    registryStyle: SHADCN_STYLE,
    registryUrl: url,
    docsUrl: docsUrlFor(item),
    type: registry.type ?? "registry:ui",
    files: (registry.files ?? []).map((file) => ({ path: fileBasename(file.path), type: file.type ?? "registry:ui" })),
    dependencies: registry.dependencies ?? [],
    registryDependencies: registry.registryDependencies ?? [],
    license: { spdx: "MIT", note: "Vendored from the official shadcn/ui registry; keep the original copyright notice." },
    fetchedAt,
  };
}

/** Composes the catalog entry for one vendored registry item.
 *  Preconditions enforced by the caller: registry has >= 1 file; item slug is valid. */
export function composeShadcnEntry(item, registry, { fetchedAt }) {
  const files = (registry.files ?? []).map((file) => fileBasename(file.path));
  if (files.length === 0) throw new Error(`shadcn item ${item}: registry exposes no files`);
  const localDir = `catalog/components/shadcn/${item}`;
  const classification = shadcnClassification(item);
  const name = titleForSlug(item);
  return {
    id: `shadcn-${item}`,
    name: `${name} (shadcn)`,
    summary: `${name}: accessible shadcn/ui React + Tailwind component, vendored with manifest for the target project.`,
    description:
      `${name} is vendored from the official shadcn/ui registry (MIT). The manifest records its registry ` +
      `dependencies and file layout; the target project integrates it through Tailwind with its own design tokens. ` +
      `The React Library app previews it via the official docs, since Tailwind is not part of this app's runtime.`,
    category: classification.category,
    themes: ["brutalist-print", "classic-clean", "midnight-glass", "neon-cyberpunk", "retro-terminal", "soft-pastel"],
    aliases: [],
    tags: ["shadcn", "tailwind", ...classification.category.split("-"), "vendored"].filter(
      (tag, index, list) => list.indexOf(tag) === index,
    ),
    status: "stable",
    version: "0.1.0",
    addedDate: fetchedAt,
    externalDependencies: [],
    props: [],
    entryType: "local",
    source: "shadcn",
    sourceUrl: docsUrlFor(item),
    externalId: item,
    retrieval: `npx shadcn@latest add ${registryUrlFor(item)} (official CLI), or use the vendored files in ${localDir}/`,
    preview: { type: "external", url: docsUrlFor(item) },
    localDir,
    manifest: `${localDir}/component.json`,
    implementation: files.map((file) => `${localDir}/${file}`),
    dependencies: [...(registry.dependencies ?? []).map((dep) => ({ name: dep }))],
    license: { spdx: "MIT", note: "Vendored from the official shadcn/ui registry; keep the original copyright notice." },
    aesthetics: classification.aesthetics,
    attributes: classification.attributes,
    syncedAt: fetchedAt,
  };
}

/** Merges one entry into catalog JSON text, keeping entries sorted by id and
 *  never overwriting an existing id. Returns the new parsed catalog object. */
export function mergeEntry(catalog, entry) {
  const entries = [...catalog.entries];
  const existing = entries.findIndex((candidate) => candidate.id === entry.id);
  if (existing >= 0) {
    return { catalog, merged: false, reason: `entry "${entry.id}" already exists (kept unmodified)` };
  }
  entries.push(entry);
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { catalog: { ...catalog, entries }, merged: true };
}

// --- Magic UI (MIT, official shadcn-compatible registry at https://magicui.design)

export const MAGIC_REGISTRY_BASE = "https://magicui.design/r";

export function magicRegistryUrlFor(item) {
  return `${MAGIC_REGISTRY_BASE}/${item}.json`;
}

export async function fetchMagicUiItem(item, { fetchImpl = fetch } = {}) {
  const url = magicRegistryUrlFor(item);
  const response = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (response.status === 404) return { registry: null, url };
  if (!response.ok) {
    throw new Error(`Magic UI registry returned ${response.status} for ${url}`);
  }
  const registry = await response.json();
  if (!registry || typeof registry !== "object" || !Array.isArray(registry.files)) {
    throw new Error(`Magic UI registry payload for ${item} is not a registry-item object`);
  }
  return { registry, url };
}

const MAGIC_CLASSIFICATIONS = {
  "dot-pattern": {
    category: "backgrounds",
    aesthetics: ["minimal", "professional"],
    attributes: ["react", "typescript", "tailwind", "light", "dark", "static", "geometric"],
  },
  "word-rotate": {
    category: "text-effects",
    aesthetics: ["editorial", "minimal"],
    attributes: ["react", "typescript", "tailwind", "light", "dark", "animated"],
  },
  "blur-fade": {
    category: "scroll-animations",
    aesthetics: ["minimal", "professional"],
    attributes: ["react", "typescript", "tailwind", "light", "dark", "animated", "scroll-driven"],
  },
  "border-beam": {
    category: "display",
    aesthetics: ["futuristic", "professional"],
    attributes: ["react", "typescript", "tailwind", "light", "dark", "animated", "gradient"],
  },
};

export function magicClassification(item) {
  return (
    MAGIC_CLASSIFICATIONS[item] ?? {
      category: "layout",
      aesthetics: ["minimal"],
      attributes: ["react", "typescript", "tailwind", "static"],
    }
  );
}

export function composeMagicUiManifest(item, registry, url, { fetchedAt }) {
  return {
    entryId: `magic-ui-${item}`,
    source: "magic-ui",
    externalId: item,
    registryItem: registry.name ?? item,
    registryUrl: url,
    docsUrl: `https://magicui.design/docs/components/${item}`,
    type: registry.type ?? "registry:ui",
    files: (registry.files ?? []).map((file) => ({ path: fileBasename(file.path), type: file.type ?? "registry:ui" })),
    dependencies: registry.dependencies ?? [],
    registryDependencies: registry.registryDependencies ?? [],
    license: { spdx: "MIT", note: "Vendored from the official Magic UI registry; keep the original copyright notice." },
    fetchedAt,
  };
}

export function composeMagicUiEntry(item, registry, { fetchedAt }) {
  const files = (registry.files ?? []).map((file) => fileBasename(file.path));
  if (files.length === 0) throw new Error(`Magic UI item ${item}: registry exposes no files`);
  const localDir = `catalog/components/magic-ui/${item}`;
  const classification = magicClassification(item);
  const name = registry.title ?? titleForSlug(item);
  // The vendored file is the source of truth for runtime imports; motion and the
  // cn() helper are the two imports Magic UI components consistently use.
  const body = registry.files.map((file) => file.content ?? "").join("\n");
  const dependencies = [];
  if (body.includes("motion/react")) {
    dependencies.push({ name: "motion", reason: "Animation runtime (components import motion/react)." });
  }
  if (body.includes("@/lib/utils")) {
    dependencies.push({ name: "cn", reason: "shadcn's cn() helper alias (@/lib/utils) used for class merging." });
  }
  for (const dep of registry.dependencies ?? []) {
    if (!dependencies.some((existing) => existing.name === dep)) {
      dependencies.push({ name: dep, reason: "Declared by the official registry item." });
    }
  }
  return {
    id: `magic-ui-${item}`,
    name: `${name} (Magic UI)`,
    summary: `${name}: Magic UI animated component, vendored with manifest; integrates via Tailwind in the target project.`,
    description:
      `${name} is vendored from the official Magic UI registry (MIT). The component pairs with shadcn/ui and uses ` +
      `Tailwind classes plus the cn() helper; see the recorded dependencies. The React Library app previews it via ` +
      `the official docs since Tailwind is not part of this app's runtime.`,
    category: classification.category,
    themes: ["brutalist-print", "classic-clean", "midnight-glass", "neon-cyberpunk", "retro-terminal", "soft-pastel"],
    aliases: [],
    tags: ["magic-ui", "tailwind", "animation", ...classification.category.split("-")].filter(
      (tag, index, list) => list.indexOf(tag) === index,
    ),
    status: "stable",
    version: "0.1.0",
    addedDate: fetchedAt,
    externalDependencies: [],
    props: [],
    entryType: "local",
    source: "magic-ui",
    sourceUrl: `https://magicui.design/docs/components/${item}`,
    externalId: item,
    retrieval: `npx shadcn@latest add ${magicRegistryUrlFor(item)} (official CLI), or use the vendored files in ${localDir}/`,
    preview: { type: "external", url: `https://magicui.design/docs/components/${item}` },
    localDir,
    manifest: `${localDir}/component.json`,
    implementation: files.map((file) => `${localDir}/${file}`),
    dependencies,
    license: { spdx: "MIT", note: "Vendored from the official Magic UI registry; keep the original copyright notice." },
    aesthetics: classification.aesthetics,
    attributes: classification.attributes,
    syncedAt: fetchedAt,
  };
}
