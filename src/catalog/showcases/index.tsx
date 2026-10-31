// Component-aware showcase loader (M8.2).
//
// The registry no longer statically imports every showcase group. Each group
// is a separate dynamic import, chosen by an explicit id→group map, so opening
// one preview downloads only that group's small descriptor module. The actual
// vendored implementation is itself a lazy import inside the group
// (lazyRaw.tsx), which keeps three.js, matter-js, gsap and motion out of
// unrelated previews.
//
// A loaded group is cached for the session; failed group imports are not
// cached, so the retry path can try again.
import { getDemo } from "../demos";
import type { Showcase } from "./types";

export type { Showcase, ShowcaseControl, ShowcaseControlType, ShowcaseValues } from "./types";

const GROUP_LOADERS = {
  text: async () => (await import("./text")).textShowcases,
  motion: async () => (await import("./motion")).motionShowcases,
  nav: async () => (await import("./nav")).navShowcases,
  surfaces: async () => (await import("./surfaces")).surfaceShowcases,
  sections: async () => (await import("./sections")).sectionShowcases,
  backgrounds: async () => (await import("./backgrounds")).backgroundShowcases,
  lists: async () => (await import("./lists")).listShowcases,
  webgl: async () => (await import("./webgl")).webglShowcases,
  magicui: async () => (await import("./magicui")).magicuiShowcases,
} satisfies Record<string, () => Promise<Showcase[]>>;

type GroupId = keyof typeof GROUP_LOADERS;

/** Explicit operation maps keep unrelated groups out of the request. */
const GROUP_BY_ID: Record<string, GroupId> = {
  "react-bits-split-text": "text",
  "react-bits-scrambled-text": "text",
  "react-bits-decrypted-text": "text",
  "react-bits-shiny-text": "text",
  "react-bits-gradient-text": "text",
  "react-bits-blur-text": "text",
  "react-bits-text-type": "text",
  "react-bits-rotating-text": "text",
  "react-bits-glitch-text": "text",
  "react-bits-falling-text": "text",
  "react-bits-text-pressure": "text",
  "react-bits-count-up": "text",
  "react-bits-circular-text": "text",
  "react-bits-animated-content": "motion",
  "react-bits-fade-content": "motion",
  "react-bits-click-spark": "motion",
  "react-bits-magnet": "motion",
  "react-bits-pixel-transition": "motion",
  "react-bits-glare-hover": "motion",
  "react-bits-star-border": "motion",
  "react-bits-dock": "nav",
  "react-bits-bubble-menu": "nav",
  "react-bits-staggered-menu": "nav",
  "react-bits-flowing-menu": "nav",
  "react-bits-card-nav": "nav",
  "react-bits-tilted-card": "surfaces",
  "react-bits-border-glow": "surfaces",
  "react-bits-spotlight-card": "surfaces",
  "react-bits-pixel-card": "surfaces",
  "react-bits-chroma-grid": "surfaces",
  "react-bits-masonry": "sections",
  "react-bits-carousel": "sections",
  "react-bits-stack": "sections",
  "react-bits-dome-gallery": "sections",
  "react-bits-stepper": "sections",
  "react-bits-elastic-slider": "sections",
  "react-bits-counter": "sections",
  "react-bits-noise": "backgrounds",
  "react-bits-grid-motion": "backgrounds",
  "react-bits-animated-list": "lists",
  "magic-ui-blur-fade": "magicui",
  "magic-ui-border-beam": "magicui",
  "magic-ui-dot-pattern": "magicui",
  "magic-ui-word-rotate": "magicui",
  "react-bits-aurora": "webgl",
  "react-bits-ballpit": "webgl",
  "react-bits-beams": "webgl",
  "react-bits-blob-cursor": "webgl",
  "react-bits-circular-gallery": "webgl",
  "react-bits-dot-grid": "webgl",
  "react-bits-fluid-glass": "webgl",
  "react-bits-glass-surface": "webgl",
  "react-bits-gooey-nav": "webgl",
  "react-bits-hyperspeed": "webgl",
  "react-bits-iridescence": "webgl",
  "react-bits-lanyard": "webgl",
  "react-bits-laser-flow": "webgl",
  "react-bits-letter-glitch": "webgl",
  "react-bits-lightning": "webgl",
  "react-bits-magnet-lines": "webgl",
  "react-bits-meta-balls": "webgl",
  "react-bits-metallic-paint": "webgl",
  "react-bits-particles": "webgl",
  "react-bits-ribbons": "webgl",
  "react-bits-waves": "webgl",
};

const groupPromises = new Map<GroupId, Promise<Showcase[]>>();
const showcaseCache = new Map<string, Showcase>();

function loadGroup(group: GroupId): Promise<Showcase[]> {
  const cached = groupPromises.get(group);
  if (cached) return cached;
  const promise = GROUP_LOADERS[group]().catch((error: unknown) => {
    groupPromises.delete(group);
    throw error;
  });
  groupPromises.set(group, promise);
  return promise;
}

export const SHOWCASE_IDS: string[] = Object.keys(GROUP_BY_ID);

/** Synchronous cache read: seeded demos and already-loaded groups. */
export function peekShowcase(id: string): Showcase | undefined {
  const cached = showcaseCache.get(id);
  if (cached) return cached;
  const seeded = getDemo(id);
  if (seeded) return { id, Component: seeded };
  return undefined;
}

/** Resolves an entry id to its reviewed showcase. Loads only its group. */
export async function loadShowcase(id: string): Promise<Showcase | undefined> {
  const cached = peekShowcase(id);
  if (cached) return cached;
  const group = GROUP_BY_ID[id];
  if (!group) return undefined;
  const showcases = await loadGroup(group);
  for (const showcase of showcases) showcaseCache.set(showcase.id, showcase);
  return showcaseCache.get(id);
}

/** Group modules that have been loaded in this session (diagnostics/tests). */
export function loadedShowcaseGroups(): GroupId[] {
  return [...groupPromises.keys()];
}
