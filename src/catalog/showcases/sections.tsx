// Section showcases (M6.2): wrappers around vendored React Bits page-section
// components (galleries, stack, stepper, slider, counters). Item arrays and
// image placeholders are built locally (data URIs) — no network, no fakes.
import type { ComponentType } from "react";
import MasonryRaw from "../../../catalog/components/react-bits/masonry/Masonry";
import CarouselRaw from "../../../catalog/components/react-bits/carousel/Carousel";
import StackRaw from "../../../catalog/components/react-bits/stack/Stack";
import DomeGalleryRaw from "../../../catalog/components/react-bits/dome-gallery/DomeGallery";
import StepperRaw, { Step } from "../../../catalog/components/react-bits/stepper/Stepper";
import ElasticSliderRaw from "../../../catalog/components/react-bits/elastic-slider/ElasticSlider";
import CounterRaw from "../../../catalog/components/react-bits/counter/Counter";
import { defineShowcase, type Showcase } from "./types";
import { CenteredStage, placeholderUri, svgDataUri } from "./helpers";

type Raw = ComponentType<Record<string, unknown>>;

const Masonry = MasonryRaw as unknown as Raw;
const Carousel = CarouselRaw as unknown as Raw;
const Stack = StackRaw as unknown as Raw;
const DomeGallery = DomeGalleryRaw as unknown as Raw;
const Stepper = StepperRaw as unknown as Raw;
const ElasticSlider = ElasticSliderRaw as unknown as Raw;
const Counter = CounterRaw as unknown as Raw;

function StackCard({ index }: { index: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#f8fafc",
        fontWeight: 700,
        fontSize: 22,
        backgroundImage: `url("${svgDataUri(420, 420, ["#1e40af", "#9d174d", "#7c2d12", "#164e63"][index % 4], ["#818cf8", "#fb7185", "#f97316", "#22d3ee"][index % 4], `Card ${index + 1}`)}")`,
        backgroundSize: "cover",
      }}
    />
  );
}

