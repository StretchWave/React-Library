// List showcases (M6.2): wrappers around vendored React Bits list components.
// AnimatedList originally shipped as `external` in M6.1 because @hugeicons was
// excluded from the runtime union; the M6.2 §12 amendment installs that runtime,
// so this component runs live again (plain string items per its source type).
const AnimatedList = createLazyRaw(() => import("../../../catalog/components/react-bits/animated-list/AnimatedList"));
import { defineShowcase, type Showcase } from "./types";
import { CenteredStage } from "./helpers";
import { createLazyRaw } from "./lazyRaw";




export const listShowcases: Showcase[] = [
  defineShowcase(
    "react-bits-animated-list",
    ({ animation, selectOnHover, theme, stagger }) => (
      <CenteredStage style={{ minHeight: 340, width: "100%" }}>
        <div style={{ width: "min(420px, 92%)" }}>
          <AnimatedList
            items={[
              "Preview request finished",
              "Catalog indexed 87 entries",
              "Showcase registry verified",
              "Master prompt generated",
              "Selection synced across views",
              "Verify gate green",
            ]}
            animation={String(animation)}
            selectOnHover={Boolean(selectOnHover)}
            theme={String(theme)}
            stagger={Number(stagger)}
          />
        </div>
      </CenteredStage>
    ),
    { animation: "pop", selectOnHover: true, theme: "dark", stagger: 0.08 },
    {
      controls: [
        { id: "animation", label: "Animation", type: "select", default: "pop", options: ["pop", "slide", "fade", "none"] },
        { id: "selectOnHover", label: "Select on hover", type: "boolean", default: true },
        { id: "theme", label: "Theme", type: "select", default: "dark", options: ["dark", "light"] },
        { id: "stagger", label: "Stagger (s)", type: "number", default: 0.08, min: 0, max: 0.5, step: 0.02 },
      ],
      hint: "Rows animate in staggered; hover or arrow keys pick a row.",
      stage: "inverted",
    },
  ),
];
