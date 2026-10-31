// WebGL showcases (M6.6 everything-local): the 21 raw-WebGL React Bits
// variants now run in-app. 18 are hand-rolled WebGL2 components that bail
// gracefully without a context; Blob Cursor, Hyperspeed, and the fully
// procedural Lanyard render through three.js (§12 amendment). Every entry is
// heavy, so the gallery shows a workspace-bound placeholder and only the
// preview workspace mounts one canvas at a time. Control defaults come from
// the vendored sources (scan-verified), and image text uses local data URIs.
import type { ReactNode } from "react";
const Aurora = createLazyRaw(() => import("../../../catalog/components/react-bits/aurora/Aurora"));
const Ballpit = createLazyRaw(() => import("../../../catalog/components/react-bits/ballpit/Ballpit"));
const Beams = createLazyRaw(() => import("../../../catalog/components/react-bits/beams/Beams"));
const BlobCursor = createLazyRaw(() => import("../../../catalog/components/react-bits/blob-cursor/BlobCursor"));
const CircularGallery = createLazyRaw(() => import("../../../catalog/components/react-bits/circular-gallery/CircularGallery"));
const DotGrid = createLazyRaw(() => import("../../../catalog/components/react-bits/dot-grid/DotGrid"));
const FluidGlass = createLazyRaw(() => import("../../../catalog/components/react-bits/fluid-glass/FluidGlass"));
const GlassSurface = createLazyRaw(() => import("../../../catalog/components/react-bits/glass-surface/GlassSurface"));
const GooeyNav = createLazyRaw(() => import("../../../catalog/components/react-bits/gooey-nav/GooeyNav"));
const Hyperspeed = createLazyRaw(() => import("../../../catalog/components/react-bits/hyperspeed/Hyperspeed"));
const Iridescence = createLazyRaw(() => import("../../../catalog/components/react-bits/iridescence/Iridescence"));
const Lanyard = createLazyRaw(() => import("../../../catalog/components/react-bits/lanyard/Lanyard"));
const LaserFlow = createLazyRaw(() => import("../../../catalog/components/react-bits/laser-flow/LaserFlow"));
const LetterGlitch = createLazyRaw(() => import("../../../catalog/components/react-bits/letter-glitch/LetterGlitch"));
const Lightning = createLazyRaw(() => import("../../../catalog/components/react-bits/lightning/Lightning"));
const MagnetLines = createLazyRaw(() => import("../../../catalog/components/react-bits/magnet-lines/MagnetLines"));
const MetaBalls = createLazyRaw(() => import("../../../catalog/components/react-bits/meta-balls/MetaBalls"));
const MetallicPaint = createLazyRaw(() => import("../../../catalog/components/react-bits/metallic-paint/MetallicPaint"));
const Particles = createLazyRaw(() => import("../../../catalog/components/react-bits/particles/Particles"));
const Ribbons = createLazyRaw(() => import("../../../catalog/components/react-bits/ribbons/Ribbons"));
const Waves = createLazyRaw(() => import("../../../catalog/components/react-bits/waves/Waves"));
import { defineShowcase, type Showcase } from "./types";
import { placeholderUri } from "./helpers";
import { createLazyRaw } from "./lazyRaw";
























/** Fixed-size stage frame: WebGL canvases render into a clipped scene box so
 *  workspace layout stays predictable regardless of vendored aspect handling. */
function WebGLStage({ children, height = 380 }: { children: ReactNode; height?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: height + 32, padding: 16 }}>
      <div style={{ position: "relative", width: "min(720px, 100%)", height, overflow: "hidden", borderRadius: 14 }}>{children}</div>
    </div>
  );
}

const WEBGL_HINT = "Runs on this machine's GPU; the heavy flag keeps it out of gallery auto-play.";