export const sectionShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-masonry",
    ({ columns, gap, radius, animateFrom, hoverEffect }) => (
      <CenteredStage style={{ minHeight: 340, width: "100%" }}>
        <div style={{ width: "min(640px, 94%)" }}>
          <Masonry
            items={[0, 1, 2, 3, 4, 5].map((index) => ({
              id: `m-${index}`,
              img: placeholderUri(index, 400, index % 2 === 0 ? 300 : 420, `Tile ${index + 1}`),
              width: 400,
              height: index % 2 === 0 ? 300 : 420,
              title: `Tile ${index + 1}`,
              description: "Placeholder tile",
            }))}
            columns={Number(columns)}
            gap={Number(gap)}
            radius={Number(radius)}
            animateFrom={String(animateFrom)}
            hoverEffect={String(hoverEffect)}
          />
        </div>
      </CenteredStage>
    ),
    { columns: 3, gap: 16, radius: 12, animateFrom: "bottom", hoverEffect: "zoom" },
    {
      controls: [
        { id: "columns", label: "Columns", type: "number", default: 3, min: 1, max: 4, step: 1 },
        { id: "gap", label: "Gap (px)", type: "number", default: 16, min: 4, max: 40, step: 2 },
        { id: "radius", label: "Tile radius (px)", type: "number", default: 12, min: 0, max: 32, step: 2 },
        { id: "animateFrom", label: "Animate from", type: "select", default: "bottom", options: ["bottom", "top", "left", "right", "center", "random", "none"] },
        { id: "hoverEffect", label: "Hover effect", type: "select", default: "zoom", options: ["zoom", "lift", "tilt", "none"] },
      ],
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-carousel",
    ({ baseWidth, effect, autoplay, loop }) => (
      <CenteredStage style={{ minHeight: 360, width: "100%" }}>
        <Carousel
          items={[0, 1, 2, 3].map((index) => ({
            id: `c-${index}`,
            title: `Slide ${index + 1}`,
            description: "Catalog showcase slide",
            image: placeholderUri(index, 520, 340, `Slide ${index + 1}`),
            alt: `Slide ${index + 1}`,
          }))}
          baseWidth={Number(baseWidth)}
          effect={String(effect)}
          autoplay={Boolean(autoplay)}
          autoplayDelay={3200}
          loop={Boolean(loop)}
        />
      </CenteredStage>
    ),
    { baseWidth: 340, effect: "tilt", autoplay: true, loop: true },
    {
      controls: [
        { id: "baseWidth", label: "Card width (px)", type: "number", default: 340, min: 220, max: 460, step: 10 },
        { id: "effect", label: "Transition effect", type: "select", default: "tilt", options: ["tilt", "slide", "scale", "fade", "cube"] },
        { id: "autoplay", label: "Autoplay", type: "boolean", default: true },
        { id: "loop", label: "Loop", type: "boolean", default: true },
      ],
      hint: "Arrow keys also drive the carousel; pause on hover by default.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-stack",
    ({ layout, tilt, autoplay }) => (
      <CenteredStage style={{ minHeight: 360, height: 360, width: "100%" }}>
        <div style={{ width: "min(340px, 90%)", height: 360 }}>
          <Stack
            cards={[0, 1, 2, 3].map((index) => <StackCard key={index} index={index} />)}
            layout={String(layout)}
            tilt={Number(tilt)}
            autoplay={Boolean(autoplay)}
            autoplayDelay={3400}
          />
        </div>
      </CenteredStage>
    ),
    { layout: "fan", tilt: 6, autoplay: true },
    {
      controls: [
        { id: "layout", label: "Layout", type: "select", default: "fan", options: ["fan", "cascade", "deck", "pile"] },
        { id: "tilt", label: "Tilt degrees", type: "number", default: 6, min: 0, max: 24, step: 2 },
        { id: "autoplay", label: "Autoplay", type: "boolean", default: true },
      ],
      hint: "Click a card to send it to the back; drag for momentum.",
      heavy: true,
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-dome-gallery",
    ({ maxVerticalRotationDeg, dragSensitivity }) => (
      <CenteredStage style={{ minHeight: 380, height: 380, width: "100%" }}>
        <DomeGallery
          images={[0, 1, 2, 3, 4, 5, 6, 7].map((index) => placeholderUri(index, 300, 300, `Item ${index + 1}`))}
          maxVerticalRotationDeg={Number(maxVerticalRotationDeg)}
          dragSensitivity={Number(dragSensitivity)}
        />
      </CenteredStage>
    ),
    { maxVerticalRotationDeg: 5, dragSensitivity: 22 },
    {
      controls: [
        { id: "maxVerticalRotationDeg", label: "Vertical tilt (deg)", type: "number", default: 5, min: 0, max: 20, step: 1 },
        { id: "dragSensitivity", label: "Drag sensitivity", type: "number", default: 22, min: 5, max: 60, step: 1 },
      ],
      hint: "Drag inside the dome to rotate the gallery ring.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-stepper",
    ({ orientation, linear }) => (
      <CenteredStage style={{ minHeight: 340, width: "100%" }}>
        <Stepper
          orientation={String(orientation)}
          linear={Boolean(linear)}
          showFooter
          backButtonText="Back"
          nextButtonText="Next"
          completeButtonText="Done"
          initialStep={0}
        >
          <Step title="Catalog" description="Dashboards, previews, and honest records.">Each step keeps its own panel content.</Step>
          <Step title="Selection" description="Stable ids that survive filtering.">Selected entries feed the master prompt.</Step>
          <Step title="Preview" description="Runtime classes drive what runs live.">Every acceptance criterion is tested against reality.</Step>
        </Stepper>
      </CenteredStage>
    ),
    { orientation: "horizontal", linear: true },
    {
      controls: [
        { id: "orientation", label: "Orientation", type: "select", default: "horizontal", options: ["horizontal", "vertical"] },
        { id: "linear", label: "Linear flow", type: "boolean", default: true },
      ],
      hint: "Use the footer buttons or click an indicator circle.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-elastic-slider",
    ({ defaultValue, maxValue, isStepped, stepSize }) => (
      <CenteredStage style={{ minHeight: 240, width: "100%" }}>
        <div style={{ width: "min(420px, 88%)" }}>
          <ElasticSlider
            defaultValue={Number(defaultValue)}
            maxValue={Number(maxValue)}
            isStepped={Boolean(isStepped)}
            stepSize={Number(stepSize)}
            ariaLabel="Elastic slider demo"
          />
        </div>
      </CenteredStage>
    ),
    { defaultValue: 64, maxValue: 100, isStepped: false, stepSize: 5 },
    {
      controls: [
        { id: "defaultValue", label: "Start value", type: "number", default: 64, min: 0, max: 90, step: 1 },
        { id: "maxValue", label: "Max value", type: "number", default: 100, min: 20, max: 200, step: 5 },
        { id: "isStepped", label: "Stepped", type: "boolean", default: false },
        { id: "stepSize", label: "Step size", type: "number", default: 5, min: 1, max: 25, step: 1 },
      ],
      hint: "Drag the thumb and release: the spring overshoots like elastic.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-counter",
    ({ value, decimals, duration, suffix }) => (
      <CenteredStage style={{ minHeight: 240 }}>
        <Counter value={Number(value)} decimals={Number(decimals)} duration={Number(duration)} suffix={String(suffix)} />
      </CenteredStage>
    ),
    { value: 128.5, decimals: 1, duration: 1.6, suffix: "" },
    {
      controls: [
        { id: "value", label: "Value", type: "number", default: 128.5, min: 0, max: 9999, step: 0.5 },
        { id: "decimals", label: "Decimals", type: "number", default: 1, min: 0, max: 3, step: 1 },
        { id: "duration", label: "Duration (s)", type: "number", default: 1.6, min: 0.5, max: 5, step: 0.2 },
        { id: "suffix", label: "Suffix", type: "text", default: "" },
      ],
      hint: "Mechanical digit roller: values spin through the odometer strip.",
      stage: "inverted",
    },
  ),
];
