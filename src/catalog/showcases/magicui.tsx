// Magic UI showcases (M6.6 everything-local): the four vendored Magic UI
// components run through motion/react (already in the runtime union) plus the
// src/lib/cn.ts shim serving their "@/lib/utils" import. Vendored Tailwind
// classes ship verbatim; magicui.css restores only the layout the animations
// need, via --rl-* tokens.
import type { ReactNode } from "react";
const BlurFade = createLazyRaw(() => import("../../../catalog/components/magic-ui/blur-fade/blur-fade").then((module) => ({ default: module.BlurFade })));
const BorderBeam = createLazyRaw(() => import("../../../catalog/components/magic-ui/border-beam/border-beam").then((module) => ({ default: module.BorderBeam })));
const DotPattern = createLazyRaw(() => import("../../../catalog/components/magic-ui/dot-pattern/dot-pattern").then((module) => ({ default: module.DotPattern })));
const WordRotate = createLazyRaw(() => import("../../../catalog/components/magic-ui/word-rotate/word-rotate").then((module) => ({ default: module.WordRotate })));
import { defineShowcase, type Showcase } from "./types";
import "./magicui.css";
import { createLazyRaw } from "./lazyRaw";







/** Stage with relative positioning the absolutely positioned vendored parts rely on. */
function MagicStage({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return (
    <div
      className="rl-magic-stage"
      style={{ display: "flex", margin: 16, minHeight: height, height }}
    >
      {children}
    </div>
  );
}

export const magicuiShowcases: Showcase[] = [
  defineShowcase(
    "magic-ui-blur-fade",
    ({ duration, delay, direction }) => (
      <MagicStage>
        <div style={{ position: "relative", margin: "auto", textAlign: "center", gap: 4 }}>
          <BlurFade inView duration={Number(duration)} delay={Number(delay)} direction={String(direction)}>
            <p style={{ margin: "6px 0", fontSize: 22, fontWeight: 600 }}>Blur fade reveals on view</p>
          </BlurFade>
          <BlurFade inView duration={Number(duration)} delay={Number(delay) + 0.2} direction={String(direction)}>
            <p style={{ margin: "6px 0", opacity: 0.85 }}>Each line staggers its entrance.</p>
          </BlurFade>
          <BlurFade inView duration={Number(duration)} delay={Number(delay) + 0.4} direction={String(direction)}>
            <p style={{ margin: "6px 0", opacity: 0.7 }}>Replay the stage to replay the reveal.</p>
          </BlurFade>
        </div>
      </MagicStage>
    ),
    { duration: 0.4, delay: 0, direction: "down" },
    {
      controls: [
        { id: "duration", label: "Duration (s)", type: "number", default: 0.4, min: 0.1, max: 1.5, step: 0.1 },
        { id: "delay", label: "Base delay (s)", type: "number", default: 0, min: 0, max: 0.6, step: 0.05 },
        { id: "direction", label: "Direction", type: "select", default: "down", options: ["down", "up", "left", "right"] },
      ],
      hint: "Vendored source uses motion/react; the entrance is blur + translate with per-line stagger.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "magic-ui-border-beam",
    ({ size, duration }) => (
      <MagicStage>
        <div
          style={{
            position: "relative",
            margin: "auto",
            width: "min(560px, 92%)",
            padding: "28px 28px",
            borderRadius: 12,
            border: "1px solid var(--rl-border)",
            background: "var(--rl-surface)",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Card with a traveling border beam</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.8 }}>
            offset-path animates a gradient square around the border box.
          </p>
          <BorderBeam size={Number(size)} duration={Number(duration)} borderWidth={2} colorFrom="#f59e0b" colorTo="#22d3ee" />
        </div>
      </MagicStage>
    ),
    { size: 50, duration: 6 },
    {
      controls: [
        { id: "size", label: "Beam size", type: "number", default: 50, min: 20, max: 120, step: 5 },
        { id: "duration", label: "Lap seconds", type: "number", default: 6, min: 2, max: 12, step: 1 },
      ],
      hint: "Colors pass through the vendored component's inline custom props, restyled here with tokens.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "magic-ui-dot-pattern",
    ({ width, height, cr, glow }) => (
      <MagicStage>
        <div style={{ position: "relative", margin: 12, borderRadius: 10, width: "calc(100% - 24px)", border: "1px dashed var(--rl-border)", minHeight: "calc(100% - 24px)" }}>
          <p style={{ margin: 0, padding: 14, fontSize: 14, opacity: 0.85 }}>
            Decorative dot grid fills any container and can pulse with glow.
          </p>
          <DotPattern width={Number(width)} height={Number(height)} cr={Number(cr)} glow={Boolean(glow)} />
        </div>
      </MagicStage>
    ),
    { width: 16, height: 16, cr: 1, glow: true },
    {
      controls: [
        { id: "width", label: "Cell width", type: "number", default: 16, min: 8, max: 40, step: 2 },
        { id: "height", label: "Cell height", type: "number", default: 16, min: 8, max: 40, step: 2 },
        { id: "cr", label: "Dot radius", type: "number", default: 1, min: 0.5, max: 4, step: 0.5 },
        { id: "glow", label: "Glow pulse", type: "boolean", default: true },
      ],
      hint: "Dots use currentColor; the bridge maps it to token-muted so both themes stay legible.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "magic-ui-word-rotate",
    ({ duration }) => (
      <MagicStage>
        <div style={{ margin: "auto", textAlign: "center" }}>
          <WordRotate words={["Animate", "Rotate", "Reveal", "Loop"]} duration={Number(duration)} />
          <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.75 }}>Vendored AnimatePresence cycle · motion/react</p>
        </div>
      </MagicStage>
    ),
    { duration: 2500 },
    {
      controls: [{ id: "duration", label: "Hold (ms)", type: "number", default: 2500, min: 1000, max: 6000, step: 250 }],
      hint: "Words rotate on an interval; motion animates enter/exit transitions.",
      stage: "neutral",
    },
  ),
];
