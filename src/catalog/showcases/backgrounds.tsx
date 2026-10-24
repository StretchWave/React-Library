// Background showcases (M6.2): the vendored React Bits background components
// whose official CSS variant runs on plain DOM/CSS (no WebGL). Noise renders
// in-flow (fixed: false) so it stays inside the preview stage.
import type { ComponentType, ReactNode } from "react";
import NoiseRaw from "../../../catalog/components/react-bits/noise/Noise";
import GridMotionRaw from "../../../catalog/components/react-bits/grid-motion/GridMotion";
import { defineShowcase, type Showcase } from "./types";
import { placeholderUri } from "./helpers";

type Raw = ComponentType<Record<string, unknown>>;

const Noise = NoiseRaw as unknown as Raw;
const GridMotion = GridMotionRaw as unknown as Raw;

export const backgroundShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-noise",
    ({ opacity, size, blendMode }) => (
      <div style={{ position: "relative", minHeight: 320, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <Noise opacity={Number(opacity)} size={Number(size)} blendMode={String(blendMode)} fixed={false} />
        <div style={{ position: "relative", zIndex: 1, padding: 20 }}>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 13 }}>
            Animated grain overlays the surface below this note.
          </p>
        </div>
      </div>
    ),
    { opacity: 0.35, size: 96, blendMode: "overlay" },
    {
      controls: [
        { id: "opacity", label: "Opacity", type: "number", default: 0.35, min: 0.05, max: 1, step: 0.05 },
        { id: "size", label: "Tile size", type: "number", default: 96, min: 32, max: 300, step: 8 },
        { id: "blendMode", label: "Blend mode", type: "select", default: "overlay", options: ["normal", "overlay", "soft-light", "multiply", "screen", "difference"] },
      ],
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-grid-motion",
    ({ rows, speed }) => (
      <CenteredStageFull>
        <GridMotion
          items={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => (
            <div
              key={index}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 10,
                backgroundImage: `url("${placeholderUri(index, 240, 240, `.${index + 1}`)}")`,
                backgroundSize: "cover",
              }}
            />
          ))}
          rows={Number(rows)}
          speed={Number(speed)}
        />
      </CenteredStageFull>
    ),
    { rows: 4, speed: 0.6 },
    {
      controls: [
        { id: "rows", label: "Rows", type: "number", default: 4, min: 2, max: 6, step: 1 },
        { id: "speed", label: "Drift speed", type: "number", default: 0.6, min: 0.1, max: 2.5, step: 0.1 },
      ],
      hint: "Tiles drift slowly; the pointer adds parallax.",
      stage: "inverted",
    },
  ),
];

function CenteredStageFull({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 360, width: "100%", padding: "12px 6px" }}>
      <div style={{ width: "min(620px, 96%)" }}>{children}</div>
    </div>
  );
}
