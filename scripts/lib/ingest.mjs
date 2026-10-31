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
    // M6.6 everything-local: all four Magic UI items render live through
    // reviewed showcases (motion/react is already in the runtime union;
    // src/lib/cn.ts backs their "@/lib/utils" import; Tailwind classes ship
    // verbatim to the target project and the stage bridges layout tokens).
    preview: {
      type: "local-demo",
      note: "Live preview renders the vendored component in the preview workspace (token-bridge styling; no external page).",
    },
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
  // M6.6 "everything-local": raw-WebGL variants run locally as heavy workspace
  // stages (19 hand-rolled WebGL2 + blob-cursor/hyperspeed/lanyard on three.js).
  const liveBase = runtime === "dom" || runtime === "gsap" || runtime === "motion" || runtime === "physics" || runtime === "webgl";
  const live = liveBase && !(overrides.live === false);
  const displayName = humanizeReactBitsName(name);
  const description = String(registry.description ?? "").trim();
  const summaryBase = description || `${displayName} from React Bits`;
  const summary = `${displayName}: ${summaryBase}`.slice(0, 140);
  const preview = live
    ? {
        type: "local-demo",
        note:
          runtime === "webgl"
            ? "Live local preview renders the vendored component on this machine's GPU."
            : "Live preview renders the vendored component in the preview workspace.",
      }
    : {
        type: "external",
        url: docsUrl,
        note: "Preview requires a runtime outside this app's union; see the official demo.",
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
    heavy: Boolean(overrides.heavy) || (runtime === "webgl" ? true : undefined),
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
  return { catalog: { ...catalog, entries }, merged: true, reason: `entry "${entry.id}" replaced (same source id)` };
}

// --- Reference-only source adapters (M7.6) ----------------------------------
// CodePen, Aceternity, 21st.dev, OriginKit, Pryzm, Ditther, GetLayers and the
// manual Uiverse/HyperUI sources stay external references. Nothing here fetches
// or copies source: the official URL, terms and attribution are recorded, and
// the app links out. This is the honest path for author-owned or restricted
// material.
const REFERENCE_THEMES = [
  "brutalist-print",
  "classic-clean",
  "midnight-glass",
  "neon-cyberpunk",
  "retro-terminal",
  "soft-pastel",
];

const DEDICATED_SOURCE_IDS = new Set(["shadcn", "magic-ui", "react-bits"]);

const CATEGORY_TYPE = {
  buttons: "button",
  inputs: "input",
  layout: "layout",
  display: "display",
  feedback: "feedback",
  navigation: "navigation",
  tabs: "tabs",
  tooltips: "tooltip",
  modals: "modal",
  "hero-sections": "section",
  "pricing-sections": "section",
  footers: "section",
  backgrounds: "background",
  gradients: "gradient",
  "text-effects": "text-effect",
  loaders: "loader",
  cursors: "cursor",
  charts: "chart",
  "3d-webgl": "scene",
  "scroll-animations": "motion",
  "page-sections": "section",
  "page-layouts": "template",
  templates: "template",
  transitions: "transition",
  "visual-effect-recipes": "visual-effect-recipe",
  scenes: "scene",
  motion: "motion",
  "micro-interactions": "micro-interaction",
};

const TYPE_CATEGORY = {
  button: "buttons",
  input: "inputs",
  card: "display",
  navigation: "navigation",
  "text-effect": "text-effects",
  loader: "loaders",
  background: "backgrounds",
  gradient: "gradients",
  section: "hero-sections",
  template: "templates",
  transition: "transitions",
  scene: "3d-webgl",
  "visual-effect-recipe": "visual-effect-recipes",
  modal: "modals",
  tooltip: "tooltips",
  tabs: "tabs",
  chart: "charts",
  cursor: "cursors",
  layout: "layout",
  feedback: "feedback",
  motion: "scroll-animations",
  "micro-interaction": "micro-interactions",
  display: "display",
};

const TRIGGER_BEHAVIOR = {
  "automatic-loop": "auto",
  mount: "auto",
  hover: "hover",
  click: "click",
  "cursor-reactive": "cursor-reactive",
  drag: "draggable",
  scroll: "scroll",
  "viewport-entry": "scroll",
  gesture: "gesture",
  physics: "auto",
  keyboard: "stateful",
  "route-transition": "click",
  "state-change": "stateful",
  static: "static",
};