export const webglShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-aurora",
    ({ amplitude, speed }) => (
      <WebGLStage>
        <Aurora amplitude={Number(amplitude)} speed={Number(speed)} time={1.5} height={1} glow={1} />
      </WebGLStage>
    ),
    { amplitude: 1, speed: 1 },
    {
      controls: [
        { id: "amplitude", label: "Wave amplitude", type: "number", default: 1, min: 0.2, max: 2.4, step: 0.1 },
        { id: "speed", label: "Flow speed", type: "number", default: 1, min: 0.2, max: 2, step: 0.1 },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-ballpit",
    ({ count, gravity, friction }) => (
      <WebGLStage>
        <Ballpit count={Number(count)} gravity={Number(gravity)} friction={Number(friction)} colors={["#c7d2fe", "#818cf8", "#f0abfc"]} />
      </WebGLStage>
    ),
    { count: 200, gravity: 0.5, friction: 0.9975 },
    {
      controls: [
        { id: "count", label: "Balls", type: "number", default: 200, min: 40, max: 500, step: 10 },
        { id: "gravity", label: "Gravity", type: "number", default: 0.5, min: 0, max: 1.5, step: 0.05 },
        { id: "friction", label: "Friction", type: "number", default: 0.9975, min: 0.99, max: 1, step: 0.0005 },
      ],
      hint: "Tilt the pointer into the stage to slosh the ball pit.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-beams",
    ({ speed, rotation }) => (
      <WebGLStage height={340}>
        <Beams speed={Number(speed)} rotation={Number(rotation)} color="#6366f1" />
      </WebGLStage>
    ),
    { speed: 1, rotation: 30 },
    {
      controls: [
        { id: "speed", label: "Beam speed", type: "number", default: 1, min: 0, max: 3, step: 0.1 },
        { id: "rotation", label: "Tilt (deg)", type: "number", default: 30, min: 0, max: 90, step: 1 },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-blob-cursor",
    ({ color, size, morphSpeed }) => (
      <WebGLStage height={380}>
        <BlobCursor color={String(color)} size={Number(size)} morphSpeed={Number(morphSpeed)} />
      </WebGLStage>
    ),
    { color: "#3B82F6", size: 140, morphSpeed: 0.4 },
    {
      controls: [
        { id: "color", label: "Blob color", type: "text", default: "#3B82F6" },
        { id: "size", label: "Blob size", type: "number", default: 140, min: 60, max: 320, step: 10 },
        { id: "morphSpeed", label: "Morph speed", type: "number", default: 0.4, min: 0.1, max: 1, step: 0.05 },
      ],
      hint: "three.js metaball follows the pointer; move it inside the stage.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-circular-gallery",
    ({ bend, scrollSpeed }) => (
      <WebGLStage height={400}>
        <CircularGallery
          items={["Aurora", "Beams", "Waves", "Dots", "Glass", "Metal", "Ribbon", "Particles"].map((text, index) => ({
            image: placeholderUri(index, 640, 420),
            text,
          }))}
          bend={Number(bend)}
          scrollSpeed={Number(scrollSpeed)}
          font="bold 34px Arial, sans-serif"
        />
      </WebGLStage>
    ),
    { bend: 3, scrollSpeed: 2 },
    {
      controls: [
        { id: "bend", label: "Curve bend", type: "number", default: 3, min: 0, max: 8, step: 0.5 },
        { id: "scrollSpeed", label: "Auto scroll", type: "number", default: 2, min: 0.5, max: 6, step: 0.5 },
      ],
      hint: "Self-contained placeholder gallery (no picsum/Webfont fetch): wheel or drag to travel.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-dot-grid",
    ({ dotSize, gap, proximity }) => (
      <WebGLStage height={380}>
        <DotGrid dotSize={Number(dotSize)} gap={Number(gap)} proximity={Number(proximity)} />
      </WebGLStage>
    ),
    { dotSize: 5, gap: 18, proximity: 140 },
    {
      controls: [
        { id: "dotSize", label: "Dot size", type: "number", default: 5, min: 2, max: 14, step: 1 },
        { id: "gap", label: "Gap", type: "number", default: 18, min: 8, max: 40, step: 2 },
        { id: "proximity", label: "Pointer radius", type: "number", default: 140, min: 40, max: 260, step: 10 },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-fluid-glass",
    ({ text, size }) => (
      <WebGLStage height={400}>
        <FluidGlass text={String(text)} size={Number(size)} />
      </WebGLStage>
    ),
    { text: "Look closer.", size: 260 },
    {
      controls: [
        { id: "text", label: "Display text", type: "text", default: "Look closer." },
        { id: "size", label: "Shape size", type: "number", default: 260, min: 120, max: 500, step: 10 },
      ],
      hint: "Refractive torus on GPU; drag inside the stage to move it.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-glass-surface",
    ({ borderRadius, blur }) => (
      <WebGLStage height={300}>
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          <GlassSurface borderRadius={Number(borderRadius)} blur={Number(blur)} width={420} height={120}>
            <span style={{ padding: "24px 32px", fontSize: 18, fontWeight: 600 }}>Glass surface</span>
          </GlassSurface>
        </div>
      </WebGLStage>
    ),
    { borderRadius: 20, blur: 11 },
    {
      controls: [
        { id: "borderRadius", label: "Radius", type: "number", default: 20, min: 0, max: 40, step: 2 },
        { id: "blur", label: "Blur", type: "number", default: 11, min: 0, max: 30, step: 1 },
      ],
      hint: "Refraction backdrop comes from the stage behind the panel.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-gooey-nav",
    ({ initialActiveIndex }) => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 260, width: "100%", padding: 16 }}>
        <GooeyNav initialActiveIndex={Math.round(Number(initialActiveIndex))} items={["Home", "Work", "About", "Contact"].map((label) => ({ label, href: "#" }))} />
      </div>
    ),
    { initialActiveIndex: 0 },
    {
      controls: [{ id: "initialActiveIndex", label: "Initial active", type: "number", default: 0, min: 0, max: 3, step: 1 }],
      hint: "Gooey fluor filter on hover/active; keyboard focus moves the goo too.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-hyperspeed",
    ({ speed }) => (
      <WebGLStage height={400}>
        <Hyperspeed speed={Number(speed)} />
      </WebGLStage>
    ),
    { speed: 1 },
    {
      controls: [{ id: "speed", label: "Warp speed", type: "number", default: 1, min: 0.5, max: 4, step: 0.25 }],
      hint: "three.js endless road; the strip lights stream past this machine's GPU.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-iridescence",
    ({ speed, mouseReact }) => (
      <WebGLStage height={380}>
        <Iridescence speed={Number(speed)} mouseReact={Boolean(mouseReact)} />
      </WebGLStage>
    ),
    { speed: 1, mouseReact: true },
    {
      controls: [
        { id: "speed", label: "Shimmer speed", type: "number", default: 1, min: 0.2, max: 3, step: 0.1 },
        { id: "mouseReact", label: "Pointer warps surface", type: "boolean", default: true },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-lanyard",
    ({ imageFit, orientation }) => (
      <WebGLStage height={440}>
        <Lanyard
          frontImage={placeholderUri(0, 760, 400, "Front")}
          backImage={placeholderUri(4, 760, 400, "Back")}
          imageFit={String(imageFit) === "contain" ? "contain" : "cover"}
          orientation={String(orientation) === "landscape" ? "landscape" : "portrait"}
        />
      </WebGLStage>
    ),
    { imageFit: "cover", orientation: "portrait" },
    {
      controls: [
        { id: "imageFit", label: "Card image fit", type: "select", default: "cover", options: ["cover", "contain"] },
        { id: "orientation", label: "Card orientation", type: "select", default: "portrait", options: ["portrait", "landscape"] },
      ],
      hint: "Fully procedural three.js card dangles, swings, and reacts to pointer drag.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-laser-flow",
    ({ intensity, speed, color }) => (
      <WebGLStage height={420}>
        <LaserFlow intensity={Number(intensity)} speed={Number(speed)} color={String(color)} />
      </WebGLStage>
    ),
    { intensity: 1.8, speed: 1.5, color: "#3847ff" },
    {
      controls: [
        { id: "intensity", label: "Intensity", type: "number", default: 1.8, min: 0.5, max: 4, step: 0.1 },
        { id: "speed", label: "Flow speed", type: "number", default: 1.5, min: 0.5, max: 3, step: 0.1 },
        { id: "color", label: "Beam color", type: "text", default: "#3847ff" },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-letter-glitch",
    ({ fontSize, density }) => (
      <WebGLStage height={320}>
        <LetterGlitch fontSize={Number(fontSize)} density={Number(density)} lightMode />
      </WebGLStage>
    ),
    { fontSize: 14, density: 0.9 },
    {
      controls: [
        { id: "fontSize", label: "Glyph size", type: "number", default: 14, min: 8, max: 28, step: 1 },
        { id: "density", label: "Glitch density", type: "number", default: 0.9, min: 0.2, max: 1, step: 0.05 },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-lightning",
    ({ bolts, spread, color }) => (
      <WebGLStage height={360}>
        <Lightning bolts={Math.round(Number(bolts))} spread={Number(spread)} color={String(color)} size={0.8} />
      </WebGLStage>
    ),
    { bolts: 1, spread: 0.6, color: "#4d6bff" },
    {
      controls: [
        { id: "bolts", label: "Bolts", type: "number", default: 1, min: 1, max: 4, step: 1 },
        { id: "spread", label: "Spread", type: "number", default: 0.6, min: 0.1, max: 1, step: 0.05 },
        { id: "color", label: "Bolt color", type: "text", default: "#4d6bff" },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-magnet-lines",
    ({ rows, columns }) => (
      <WebGLStage height={400}>
        <MagnetLines
          rows={Math.round(Number(rows))}
          columns={Math.round(Number(columns))}
          spacing={30}
          lineColor="#6366f1"
          accentColor="#f472b6"
          lineWidth={3}
        />
      </WebGLStage>
    ),
    { rows: 12, columns: 12 },
    {
      controls: [
        { id: "rows", label: "Rows", type: "number", default: 12, min: 6, max: 16, step: 1 },
        { id: "columns", label: "Columns", type: "number", default: 12, min: 6, max: 16, step: 1 },
      ],
      hint: "Needles orbit toward the pointer's magnet field.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-meta-balls",
    ({ speed, enableMouseInteraction, ballCount }) => (
      <WebGLStage height={380}>
        <MetaBalls speed={Number(speed)} enableMouseInteraction={Boolean(enableMouseInteraction)} ballCount={Math.round(Number(ballCount))} />
      </WebGLStage>
    ),
    { speed: 0.3, enableMouseInteraction: true, ballCount: 15 },
    {
      controls: [
        { id: "speed", label: "Drift speed", type: "number", default: 0.3, min: 0.1, max: 1, step: 0.05 },
        { id: "ballCount", label: "Balls", type: "number", default: 15, min: 4, max: 30, step: 1 },
        { id: "enableMouseInteraction", label: "Pointer attracts", type: "boolean", default: true },
      ],
      hint: "Metaball shader blobs; the pointer gravity blends them into one.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-metallic-paint",
    ({ text, density, softness, angle }) => (
      <WebGLStage height={320}>
        <MetallicPaint text={String(text) || "Metallic"} density={Number(density)} softness={Number(softness)} angle={Number(angle)} />
      </WebGLStage>
    ),
    { text: "Metallic", density: 2, softness: 0.1, angle: 70 },
    {
      controls: [
        { id: "text", label: "Display text", type: "text", default: "Metallic" },
        { id: "density", label: "Paint density", type: "number", default: 2, min: 0.5, max: 4, step: 0.1 },
        { id: "softness", label: "Softness", type: "number", default: 0.1, min: 0, max: 0.5, step: 0.05 },
        { id: "angle", label: "Light angle", type: "number", default: 70, min: 30, max: 120, step: 5 },
      ],
      hint: "Self-contained GPU text painting; no external texture image.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-particles",
    ({ particleCount, speed }) => (
      <WebGLStage height={380}>
        <Particles
          particleCount={Math.round(Number(particleCount))}
          speed={Number(speed)}
          particleColors={["#6366f1", "#ec4899", "#38bdf8"]}
        />
      </WebGLStage>
    ),
    { particleCount: 200, speed: 0.1 },
    {
      controls: [
        { id: "particleCount", label: "Particles", type: "number", default: 200, min: 40, max: 500, step: 20 },
        { id: "speed", label: "Drift speed", type: "number", default: 0.1, min: 0.02, max: 1, step: 0.02 },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-ribbons",
    ({ thickness, stiffness, bounce }) => (
      <WebGLStage height={380}>
        <Ribbons thickness={Number(thickness)} stiffness={Number(stiffness)} bounce={Number(bounce)} length={3.2} />
      </WebGLStage>
    ),
    { thickness: 30, stiffness: 0.5, bounce: 0.5 },
    {
      controls: [
        { id: "thickness", label: "Ribbon width", type: "number", default: 30, min: 10, max: 80, step: 2 },
        { id: "stiffness", label: "Stiffness", type: "number", default: 0.5, min: 0, max: 1, step: 0.05 },
        { id: "bounce", label: "Bounce", type: "number", default: 0.5, min: 0, max: 1, step: 0.05 },
      ],
      hint: "The ribbon drifts on its own; move the pointer across the stage to steer it.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-waves",
    ({ amplitude, spacing }) => (
      <WebGLStage height={360}>
        <Waves amplitude={Number(amplitude)} spacing={Number(spacing)} lineColor="#6366f1" accentColor="#ec4899" />
      </WebGLStage>
    ),
    { amplitude: 32, spacing: 10 },
    {
      controls: [
        { id: "amplitude", label: "Wave amplitude", type: "number", default: 32, min: 8, max: 80, step: 4 },
        { id: "spacing", label: "Line spacing", type: "number", default: 10, min: 4, max: 24, step: 2 },
      ],
      hint: WEBGL_HINT,
      heavy: true,
      stage: "inverted",
    },
  ),
];
