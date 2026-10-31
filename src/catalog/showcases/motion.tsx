// Motion showcases (M6.2): wrappers around vendored React Bits motion and
// interaction primitives. Reveal components read ScrollTrigger-like viewport
// thresholds, so the stage note says when to press Replay.
import type { ReactNode } from "react";
const AnimatedContent = createLazyRaw(() => import("../../../catalog/components/react-bits/animated-content/AnimatedContent"));
const FadeContent = createLazyRaw(() => import("../../../catalog/components/react-bits/fade-content/FadeContent"));
const ClickSpark = createLazyRaw(() => import("../../../catalog/components/react-bits/click-spark/ClickSpark"));
const Magnet = createLazyRaw(() => import("../../../catalog/components/react-bits/magnet/Magnet"));
const PixelTransition = createLazyRaw(() => import("../../../catalog/components/react-bits/pixel-transition/PixelTransition"));
const GlareHover = createLazyRaw(() => import("../../../catalog/components/react-bits/glare-hover/GlareHover"));
const StarBorder = createLazyRaw(() => import("../../../catalog/components/react-bits/star-border/StarBorder"));
import { defineShowcase, type Showcase } from "./types";
import { CenteredStage, svgDataUri } from "./helpers";
import { createLazyRaw } from "./lazyRaw";










function TintedPanel({ children, tone = 0 }: { children: ReactNode; tone?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "18px 26px",
        borderRadius: 14,
        backgroundImage: `url("${svgDataUri(400, 120, ["#1e40af", "#818cf8"][tone % 2], ["#818cf8", "#1e40af"][tone % 2])}")`,
        backgroundSize: "cover",
        color: "#f8fafc",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </div>
  );
}

