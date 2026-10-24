// Showcase helpers (M6.2). Small, dependency-free building blocks shared by
// the per-source showcase wrappers: self-contained SVG placeholder images
// (no network, no screenshots) and tiny presentational fragments.
import type { CSSProperties, ReactNode } from "react";

/** Deterministic gradient placeholder image as a local data URI. Selling
 *  point: previews never depend on the network and never fake real photos. */
export function svgDataUri(width: number, height: number, from: string, to: string, label?: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${esc(from)}'/><stop offset='1' stop-color='${esc(to)}'/></linearGradient></defs>` +
    `<rect width='100%' height='100%' fill='url(#g)'/>` +
    (label ? `<text x='50%' y='52%' fill='rgba(255,255,255,0.85)' font-family='system-ui,sans-serif' font-size='${Math.round(height / 9)}' text-anchor='middle'>${esc(label)}</text>` : "") +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Pastel gradient pair list used as the catalog's placeholder palette. */
export const PLACEHOLDER_PAIRS: Array<[string, string]> = [
  ["#6d28d9", "#db2777"],
  ["#0f766e", "#38bdf8"],
  ["#b45309", "#f59e0b"],
  ["#1e40af", "#818cf8"],
  ["#9d174d", "#fb7185"],
  ["#3f6212", "#a3e635"],
  ["#7c2d12", "#f97316"],
  ["#164e63", "#22d3ee"],
];

export function placeholderUri(index: number, width = 480, height = 320, label?: string): string {
  const [from, to] = PLACEHOLDER_PAIRS[index % PLACEHOLDER_PAIRS.length];
  return svgDataUri(width, height, from, to, label ?? `Item ${index + 1}`);
}

/** Centered stage content wrapper for showcase compositions. */
export function CenteredStage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, padding: "24px 12px", ...style }}
    >
      {children}
    </div>
  );
}
