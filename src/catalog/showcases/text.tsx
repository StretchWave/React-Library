// Text-animation showcases (M6.2): reviewed wrappers around vendored React Bits
// text components. Each wrapper applies showcase defaults; the preview workspace
// overrides come from the recorded control specs (identity prop names).
import type { ComponentType } from "react";
import SplitTextRaw from "../../../catalog/components/react-bits/split-text/SplitText";
import ScrambledTextRaw from "../../../catalog/components/react-bits/scrambled-text/ScrambledText";
import DecryptedTextRaw from "../../../catalog/components/react-bits/decrypted-text/DecryptedText";
import ShinyTextRaw from "../../../catalog/components/react-bits/shiny-text/ShinyText";
import GradientTextRaw from "../../../catalog/components/react-bits/gradient-text/GradientText";
import BlurTextRaw from "../../../catalog/components/react-bits/blur-text/BlurText";
import TextTypeRaw from "../../../catalog/components/react-bits/text-type/TextType";
import RotatingTextRaw from "../../../catalog/components/react-bits/rotating-text/RotatingText";
import GlitchTextRaw from "../../../catalog/components/react-bits/glitch-text/GlitchText";
import FallingTextRaw from "../../../catalog/components/react-bits/falling-text/FallingText";
import TextPressureRaw from "../../../catalog/components/react-bits/text-pressure/TextPressure";
import CountUpRaw from "../../../catalog/components/react-bits/count-up/CountUp";
import CircularTextRaw from "../../../catalog/components/react-bits/circular-text/CircularText";
import { defineShowcase, type Showcase } from "./types";
import { CenteredStage } from "./helpers";

type Raw = ComponentType<Record<string, unknown>>;

const SplitText = SplitTextRaw as unknown as Raw;
const ScrambledText = ScrambledTextRaw as unknown as Raw;
const DecryptedText = DecryptedTextRaw as unknown as Raw;
const ShinyText = ShinyTextRaw as unknown as Raw;
const GradientText = GradientTextRaw as unknown as Raw;
const BlurText = BlurTextRaw as unknown as Raw;
const TextType = TextTypeRaw as unknown as Raw;
const RotatingText = RotatingTextRaw as unknown as Raw;
const GlitchText = GlitchTextRaw as unknown as Raw;
const FallingText = FallingTextRaw as unknown as Raw;
const TextPressure = TextPressureRaw as unknown as Raw;
const CountUp = CountUpRaw as unknown as Raw;
const CircularText = CircularTextRaw as unknown as Raw;

