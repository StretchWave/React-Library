// Navigation showcases (M6.2): wrappers around vendored React Bits navigation
// components (dock, menus). Item arrays live inside the wrappers so that
// showcase defaults/controls stay scalar values only.
import type { ComponentType } from "react";
import DockRaw from "../../../catalog/components/react-bits/dock/Dock";
import BubbleMenuRaw from "../../../catalog/components/react-bits/bubble-menu/BubbleMenu";
import StaggeredMenuRaw from "../../../catalog/components/react-bits/staggered-menu/StaggeredMenu";
import FlowingMenuRaw from "../../../catalog/components/react-bits/flowing-menu/FlowingMenu";
import CardNavRaw from "../../../catalog/components/react-bits/card-nav/CardNav";
import { defineShowcase, type Showcase } from "./types";
import { CenteredStage } from "./helpers";

type Raw = ComponentType<Record<string, unknown>>;

const Dock = DockRaw as unknown as Raw;
const BubbleMenu = BubbleMenuRaw as unknown as Raw;
const StaggeredMenu = StaggeredMenuRaw as unknown as Raw;
const FlowingMenu = FlowingMenuRaw as unknown as Raw;
const CardNav = CardNavRaw as unknown as Raw;

function Glyph({ d, viewBox = "0 0 24 24" }: { d: string; viewBox?: string }) {
  return (
    <svg width="22" height="22" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DOCK_GLYPHS = [
  "M3 5h18v14H3z",
  "M12 3l9 7-9 7-9-7z",
  "M5 12h14",
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  "M4 4h16v6H4zM4 14h16v6H4z",
];

export const navShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-dock",
    ({ position, theme, magnification, distance }) => (
      <CenteredStage style={{ minHeight: 300, paddingBottom: 84 }}>
        <Dock
          items={DOCK_GLYPHS.map((d, index) => ({
            icon: <Glyph d={d} />,
            label: `Shortcut ${index + 1}`,
            onClick: () => undefined,
          }))}
          position={String(position)}
          theme={String(theme)}
          magnification={Number(magnification)}
          distance={Number(distance)}
        />
      </CenteredStage>
    ),
    { position: "bottom", theme: "dark", magnification: 2, distance: 160 },
    {
      controls: [
        { id: "position", label: "Position", type: "select", default: "bottom", options: ["bottom", "top", "left", "right"] },
        { id: "theme", label: "Theme", type: "select", default: "dark", options: ["dark", "light"] },
        { id: "magnification", label: "Magnification", type: "number", default: 2, min: 1.2, max: 3, step: 0.1 },
        { id: "distance", label: "Reach (px)", type: "number", default: 160, min: 60, max: 300, step: 10 },
      ],
      hint: "Hover the dock icons to see them scale; keyboard focus included.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-bubble-menu",
    ({ animationDuration, staggerDelay }) => (
      <div style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <BubbleMenu
          logo="RL"
          items={[
            { label: "Text", href: "#", ariaLabel: "Text components" },
            { label: "Motion", href: "#", ariaLabel: "Motion components" },
            { label: "Backgrounds", href: "#", ariaLabel: "Background components" },
            { label: "Sections", href: "#", ariaLabel: "Section components" },
          ]}
          animationDuration={Number(animationDuration)}
          staggerDelay={Number(staggerDelay)}
        />
      </div>
    ),
    { animationDuration: 0.45, staggerDelay: 0.06 },
    {
      controls: [
        { id: "animationDuration", label: "Open duration (s)", type: "number", default: 0.45, min: 0.1, max: 1.2, step: 0.05 },
        { id: "staggerDelay", label: "Stagger delay (s)", type: "number", default: 0.06, min: 0, max: 0.3, step: 0.02 },
      ],
      hint: "Click the logo bubble to open the menu; click away to close.",
      stage: "neutral",
    },
  ),
  defineShowcase(
    "react-bits-staggered-menu",
    ({ displayItemNumbering, closeOnClickAway }) => (
      <div style={{ minHeight: 340, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <StaggeredMenu
          items={[
            { label: "Overview", ariaLabel: "Overview", link: "#" },
            { label: "Components", ariaLabel: "Components", link: "#" },
            { label: "Preview", ariaLabel: "Preview", link: "#" },
            { label: "Selection", ariaLabel: "Selection", link: "#" },
          ]}
          displaySocials={false}
          displayItemNumbering={Boolean(displayItemNumbering)}
          closeOnClickAway={Boolean(closeOnClickAway)}
        />
      </div>
    ),
    { displayItemNumbering: true, closeOnClickAway: true },
    {
      controls: [
        { id: "displayItemNumbering", label: "Item numbering", type: "boolean", default: true },
        { id: "closeOnClickAway", label: "Close on click-away", type: "boolean", default: true },
      ],
      hint: "Click the menu button in the stage corner; entries stagger in.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-flowing-menu",
    ({ speed, direction, followCursor }) => (
      <CenteredStage style={{ minHeight: 300, width: "100%" }}>
        <div style={{ width: "min(560px, 92%)" }}>
          <FlowingMenu
            items={[
              { text: "Editorial flow", link: "#" },
              { text: "Cascade rows", link: "#" },
              { text: "Marquee band", link: "#", marquee: undefined },
              { text: "Magnet hover", link: "#" },
            ]}
            speed={Number(speed)}
            direction={String(direction)}
            followCursor={Boolean(followCursor)}
          />
        </div>
      </CenteredStage>
    ),
    { speed: 1.2, direction: "alternate", followCursor: true },
    {
      controls: [
        { id: "speed", label: "Flow speed", type: "number", default: 1.2, min: 0.3, max: 4, step: 0.1 },
        { id: "direction", label: "Direction", type: "select", default: "alternate", options: ["left", "right", "alternate"] },
        { id: "followCursor", label: "Follow cursor", type: "boolean", default: true },
      ],
      hint: "Hover a row to release its flowing label band.",
      stage: "inverted",
    },
  ),
  defineShowcase(
    "react-bits-card-nav",
    ({ theme, defaultOpen }) => (
      <CenteredStage style={{ minHeight: 320, paddingBottom: 120 }}>
        <CardNav
          logo="RL"
          logoAlt="React Library"
          items={[
            {
              label: "Catalog",
              description: "Browse every component",
              links: [{ label: "Browser", href: "#", ariaLabel: "Browser" }, { label: "Gallery", href: "#", ariaLabel: "Gallery" }],
            },
            {
              label: "Preview",
              description: "Run the live workspace",
              links: [{ label: "Workspace", href: "#", ariaLabel: "Workspace" }],
            },
            {
              label: "Selection",
              description: "Build the master prompt",
              links: [{ label: "Prompt studio", href: "#", ariaLabel: "Prompt studio" }],
            },
          ]}
          theme={String(theme)}
          defaultOpen={Boolean(defaultOpen)}
        />
      </CenteredStage>
    ),
    { theme: "dark", defaultOpen: true },
    {
      controls: [
        { id: "theme", label: "Theme", type: "select", default: "dark", options: ["dark", "light"] },
        { id: "defaultOpen", label: "Cards open initially", type: "boolean", default: true },
      ],
      hint: "Click the logo to fold/unfold the card columns.",
      stage: "inverted",
    },
  ),
];
