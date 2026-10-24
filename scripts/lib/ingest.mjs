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

// --- React Bits (animation-first source; see taxonomy/sources.json).
// Official registry exposes a shadcn-compatible item per variant:
//   https://reactbits.dev/r/{Name}-TS-CSS.json   <- vendored here (plain CSS)
//   https://reactbits.dev/r/{Name}-TS-TW.json    <- Tailwind (NOT vendored live)
// License: MIT + Commons Clause v1.0. Application use is permitted; the clause
// bars selling/sub-licensing the component source itself. Vendoring files into
// this catalog for preview and agent delivery is permitted with attribution.
export const REACT_BITS_BASE = "https://reactbits.dev";
export const REACT_BITS_LICENSE = {
  spdx: "MIT",
  note:
    "MIT + Commons Clause v1.0. Use in applications is permitted; do not sell or re-license the react-bits source itself. Vendored here with attribution for preview and agent delivery.",
};

export function reactBitsRegistryUrlFor(name, variant = "TS-CSS") {
  return `${REACT_BITS_BASE}/r/${name}-${variant}.json`;
}

export function reactBitsPageUrlFor(group, slug) {
  return `${REACT_BITS_BASE}/${group}/${slug}`;
}

export async function fetchReactBitsItem(name, variant = "TS-CSS", { fetchImpl = fetch } = {}) {
  const url = reactBitsRegistryUrlFor(name, variant);
  let response;
  try {
    // reactbits.dev sits behind Cloudflare; a declared UA avoids connect resets.
    response = await fetchImpl(url, { headers: { accept: "application/json", "user-agent": "react-library-catalog/1.0 (+https://reactbits.dev)" } });
  } catch (error) {
    return { registry: null, url, error: String((error && error.cause && error.cause.code) || error.message) };
  }
  if (response.status === 404) return { registry: null, url };
  if (!response.ok) {
    throw new Error(`react-bits registry returned ${response.status} for ${url}`);
  }
  const registry = await response.json();
  if (!registry || typeof registry !== "object" || !Array.isArray(registry.files)) {
    throw new Error(`react-bits registry payload for ${name}-${variant} is not a registry-item object`);
  }
  return { registry, url };
}

/** Non-relative package specifiers imported by the registry source. "react",
 *  "react-dom" and the app-owned "@/lib/utils" alias are tracked separately.
 *  Matching is anchored to real import/export statements (multi-line aware) so
 *  code embedded inside template literals or prose is never captured. */
const IMPORT_STATEMENT =
  /(?:^|[\r\n])[ \t]*(?:import|export)\s[^;\n]{0,600}?\bfrom\s*['"]([^'"]+)['"]|(?:^|[\r\n])[ \t]*import\s+['"]([^'"]+)['"]/g;

export function scanImports(sources) {
  const specifiers = new Set();
  const body = sources.join("\n");
  let match;
  IMPORT_STATEMENT.lastIndex = 0;
  while ((match = IMPORT_STATEMENT.exec(body))) {
    const specifier = match[1] || match[2];
    if (!specifier || specifier.startsWith(".") || specifier.startsWith("@/")) continue;
    // Scoped or first path segment defines the package.
    const pkg = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
    if (pkg) specifiers.add(pkg);
  }
  return [...specifiers];
}

const WEBGL_PACKAGES = new Set(["three", "@react-three/fiber", "@react-three/drei", "ogl"]);

/** Animation runtime class from declaration + scanned imports + source body.
 *  Some react-bits CSS-variant components implement WebGL directly (no three):
 *  a raw webgl/webgl2 context marks them webgl even without a GL library. */