export const motionShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-animated-content",
    ({ children, duration, direction, distance, scale }) => (
      <CenteredStage>
        <AnimatedContent
          duration={Number(duration)}
          direction={String(direction)}
          distance={Number(distance)}
          scale={Number(scale)}
        >
          <TintedPanel>{String(children)}</TintedPanel>
        </AnimatedContent>
      </CenteredStage>
    ),
    { children: "Animated content", duration: 1, direction: "vertical", distance: 80, scale: 1.05 },
    {
      controls: [
        { id: "children", label: "Content", type: "text", default: "Animated content" },
        { id: "duration", label: "Duration (s)", type: "number", default: 1, min: 0.3, max: 3, step: 0.1 },
        { id: "direction", label: "Direction", type: "select", default: "vertical", options: ["vertical", "horizontal"] },
        { id: "distance", label: "Travel (px)", type: "number", default: 80, min: 10, max: 240, step: 10 },
        { id: "scale", label: "Scale from", type: "number", default: 1.05, min: 0.9, max: 1.4, step: 0.05 },
      ],
      hint: "Entrance runs when the stage mounts — press Replay to watch again.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-fade-content",
    ({ children, duration, blur, delay }) => (
      <CenteredStage>
        <FadeContent duration={Number(duration)} blur={Number(blur)} delay={Number(delay)}>
          <TintedPanel tone={1}>{String(children)}</TintedPanel>
        </FadeContent>
      </CenteredStage>
    ),
    { children: "Fade content", duration: 1.2, blur: 10, delay: 0.2 },
    {
      controls: [
        { id: "children", label: "Content", type: "text", default: "Fade content" },
        { id: "duration", label: "Duration (s)", type: "number", default: 1.2, min: 0.3, max: 3, step: 0.1 },
        { id: "blur", label: "Blur start (px)", type: "number", default: 10, min: 0, max: 40, step: 2 },
        { id: "delay", label: "Delay (s)", type: "number", default: 0.2, min: 0, max: 2, step: 0.1 },
      ],
      hint: "Fade-in with blur settle; Replay restarts the entrance.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-click-spark",
    ({ sparkColor, sparkCount, duration, sparkSize }) => (
      <div style={{ minHeight: 300 }}>
        <ClickSpark sparkColor={String(sparkColor)} sparkCount={Number(sparkCount)} duration={Number(duration)} sparkSize={Number(sparkSize)}>
          <CenteredStage>
            <p style={{ margin: 0, color: "inherit", opacity: 0.85 }}>
              Click anywhere in the stage to fire sparks.
            </p>
          </CenteredStage>
        </ClickSpark>
      </div>
    ),
    { sparkColor: "#FFB86C", sparkCount: 12, duration: 0.5, sparkSize: 10 },
    {
      controls: [
        { id: "sparkColor", label: "Spark color (hex)", type: "text", default: "#FFB86C" },
        { id: "sparkCount", label: "Sparks per click", type: "number", default: 12, min: 4, max: 40, step: 2 },
        { id: "sparkSize", label: "Spark size", type: "number", default: 10, min: 4, max: 30, step: 2 },
        { id: "duration", label: "Duration (s)", type: "number", default: 0.5, min: 0.2, max: 1.5, step: 0.1 },
      ],
      hint: "Pointer-driven: click or tap inside the stage area.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-magnet",
    ({ children, magnetStrength, maxOffset, padding }) => (
      <CenteredStage style={{ minHeight: 260 }}>
        <Magnet magnetStrength={Number(magnetStrength)} maxOffset={Number(maxOffset)} padding={Number(padding)}>
          <TintedPanel>{String(children)}</TintedPanel>
        </Magnet>
      </CenteredStage>
    ),
    { children: "Magnetic snap", magnetStrength: 0.3, maxOffset: 40, padding: 80 },
    {
      controls: [
        { id: "children", label: "Content", type: "text", default: "Magnetic snap" },
        { id: "magnetStrength", label: "Magnet strength", type: "number", default: 0.3, min: 0.1, max: 1, step: 0.05 },
        { id: "maxOffset", label: "Max offset (px)", type: "number", default: 40, min: 10, max: 160, step: 10 },
        { id: "padding", label: "Field padding (px)", type: "number", default: 80, min: 20, max: 200, step: 10 },
      ],
      hint: "Move the cursor near the panel; it follows and springs back.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-pixel-transition",
    ({ gridSize, pixelColor, trigger, animationStepDuration, mosaic }) => (
      <CenteredStage style={{ minHeight: 280 }}>
        <PixelTransition
          gridSize={Number(gridSize)}
          pixelColor={String(pixelColor)}
          trigger={String(trigger)}
          animationStepDuration={Number(animationStepDuration)}
          mosaic={Boolean(mosaic)}
          firstContent={
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: `url("${svgDataUri(400, 260, "#1e40af", "#818cf8", "Before")}")`, backgroundSize: "cover", color: "#f8fafc", fontWeight: 700, fontSize: 20 }}>
              Before
            </div>
          }
          secondContent={
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: `url("${svgDataUri(400, 260, "#9d174d", "#fb7185", "After")}")`, backgroundSize: "cover", color: "#f8fafc", fontWeight: 700, fontSize: 20 }}>
              After
            </div>
          }
        />
      </CenteredStage>
    ),
    { gridSize: 22, pixelColor: "#151515", trigger: "hover", animationStepDuration: 0.35, mosaic: true },
    {
      controls: [
        { id: "trigger", label: "Trigger", type: "select", default: "hover", options: ["hover", "click"] },
        { id: "gridSize", label: "Grid size", type: "number", default: 22, min: 8, max: 60, step: 2 },
        { id: "pixelColor", label: "Pixel color (hex)", type: "text", default: "#151515" },
        { id: "animationStepDuration", label: "Step duration (s)", type: "number", default: 0.35, min: 0.1, max: 1, step: 0.05 },
        { id: "mosaic", label: "Mosaic pattern", type: "boolean", default: true },
      ],
      hint: "Hover (or click) the tile to wipe the pixel transition.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-glare-hover",
    ({ variant, glareOpacity, glareSize }) => (
      <CenteredStage style={{ minHeight: 280 }}>
        <GlareHover variant={String(variant)} glareOpacity={Number(glareOpacity)} glareSize={Number(glareSize)}>
          <div style={{ width: 260, height: 170, borderRadius: 12, backgroundImage: `url("${svgDataUri(520, 340, "#164e63", "#22d3ee", "Glare target")}")`, backgroundSize: "cover" }} />
        </GlareHover>
      </CenteredStage>
    ),
    { variant: "streak", glareOpacity: 0.5, glareSize: 1.1 },
    {
      controls: [
        { id: "variant", label: "Variant", type: "select", default: "streak", options: ["streak", "twin", "sheen"] },
        { id: "glareOpacity", label: "Glare opacity", type: "number", default: 0.5, min: 0.1, max: 1, step: 0.05 },
        { id: "glareSize", label: "Glare size", type: "number", default: 1.1, min: 0.4, max: 2, step: 0.1 },
      ],
      hint: "Hover the image to sweep the glare band.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-star-border",
    ({ children, duration, thickness, stars, hover, clickPulse }) => (
      <CenteredStage style={{ minHeight: 280 }}>
        <StarBorder duration={Number(duration)} thickness={Number(thickness)} stars={Number(stars)} hover={String(hover)} clickPulse={Boolean(clickPulse)}>
          <TintedPanel tone={1}>{String(children)}</TintedPanel>
        </StarBorder>
      </CenteredStage>
    ),
    { children: "Star border", duration: 9, thickness: 2, stars: 24, hover: "brighten", clickPulse: true },
    {
      controls: [
        { id: "children", label: "Content", type: "text", default: "Star border" },
        { id: "duration", label: "Trail duration (s)", type: "number", default: 9, min: 3, max: 30, step: 1 },
        { id: "thickness", label: "Border thickness", type: "number", default: 2, min: 1, max: 8, step: 1 },
        { id: "stars", label: "Star count", type: "number", default: 24, min: 6, max: 80, step: 2 },
        { id: "hover", label: "Hover behavior", type: "select", default: "brighten", options: ["lap", "brighten", "reveal", "none"] },
        { id: "clickPulse", label: "Click pulse", type: "boolean", default: true },
      ],
      stage: "inverted",
    },
  ),
];
