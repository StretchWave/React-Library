// Showcase registry (M6.2). Single reviewed entry point from catalog entry id
// to a runnable preview: the preview workspace renders ONLY through this
// registry (vendored component code never executes in the app outside here).
// The six seeded components keep their vetted demo compositions from
// src/catalog/demos.ts — registered here too so the workspace is uniform.
import { getDemo } from "../demos";
import { textShowcases } from "./text";
import { motionShowcases } from "./motion";
import { navShowcases } from "./nav";
import { surfaceShowcases } from "./surfaces";
import { sectionShowcases } from "./sections";
import { backgroundShowcases } from "./backgrounds";
import { listShowcases } from "./lists";
import { webglShowcases } from "./webgl";
import { magicuiShowcases } from "./magicui";
import type { Showcase } from "./types";

export type { Showcase, ShowcaseControl, ShowcaseControlType, ShowcaseValues } from "./types";

const VENDORED_SHOWCASES: Showcase[] = [
  ...textShowcases,
  ...motionShowcases,
  ...navShowcases,
  ...surfaceShowcases,
  ...sectionShowcases,
  ...backgroundShowcases,
  ...listShowcases,
  ...webglShowcases,
  ...magicuiShowcases,
];

/** Catalog entries that keep their seeded in-app demo in the workspace. */
const SEEDED_SHOWCASES: Showcase[] = [];

void SEEDED_SHOWCASES;

const REGISTRY = new Map<string, Showcase>();
for (const showcase of VENDORED_SHOWCASES) {
  if (REGISTRY.has(showcase.id)) {
    throw new Error(`duplicate showcase id: ${showcase.id}`);
  }
  REGISTRY.set(showcase.id, showcase);
}

export const SHOWCASE_IDS: string[] = [...REGISTRY.keys()];

export function getShowcase(id: string): Showcase | undefined {
  const showcase = REGISTRY.get(id);
  if (showcase) return showcase;
  // Seeded six: reuse their vetted demo composition as the stage component.
  const Seeded = getDemo(id);
  if (Seeded) return { id, Component: Seeded };
  return undefined;
}