export function reactBitsRuntime({ dependencies = [], imports = [], cssSources = [], sources = [] }) {
  const pkgs = [...dependencies.map((dep) => String(dep).split("@")[0] || dep), ...imports];
  const body = sources.join("\n");
  const directWebGL = /getContext\s*\(\s*['"]webgl2?['"]/.test(body);
  if (pkgs.some((pkg) => WEBGL_PACKAGES.has(pkg)) || directWebGL) return "webgl";
  if (pkgs.includes("matter-js")) return "physics";
  if (pkgs.includes("tailwindcss") || cssSources.some((css) => /@apply|\@tailwind/.test(css))) {
    return "tailwind";
  }
  if (pkgs.includes("gsap")) return "gsap";
  if (pkgs.includes("motion") || pkgs.includes("framer-motion")) return "motion";
  return "dom";
}

export function importPackages(sources) {
  return scanImports(sources).filter((pkg) => !(pkg === "react" || pkg === "react-dom"));
}


// --- Magic UI (MIT, official shadcn-compatible registry at https://magicui.design).
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

// --- React Bits curation (M6 correction: animation-first).
// Displays name -> reactbits.dev group. The adapter verifies every registry
// item live; anything that 404s is skipped (never fabricated). `overrides`
// carries per-item category/aesthetics/heavy facts; everything else derives
// from the registry payload.
export const REACT_BITS_CURATED = [
  // Text animations.
  { name: "SplitText", group: "text-animations", aesthetics: ["editorial", "playful"] },
  { name: "ScrambledText", group: "text-animations", aesthetics: ["cyberpunk", "brutalist"] },
  { name: "DecryptedText", group: "text-animations", aesthetics: ["cyberpunk"] },
  { name: "ShinyText", group: "text-animations", aesthetics: ["luxury", "playful"] },
  { name: "GradientText", group: "text-animations", aesthetics: ["playful", "cyberpunk"] },
  { name: "BlurText", group: "text-animations", aesthetics: ["minimal", "editorial"] },
  { name: "TextType", group: "text-animations", aesthetics: ["retro-synthwave", "brutalist"] },
  { name: "RotatingText", group: "text-animations", aesthetics: ["minimal", "editorial"] },
  { name: "GlitchText", group: "text-animations", aesthetics: ["cyberpunk", "retro-synthwave", "brutalist"] },
  { name: "FallingText", group: "text-animations", aesthetics: ["playful", "organic"], heavy: true },
  { name: "TextPressure", group: "text-animations", aesthetics: ["brutalist", "editorial"] },
  { name: "CountUp", group: "text-animations", category: "display", aesthetics: ["minimal", "professional"] },
  { name: "CircularText", group: "text-animations", aesthetics: ["editorial", "playful"] },
  // Animations (motion primitives).
  { name: "AnimatedContent", group: "animations", aesthetics: ["minimal", "professional"] },
  { name: "FadeContent", group: "animations", aesthetics: ["minimal", "professional"] },
  { name: "ClickSpark", group: "animations", aesthetics: ["gaming", "playful"] },
  { name: "Magnet", group: "animations", aesthetics: ["playful", "minimal"] },
  { name: "PixelTransition", group: "animations", category: "layout", aesthetics: ["retro-synthwave", "gaming"] },
  { name: "MetaBalls", group: "animations", aesthetics: ["organic", "playful"] },
  { name: "GlareHover", group: "animations", category: "layout", aesthetics: ["luxury", "futuristic"] },
  { name: "StarBorder", group: "animations", category: "layout", aesthetics: ["futuristic", "cyberpunk"] },
  { name: "Ribbons", group: "animations", aesthetics: ["futuristic", "editorial"] },
  { name: "BlobCursor", group: "animations", aesthetics: ["organic", "playful"] },
  // Backgrounds.
  { name: "Aurora", group: "backgrounds", aesthetics: ["futuristic", "organic"] },
  { name: "Particles", group: "backgrounds", aesthetics: ["minimal", "futuristic"] },
  { name: "Lightning", group: "backgrounds", aesthetics: ["cyberpunk", "gaming"] },
  { name: "DotGrid", group: "backgrounds", aesthetics: ["minimal", "futuristic"] },
  { name: "Beams", group: "backgrounds", aesthetics: ["cyberpunk", "futuristic"] },
  { name: "Waves", group: "backgrounds", aesthetics: ["organic", "minimal"] },
  { name: "Ballpit", group: "backgrounds", aesthetics: ["playful", "futuristic"], heavy: true },
  { name: "LetterGlitch", group: "backgrounds", aesthetics: ["cyberpunk", "brutalist"] },
  { name: "GridMotion", group: "backgrounds", aesthetics: ["editorial", "brutalist"] },
  { name: "Noise", group: "backgrounds", aesthetics: ["brutalist", "organic"] },
  { name: "MagnetLines", group: "backgrounds", aesthetics: ["futuristic", "minimal"] },
  // Components (nav, surfaces, sections).
  { name: "Dock", group: "components", category: "navigation", aesthetics: ["minimal", "professional", "playful"] },
  { name: "BubbleMenu", group: "components", category: "navigation", aesthetics: ["playful", "casual"] },
  { name: "GooeyNav", group: "components", category: "navigation", aesthetics: ["playful", "organic"] },
  { name: "StaggeredMenu", group: "components", category: "navigation", aesthetics: ["minimal", "editorial"] },
  { name: "FlowingMenu", group: "components", category: "navigation", aesthetics: ["editorial", "luxury"] },
  { name: "CardNav", group: "components", category: "navigation", aesthetics: ["professional", "minimal"] },
  { name: "Masonry", group: "components", category: "page-sections", aesthetics: ["editorial", "casual"] },
  { name: "Carousel", group: "components", category: "page-sections", aesthetics: ["editorial", "minimal"] },
  { name: "Stack", group: "components", category: "page-sections", aesthetics: ["playful", "casual"], heavy: true },
  { name: "CircularGallery", group: "components", category: "page-sections", aesthetics: ["editorial", "luxury"] },
  { name: "AnimatedList", group: "components", category: "feedback", aesthetics: ["playful", "casual"] },
  { name: "Counter", group: "components", category: "display", aesthetics: ["minimal", "professional"] },
  { name: "TiltedCard", group: "components", category: "layout", aesthetics: ["futuristic", "editorial"] },
  { name: "BorderGlow", group: "components", category: "layout", aesthetics: ["cyberpunk", "futuristic"] },
  { name: "SpotlightCard", group: "components", category: "layout", aesthetics: ["minimal", "professional"] },
  { name: "PixelCard", group: "components", category: "layout", aesthetics: ["gaming", "retro-synthwave"] },
  { name: "ChromaGrid", group: "components", category: "layout", aesthetics: ["cyberpunk", "editorial"] },
  { name: "GlassSurface", group: "components", category: "layout", aesthetics: ["luxury", "minimal"] },
  { name: "Stepper", group: "components", category: "inputs", aesthetics: ["minimal", "professional"] },
  { name: "ElasticSlider", group: "components", category: "inputs", aesthetics: ["playful", "minimal"] },
  { name: "MetallicPaint", group: "backgrounds", aesthetics: ["futuristic", "luxury"] },
  { name: "LaserFlow", group: "backgrounds", aesthetics: ["cyberpunk", "futuristic"] },
  { name: "FluidGlass", group: "backgrounds", aesthetics: ["futuristic", "organic"] },
];

// React Bits items kept as external references (code can run only in the
// official stack; stored as verified links + retrieval, same as M5.2).
export const REACT_BITS_EXTERNAL_CURATED = [
  {
    name: "Lanyard",
    group: "components",
    category: "3d-webgl",
    aesthetics: ["futuristic", "playful"],
    summary: "3D team logo card swinging on a physics lanyard, powered by three.js",
  },
  {
    name: "DomeGallery",
    group: "components",
    category: "3d-webgl",
    aesthetics: ["futuristic", "editorial"],
    summary: "images curved around an inner sphere and orbiting as a gallery dome",
  },
  {
    name: "Hyperspeed",
    group: "backgrounds",
    category: "3d-webgl",
    aesthetics: ["futuristic", "cyberpunk"],
    summary: "warp-speed animated starfield background built with three.js",
  },
  {
    name: "Iridescence",
    group: "backgrounds",
    category: "3d-webgl",
    aesthetics: ["futuristic", "organic"],
    summary: "colorful iridescent shader background that reacts to the cursor",
  },
];

export function humanizeReactBitsName(name) {
  // "SplitText" -> "Split Text", "DotGrid" -> "Dot Grid", "Ballpit" -> "Ballpit".
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
}

export function reactBitsSlugFor(registryName) {
  return humanizeReactBitsName(registryName).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const REACT_BITS_BASE_ATTRIBUTES = ["react", "typescript", "css", "animated"];

/** Composes the component.json manifest mirroring the M5 adapter shape. */
export function composeReactBitsManifest(name, group, registry, url, { fetchedAt }) {
  const slug = reactBitsSlugFor(name);
  return {
    entryId: `react-bits-${slug}`,
    source: "react-bits",
    externalId: name,
    registryItem: registry.name ?? `${name}-TS-CSS`,
    registryVariant: "TS-CSS",
    registryUrl: url,
    docsUrl: reactBitsPageUrlFor(group, slug),
    group,
    type: registry.type ?? "registry:component",
    files: (registry.files ?? []).map((file) => ({ path: fileBasename(file.path), type: file.type ?? "registry:component" })),
    dependencies: registry.dependencies ?? [],
    registryDependencies: registry.registryDependencies ?? [],
    license: REACT_BITS_LICENSE,
    fetchedAt,
  };
}

/** Merges the scanned imports + declared dependencies into honest dep records. */
function reactBitsDependencies(registry) {
  const declared = (registry.dependencies ?? []).map((dep) => String(dep).split("@")[0] || String(dep));
  const scanned = importPackages((registry.files ?? []).map((file) => file.content ?? ""));
  const body = (registry.files ?? []).map((file) => file.content ?? "").join("\n");
  const deps = [];
  const push = (name, reason) => {
    if (!deps.some((dep) => dep.name === name)) deps.push({ name, reason });
  };
  for (const pkg of new Set([...scanned, ...declared])) {
    if (pkg === "react" || pkg === "react-dom") continue; // framework assumption, not a dep record
    if (pkg === "motion" || pkg === "framer-motion") {
      push("motion", "Animation runtime (the source imports motion/react or framer-motion).");
    } else if (pkg.startsWith("@gsap")) {
      push("@gsap/react", "Declared by the official registry item (useGSAP helper).");
    } else if (pkg.startsWith("@hugeicons")) {
      push("@hugeicons/react", "Icon runtime used by the official source (free icons).");
      push("@hugeicons/core-free-icons", "Icon data package required by @hugeicons/react.");
    } else {
      push(pkg, "Declared by the official registry item or imported by the vendored source.");
    }
  }
  if (body.includes("@/lib/utils")) {
    push("cn", "shadcn cn() class-merging helper; this app provides src/lib/cn.ts as the '@/lib/utils' alias.");
  }
  return deps;
}

/** Composes one vendored React Bits catalog entry. */
export function composeReactBitsEntry(name, group, registry, { fetchedAt, overrides = {} }) {
  const files = (registry.files ?? []).map((file) => fileBasename(file.path));
  if (files.length === 0) throw new Error(`React Bits item ${name}: registry exposes no files`);
  const slug = reactBitsSlugFor(name);
  const localDir = `catalog/components/react-bits/${slug}`;
  const docsUrl = reactBitsPageUrlFor(group, slug);
  const deps = reactBitsDependencies(registry);
  const cssContent = (registry.files ?? [])
    .filter((file) => String(file.path ?? "").endsWith(".css"))
    .map((file) => file.content ?? "");
  const runtime = reactBitsRuntime({
    dependencies: deps.map((dep) => dep.name),
    imports: [],
    cssSources: cssContent,
    sources: (registry.files ?? []).map((file) => file.content ?? ""),
  });
  const body = (registry.files ?? []).map((file) => file.content ?? "").join("\n");
  const usesCanvas = /<canvas|getContext\(/.test(body);
  const liveBase = runtime === "dom" || runtime === "gsap" || runtime === "motion" || runtime === "physics";
  const live = liveBase && !(overrides.live === false);
  const displayName = humanizeReactBitsName(name);
  const description = String(registry.description ?? "").trim();
  const summaryBase = description || `${displayName} from React Bits`;
  const summary = `${displayName}: ${summaryBase}`.slice(0, 140);
  const preview = live
    ? { type: "local-demo", note: "Live preview renders the vendored component in the preview workspace." }
    : {
        type: runtime === "webgl" ? "source-link" : "external",
        url: docsUrl,
        note:
          runtime === "webgl"
            ? "WebGL/WebGPU component: source is vendored for the target project; the live demo runs on the official site."
            : "Preview requires component styling outside this app's runtime; see the official demo.",
      };
  const attributes = [...REACT_BITS_BASE_ATTRIBUTES];
  if (runtime === "gsap") attributes.push("gsap");
  if (runtime === "motion") attributes.push("motion");
  if (runtime === "webgl") attributes.push("webgl");
  if (usesCanvas) attributes.push("canvas");
  return {
    id: `react-bits-${slug}`,
    name: `${displayName} (React Bits)`,
    summary,
    description:
      `${displayName} is vendored from the official React Bits registry (MIT + Commons Clause v1.0) in the ` +
      `TypeScript + plain CSS variant. ${description} The entry records the animation runtime (${runtime}) and ` +
      (live
        ? "the preview workspace renders it live."
        : "the live demo runs on reactbits.dev; this catalog vendors the code for reference and agent delivery."),
    category: overrides.category ?? (group === "text-animations" ? "text-effects" : group === "backgrounds" ? "backgrounds" : "motion"),
    themes: ["brutalist-print", "classic-clean", "midnight-glass", "neon-cyberpunk", "retro-terminal", "soft-pastel"],
    aliases: [...new Set([name.toLowerCase(), slug])],
    tags: ["react-bits", "animation", slug, ...displayName.toLowerCase().split(" ")].filter(
      (tag, index, list) => list.indexOf(tag) === index,
    ),
    status: "stable",
    version: "0.1.0",
    addedDate: fetchedAt,
    externalDependencies: [],
    props: [],
    entryType: "local",
    source: "react-bits",
    sourceUrl: docsUrl,
    externalId: name,
    retrieval: `npx shadcn@latest add ${REACT_BITS_BASE}/r/${name}-TS-CSS.json (official registry), or use the vendored files in ${localDir}/`,
    preview,
    localDir,
    manifest: `${localDir}/component.json`,
    implementation: files.map((file) => `${localDir}/${file}`),
    dependencies: deps,
    license: REACT_BITS_LICENSE,
    runtime,
    heavy: Boolean(overrides.heavy) || undefined,
    aesthetics: overrides.aesthetics ?? ["minimal"],
    attributes: [...new Set(attributes)],
    syncedAt: fetchedAt,
  };
}

/** Composes an external-only React Bits reference entry (no vendored code). */
export function composeReactBitsExternalEntry(name, group, { fetchedAt, overrides = {} }) {
  const slug = reactBitsSlugFor(name);
  const displayName = humanizeReactBitsName(name);
  const docsUrl = reactBitsPageUrlFor(group, slug);
  return {
    id: `react-bits-${slug}`,
    name: `${displayName} (React Bits)`,
    summary: `${displayName}: React Bits 3D/WebGL showcase (${String(overrides.summary ?? "")}).`.slice(0, 140),
    description:
      `${displayName} is a React Bits showcase entry kept as an external reference. Its implementation relies on ` +
      `three.js/OGL, which this catalog does not vendor; the entry records verified official links and retrieval ` +
      `so the receiving agent can pull it from the official registry when the target project supports WebGL.`,
    category: overrides.category ?? "3d-webgl",
    themes: ["brutalist-print", "classic-clean", "midnight-glass", "neon-cyberpunk", "retro-terminal", "soft-pastel"],
    aliases: [...new Set([name.toLowerCase(), slug])],
    tags: ["react-bits", "animation", "webgl", slug].filter((tag, index, list) => list.indexOf(tag) === index),
    status: "stable",
    version: "0.1.0",
    addedDate: fetchedAt,
    externalDependencies: [],
    props: [],
    entryType: "external",
    source: "react-bits",
    sourceUrl: docsUrl,
    externalId: name,
    retrieval: `npx shadcn@latest add ${REACT_BITS_BASE}/r/${name}-TS-TW.json (official registry; fetches code licensed MIT + Commons Clause).`,
    preview: { type: "source-link", url: docsUrl, note: "WebGL demo; the live animation runs on the official site." },
    license: REACT_BITS_LICENSE,
    aesthetics: overrides.aesthetics ?? ["futuristic"],
    attributes: ["react", "typescript", "webgl", "3d", "animated"],
    syncedAt: fetchedAt,
  };
}

/** Like mergeEntry, but replaces an existing same-source id (ingestion v2). */
export function replaceEntry(catalog, entry) {
  const entries = [...catalog.entries];
  const existing = entries.findIndex((candidate) => candidate.id === entry.id);
  if (existing < 0) return mergeEntry(catalog, entry);
  entries[existing] = entry;
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { catalog: { ...catalog, entries }, merged: true, reason: `entry "${entry.id}" replaced (react-bits vendored)` };
}
