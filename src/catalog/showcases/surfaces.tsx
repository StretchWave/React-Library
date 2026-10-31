// Surface showcases (M6.2): wrappers around vendored React Bits card and
// glass surfaces. Every placeholder image is generated locally (data URI), so
// previews run offline and tests never depend on the network.
const TiltedCard = createLazyRaw(() => import("../../../catalog/components/react-bits/tilted-card/TiltedCard"));
const BorderGlow = createLazyRaw(() => import("../../../catalog/components/react-bits/border-glow/BorderGlow"));
const SpotlightCard = createLazyRaw(() => import("../../../catalog/components/react-bits/spotlight-card/SpotlightCard"));
const PixelCard = createLazyRaw(() => import("../../../catalog/components/react-bits/pixel-card/PixelCard"));
const ChromaGrid = createLazyRaw(() => import("../../../catalog/components/react-bits/chroma-grid/ChromaGrid"));
import { defineShowcase, type Showcase } from "./types";
import { CenteredStage, placeholderUri, svgDataUri } from "./helpers";
import { createLazyRaw } from "./lazyRaw";








export const surfaceShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-tilted-card",
    ({ rotateAmplitude, scaleOnHover, radius }) => (
      <CenteredStage style={{ minHeight: 320, width: "100%" }}>
        <TiltedCard
          imageSrc={placeholderUri(0, 400, 400, "Tilt")}
          altText="Tilted card placeholder"
          captionText="React Library catalog item"
          containerHeight={280}
          containerWidth={320}
          imageHeight={280}
          imageWidth={320}
          rotateAmplitude={Number(rotateAmplitude)}
          scaleOnHover={Number(scaleOnHover)}
          radius={Number(radius)}
          showTooltip
          displayOverlayContent
        />
      </CenteredStage>
    ),
    { rotateAmplitude: 12, scaleOnHover: 1.05, radius: 12 },
    {
      controls: [
        { id: "rotateAmplitude", label: "Tilt degrees", type: "number", default: 12, min: 2, max: 30, step: 1 },
        { id: "scaleOnHover", label: "Scale on hover", type: "number", default: 1.05, min: 1, max: 1.3, step: 0.01 },
        { id: "radius", label: "Corner radius (px)", type: "number", default: 12, min: 0, max: 40, step: 2 },
      ],
      hint: "Move the cursor across the card; it tilts toward the pointer.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-border-glow",
    ({ children, glowRadius, glowIntensity, animated }) => (
      <CenteredStage style={{ minHeight: 300, width: "100%" }}>
        <BorderGlow glowRadius={Number(glowRadius)} glowIntensity={Number(glowIntensity)} animated={Boolean(animated)}>
          <div
            style={{
              padding: "34px 28px",
              borderRadius: 14,
              backgroundImage: `url("${svgDataUri(360, 160, "#111827", "#374151", "")}")`,
              backgroundSize: "cover",
              color: "#f9fafb",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            {String(children)}
          </div>
        </BorderGlow>
      </CenteredStage>
    ),
    { children: "Border glow follows the cursor", glowRadius: 30, glowIntensity: 2, animated: true },
    {
      controls: [
        { id: "children", label: "Content", type: "text", default: "Border glow follows the cursor" },
        { id: "glowRadius", label: "Glow radius", type: "number", default: 30, min: 8, max: 90, step: 2 },
        { id: "glowIntensity", label: "Glow intensity", type: "number", default: 2, min: 0.5, max: 6, step: 0.5 },
        { id: "animated", label: "Idle animation", type: "boolean", default: true },
      ],
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-spotlight-card",
    ({ shape, theme, spotlightSize, intensity }) => (
      <CenteredStage style={{ minHeight: 300, width: "100%" }}>
        <SpotlightCard shape={String(shape)} theme={String(theme)} spotlightSize={Number(spotlightSize)} intensity={Number(intensity)}>
          <div style={{ padding: "28px 24px", color: theme === "light" ? "#111827" : "#f8fafc" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Spotlight card</h3>
            <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>
              A radial highlight tracks the cursor across this card surface.
            </p>
          </div>
        </SpotlightCard>
      </CenteredStage>
    ),
    { shape: "circle", theme: "dark", spotlightSize: 220, intensity: 0.6 },
    {
      controls: [
        { id: "shape", label: "Spotlight shape", type: "select", default: "circle", options: ["circle", "beam"] },
        { id: "theme", label: "Theme", type: "select", default: "dark", options: ["dark", "light"] },
        { id: "spotlightSize", label: "Spotlight size (px)", type: "number", default: 220, min: 80, max: 480, step: 10 },
        { id: "intensity", label: "Intensity", type: "number", default: 0.6, min: 0.1, max: 1, step: 0.05 },
      ],
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-pixel-card",
    ({ gap, speed, pixelSize, children }) => (
      <CenteredStage style={{ minHeight: 320, width: "100%" }}>
        <PixelCard gap={Number(gap)} speed={Number(speed)} pixelSize={Number(pixelSize)}>
          <div style={{ padding: "30px 24px", color: "#f8fafc", textAlign: "center", fontWeight: 600 }}>
            {String(children)}
          </div>
        </PixelCard>
      </CenteredStage>
    ),
    { gap: 10, speed: 60, pixelSize: 8, children: "Pixel card reveals as tiny blocks fill the frame." },
    {
      controls: [
        { id: "children", label: "Content", type: "text", default: "Pixel card reveals as tiny blocks fill the frame." },
        { id: "gap", label: "Pixel gap", type: "number", default: 10, min: 2, max: 40, step: 2 },
        { id: "speed", label: "Speed", type: "number", default: 60, min: 10, max: 200, step: 5 },
        { id: "pixelSize", label: "Pixel size", type: "number", default: 8, min: 4, max: 40, step: 2 },
      ],
      hint: "Hover the tile: pixels flood in around the pointer.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-chroma-grid",
    ({ columns, gap, radius }) => (
      <CenteredStage style={{ minHeight: 340, width: "100%" }}>
        <ChromaGrid
          items={[0, 1, 2].map((index) => ({
            image: placeholderUri(index, 400, 400, `Card ${index + 1}`),
            title: `Catalog item #${index + 1}`,
            subtitle: "react-bits · motion",
            borderColor: "",
          }))}
          columns={Number(columns)}
          gap={Number(gap)}
          radius={Number(radius)}
        />
      </CenteredStage>
    ),
    { columns: 3, gap: 16, radius: 16 },
    {
      controls: [
        { id: "columns", label: "Columns", type: "number", default: 3, min: 1, max: 3, step: 1 },
        { id: "gap", label: "Gap (px)", type: "number", default: 16, min: 4, max: 40, step: 2 },
        { id: "radius", label: "Card radius (px)", type: "number", default: 16, min: 0, max: 36, step: 2 },
      ],
      hint: "Chroma glow bulbs sit on the card borders; hover to see them respond.",
      stage: "inverted",
    },
  ),
];