export const textShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-split-text",
    ({ text, splitType, tag, duration }) => (
      <CenteredStage>
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <SplitText text={String(text)} splitType={String(splitType)} tag={String(tag)} duration={Number(duration)} />
        </div>
      </CenteredStage>
    ),
    { text: "Animation-first discovery", splitType: "chars", tag: "h2", duration: 0.9 },
    {
      controls: [
        { id: "text", label: "Text", type: "text", default: "Animation-first discovery" },
        { id: "splitType", label: "Split by", type: "select", default: "chars", options: ["chars", "words", "lines", "words, chars"] },
        { id: "tag", label: "Semantic tag", type: "select", default: "h2", options: ["h1", "h2", "h3", "p", "span"] },
        { id: "duration", label: "Duration (s)", type: "number", default: 0.9, min: 0.2, max: 3, step: 0.1 },
      ],
      hint: "Staggered per-character entrance; use Replay to watch it again.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-scrambled-text",
    ({ speed, effect, clickBurst, intro, children }) => (
      <CenteredStage style={{ minHeight: 260 }}>
        <ScrambledText speed={Number(speed)} effect={String(effect)} clickBurst={Boolean(clickBurst)} intro={Boolean(intro)}>
          {String(children)}
        </ScrambledText>
      </CenteredStage>
    ),
    { speed: 0.5, effect: "scramble", clickBurst: true, intro: true, children: "SCRAMBLE TEXT" },
    {
      controls: [
        { id: "children", label: "Text", type: "text", default: "SCRAMBLE TEXT" },
        { id: "effect", label: "Effect", type: "select", default: "scramble", options: ["scramble", "lift", "blur", "magnify"] },
        { id: "speed", label: "Speed", type: "number", default: 0.5, min: 0.1, max: 2, step: 0.1 },
        { id: "clickBurst", label: "Click burst", type: "boolean", default: true },
        { id: "intro", label: "Intro animation", type: "boolean", default: true },
      ],
      hint: "Click inside the stage to send a scramble wave through the glyphs.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-decrypted-text",
    ({ text, speed, sequential, animateOn }) => (
      <CenteredStage>
        <DecryptedText
          text={String(text)}
          speed={Number(speed)}
          sequential={Boolean(sequential)}
          animateOn={String(animateOn)}
        />
      </CenteredStage>
    ),
    { text: "Decrypted text reveals on scroll", speed: 12, sequential: true, animateOn: "view" },
    {
      controls: [
        { id: "text", label: "Text", type: "text", default: "Decrypted text reveals on scroll" },
        { id: "speed", label: "Speed", type: "number", default: 12, min: 2, max: 40, step: 1 },
        { id: "sequential", label: "Sequential", type: "boolean", default: true },
        { id: "animateOn", label: "Animate on", type: "select", default: "view", options: ["view", "hover", "inViewHover", "click"] },
      ],
      hint: "Scrambles toward readable text as it enters the viewport; Replay to restart.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-shiny-text",
    ({ text, speed, glow, delay }) => (
      <CenteredStage>
        <ShinyText text={String(text)} speed={Number(speed)} glow={Number(glow)} delay={Number(delay)} />
      </CenteredStage>
    ),
    { text: "Shiny text shimmer", speed: 3, glow: 0.5, delay: 0 },
    {
      controls: [
        { id: "text", label: "Text", type: "text", default: "Shiny text shimmer" },
        { id: "speed", label: "Speed", type: "number", default: 3, min: 1, max: 10, step: 0.5 },
        { id: "glow", label: "Glow", type: "number", default: 0.5, min: 0, max: 1, step: 0.1 },
        { id: "delay", label: "Delay (s)", type: "number", default: 0, min: 0, max: 5, step: 0.5 },
      ],
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-gradient-text",
    ({ children, animationSpeed, yoyo, glow }) => (
      <CenteredStage>
        <GradientText animationSpeed={Number(animationSpeed)} yoyo={Boolean(yoyo)} glow={Number(glow)}>
          {String(children)}
        </GradientText>
      </CenteredStage>
    ),
    { children: "Gradient Text", animationSpeed: 6, yoyo: true, glow: 4 },
    {
      controls: [
        { id: "children", label: "Text", type: "text", default: "Gradient Text" },
        { id: "animationSpeed", label: "Speed (s per cycle)", type: "number", default: 6, min: 2, max: 20, step: 1 },
        { id: "yoyo", label: "Reverse at ends", type: "boolean", default: true },
        { id: "glow", label: "Glow radius", type: "number", default: 4, min: 0, max: 20, step: 1 },
      ],
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-blur-text",
    ({ text, animateBy, effect, trigger }) => (
      <CenteredStage>
        <BlurText text={String(text)} animateBy={String(animateBy)} effect={String(effect)} trigger={String(trigger)} />
      </CenteredStage>
    ),
    { text: "Blur text settles into focus", animateBy: "words", effect: "blur", trigger: "view" },
    {
      controls: [
        { id: "text", label: "Text", type: "text", default: "Blur text settles into focus" },
        { id: "animateBy", label: "Animate by", type: "select", default: "words", options: ["words", "letters"] },
        { id: "effect", label: "Effect", type: "select", default: "blur", options: ["blur", "zoom", "tilt", "focus", "drift"] },
        { id: "trigger", label: "Trigger", type: "select", default: "view", options: ["view", "load", "hover", "click"] },
      ],
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-text-type",
    ({ text, typingSpeed, cursorStyle, loop, showCursor }) => (
      <CenteredStage style={{ minHeight: 240 }}>
        <TextType
          text={String(text)}
          typingSpeed={Number(typingSpeed)}
          cursorStyle={String(cursorStyle)}
          loop={Boolean(loop)}
          showCursor={Boolean(showCursor)}
        />
      </CenteredStage>
    ),
    { text: "Text types itself: watch the cursor.", typingSpeed: 45, cursorStyle: "bar", loop: true, showCursor: true },
    {
      controls: [
        { id: "text", label: "Text", type: "text", default: "Text types itself: watch the cursor." },
        { id: "typingSpeed", label: "Typing speed", type: "number", default: 45, min: 10, max: 150, step: 5 },
        { id: "cursorStyle", label: "Cursor", type: "select", default: "bar", options: ["character", "bar", "block", "underscore"] },
        { id: "loop", label: "Loop typing", type: "boolean", default: true },
        { id: "showCursor", label: "Show cursor", type: "boolean", default: true },
      ],
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-rotating-text",
    ({ effect }) => (
      <CenteredStage>
        <RotatingText texts={["discovering", "composing", "animating", "shipping"]} effect={String(effect)} />
      </CenteredStage>
    ),
    { effect: "blur" },
    {
      controls: [
        { id: "effect", label: "Effect", type: "select", default: "blur", options: ["slide", "flip", "blur", "scale", "drop"] },
      ],
      hint: "Rotates through word options; a label the workspace adds for context.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-glitch-text",
    ({ children, speed, mode, trigger }) => (
      <CenteredStage style={{ minHeight: 240 }}>
        <GlitchText speed={Number(speed)} mode={String(mode)} trigger={String(trigger)}>
          {String(children)}
        </GlitchText>
      </CenteredStage>
    ),
    { children: "GLITCH", speed: 0.5, mode: "slices", trigger: "always" },
    {
      controls: [
        { id: "children", label: "Text", type: "text", default: "GLITCH" },
        { id: "mode", label: "Mode", type: "select", default: "slices", options: ["slices", "rgb", "scan", "noise"] },
        { id: "trigger", label: "Trigger", type: "select", default: "always", options: ["always", "hover", "click"] },
        { id: "speed", label: "Speed", type: "number", default: 0.5, min: 0.1, max: 3, step: 0.1 },
      ],
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-falling-text",
    ({ text, highlightWords, gravity, trigger }) => (
      <CenteredStage style={{ minHeight: 300 }}>
        <FallingText
          text={String(text)}
          highlightWords={[String(highlightWords)]}
          gravity={Number(gravity)}
          trigger={String(trigger)}
        />
      </CenteredStage>
    ),
    {
      text: "Click the highlighted words to let them fall. Physics takes over and the page briefly becomes a playground.",
      highlightWords: "fall",
      gravity: 1,
      trigger: "click",
    },
    {
      controls: [
        { id: "text", label: "Paragraph", type: "text", default: "Click the highlighted words to let them fall." },
        { id: "highlightWords", label: "Highlighted word", type: "text", default: "fall" },
        { id: "gravity", label: "Gravity", type: "number", default: 1, min: 0.2, max: 3, step: 0.1 },
        { id: "trigger", label: "Trigger", type: "select", default: "click", options: ["auto", "hover", "click", "scroll"] },
      ],
      hint: "matter-js physics: click a highlighted word to release it.",
      heavy: true,
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-text-pressure",
    ({ text, idle, flex }) => (
      <CenteredStage style={{ minHeight: 280 }}>
        <TextPressure text={String(text)} idle={String(idle)} flex={Boolean(flex)} />
      </CenteredStage>
    ),
    { text: "Pressure", idle: "wave", flex: true },
    {
      controls: [
        { id: "text", label: "Text", type: "text", default: "Pressure" },
        { id: "idle", label: "Idle animation", type: "select", default: "wave", options: ["none", "wave", "pulse"] },
        { id: "flex", label: "Flex glyphs", type: "boolean", default: true },
      ],
      hint: "Cursor pressure bends the letterforms; move the pointer across the stage.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-count-up",
    ({ to, from, suffix, duration }) => (
      <CenteredStage style={{ minHeight: 220 }}>
        <CountUp to={Number(to)} from={Number(from)} suffix={String(suffix)} duration={Number(duration)} />
      </CenteredStage>
    ),
    { to: 2026, from: 1990, suffix: "", duration: 2 },
    {
      controls: [
        { id: "to", label: "Count to", type: "number", default: 2026, min: 0, max: 100000, step: 1 },
        { id: "from", label: "Count from", type: "number", default: 1990, min: 0, max: 100000, step: 1 },
        { id: "suffix", label: "Suffix", type: "text", default: "" },
        { id: "duration", label: "Duration (s)", type: "number", default: 2, min: 0.5, max: 8, step: 0.5 },
      ],
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-circular-text",
    ({ text, spinDuration, direction, size }) => (
      <CenteredStage>
        <CircularText
          text={String(text)}
          spinDuration={Number(spinDuration)}
          direction={String(direction)}
          size={Number(size)}
        />
      </CenteredStage>
    ),
    { text: "REACT LIBRARY · ANIMATION FIRST · ", spinDuration: 20, direction: "clockwise", size: 200 },
    {
      controls: [
        { id: "text", label: "Ring text", type: "text", default: "REACT LIBRARY · ANIMATION FIRST · " },
        { id: "spinDuration", label: "Spin duration (s)", type: "number", default: 20, min: 5, max: 60, step: 1 },
        { id: "direction", label: "Direction", type: "select", default: "clockwise", options: ["clockwise", "counterclockwise"] },
        { id: "size", label: "Size (px)", type: "number", default: 200, min: 120, max: 320, step: 10 },
      ],
      stage: "neutral",
    },
  ),
];