const TECHNIQUE_TERMS = [
  ["fade", "fade"],
  ["slide", "slide"],
  ["blur", "blur"],
  ["glitch", "glitch"],
  ["scroll", "scroll"],
  ["rotate", "rotation"],
  ["grain", "noise"],
  ["noise", "noise"],
  ["particle", "particles"],
  ["gradient", "gradient-shift"],
  ["glow", "glow"],
  ["shimmer", "shimmer"],
  ["stagger", "stagger"],
  ["mask", "reveal-mask"],
  ["elastic", "elastic"],
  ["morph", "morphing"],
  ["transition", "reveal-mask"],
  ["dither", "dithering"],
  ["pixel", "pixelation"],
  ["wave", "wave"],
  ["orbit", "orbit"],
  ["depth", "depth"],
  ["flip", "flip"],
  ["marquee", "marquee"],
  ["3d", "depth"],
  ["glass", "glass"],
  ["metal", "metallic"],
  ["shader", "shader"],
];

/** Normalizes an arbitrary title into a stable kebab id segment. */
export function slugifyTitle(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Parses only official CodePen pen URLs and returns the official embed URL. */
export function parseCodePenUrl(input) {
  let parsed;
  try {
    parsed = new URL(String(input));
  } catch {
    throw new Error("CodePen URL must be an absolute https://codepen.io/<user>/pen/<slug> URL");
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (parsed.protocol !== "https:" || host !== "codepen.io") {
    throw new Error("CodePen URL must use the official codepen.io host over https");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  const penIndex = parts.indexOf("pen");
  const user = parts[0];
  const slug = penIndex >= 1 ? parts[penIndex + 1] : "";
  if (!user || !slug) {
    throw new Error("CodePen URL must look like https://codepen.io/<user>/pen/<slug>");
  }
  return {
    url: `https://codepen.io/${encodeURIComponent(user)}/pen/${encodeURIComponent(slug)}`,
    user,
    slug,
    embedUrl: `https://codepen.io/${encodeURIComponent(user)}/embed/${encodeURIComponent(slug)}?default-tab=result`,
  };
}

function uniqueList(values) {
  return [...new Set((values ?? []).filter((value) => typeof value === "string" && value.trim() !== ""))];
}

function inferReferenceFacets({ title, summary = "", categoryHint = "", types = [], triggers = [], techniques = [] }) {
  const text = `${title} ${summary}`.toLowerCase();
  const inferredTypes = [...types];
  if (inferredTypes.length === 0) {
    if (/transition|page change|route/.test(text)) inferredTypes.push("transition");
    if (/background|particle|aurora|gradient field/.test(text)) inferredTypes.push("background");
    if (/text|type|letter|word|font/.test(text)) inferredTypes.push("text-effect");
    if (/loader|spinner|skeleton|progress/.test(text)) inferredTypes.push("loader");
    if (/cursor/.test(text)) inferredTypes.push("cursor");
    if (/gallery|3d|scene|sphere/.test(text)) inferredTypes.push("scene");
    if (/card/.test(text)) inferredTypes.push("card");
    if (/button/.test(text)) inferredTypes.push("button");
    if (/input|field|slider|switch/.test(text)) inferredTypes.push("input");
    if (/nav|menu|dock|breadcrumb/.test(text)) inferredTypes.push("navigation");
    if (/modal|dialog/.test(text)) inferredTypes.push("modal");
    if (/tooltip/.test(text)) inferredTypes.push("tooltip");
    if (/chart|graph/.test(text)) inferredTypes.push("chart");
    if (/section|hero|pricing|footer/.test(text)) inferredTypes.push("section");
    if (/template|layout/.test(text)) inferredTypes.push("template");
    if (inferredTypes.length === 0) {
      const categoryType = CATEGORY_TYPE[categoryHint];
      inferredTypes.push(categoryType || "display");
    }
  }
  const inferredTriggers = [...triggers];
  if (inferredTriggers.length === 0) {
    if (/transition|page change|route/.test(text)) inferredTriggers.push("route-transition");
    if (/scroll|reveal/.test(text)) inferredTriggers.push("scroll", "viewport-entry");
    if (/hover/.test(text)) inferredTriggers.push("hover");
    if (/cursor|mouse/.test(text)) inferredTriggers.push("cursor-reactive");
    if (/drag/.test(text)) inferredTriggers.push("drag");
    if (/click|toggle|switch|menu/.test(text)) inferredTriggers.push("click");
    if (/loop|ambient|automatic|animated background|particle/.test(text)) inferredTriggers.push("automatic-loop");
    if (inferredTriggers.length === 0) inferredTriggers.push("static");
  }
  const inferredTechniques = [...techniques];
  if (inferredTechniques.length === 0) {
    for (const [term, technique] of TECHNIQUE_TERMS) {
      if (text.includes(term)) inferredTechniques.push(technique);
    }
  }
  const category =
    categoryHint ||
    (inferredTypes.includes("transition") ? "transitions" : TYPE_CATEGORY[inferredTypes[0]] || "display");
  return {
    category,
    types: uniqueList(inferredTypes),
    triggers: uniqueList(inferredTriggers),
    techniques: uniqueList(inferredTechniques),
  };
}

function referenceBehaviors(triggers) {
  return uniqueList(triggers.map((trigger) => TRIGGER_BEHAVIOR[trigger] ?? "static"));
}

/** Composes an external-only reference entry. Never writes local paths. */
export function composeReferenceEntry({
  sourceDoc,
  url,
  title,
  summary,
  category,
  types = [],
  triggers = [],
  techniques = [],
  aesthetics = [],
  attributes = [],
  externalId,
  id,
  author,
  license,
  licenseUrl,
  previewUrl,
  existingIds = [],
  existingEntries = null,
  fetchedAt,
  themeIds = REFERENCE_THEMES,
}) {
  if (!sourceDoc || typeof sourceDoc !== "object") throw new Error("a reference entry requires a source record");
  if (!/^https?:\/\//i.test(String(url ?? ""))) throw new Error("reference URL must be an absolute http(s) URL");
  if (!title || !String(title).trim()) throw new Error("reference entries require an explicit title");
  if (DEDICATED_SOURCE_IDS.has(sourceDoc.id)) {
    throw new Error(`source "${sourceDoc.id}" has a dedicated ingestion adapter; use that instead`);
  }
  const safeTitle = String(title).trim();
  const slug = slugifyTitle(externalId || safeTitle);
  if (!slug) throw new Error("could not derive a stable id from the reference title");
  const entryId = id || `${sourceDoc.id}-${slug}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entryId)) throw new Error(`reference id "${entryId}" must be a kebab slug`);
  const facets = inferReferenceFacets({
    title: safeTitle,
    summary: summary || "",
    categoryHint: category || "",
    types,
    triggers,
    techniques,
  });
  // Idempotent re-runs must preserve the target entry's own aliases while still
  // rejecting collisions with every other id/alias. The flattened `existingIds`
  // form remains supported for callers/tests that do not have entry objects.
  const claimed = new Set(existingIds);
  for (const existing of existingEntries ?? []) {
    if (!existing || existing.id === entryId) continue;
    if (existing.id) claimed.add(existing.id);
    for (const alias of existing.aliases ?? []) claimed.add(alias);
  }
  const aliases = uniqueList([slugifyTitle(externalId || ""), slug, slugifyTitle(safeTitle)]).filter(
    (alias) => alias !== entryId && !claimed.has(alias),
  );
  const safeSummary = (summary || `${safeTitle}: external reference. Open the official source before reuse.`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  const licenseNote =
    sourceDoc.license ||
    "License not verified. Consult the official source before copying or redistributing.";
  const preview = previewUrl || url;
  const entry = {
    id: entryId,
    name: safeTitle,
    summary: safeSummary,
    description:
      `${safeTitle} is tracked as an external reference from ${sourceDoc.name}. ` +
      `No source is stored or redistributed by this catalog. Open the official page and follow its terms.`,
    category: facets.category,
    themes: [...themeIds],
    aliases,
    tags: uniqueList([sourceDoc.id, "reference", ...facets.types, ...facets.triggers]),
    status: "stable",
    version: "0.1.0",
    addedDate: fetchedAt,
    externalDependencies: [],
    props: [],
    entryType: "external",
    source: sourceDoc.id,
    sourceUrl: url,
    externalId: externalId || slug,
    retrieval:
      `Open the official source at ${url}. ` +
      `${sourceDoc.limit || "Follow the source terms before copying or redistributing."}`,
    preview: {
      type: "source-link",
      url: preview,
      note: "External reference only; the official source renders the demo.",
    },
    license: {
      spdx: license || "NOASSERTION",
      attribution: author || undefined,
      note: licenseNote,
      url: licenseUrl || undefined,
    },
    aesthetics: uniqueList(aesthetics),
    attributes: uniqueList(attributes),
    behaviors: referenceBehaviors(facets.triggers),
    types: facets.types,
    triggers: facets.triggers,
    techniques: facets.techniques,
    tagMeta: {
      sourceProvided: [],
      inferred: uniqueList([
        ...facets.types.map((value) => `type:${value}`),
        ...facets.triggers.map((value) => `trigger:${value}`),
        ...facets.techniques.map((value) => `technique:${value}`),
        ...aesthetics.map((value) => `vibe:${value}`),
        ...attributes.map((value) => `tech:${value}`),
      ]),
      reviewNeeded: true,
    },
    previewProfile: {
      mode: "external",
      layout: "wide",
      cost: "low",
      aspectRatio: "16 / 9",
      minWidth: 360,
      minHeight: 280,
      gridColumnSpan: 2,
      gridRowSpan: 1,
      expandedRecommended: true,
      requires: [],
      autoplayAllowed: false,
      previewStatus: "external",
      failureReason: "External reference preview - open the official source instead of running it here.",
    },
    syncedAt: fetchedAt,
  };
  return entry;
}

/** CodePen-specific composition: only official pen/embed URLs, no scraping. */
export function composeCodePenEntry(options) {
  const info = parseCodePenUrl(options.url);
  const title = options.title || titleForSlug(info.slug);
  const entry = composeReferenceEntry({
    ...options,
    sourceDoc: options.sourceDoc,
    url: info.url,
    previewUrl: info.embedUrl,
    title,
    id: options.id || `codepen-${slugifyTitle(title)}`,
    externalId: options.externalId || info.slug,
    category: options.category || "transitions",
    types: options.types?.length ? options.types : ["transition"],
    triggers: options.triggers?.length ? options.triggers : ["route-transition"],
    summary:
      options.summary ||
      `${title}: saved CodePen reference. Inspect the official pen and verify its license before reuse.`,
  });
  entry.retrieval =
    `Open the official pen at ${info.url} or embed ${info.embedUrl}. ` +
    "Export only when the author's license permits it; no bulk scraping.";
  entry.tags = uniqueList([...entry.tags, "codepen", "pen"]);
  return { entry, info };
}

/** Raises derived source coverage to match a newly imported reference entry.
 *  `clearBlockedLabel` is used only when the exact blocked item was resolved. */
export function updateSourceCoverage(
  sourcesDoc,
  sourceId,
  { imported, checkedAt, clearBlockedLabel, note } = {},
) {
  if (!sourcesDoc || !Array.isArray(sourcesDoc.sources)) return sourcesDoc;
  const nextSources = sourcesDoc.sources.map((source) => {
    if (source.id !== sourceId) return source;
    const coverage = { ...(source.coverage || {}) };
    coverage.discovered = Math.max(coverage.discovered ?? 0, imported ?? 0);
    coverage.usable = Math.max(coverage.usable ?? 0, imported ?? 0);
    if (clearBlockedLabel) {
      coverage.blocked = (coverage.blocked || []).filter((record) => record.label !== clearBlockedLabel);
      coverage.locked = 0;
      coverage.reviewNeeded = 0;
    }
    if (checkedAt) coverage.checkedAt = checkedAt;
    if (note) coverage.note = note;
    return { ...source, coverage };
  });
  return { ...sourcesDoc, sources: nextSources };
}
